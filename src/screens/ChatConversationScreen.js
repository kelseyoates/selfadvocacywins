import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  Alert,
  Keyboard,
  Dimensions
} from 'react-native';
import { CometChat } from '@cometchat-pro/react-native-chat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';

const containsProfanity = (text) => {
  const profanityList = [
    'shit', 'fuck', 'damn', 'ass', 'bitch', 'crap', 'piss', 'dick', 'pussy', 'cock',
    'bastard', 'hell', 'whore', 'slut', 'asshole', 'cunt', 'fucker', 'fucking',
    // Add more words as needed
  ];

  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => 
    profanityList.some(profanity => 
      word.includes(profanity) || 
      word.replace(/[^a-zA-Z]/g, '').includes(profanity)
    )
  );
};

const ChatConversationScreen = ({ route, navigation }) => {
  const { uid, name } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const { height: screenHeight } = Dimensions.get('window');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      console.log("Fetching messages for:", uid);
      const messagesRequest = new CometChat.MessagesRequestBuilder()
        .setUID(uid)
        .setLimit(50)
        .build();

      const fetchedMessages = await messagesRequest.fetchPrevious();
      console.log("Fetched messages count:", fetchedMessages.length);
      
      // Filter out action and system messages
      const validMessages = fetchedMessages.filter(msg => 
        msg.category !== 'action' && 
        msg.category !== 'system' && 
        msg.senderId !== 'app_system'
      );
      
      console.log("Valid messages count:", validMessages.length);
      setMessages(validMessages);
      
      // Scroll to bottom after fetching
      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      });
    } catch (error) {
      console.log("Error fetching messages:", error);
    }
  }, [uid]);

  // Get current user and fetch messages on mount
  useEffect(() => {
    console.log("Component mounted");
    
    const initializeChat = async () => {
      try {
        const user = await CometChat.getLoggedinUser();
        console.log("Current user:", user?.uid);
        setCurrentUser(user);
        await fetchMessages();
      } catch (error) {
        console.log("Initialization error:", error);
      }
    };

    initializeChat();

    // Set up message listener
    const messageListener = new CometChat.MessageListener({
      onTextMessageReceived: message => {
        console.log("New message received:", message);
        if (message.sender.uid === uid || message.receiver.uid === uid) {
          setMessages(prev => [...prev, message]);
        }
      }
    });

    CometChat.addMessageListener(
      'CHAT_SCREEN_MESSAGE_LISTENER',
      messageListener
    );

    return () => {
      CometChat.removeMessageListener('CHAT_SCREEN_MESSAGE_LISTENER');
    };
  }, [uid, fetchMessages]);

  // Initialize message moderation
  useEffect(() => {
    // Set up message listener with moderation
    const listenerID = "MODERATION_LISTENER_" + Date.now();
    
    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onTextMessageReceived: message => {
          console.log("Message received:", message);
        },
        onMessageDeleted: message => {
          console.log("Message deleted:", message);
          // Remove deleted message from state
          setMessages(prev => prev.filter(m => m.id !== message.id));
        }
      })
    );

    return () => {
      CometChat.removeMessageListener(listenerID);
    };
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;

    const messageText = inputText.trim();

    // Check for profanity first
    if (containsProfanity(messageText)) {
      Alert.alert(
        'Message Blocked',
        'Your message contains inappropriate language and cannot be sent.'
      );
      setInputText('');
      return;
    }

    setIsLoading(true);

    try {
      const textMessage = new CometChat.TextMessage(
        uid,
        messageText,
        CometChat.RECEIVER_TYPE.USER
      );

      // Add both types of moderation metadata
      textMessage.setMetadata({
        moderator: {
          enable: true,
          profanity: {
            severity: "high",
            filterType: "block"
          }
        },
        "@injected": {
          extensions: {
            profanity: {
              enabled: true,
              filterType: "block",
              severity: "high"
            }
          }
        }
      });

      console.log("Sending message with moderation:", {
        text: messageText,
        metadata: textMessage.metadata
      });

      // Additional client-side check before sending
      if (containsProfanity(messageText)) {
        throw new Error("PROFANITY_DETECTED");
      }

      const sentMessage = await CometChat.sendMessage(textMessage);
      console.log("Message response:", sentMessage);

      // Check server response for moderation
      if (sentMessage.metadata?.moderator?.blocked || 
          sentMessage.metadata?.["@injected"]?.extensions?.profanity?.blocked) {
        Alert.alert('Message Blocked', 'This message contains inappropriate content.');
        setInputText(messageText);
        return;
      }

      setInputText('');
      setMessages(prev => {
        const newMessages = [...prev, sentMessage];
        requestAnimationFrame(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        });
        return newMessages;
      });
    } catch (error) {
      console.log("Message error:", error);
      
      if (error.message === "PROFANITY_DETECTED" || 
          error.code === "ERR_CONTENT_MODERATED" || 
          error.code === "MESSAGE_MODERATED") {
        Alert.alert(
          'Message Blocked', 
          'This message contains inappropriate content and cannot be sent.'
        );
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
      setInputText(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMediaPicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions to attach media.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled) {
        setIsUploading(true);
        const asset = result.assets[0];
        console.log("Selected media:", asset);

        try {
          const file = {
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
            size: asset.fileSize
          };

          const mediaMessage = new CometChat.MediaMessage(
            uid,
            file,
            CometChat.MESSAGE_TYPE.IMAGE,
            CometChat.RECEIVER_TYPE.USER
          );

          mediaMessage.setMetadata({
            "extensions": {
              "moderation": {
                "enabled": true,
                "image": {
                  "enabled": true,
                  "action": "block",
                  "severity": "high"
                }
              }
            }
          });

          console.log("Attempting to send media message:", {
            file: file,
            metadata: mediaMessage.metadata
          });

          const sentMessage = await CometChat.sendMediaMessage(mediaMessage);
          console.log("Media message response:", sentMessage);

          // Check moderation response
          if (sentMessage.metadata?.moderation?.blocked || 
              sentMessage.metadata?.["@injected"]?.extensions?.moderation?.blocked) {
            throw new Error("INAPPROPRIATE_CONTENT");
          }

          setMessages(prev => {
            const newMessages = [...prev, sentMessage];
            requestAnimationFrame(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            });
            return newMessages;
          });
        } catch (error) {
          console.log("Media send error details:", error);
          
          // More specific error handling
          if (error.message === "INAPPROPRIATE_CONTENT" ||
              error.code === "ERR_CONTENT_MODERATED" ||
              error.code === "MESSAGE_MODERATED" ||
              error.message?.toLowerCase().includes('moderation') ||
              error.message?.toLowerCase().includes('inappropriate')) {
            Alert.alert(
              'Inappropriate Content',
              'This image appears to contain inappropriate or explicit content and cannot be sent. Please choose a different image that follows community guidelines.'
            );
          } else if (error.code === "ERR_FILE_SIZE_TOO_LARGE") {
            Alert.alert(
              'File Too Large',
              'The image file is too large. Please choose a smaller image or compress this one.'
            );
          } else if (error.code === "ERR_INVALID_MEDIA_MESSAGE") {
            Alert.alert(
              'Invalid Image',
              'The selected image could not be processed. Please try a different image.'
            );
          } else {
            Alert.alert(
              'Upload Error',
              'There was a problem sending your image. Please try again.'
            );
          }
        }
      }
    } catch (error) {
      console.log("Media picker error:", error);
      Alert.alert(
        'Error',
        'Failed to process the image. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    // Skip action and system messages
    if (item.category === 'action' || 
        item.senderId === 'app_system' || 
        item.category === 'system') {
      return null;
    }

    const isMyMessage = item.sender?.uid === currentUser?.uid;
    
    console.log("Rendering valid message:", {
      type: item.type,
      category: item.category,
      senderId: item.sender?.uid,
      url: item.type === 'image' ? item.data?.url : undefined
    });
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        {!isMyMessage && (
          <Text style={styles.senderName}>
            {item.sender?.name || 'Other User'}
          </Text>
        )}
        
        {item.type === 'text' ? (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
        ) : item.type === 'image' ? (
          <View>
            <Image
              source={{ 
                uri: item.data?.url,
                cache: 'force-cache'
              }}
              style={styles.messageImage}
              resizeMode="contain"
              onError={(error) => console.log("Image load error:", error)}
            />
          </View>
        ) : null}

        <Text style={[
          styles.timestamp,
          isMyMessage ? styles.myTimestamp : styles.theirTimestamp
        ]}>
          {new Date(item.sentAt * 1000).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  console.log("Rendering with messages count:", messages.length);

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { height: screenHeight }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 150 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No messages yet</Text>
        )}
      />
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={handleMediaPicker}
          disabled={isUploading || isLoading}
        >
          <MaterialCommunityIcons 
            name="attachment" 
            size={24} 
            color={isUploading || isLoading ? "#999" : "#24269B"} 
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          editable={!isLoading && !isUploading}
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={isLoading || isUploading || !inputText.trim()}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={24} 
            color={(isLoading || isUploading || !inputText.trim()) ? "#999" : "#24269B"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageList: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerButton: {
    marginRight: 15,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 2,
    maxWidth: '80%',
    borderRadius: 15,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#24269B',
    borderBottomRightRadius: 5,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8E8E8',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#000000',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  attachButton: {
    padding: 10,
    marginRight: 5,
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    padding: 10,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#999',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 2,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
  },
  theirTimestamp: {
    color: '#666',
    alignSelf: 'flex-start',
  },
});

export default ChatConversationScreen; 
