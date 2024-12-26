import React, { useState, useEffect, useRef } from 'react';
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

const ChatConversationScreen = ({ route, navigation }) => {
  const { uid, name, conversationType } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [userAvatar, setUserAvatar] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef();
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const screenHeight = Dimensions.get('window').height;

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && contentHeight > listHeight) {
      flatListRef.current.scrollToOffset({ 
        offset: contentHeight - listHeight,
        animated 
      });
    }
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await CometChat.getLoggedinUser();
      setCurrentUser(user);
    };
    getCurrentUser();

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerContainer}>
          <Image
            source={{ 
              uri: userAvatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
            }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerTitle}>{name}</Text>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('VideoCall', { uid, name })}
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="video" size={24} color="#24269B" />
        </TouchableOpacity>
      ),
    });

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid.toLowerCase()));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.profilePicture) {
            setUserAvatar(userData.profilePicture);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();

    let messagesRequest = new CometChat.MessagesRequestBuilder()
      .setUID(uid)
      .setLimit(50)
      .build();

    messagesRequest.fetchPrevious().then(
      fetchedMessages => {
        console.log("Message list fetched:", fetchedMessages);
        setMessages(fetchedMessages);
      },
      error => {
        console.log("Message fetching failed:", error);
      }
    );

    CometChat.addMessageListener(
      'CHAT_CONVERSATION_SCREEN_MESSAGE_LISTENER',
      new CometChat.MessageListener({
        onTextMessageReceived: message => {
          if (message.sender.uid === uid || message.receiver.uid === uid) {
            setMessages(prevMessages => [...prevMessages, message]);
          }
        },
        onMediaMessageReceived: message => {
          if (message.sender.uid === uid || message.receiver.uid === uid) {
            setMessages(prevMessages => [...prevMessages, message]);
          }
        }
      })
    );

    return () => {
      CometChat.removeMessageListener('CHAT_CONVERSATION_SCREEN_MESSAGE_LISTENER');
    };
  }, [uid, name, navigation, userAvatar]);

  // Add effect to scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [messages, contentHeight, listHeight]);

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        sendMediaMessage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const sendMediaMessage = async (uri) => {
    const file = {
      uri: uri,
      type: 'image/jpeg',
      name: uri.split('/').pop(),
    };

    const mediaMessage = new CometChat.MediaMessage(
      uid,
      file,
      CometChat.MESSAGE_TYPE.IMAGE,
      CometChat.RECEIVER_TYPE.USER
    );

    try {
      const sentMessage = await CometChat.sendMessage(mediaMessage);
      console.log('Media message sent successfully:', sentMessage);
      setMessages(prevMessages => [...prevMessages, sentMessage]);
    } catch (error) {
      console.error('Error sending media message:', error);
      Alert.alert('Error', 'Failed to send image');
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const textMessage = new CometChat.TextMessage(
      uid,
      inputText,
      CometChat.RECEIVER_TYPE.USER
    );

    CometChat.sendMessage(textMessage).then(
      message => {
        console.log("Message sent successfully:", message);
        setMessages(prevMessages => [...prevMessages, message]);
        setInputText('');
        scrollToBottom();
      },
      error => {
        console.log("Message sending failed:", error);
      }
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = currentUser && item.sender?.uid === currentUser.uid;

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        {item.type === CometChat.MESSAGE_TYPE.TEXT ? (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
        ) : item.type === CometChat.MESSAGE_TYPE.IMAGE ? (
          <Image
            source={{ uri: item.data.url }}
            style={styles.messageImage}
            resizeMode="contain"
          />
        ) : null}
      </View>
    );
  };

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
        contentContainerStyle={[
          styles.messageList,
          { flexGrow: 1, justifyContent: 'flex-end' }
        ]}
        onLayout={(event) => {
          setListHeight(event.nativeEvent.layout.height);
        }}
        onContentSizeChange={(width, height) => {
          setContentHeight(height);
          scrollToBottom(false);
        }}
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />
      <View style={[
        styles.inputContainer,
        Platform.OS === 'ios' && { marginBottom: 20 }
      ]}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={handleImagePicker}
        >
          <MaterialCommunityIcons name="image" size={24} color="#666" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          numberOfLines={4}
          maxLength={1000}
          textAlignVertical="top"
          onFocus={() => {
            setTimeout(() => scrollToBottom(true), 100);
          }}
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={24} 
            color={inputText.trim() ? "#24269B" : "#999"} 
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
    paddingVertical: 15,
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
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: '80%',
    borderRadius: 15,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#24269B',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#000',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 35 : 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 16,
  },
  attachButton: {
    padding: 10,
  },
  sendButton: {
    padding: 10,
  },
});

export default ChatConversationScreen; 