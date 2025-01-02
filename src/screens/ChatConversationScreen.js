import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { CometChat } from '@cometchat-pro/react-native-chat';
import { useAuth } from '../contexts/AuthContext';
import { isSupporterFor } from '../services/cometChat';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ChatConversationScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const [isSupporter, setIsSupporter] = useState(false);
  const [userType, setUserType] = useState(null);
  const { uid, name, conversationType } = route.params;

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      // Check if current user is a supporter for this chat
      const supporterAccess = await isSupporterFor(
        user.uid.toLowerCase(),
        uid.toLowerCase()
      );
      setIsSupporter(supporterAccess);

      // Get user type from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid.toLowerCase()));
      if (userDoc.exists()) {
        setUserType(userDoc.data().userType);
      }
    } catch (error) {
      console.error('Error checking user access:', error);
    }
  };

  const handleSendMessage = (message) => {
    if (isSupporter) {
      Alert.alert('Read Only', 'As a supporter, you can only view messages');
      return;
    }
    // Regular message sending logic
    // ...
  };

  const handleSendMedia = (mediaFile) => {
    if (isSupporter) {
      Alert.alert('Read Only', 'As a supporter, you can only view messages');
      return;
    }
    // Regular media sending logic
    // ...
  };

  return (
    <View style={styles.container}>
      {isSupporter && (
        <View style={styles.supporterBanner}>
          <Text style={styles.supporterBannerText}>
            Supporter View - Read Only
          </Text>
        </View>
      )}
      
      <CometChatMessages
        {...route.params}
        hideMessageComposer={isSupporter}
        style={styles.messageList}
      />
      
      {!isSupporter && (
        <View style={styles.composerContainer}>
          <MessageComposer
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  supporterBanner: {
    backgroundColor: '#24269B',
    padding: 8,
    alignItems: 'center',
  },
  supporterBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  messageList: {
    flex: 1,
  },
  composerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 10,
  },
});

export default ChatConversationScreen; 