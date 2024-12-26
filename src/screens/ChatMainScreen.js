import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  TextInput,
  ActivityIndicator,
  Modal
} from 'react-native';
import { CometChat } from '@cometchat-pro/react-native-chat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ChatMainScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => setModalVisible(true)}
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="message-plus" size={24} color="#24269B" />
        </TouchableOpacity>
      ),
    });

    fetchConversations();

    // Message listener
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

  const fetchConversations = () => {
    let conversationsRequest = new CometChat.ConversationsRequestBuilder()
      .setLimit(30)
      .build();

    conversationsRequest.fetchNext().then(
      conversationList => {
        console.log("Conversations list received:", conversationList);
        setConversations(conversationList);
        setLoading(false);
      },
      error => {
        console.log("Conversations list fetching failed:", error);
        setLoading(false);
      }
    );
  };

  const searchUsers = async (query) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const usersRequest = new CometChat.UsersRequestBuilder()
      .setLimit(10)
      .setSearchKeyword(query)
      .build();

    try {
      const users = await usersRequest.fetchNext();
      console.log("Users found:", users);
      setSearchResults(users);
    } catch (error) {
      console.log("User search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (user) => {
    setModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    
    navigation.navigate('ChatConversation', {
      uid: user.uid,
      name: user.name,
      conversationType: 'user'
    });
  };

  const renderConversation = ({ item }) => {
    const user = item.conversationType === 'user' ? item.conversationWith : null;
    const lastMessage = item.lastMessage?.text || 'No messages yet';
    
    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => navigation.navigate('ChatConversation', { 
          uid: user?.uid,
          name: user?.name,
          conversationType: item.conversationType
        })}
      >
        <Image 
          source={{ 
            uri: user?.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
          }}
          style={styles.avatar}
        />
        <View style={styles.conversationInfo}>
          <Text style={styles.userName}>{user?.name || 'Unknown User'}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => startConversation(item)}
    >
      <Image 
        source={{ 
          uri: item.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
        }}
        style={styles.searchAvatar}
      />
      <Text style={styles.searchUserName}>{item.name}</Text>
    </TouchableOpacity>
  );

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
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.startChatButtonText}>Start a new chat</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Chat</Text>
              <TouchableOpacity 
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                value={searchQuery}
                onChangeText={searchUsers}
                autoCapitalize="none"
              />
            </View>

            {searching ? (
              <ActivityIndicator style={styles.searchingIndicator} />
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={item => item.uid}
                ListEmptyComponent={
                  searchQuery.length > 0 ? (
                    <Text style={styles.noResultsText}>No users found</Text>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
    marginRight: 15,
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
  startChatButton: {
    backgroundColor: '#24269B',
    padding: 12,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  searchUserName: {
    fontSize: 16,
  },
  searchingIndicator: {
    marginTop: 20,
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});

export default ChatMainScreen;
