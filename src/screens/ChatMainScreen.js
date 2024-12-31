import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
} from 'react-native';
import { CometChat } from '@cometchat-pro/react-native-chat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const ChatMainScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <TouchableOpacity 
            onPress={() => navigation.navigate('NewChat')}
            style={styles.newChatButton}
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

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const conversationsRequest = new CometChat.ConversationsRequestBuilder()
        .setLimit(30)
        .build();

      const conversationList = await conversationsRequest.fetchNext();
      console.log("Conversations list received:", conversationList);
      setConversations(conversationList);
    } catch (error) {
      console.log("Conversations list fetching failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = ({ item }) => {
    const otherUserUid = item.conversationWith?.uid;
    const profileUrl = users[otherUserUid]?.profilePicture;
    
    const navigateToChat = () => {
      if (item.conversationType === CometChat.RECEIVER_TYPE.GROUP) {
        navigation.navigate('GroupChat', { 
          uid: item.conversationWith.guid,
          name: item.conversationWith.name
        });
      } else {
        navigation.navigate('ChatConversation', { 
          uid: otherUserUid,
          name: item.conversationWith?.name,
          profilePicture: profileUrl,
          conversationType: item.conversationType
        });
      }
    };

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={navigateToChat}
      >
        <Image 
          source={{ 
            uri: profileUrl || 'https://www.gravatar.com/avatar'
          }}
          style={styles.avatar}
        />
        <View style={styles.conversationInfo}>
          <Text style={styles.userName}>
            {item.conversationType === CometChat.RECEIVER_TYPE.GROUP ? 
              `👥 ${item.conversationWith?.name}` : 
              item.conversationWith?.name || 'Unknown User'}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage?.text || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.conversationId}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <TouchableOpacity 
              style={styles.startChatButton}
              onPress={() => navigation.navigate('NewChat')}
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
  }

});

export default ChatMainScreen;