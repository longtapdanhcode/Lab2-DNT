import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, isLoading } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="school" size={48} color="#0052CC" />
          </View>
          <Text style={styles.universityName}>VIETNAM - KOREA UNIVERSITY</Text>
          <Text style={styles.appTitle}>Study Room Booking</Text>
          <Text style={styles.appSubtitle}>
            Reserve study rooms & labs across Buildings A, B, C, and V with real-time conflict prevention.
          </Text>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="calendar" size={18} color="#0052CC" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Smart Booking</Text>
              <Text style={styles.featureDesc}>
                Real-time slot availability with conflict prevention
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="qr-code" size={18} color="#059669" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Digital QR Pass</Text>
              <Text style={styles.featureDesc}>
                Quick check-in at turnstile with your booking QR code
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="notifications" size={18} color="#D97706" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Push Reminders</Text>
              <Text style={styles.featureDesc}>
                Get notified 15 minutes before your slot starts
              </Text>
            </View>
          </View>
        </View>

        {/* Sign In Button */}
        <View style={styles.authSection}>
          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.googleButtonDisabled]}
            onPress={signInWithGoogle}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By signing in, you agree to VKU's terms of service and privacy policy.
            Use your institutional email for the best experience.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by Supabase • Expo SDK 57
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  universityName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052CC',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  featuresContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  authSection: {
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0052CC',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#0052CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
    maxWidth: 320,
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});
