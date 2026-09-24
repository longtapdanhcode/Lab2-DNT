import { supabase } from '../lib/supabase';
import { Booking, Room } from '../types';

// ============================================================
// ROOMS - Fetch rooms from Supabase (with local fallback)
// ============================================================

export async function fetchRooms(): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('building', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error fetching rooms from Supabase:', error.message);
      return [];
    }

    // Map Supabase row to our Room type
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      building: row.building,
      floor: row.floor,
      capacity: row.capacity,
      equipment: row.equipment || [],
      imageUrl: row.image_url,
      description: row.description,
      isLab: row.is_lab || false,
      labSpec: row.lab_spec || undefined,
      openingHours: row.opening_hours,
    }));
  } catch (err) {
    console.error('fetchRooms exception:', err);
    return [];
  }
}

// ============================================================
// BOOKINGS - CRUD operations on Supabase
// ============================================================

export async function fetchUserBookings(userId: string): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching bookings:', error.message);
      return [];
    }

    return (data || []).map(mapBookingRow);
  } catch (err) {
    console.error('fetchUserBookings exception:', err);
    return [];
  }
}

export async function fetchAllBookings(): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['confirmed', 'checked-in'])
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching all bookings:', error.message);
      return [];
    }

    return (data || []).map(mapBookingRow);
  } catch (err) {
    console.error('fetchAllBookings exception:', err);
    return [];
  }
}

export async function createBookingInSupabase(params: {
  userId: string;
  roomId: string;
  roomName: string;
  building: string;
  floor: number;
  date: string;
  slotId: string;
  slotLabel: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  qrCodePayload: string;
}): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: params.userId,
      room_id: params.roomId,
      room_name: params.roomName,
      building: params.building,
      floor: params.floor,
      date: params.date,
      slot_id: params.slotId,
      slot_label: params.slotLabel,
      student_id: params.studentId,
      student_name: params.studentName,
      student_email: params.studentEmail,
      status: 'confirmed',
      qr_code_payload: params.qrCodePayload,
    })
    .select()
    .single();

  return { data, error };
}

export async function updateBookingStatus(
  bookingId: string,
  status: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);

  return { error };
}

export async function checkSlotAvailability(
  roomId: string,
  date: string,
  slotId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('date', date)
      .eq('slot_id', slotId)
      .in('status', ['confirmed', 'checked-in'])
      .limit(1);

    if (error) {
      console.warn('Slot availability check error:', error.message);
      return false; // Assume unavailable on error for safety
    }

    // If no rows returned, slot is available
    return !data || data.length === 0;
  } catch (err) {
    console.error('checkSlotAvailability exception:', err);
    return false;
  }
}

// ============================================================
// PROFILE - Update user profile
// ============================================================

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    student_id?: string;
    faculty?: string;
    phone?: string;
    avatar_url?: string;
  }
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error };
}

// ============================================================
// Helper: Map Supabase booking row to our Booking type
// ============================================================

function mapBookingRow(row: any): Booking {
  return {
    id: row.id,
    roomId: row.room_id,
    roomName: row.room_name,
    building: row.building,
    floor: row.floor,
    date: row.date,
    slotId: row.slot_id,
    slotLabel: row.slot_label,
    studentId: row.student_id,
    studentName: row.student_name,
    studentEmail: row.student_email,
    status: row.status,
    createdAt: row.created_at,
    qrCodePayload: row.qr_code_payload,
    notificationId: row.notification_id,
  };
}
