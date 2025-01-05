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
  Dimensions,
  ScrollView,
  AccessibilityInfo
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
  const [reportedUsers, setReportedUsers] = useState(new Set());
  const [smartReplies, setSmartReplies] = useState([]);
  const [isLoadingSmartReplies, setIsLoadingSmartReplies] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

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

  // Add screen reader detection
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

  // Add screen reader announcement helper
  const announceToScreenReader = (message) => {
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;

    setIsLoading(true);
    announceToScreenReader('Sending message');

    try {
      const messageText = inputText.trim();
      const textMessage = new CometChat.TextMessage(
        uid,
        messageText,
        CometChat.RECEIVER_TYPE.USER
      );

      textMessage.setMetadata({
        "extensions": {
          "data-masking": {
            "enabled": true,
            "maskingType": "text",
            "maskWith": "***",
            "patterns": {
              "email": true,
              "phone": true,
              "credit-card": true,
              "ssn": true
            }
          },
          "moderation": {
            "enabled": true,
            "profanity": {
              "enabled": true,
              "action": "mask",
              "severity": "high"
            }
          }
        }
      });

      console.log("Attempting to send message:", {
        text: messageText,
        metadata: textMessage.metadata
      });

      const sentMessage = await CometChat.sendMessage(textMessage);
      console.log("Server response:", sentMessage);

      // Only show alert if actually masked
      if (sentMessage.text !== messageText && 
          (sentMessage.text.includes('***') || 
           sentMessage.metadata?.["@injected"]?.extensions?.["data-masking"]?.masked)) {
        Alert.alert(
          'Cannot Send Personal Information',
          'Your message contains personal information (like phone numbers or email addresses) which cannot be shared.'
        );
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
      announceToScreenReader('Message sent successfully');
    } catch (error) {
      console.log("Detailed error information:", {
        code: error.code,
        message: error.message,
        details: error.details || {},
        metadata: error.metadata || {}
      });
      
      if (error.code === "ERR_DATA_MASKING" || 
          error.message?.includes("data-masking") ||
          error.message?.includes("personal information")) {
        Alert.alert(
          'Cannot Send Personal Information',
          'Your message contains personal information (like phone numbers or email addresses) which cannot be shared.'
        );
      } else if (error.code === "ERR_PROFANITY_FOUND" || 
                 error.message?.includes("profanity")) {
        Alert.alert(
          'Inappropriate Language',
          'Your message contains inappropriate language and cannot be sent.'
        );
      } else if (error.code === "ERR_CONNECTION_ERROR") {
        Alert.alert(
          'Connection Error',
          'Please check your internet connection and try again.'
        );
      } else {
        // Create a new message object for unknown errors
        const newMessage = {
          id: Date.now().toString(),
          text: messageText,
          sender: { 
            uid: currentUser.uid 
          },
          category: "message",
          type: "text",
          receiverId: uid,
          sentAt: Date.now()
        };

        setMessages(prev => {
          const newMessages = [...prev, newMessage];
          requestAnimationFrame(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          });
          return newMessages;
        });
        setInputText('');
      }
      announceToScreenReader('Failed to send message');
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
          announceToScreenReader('Image sent successfully');
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
      announceToScreenReader('Failed to send image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReportUser = async (userId, messageId, reason) => {
    try {
      const reportData = {
        reportedUid: userId,
        messageId: messageId,
        reason: reason
      };

      await CometChat.reportUser(reportData);
      
      // Add user to reported set to prevent multiple reports
      setReportedUsers(prev => new Set(prev).add(userId));
      
      Alert.alert(
        'User Reported',
        'Thank you for helping keep our community safe. This user has been reported for review.'
      );
    } catch (error) {
      console.log("Report user error:", error);
      Alert.alert(
        'Report Failed',
        'Unable to submit report. Please try again later.'
      );
    }
  };

  const handleMessageLongPress = (message) => {
    // Don't show report option for own messages
    if (message.sender.uid === currentUser.uid) return;

    // Don't show report option if user already reported
    if (reportedUsers.has(message.sender.uid)) {
      Alert.alert('Already Reported', 'You have already reported this user.');
      return;
    }

    Alert.alert(
      'Report Message',
      'Would you like to report this message for inappropriate content?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Report Reason',
              'Why are you reporting this message?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Inappropriate Content',
                  onPress: () => handleReportUser(message.sender.uid, message.id, 'inappropriate_content')
                },
                {
                  text: 'Personal Information',
                  onPress: () => handleReportUser(message.sender.uid, message.id, 'personal_information')
                },
                {
                  text: 'Harassment',
                  onPress: () => handleReportUser(message.sender.uid, message.id, 'harassment')
                }
              ]
            );
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }) => {
    // Skip action and system messages
    if (item.category === 'action' || 
        item.senderId === 'app_system' || 
        item.category === 'system') {
      return null;
    }

    const isMyMessage = item.sender?.uid === currentUser?.uid;
    const senderName = isMyMessage ? 'You' : (item.sender?.name || 'Other User');
    const timeString = new Date(item.sentAt * 1000).toLocaleString();
    
    return (
      <View 
        style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}
        accessible={true}
        accessibilityLabel={`Message from ${senderName} at ${timeString}: ${
          item.type === 'text' ? item.text : 'Image message'
        }`}
      >
        {!isMyMessage && (
          <Text 
            style={styles.senderName}
            accessibilityLabel={`Sent by ${senderName}`}
          >
            {senderName}
          </Text>
        )}
        
        {item.type === 'text' ? (
          <Text 
            style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}
          >
            {item.text}
          </Text>
        ) : item.type === 'image' ? (
          <Image
            source={{ uri: item.data?.url, cache: 'force-cache' }}
            style={styles.messageImage}
            resizeMode="contain"
            accessible={true}
            accessibilityLabel={`Image sent by ${senderName}`}
          />
        ) : null}

        <Text 
          style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.theirTimestamp]}
          accessibilityLabel={`Sent at ${timeString}`}
        >
          {timeString}
        </Text>
      </View>
    );
  };

  console.log("Rendering with messages count:", messages.length);

  useEffect(() => {
    const setNavigationHeader = async () => {
      try {
        // First get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', uid));
        const userData = userDoc.data();
        
        // Then get CometChat user data
        const cometChatUser = await CometChat.getUser(uid);
        
        navigation.setOptions({
          headerTitle: () => (
            <TouchableOpacity 
              style={styles.headerContainer}
              onPress={() => {
                console.log('Header tapped');
                Alert.alert('Navigating to profile...');
                navigation.navigate('OtherUserProfile', {
                  screen: 'OtherUserProfile',
                  params: {
                    userId: uid,
                    username: userData?.name || cometChatUser.name || name || 'Chat'
                  }
                });
              }}
              activeOpacity={0.6}
            >
              <Image 
                source={{ 
                  uri: userData?.profilePicture || 
                       'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' 
                }} 
                style={styles.headerAvatar}
              />
              <Text style={styles.headerTitle}>
                {userData?.name || cometChatUser.name || name || 'Chat'}
              </Text>
            </TouchableOpacity>
          ),
          headerTitleAlign: 'left',
        });
      } catch (error) {
        console.log("Error fetching user details:", error);
        // Fallback to using name from route params
        navigation.setOptions({
          headerTitle: name || 'Chat',
        });
      }
    };

    setNavigationHeader();
  }, [navigation, uid, name]);

  // Add this function to handle smart replies
  const getSmartReplies = async (message) => {
    try {
      setIsLoadingSmartReplies(true);
      if (!message || !message.text) return;

      const smartReplyObject = new CometChat.SmartRepliesBuilder()
        .setMessage(message)
        .build();

      const replies = await smartReplyObject.fetchReplies();
      console.log('Smart replies:', replies);
      setSmartReplies(replies || []);
    } catch (error) {
      console.error('Error getting smart replies:', error);
      setSmartReplies([]);
    } finally {
      setIsLoadingSmartReplies(false);
    }
  };

  // Update your message listener to get smart replies for the last message
  useEffect(() => {
    const listenerID = "CHAT_SCREEN_" + Date.now();
    
    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onTextMessageReceived: message => {
          console.log("Message received:", message);
          setMessages(prev => [...prev, message]);
          // Get smart replies for the received message
          getSmartReplies(message);
          
          // Scroll to bottom
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          });
        }
      })
    );

    return () => {
      CometChat.removeMessageListener(listenerID);
    };
  }, []);

  // Add this function to handle smart reply selection
  const handleSmartReplyPress = async (reply) => {
    try {
      setInputText(reply);
      setSmartReplies([]); // Clear smart replies
      await sendMessage(reply);
    } catch (error) {
      console.error('Error sending smart reply:', error);
    }
  };

  // Add the smart replies component to your render
  const renderSmartReplies = () => {
    if (smartReplies.length === 0) return null;

    return (
      <View 
        style={styles.smartRepliesContainer}
        accessible={true}
        accessibilityLabel="Quick reply suggestions"
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.smartRepliesContent}
        >
          {smartReplies.map((reply, index) => (
            <TouchableOpacity
              key={index}
              style={styles.smartReplyButton}
              onPress={() => handleSmartReplyPress(reply)}
              accessible={true}
              accessibilityLabel={`Quick reply: ${reply}`}
              accessibilityHint="Double tap to send this reply"
              accessibilityRole="button"
            >
              <Text style={styles.smartReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { height: screenHeight }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 150 : 0}
      accessible={true}
      accessibilityLabel="Chat conversation"
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.messageList}
        accessibilityLabel={`${messages.length} messages`}
        accessibilityHint="Scroll to read messages"
        onContentSizeChange={() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No messages yet</Text>
        )}
      />
      
      {renderSmartReplies()}

      <View 
        style={styles.inputContainer}
        accessible={true}
        accessibilityLabel="Message input section"
      >
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={handleMediaPicker}
          disabled={isUploading || isLoading}
          accessible={true}
          accessibilityLabel="Attach image"
          accessibilityHint="Double tap to select an image to send"
          accessibilityRole="imagebutton"
          accessibilityState={{ disabled: isUploading || isLoading }}
        >
          <MaterialCommunityIcons 
            name="attachment" 
            size={36} 
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
          accessible={true}
          accessibilityLabel="Message input"
          accessibilityHint="Enter your message here"
        />

        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={isLoading || isUploading || !inputText.trim()}
          accessible={true}
          accessibilityLabel="Send message"
          accessibilityHint="Double tap to send your message"
          accessibilityRole="button"
          accessibilityState={{ 
            disabled: isLoading || isUploading || !inputText.trim() 
          }}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={36} 
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
    paddingVertical: 5,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
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
    height: 60,
    borderWidth: 1,
    borderColor: '#24269B',
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
  headerProfilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  smartRepliesContainer: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  },
  smartRepliesContent: {
    paddingHorizontal: 8,
  },
  smartReplyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  smartReplyText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default ChatConversationScreen; 