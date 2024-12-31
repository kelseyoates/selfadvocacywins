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
  Alert,
  Modal,
  Image,
} from 'react-native';
import { CometChat } from '@cometchat-pro/react-native-chat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const GroupChatScreen = ({ route, navigation }) => {
  const { uid: groupId, name: groupName } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const flatListRef = useRef();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  // Fetch group info and members
  const fetchGroupInfo = async () => {
    try {
      const group = await CometChat.getGroup(groupId);
      setGroupInfo(group);
      
      const membersRequest = new CometChat.GroupMembersRequestBuilder(groupId)
        .setLimit(100)
        .build();
      
      const membersList = await membersRequest.fetchNext();
      console.log('Members:', membersList);
      setMembers(membersList);
      
      console.log('Group info:', group);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  useEffect(() => {
    fetchGroupInfo();
    
    const initializeChat = async () => {
      const user = await CometChat.getLoggedinUser();
      setCurrentUser(user);
      fetchMessages();
    };

    initializeChat();

    // Message listener
    const listenerID = `GROUP_CHAT_${groupId}`;
    const messageListener = new CometChat.MessageListener({
      onTextMessageReceived: message => {
        if (message.receiverId === groupId) {
          setMessages(prev => [...prev, message]);
          flatListRef.current?.scrollToEnd();
        }
      }
    });

    CometChat.addMessageListener(listenerID, messageListener);

    return () => CometChat.removeMessageListener(listenerID);
  }, [groupId]);

  // Set up header with group info button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setIsModalVisible(true)}
        >
          <MaterialCommunityIcons name="information" size={24} color="#24269B" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchMessages = async () => {
    try {
      const messagesRequest = new CometChat.MessagesRequestBuilder()
        .setGUID(groupId)
        .setLimit(50)
        .build();

      const fetchedMessages = await messagesRequest.fetchPrevious();
      setMessages(fetchedMessages.filter(msg => msg.category === 'message'));
    } catch (error) {
      console.log('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const textMessage = new CometChat.TextMessage(
        groupId,
        inputText.trim(),
        CometChat.RECEIVER_TYPE.GROUP
      );

      const sentMessage = await CometChat.sendMessage(textMessage);
      setMessages(prev => [...prev, sentMessage]);
      setInputText('');
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const leaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await CometChat.leaveGroup(groupId);
              navigation.goBack();
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group');
            }
          }
        }
      ]
    );
  };

  const updateGroupName = async () => {
    if (!newGroupName.trim()) return;

    try {
      await CometChat.updateGroup(groupId, {
        name: newGroupName.trim()
      });
      setIsModalVisible(false);
      fetchGroupInfo();
    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert('Error', 'Failed to update group name');
    }
  };

  const handleAttachment = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled) {
        setIsUploading(true);
        const imageUri = result.assets[0].uri;

        // Create a media message directly with the local file
        const mediaMessage = new CometChat.MediaMessage(
          groupId,
          {
            uri: imageUri,
            type: 'image/jpeg',
            name: `image_${Date.now()}.jpg`
          },
          CometChat.MESSAGE_TYPE.IMAGE,
          CometChat.RECEIVER_TYPE.GROUP
        );

        // Add metadata if needed
        mediaMessage.setMetadata({
          type: 'image',
          size: result.assets[0].fileSize
        });

        console.log('Sending media message:', {
          groupId,
          type: CometChat.MESSAGE_TYPE.IMAGE,
          receiverType: CometChat.RECEIVER_TYPE.GROUP
        });

        const sentMessage = await CometChat.sendMediaMessage(mediaMessage);
        console.log('Media message sent successfully:', sentMessage);
        
        setMessages(prev => [...prev, sentMessage]);
        
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    } catch (error) {
      console.error('Error handling attachment:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details
      });
      Alert.alert(
        'Error', 
        'Failed to send image. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender?.uid === currentUser?.uid;

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        {!isMyMessage && (
          <Text style={styles.senderName}>{item.sender?.name}</Text>
        )}
        
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.data.url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={handleAttachment}
          disabled={isUploading}
        >
          <MaterialCommunityIcons 
            name="attachment" 
            size={24} 
            color={isUploading ? '#999' : '#24269B'} 
          />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          editable={!isUploading}
        />
        
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={isUploading || !inputText.trim()}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={24} 
            color={isUploading || !inputText.trim() ? '#999' : '#24269B'} 
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Group Information</Text>
            
            {groupInfo?.owner === currentUser?.uid && (
              <View style={styles.groupNameContainer}>
                <TextInput
                  style={styles.groupNameInput}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="Enter new group name"
                />
                <TouchableOpacity 
                  style={styles.updateButton}
                  onPress={updateGroupName}
                >
                  <Text style={styles.updateButtonText}>Update Name</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.membersTitle}>Members ({members.length}):</Text>
            <FlatList
              data={members}
              keyExtractor={item => item.uid}
              renderItem={({ item }) => (
                <Text style={styles.memberItem}>
                  {item.name || item.uid} 
                  {item.scope === 'admin' ? ' (Admin)' : ''} 
                  {item.uid === groupInfo?.owner ? ' (Owner)' : ''}
                </Text>
              )}
              style={styles.membersList}
            />

            <TouchableOpacity 
              style={styles.leaveButton}
              onPress={leaveGroup}
            >
              <Text style={styles.leaveButtonText}>Leave Group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButton: {
    marginRight: 15,
  },
  messageList: {
    padding: 10,
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
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#000000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  sendButton: {
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#24269B',
  },
  groupNameContainer: {
    marginBottom: 20,
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#24269B',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  updateButton: {
    backgroundColor: '#24269B',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  membersList: {
    maxHeight: 200,
  },
  memberItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  leaveButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  leaveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#E8E8E8',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  attachButton: {
    padding: 10,
    marginRight: 5,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
  },
});

export default GroupChatScreen; 