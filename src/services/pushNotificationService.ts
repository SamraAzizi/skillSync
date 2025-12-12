import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export const initializePushNotifications = async (userId: string) => {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only available on native platforms');
    return;
  }

  try {
    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      // Register with APNS/FCM
      await PushNotifications.register();
    } else {
      console.log('Push notification permission denied');
      return;
    }

    // Handle registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      await saveDeviceToken(userId, token.value);
    });

    // Handle registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    // Handle incoming notifications when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      // You can show a local notification or update UI here
    });

    // Handle notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification);
      // Navigate to relevant screen based on notification data
      const data = notification.notification.data;
      if (data?.sessionId) {
        // Navigate to session or schedule page
        window.location.href = '/schedule';
      }
    });

  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

const saveDeviceToken = async (userId: string, token: string) => {
  try {
    const platform = Capacitor.getPlatform();
    
    // Upsert the token (insert or update if exists)
    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        { 
          user_id: userId, 
          token, 
          platform,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'user_id,token',
          ignoreDuplicates: false 
        }
      );

    if (error) {
      console.error('Error saving device token:', error);
    } else {
      console.log('Device token saved successfully');
    }
  } catch (error) {
    console.error('Error saving device token:', error);
  }
};

export const removeDeviceToken = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing device tokens:', error);
    }
  } catch (error) {
    console.error('Error removing device tokens:', error);
  }
};
