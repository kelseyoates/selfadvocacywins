import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  AccessibilityInfo
} from 'react-native';
import { CometChat } from '@cometchat-pro/react-native-chat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { isSupporterFor } from '../services/cometChat';

const ChatMainScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const { user } = useAuth();
  const [supporterAccess, setSupporterAccess] = useState({});
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <TouchableOpacity 
            onPress={() => {
              announceToScreenReader('Starting new chat');
              navigation.navigate('NewChat');
            }}
            style={styles.newChatButton}
            accessible={true}
            accessibilityLabel="Start new chat"
            accessibilityHint="Opens screen to start a new conversation"
            accessibilityRole="button"
          >
            <View style={styles.buttonContent}>
              <Text style={styles.newChatButtonText}>
                New Chat <MaterialCommunityIcons name="message-plus" size={24} color="#24269B" />
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ),
    });

    fetchConversations();

    CometChat.addMessageListener(
      'CHAT_MAIN_SCREEN_MESSAGE_LISTENER',
      new CometChat.MessageListener({
        onTextMessageReceived: message => {
          console.log("Message received:", message);
          fetchConversations();
        }
      })
    );

    return () => {
      CometChat.removeMessageListener('CHAT_MAIN_SCREEN_MESSAGE_LISTENER');
    };
  }, [navigation]);

  useEffect(() => {
    const fetchUserData = async (uid) => {
      try {
        console.log('Fetching user data for UID:', uid);
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Found user data:', userData);
          console.log('Profile picture URL:', userData.profilePicture);
          setUsers(prev => ({
            ...prev,
            [uid]: userData
          }));
        } else {
          console.log('No user document found for UID:', uid);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    console.log('Current chats:', conversations);
    conversations.forEach(chat => {
      if (chat.conversationWith?.uid) {
        fetchUserData(chat.conversationWith.uid);
      } else {
        console.log('Chat missing conversationWith.uid:', chat);
      }
    });
  }, [conversations]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, refreshing conversations');
      fetchConversations();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const checkSupporterAccess = async () => {
      if (conversations) {
        const accessMap = {};
        for (const conv of conversations) {
          if (conv.conversationType === CometChat.RECEIVER_TYPE.USER) {
            accessMap[conv.conversationWith.uid] = await isSupporterFor(
              user.uid.toLowerCase(),
              conv.conversationWith.uid.toLowerCase()
            );
          }
        }
        setSupporterAccess(accessMap);
      }
    };

    checkSupporterAccess();
  }, [conversations]);

  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
    };

    checkScreenReader();
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const announceToScreenReader = (message) => {
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    announceToScreenReader('Loading conversations');
    try {
      const conversationsRequest = new CometChat.ConversationsRequestBuilder()
        .setLimit(30)
        .build();

      const conversationList = await conversationsRequest.fetchNext();
      console.log("Conversations list received:", conversationList);
      setConversations(conversationList);
      announceToScreenReader(`Loaded ${conversationList.length} conversations`);
    } catch (error) {
      announceToScreenReader('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = ({ item }) => {
    const isGroup = item.conversationType === CometChat.RECEIVER_TYPE.GROUP;
    
    // For groups, use guid; for users, use uid
    const conversationId = isGroup 
      ? item.conversationWith?.guid 
      : item.conversationWith?.uid;

    const name = item.conversationWith?.name;
    
    // Handle different message types
    let lastMessage = 'Start chatting';
    if (item.lastMessage) {
      if (item.lastMessage.type === 'text') {
        lastMessage = item.lastMessage.text;
      } else if (item.lastMessage.type === 'image') {
        lastMessage = '📷 Photo';
      } else if (item.lastMessage.type === 'video') {
        lastMessage = '🎥 Video';
      } else if (item.lastMessage.type === 'file') {
        lastMessage = '📎 File';
      }
    }

    const navigateToChat = () => {
      announceToScreenReader(`Opening chat with ${name}`);
      if (isGroup) {
        navigation.navigate('GroupChat', { 
          uid: conversationId,
          name: name
        });
      } else {
        navigation.navigate('ChatConversation', { 
          uid: conversationId,
          name: name,
          profilePicture: users[conversationId]?.profilePicture,
          conversationType: CometChat.RECEIVER_TYPE.USER
        });
      }
    };

    const accessibilityLabel = `Chat with ${name}. ${
      supporterAccess[conversationId] ? 'You are a supporter. ' : ''
    }Last message: ${lastMessage}`;

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={navigateToChat}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to open conversation"
        accessibilityRole="button"
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={isGroup ? 
              require('../../assets/friends-inactive.png') : 
              { uri: users[conversationId]?.profilePicture || 'https://www.gravatar.com/avatar' }
            }
            style={styles.avatar}
            accessible={true}
            accessibilityLabel={`${name}'s profile picture`}
            accessibilityRole="image"
          />
        </View>
        <View 
          style={styles.conversationInfo}
          accessible={true}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.userName}>{name || 'Unknown'}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
        </View>
        
        {supporterAccess[conversationId] && (
          <View 
            style={styles.supporterBadge}
            accessible={true}
            accessibilityElementsHidden={true}
          >
            <Text style={styles.supporterBadgeText}>Supporter</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View 
        style={styles.centerContainer}
        accessible={true}
        accessibilityLabel="Loading conversations"
      >
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Chat conversations"
    >
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.conversationId}
        accessibilityHint="Scroll to view conversations"
        ListEmptyComponent={
          <View 
            style={styles.emptyContainer}
            accessible={true}
            accessibilityLabel="No conversations"
          >
            <Text style={styles.emptyText}>No conversations yet</Text>
            <TouchableOpacity 
              style={styles.startChatButton}
              onPress={() => {
                announceToScreenReader('Starting new chat');
                navigation.navigate('NewChat');
              }}
              accessible={true}
              accessibilityLabel="Start a new chat"
              accessibilityHint="Opens screen to start a new conversation"
              accessibilityRole="button"
            >
              <Text style={styles.startChatButtonText}>Start a new chat</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  headerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    color: '#24269B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  conversationInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },


  buttonContainer: {
    marginRight: 15,
    position: 'relative',
  },

  buttonShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#1a1b6e',
    borderRadius: 25,
  },

  newChatButton: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 25,
    position: 'relative',
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#24269B',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  newChatButtonText: {
    color: '#24269B',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonIcon: {
    width: 90,
    height: 90,
    borderRadius: 15,
  },

  supporterBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#24269B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  supporterBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default ChatMainScreen;