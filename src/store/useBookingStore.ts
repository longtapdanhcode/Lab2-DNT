import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking, BuildingCode, EquipmentType, FilterState, Room } from '../types';
import { MOCK_ROOMS } from '../data/mockRooms';
import { TIME_SLOTS } from '../data/timeSlots';
import { scheduleBookingReminder, cancelBookingReminder } from '../services/notificationService';
import {
  fetchRooms,
  fetchUserBookings,
  fetchAllBookings,
  createBookingInSupabase,
  updateBookingStatus,
  checkSlotAvailability,
} from '../services/supabaseService';

// Format helper for YYYY-MM-DD
export function getFormattedDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface BookingState {
  // Auth user info (set from AuthContext)
  authUserId: string | null;
  authUserName: string;
  authUserEmail: string;
  authStudentId: string;
  authAvatarUrl: string;
  setAuthUser: (params: {
    userId: string;
    name: string;
    email: string;
    studentId: string;
    avatarUrl: string;
  }) => void;
  clearAuthUser: () => void;

  // Rooms
  rooms: Room[];
  loadRooms: () => Promise<void>;

  // Bookings
  bookings: Booking[];
  allBookings: Booking[]; // All active bookings for conflict checking
  loadUserBookings: () => Promise<void>;
  loadAllBookings: () => Promise<void>;
  createBooking: (params: {
    roomId: string;
    date: string;
    slotId: string;
  }) => Promise<{ success: boolean; booking?: Booking; error?: string }>;
  cancelBooking: (bookingId: string) => Promise<void>;
  checkInBooking: (bookingId: string) => Promise<void>;
  isSlotBooked: (roomId: string, date: string, slotId: string) => boolean;

  // Filter State
  filters: FilterState;
  setSearchQuery: (query: string) => void;
  setBuildingFilter: (building: BuildingCode | 'ALL') => void;
  setMinCapacityFilter: (capacity: number) => void;
  toggleEquipmentFilter: (equipment: EquipmentType) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  building: 'ALL',
  minCapacity: 0,
  equipment: [],
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      // Auth user
      authUserId: null,
      authUserName: '',
      authUserEmail: '',
      authStudentId: '',
      authAvatarUrl: '',

      setAuthUser: ({ userId, name, email, studentId, avatarUrl }) =>
        set({
          authUserId: userId,
          authUserName: name,
          authUserEmail: email,
          authStudentId: studentId,
          authAvatarUrl: avatarUrl,
        }),

      clearAuthUser: () =>
        set({
          authUserId: null,
          authUserName: '',
          authUserEmail: '',
          authStudentId: '',
          authAvatarUrl: '',
          bookings: [],
          allBookings: [],
        }),

      // Rooms - load from Supabase with local fallback
      rooms: MOCK_ROOMS,

      loadRooms: async () => {
        try {
          const supabaseRooms = await fetchRooms();
          if (supabaseRooms.length > 0) {
            set({ rooms: supabaseRooms });
          }
          // If no rooms in DB, keep MOCK_ROOMS as fallback
        } catch (err) {
          console.warn('Failed to load rooms from Supabase, using local data');
        }
      },

      // Bookings
      bookings: [],
      allBookings: [],

      loadUserBookings: async () => {
        const { authUserId } = get();
        if (!authUserId) return;
        try {
          const userBookings = await fetchUserBookings(authUserId);
          set({ bookings: userBookings });
        } catch (err) {
          console.warn('Failed to load user bookings:', err);
        }
      },

      loadAllBookings: async () => {
        try {
          const allBks = await fetchAllBookings();
          set({ allBookings: allBks });
        } catch (err) {
          console.warn('Failed to load all bookings:', err);
        }
      },

      isSlotBooked: (roomId: string, date: string, slotId: string) => {
        const { allBookings, bookings } = get();
        // Check both all bookings (from DB) and local bookings
        const combined = [...allBookings, ...bookings];
        const seen = new Set<string>();
        return combined.some((b) => {
          const key = `${b.roomId}-${b.date}-${b.slotId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return (
            b.roomId === roomId &&
            b.date === date &&
            b.slotId === slotId &&
            b.status !== 'cancelled'
          );
        });
      },

      createBooking: async ({ roomId, date, slotId }) => {
        const state = get();
        const room = state.rooms.find((r) => r.id === roomId);
        const slot = TIME_SLOTS.find((s) => s.id === slotId);

        if (!room) {
          return { success: false, error: 'Study room not found.' };
        }
        if (!slot) {
          return { success: false, error: 'Selected time slot is invalid.' };
        }

        // Check local conflict first
        const hasLocalConflict = state.isSlotBooked(roomId, date, slotId);
        if (hasLocalConflict) {
          return {
            success: false,
            error: `This slot (${slot.label}) for ${room.name} has already been reserved. Please pick another slot.`,
          };
        }

        // Double-check with Supabase
        const isAvailable = await checkSlotAvailability(roomId, date, slotId);
        if (!isAvailable) {
          // Refresh all bookings to get latest state
          await get().loadAllBookings();
          return {
            success: false,
            error: `This slot (${slot.label}) for ${room.name} was just reserved by another student. Please pick another slot.`,
          };
        }

        const qrPayload = JSON.stringify({
          roomId: room.id,
          roomName: room.name,
          building: room.building,
          date,
          slot: slot.label,
          studentId: state.authStudentId,
          studentName: state.authUserName,
          timestamp: new Date().toISOString(),
        });

        // Insert into Supabase
        const { data: newRow, error: insertError } = await createBookingInSupabase({
          userId: state.authUserId || '',
          roomId: room.id,
          roomName: room.name,
          building: room.building,
          floor: room.floor,
          date,
          slotId: slot.id,
          slotLabel: slot.label,
          studentId: state.authStudentId,
          studentName: state.authUserName,
          studentEmail: state.authUserEmail,
          qrCodePayload: qrPayload,
        });

        if (insertError) {
          console.error('Supabase booking insert error:', insertError);
          return {
            success: false,
            error: insertError.message || 'Failed to save booking to database.',
          };
        }

        const newBooking: Booking = {
          id: newRow.id,
          roomId: room.id,
          roomName: room.name,
          building: room.building,
          floor: room.floor,
          date,
          slotId: slot.id,
          slotLabel: slot.label,
          studentId: state.authStudentId,
          studentName: state.authUserName,
          studentEmail: state.authUserEmail,
          status: 'confirmed',
          createdAt: newRow.created_at || new Date().toISOString(),
          qrCodePayload: qrPayload,
        };

        // Schedule local push notification
        const notificationId = await scheduleBookingReminder(newBooking, slot.startTime);
        if (notificationId) {
          newBooking.notificationId = notificationId;
        }

        set((s) => ({
          bookings: [newBooking, ...s.bookings],
          allBookings: [newBooking, ...s.allBookings],
        }));

        return { success: true, booking: newBooking };
      },

      cancelBooking: async (bookingId: string) => {
        const { bookings } = get();
        const bookingToCancel = bookings.find((b) => b.id === bookingId);

        // Cancel notification
        if (bookingToCancel?.notificationId) {
          await cancelBookingReminder(bookingToCancel.notificationId);
        }

        // Update in Supabase
        const { error } = await updateBookingStatus(bookingId, 'cancelled');
        if (error) {
          console.error('Cancel booking error:', error);
        }

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'cancelled' } : b
          ),
          allBookings: state.allBookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'cancelled' } : b
          ),
        }));
      },

      checkInBooking: async (bookingId: string) => {
        // Update in Supabase
        const { error } = await updateBookingStatus(bookingId, 'checked-in');
        if (error) {
          console.error('Check-in booking error:', error);
        }

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'checked-in' } : b
          ),
          allBookings: state.allBookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'checked-in' } : b
          ),
        }));
      },

      // Filter management
      filters: DEFAULT_FILTERS,

      setSearchQuery: (query: string) =>
        set((state) => ({
          filters: { ...state.filters, searchQuery: query },
        })),

      setBuildingFilter: (building: BuildingCode | 'ALL') =>
        set((state) => ({
          filters: { ...state.filters, building },
        })),

      setMinCapacityFilter: (capacity: number) =>
        set((state) => ({
          filters: { ...state.filters, minCapacity: capacity },
        })),

      toggleEquipmentFilter: (item: EquipmentType) =>
        set((state) => {
          const current = state.filters.equipment;
          const exists = current.includes(item);
          const updated = exists
            ? current.filter((eq) => eq !== item)
            : [...current, item];
          return {
            filters: { ...state.filters, equipment: updated },
          };
        }),

      resetFilters: () =>
        set(() => ({
          filters: DEFAULT_FILTERS,
        })),
    }),
    {
      name: 'vku-booking-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bookings: state.bookings,
        authUserId: state.authUserId,
        authUserName: state.authUserName,
        authUserEmail: state.authUserEmail,
        authStudentId: state.authStudentId,
        authAvatarUrl: state.authAvatarUrl,
      }),
    }
  )
);
