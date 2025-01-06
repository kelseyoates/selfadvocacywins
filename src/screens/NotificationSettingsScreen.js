import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CometChat } from '@cometchat-pro/react-native-chat';

const NotificationSettingsScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    privateChats: false,
    publicChats: false
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'notifications'));
      if (userDoc.exists()) {
        setSettings(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSetting = async (type, value) => {
    try {
      setSettings(prev => ({ ...prev, [type]: value }));
      
      // Update Firestore
      await setDoc(doc(db, 'users', user.uid, 'settings', 'notifications'), {
        ...settings,
        [type]: value
      }, { merge: true });

      // Update CometChat push notification settings
      if (type === 'privateChats') {
        await CometChat.registerTokenForPushNotification(
          value ? 'all' : 'none',
          CometChat.RECEIVER_TYPE.USER
        );
      } else if (type === 'publicChats') {
        await CometChat.registerTokenForPushNotification(
          value ? 'all' : 'none',
          CometChat.RECEIVER_TYPE.GROUP
        );
      }

    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      // Revert the switch if there was an error
      setSettings(prev => ({ ...prev, [type]: !value }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chat Notifications</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Private Chat Messages</Text>
          <Switch
            value={settings.privateChats}
            onValueChange={(value) => updateNotificationSetting('privateChats', value)}
            trackColor={{ false: '#767577', true: '#24269B' }}
            thumbColor={settings.privateChats ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Community Messages</Text>
          <Switch
            value={settings.publicChats}
            onValueChange={(value) => updateNotificationSetting('publicChats', value)}
            trackColor={{ false: '#767577', true: '#24269B' }}
            thumbColor={settings.publicChats ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <Text style={styles.disclaimer}>
        You can customize which notifications you receive. Changes will apply to all your devices.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  disclaimer: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default NotificationSettingsScreen; 