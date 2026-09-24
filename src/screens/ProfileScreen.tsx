import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useBookingStore } from '../store/useBookingStore';
import { useAuth } from '../contexts/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { userProfile, updateUserProfile, signOut, user } = useAuth();
  const bookings = useBookingStore((state) => state.bookings);
  const authUserName = useBookingStore((state) => state.authUserName);
  const authUserEmail = useBookingStore((state) => state.authUserEmail);
  const authStudentId = useBookingStore((state) => state.authStudentId);
  const authAvatarUrl = useBookingStore((state) => state.authAvatarUrl);
  const setAuthUser = useBookingStore((state) => state.setAuthUser);

  // Use data from auth profile or store
  const displayName = userProfile?.full_name || authUserName || 'VKU Student';
  const displayEmail = userProfile?.email || authUserEmail || '';
  const displayStudentId = userProfile?.student_id || authStudentId || '';
  const displayFaculty = userProfile?.faculty || '';
  const displayAvatar = userProfile?.avatar_url || authAvatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

  // Edit Profile Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [studentId, setStudentId] = useState(displayStudentId);
  const [faculty, setFaculty] = useState(displayFaculty);
  const [email, setEmail] = useState(displayEmail);
  const [errorMsg, setErrorMsg] = useState('');

  const activeCount = bookings.filter((b) => b.status === 'confirmed').length;
  const checkedInCount = bookings.filter((b) => b.status === 'checked-in').length;
  const totalHours = (activeCount + checkedInCount) * 2; // Each slot is 2 hours

  const handleOpenEditModal = () => {
    setName(displayName);
    setStudentId(displayStudentId);
    setFaculty(displayFaculty);
    setEmail(displayEmail);
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }
    if (!studentId.trim()) {
      setErrorMsg('Student ID cannot be empty.');
      return;
    }
    if (!faculty.trim()) {
      setErrorMsg('Faculty cannot be empty.');
      return;
    }

    try {
      // Update in Supabase
      await updateUserProfile({
        full_name: name.trim(),
        student_id: studentId.trim(),
        faculty: faculty.trim(),
      } as any);

      // Also update the booking store
      if (user) {
        setAuthUser({
          userId: user.id,
          name: name.trim(),
          email: displayEmail,
          studentId: studentId.trim(),
          avatarUrl: displayAvatar,
        });
      }

      setIsEditModalOpen(false);

      if (Platform.OS === 'web') {
        alert('Profile updated successfully! ✅');
      } else {
        Alert.alert('Profile Updated 🎉', 'Your student details have been saved to the cloud.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update profile.');
    }
  };

  const handleSignOut = () => {
    const doSignOut = async () => {
      await signOut();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        doSignOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  const handleTestNotification = async () => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
          setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('VKU Study Room Alert 🔔', {
                body: 'Test Reminder: Your study slot in Lab B.305 starts in 15 minutes! Please have your QR pass ready.',
                icon: '/favicon.png',
              });
            } else {
              alert('🔔 [VKU Study Room Alert]\n\nTest Reminder: Your study slot in Lab B.305 starts in 15 minutes! Please have your QR pass ready.');
            }
          }, 2000);
          alert('Test Notification scheduled! Alert will trigger in 2 seconds.');
        } else {
          alert('🔔 [VKU Study Room Alert]\n\nTest Reminder: Your study slot in Lab B.305 starts in 15 minutes! Please have your QR pass ready.');
        }
      } catch (e: any) {
        alert('Notification test error: ' + (e?.message || e));
      }
      return;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please enable notifications in your device settings to receive 15-minute booking reminders.'
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'VKU Study Room Alert 🔔',
          body: 'Test Reminder: Your study slot in Lab B.305 starts in 15 minutes! Please have your QR pass ready.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 3,
          repeats: false,
        },
      });

      Alert.alert(
        'Test Notification Scheduled! 📲',
        'You will receive a demo VKU check-in reminder in 3 seconds.'
      );
    } catch (err: any) {
      Alert.alert('Notification Test Error', err?.message || 'Could not schedule notification');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>VKU STUDENT ACCOUNT</Text>
        <Text style={styles.headerTitle}>Student Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* VKU Student Digital Card */}
        <View style={styles.idCard}>
          <View style={styles.idCardHeader}>
            <View style={styles.idUnivRow}>
              <Ionicons name="school" size={16} color="#FFFFFF" />
              <Text style={styles.idUnivTitle}>VIETNAM - KOREA UNIVERSITY</Text>
            </View>
            <TouchableOpacity
              style={styles.editCardBtn}
              onPress={handleOpenEditModal}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={13} color="#FFFFFF" />
              <Text style={styles.editCardBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.idCardBody}>
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            <View style={styles.idStudentInfo}>
              <Text style={styles.studentName}>{displayName}</Text>
              {displayStudentId ? (
                <Text style={styles.studentIdCode}>ID: {displayStudentId}</Text>
              ) : (
                <Text style={[styles.studentIdCode, { color: '#F59E0B' }]}>Student ID not set</Text>
              )}
              {displayFaculty ? (
                <Text style={styles.facultyText}>{displayFaculty}</Text>
              ) : null}
              <Text style={styles.emailText}>{displayEmail}</Text>
            </View>
          </View>

          <View style={styles.idCardFooter}>
            <Text style={styles.footerBarcode}>VKU-2026-CAMPUS-PASS</Text>
            <View style={styles.activeDot} />
          </View>
        </View>

        {/* Google Account Badge */}
        <View style={styles.googleBadge}>
          <View style={styles.googleIconBox}>
            <Text style={styles.googleIconText}>G</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.googleBadgeTitle}>Signed in with Google</Text>
            <Text style={styles.googleBadgeEmail}>{displayEmail}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* Quick Edit Action Button */}
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={handleOpenEditModal}
          activeOpacity={0.8}
        >
          <Ionicons name="create" size={16} color="#0052CC" />
          <Text style={styles.editProfileButtonText}>Edit Student Information</Text>
        </TouchableOpacity>

        {/* Booking Statistics */}
        <Text style={styles.sectionTitle}>Booking Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active Passes</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>
              {checkedInCount}
            </Text>
            <Text style={styles.statLabel}>Checked-in</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#0052CC' }]}>
              {totalHours} hrs
            </Text>
            <Text style={styles.statLabel}>Study Hours</Text>
          </View>
        </View>

        {/* Quick Tools & Notification Demo */}
        <Text style={styles.sectionTitle}>System Settings & Testing</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTestNotification}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrapper, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="notifications" size={18} color="#0052CC" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuItemTitle}>Test 15-Min Push Notification</Text>
              <Text style={styles.menuItemSubtitle}>
                Triggers a simulated VKU check-in alert in 2-3s
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={[styles.menuIconWrapper, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuItemTitle}>Conflict Prevention Engine</Text>
              <Text style={styles.menuItemSubtitle}>
                Active & synced with Supabase Database
              </Text>
            </View>
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={[styles.menuIconWrapper, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="cloud-done" size={18} color="#059669" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuItemTitle}>Cloud Database</Text>
              <Text style={styles.menuItemSubtitle}>
                Bookings & profile stored in Supabase
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* About VKU Mini Project */}
        <View style={styles.aboutBox}>
          <Text style={styles.aboutTitle}>VKU Study Room Booking App</Text>
          <Text style={styles.aboutDesc}>
            Designed for Vietnam-Korea University students to streamline room reservations,
            prevent door collisions, and facilitate quick turnstile check-in across Buildings A, B, C, and V.
            Now with Google Sign-In and cloud database powered by Supabase.
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubtitle}>VKU STUDENT IDENTITY</Text>
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Validation Alert */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. Lê Bảo Long"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Student ID Code</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={studentId}
                    onChangeText={(val) => {
                      setStudentId(val);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. 21IT128"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Faculty / Department</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={faculty}
                    onChangeText={(val) => {
                      setFaculty(val);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. Software Engineering & Information Technology"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email (from Google account)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: '#94A3B8' }]}
                    value={email}
                    editable={false}
                    placeholder="Linked to Google account"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <Text style={styles.formHint}>Email is managed by your Google account</Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save to Cloud</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0052CC',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  idCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  idCardHeader: {
    backgroundColor: '#0052CC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idUnivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idUnivTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  editCardBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  idCardBody: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  idStudentInfo: {
    flex: 1,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  studentIdCode: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  facultyText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  emailText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  idCardFooter: {
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBarcode: {
    color: '#475569',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  googleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleBadgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  googleBadgeEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginBottom: 20,
  },
  editProfileButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0052CC',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrapper: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  aboutBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aboutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  aboutDesc: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
    padding: Platform.OS === 'web' ? 16 : 0,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    maxWidth: 520,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0052CC',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    gap: 8,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalBody: {
    padding: 20,
    maxHeight: 380,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0052CC',
    gap: 6,
    shadowColor: '#0052CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
