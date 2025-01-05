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
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { CometChat } from '@cometchat-pro/react-native-chat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const containsProfanity = (text) => {
  const profanityList = [
    'shit', 'fuck', 'damn', 'ass', 'bitch', 'crap', 'piss',
    'dick', 'pussy', 'cock',
    'bastard', 'hell', 'whore', 'slut', 'asshole', 'cunt',
    'fucker', 'fucking',
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

// Create a separate header component for better control
const GroupInfoButton = ({ onPress }) => {
  return (
    <TouchableOpacity
      onPress={() => {
        console.log('Info button pressed');
        Alert.alert('Debug', 'Info button pressed'); // Debug alert
        onPress();
      }}
      style={{
        marginRight: 15,
        padding: 10,
        backgroundColor: 'transparent',
      }}
    >
      <MaterialCommunityIcons
        name="information"
        size={28}
        color="#24269B"
      />
    </TouchableOpacity>
  );
};

const GroupChatScreen = ({ route, navigation }) => {
  console.log('GroupChatScreen rendering');
  
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
  const [reportedUsers, setReportedUsers] = useState(new Set());
  const [memberProfiles, setMemberProfiles] = useState({});
  const [smartReplies, setSmartReplies] = useState([]);
  const [isLoadingSmartReplies, setIsLoadingSmartReplies] = useState(false);

  // Test function to verify modal visibility
  const toggleModal = () => {
    console.log('Current modal visibility:', isModalVisible);
    setIsModalVisible(!isModalVisible);
    console.log('New modal visibility:', !isModalVisible);
  };

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
      
      // Fetch Firestore profiles after getting CometChat members
      await fetchMemberProfiles(membersList);
      
      console.log('Group info:', group);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  // Add this function to fetch user profiles from Firestore
  const fetchMemberProfiles = async (membersList) => {
    try {
      const profiles = {};
      const userPromises = membersList.map(async (member) => {
        const userDoc = await getDoc(doc(db, 'users', member.uid.toLowerCase()));
        if (userDoc.exists()) {
          profiles[member.uid] = userDoc.data();
        }
      });
      
      await Promise.all(userPromises);
      setMemberProfiles(profiles);
    } catch (error) {
      console.error('Error fetching member profiles:', error);
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const user = await CometChat.getLoggedinUser();
        setCurrentUser(user);
        await fetchMessages();
        await fetchGroupInfo();
      } catch (error) {
        console.log("Initialization error:", error);
      }
    };

    initializeChat();
  }, []);

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

    // First check for profanity with our local filter
    if (containsProfanity(inputText)) {
      Alert.alert(
        'Inappropriate Content',
        'Your message contains inappropriate language. Please revise and try again.'
      );
      return;
    }

    try {
      // Create message with data masking enabled
      const textMessage = new CometChat.TextMessage(
        groupId,
        inputText.trim(),
        CometChat.RECEIVER_TYPE.GROUP
      );

      // Enable data masking
      textMessage.metadata = {
        dataMasking: true,
        sensitive_data: true
      };

      const sentMessage = await CometChat.sendMessage(textMessage);
      console.log('Message sent successfully');
      
      setMessages(prev => [...prev, sentMessage]);
      setInputText('');

      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    } catch (error) {
      // Handle CometChat's profanity filter error without logging
      if (error.code === 'ERR_BLOCKED_BY_EXTENSION' && 
          error.details?.action === 'do_not_propagate') {
        Alert.alert(
          'Message Blocked',
          'Your message was blocked by our content filter. Please revise and try again.'
        );
      } else {
        // Only log non-profanity errors
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message');
      }
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
    if (!newGroupName.trim() || !groupId) return;

    try {
      console.log('Updating group name for group:', groupId);
      
      // Create group object with required parameters
      const group = new CometChat.Group(
        groupId,
        newGroupName.trim(),
        CometChat.GROUP_TYPE.PRIVATE
      );

      const updatedGroup = await CometChat.updateGroup(group);
      console.log('Group updated:', updatedGroup);

      // Update local state
      setGroupInfo(prevInfo => ({
        ...prevInfo,
        name: newGroupName.trim()
      }));

      // Update navigation title
      navigation.setOptions({
        title: newGroupName.trim()
      });

      // Clear input and close modal
      setNewGroupName('');
      setIsModalVisible(false);

      // Show success message
      Alert.alert('Success', 'Group name updated successfully');

    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert(
        'Error',
        'Failed to update group name. Please try again.'
      );
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

        // Create media message with moderation enabled
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

        // Enable image moderation
        mediaMessage.metadata = {
          imageModeration: true,
          sensitive_content: true
        };

        try {
          const sentMessage = await CometChat.sendMediaMessage(mediaMessage);
          console.log('Image sent successfully');
          
          setMessages(prev => [...prev, sentMessage]);
          
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        } catch (error) {
          if (error.code === 'ERR_BLOCKED_BY_EXTENSION') {
            Alert.alert(
              'Image Blocked',
              'This image was blocked by our content filter. Please choose another image.'
            );
          } else {
            console.error('Error sending image:', error);
            Alert.alert('Error', 'Failed to send image');
          }
        }
      }
    } catch (error) {
      console.error('Error handling attachment:', error);
      Alert.alert('Error', 'Failed to access image library');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReportMessage = async (message) => {
    try {
      const reportType = "inappropriate";
      const reportMessage = await CometChat.reportMessage(
        message.id,
        reportType,
        { reason: "Inappropriate content" }
      );
      
      console.log("Message reported successfully:", reportMessage);
      Alert.alert(
        "Message Reported",
        "Thank you for helping keep our community safe."
      );
    } catch (error) {
      console.error("Error reporting message:", error);
      Alert.alert(
        "Error",
        "Failed to report message. Please try again."
      );
    }
  };

  const handleReportUser = async (user) => {
    try {
      const reportType = "inappropriate";
      const reportUser = await CometChat.reportUser(
        user.uid,
        reportType,
        { reason: "Inappropriate behavior" }
      );
      
      console.log("User reported successfully:", reportUser);
      Alert.alert(
        "User Reported",
        "Thank you for helping keep our community safe."
      );
    } catch (error) {
      console.error("Error reporting user:", error);
      Alert.alert(
        "Error",
        "Failed to report user. Please try again."
      );
    }
  };

  const getSmartReplies = async (message) => {
    try {
      if (!message || !message.text) return;
      
      setIsLoadingSmartReplies(true);
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

  const handleSmartReplyPress = async (reply) => {
    try {
      setInputText(reply);
      setSmartReplies([]); // Clear smart replies
      await sendMessage(reply);
    } catch (error) {
      console.error('Error sending smart reply:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender?.uid === currentUser?.uid;

    const onLongPress = () => {
      // Don't show report options for own messages
      if (isMyMessage) return;

      Alert.alert(
        "Report Options",
        "What would you like to report?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Report Message",
            onPress: () => handleReportMessage(item)
          },
          {
            text: "Report User",
            style: "destructive",
            onPress: () => handleReportUser(item.sender)
          }
        ]
      );
    };

    return (
      <TouchableOpacity 
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        {!isMyMessage && (
          <Text style={styles.senderName}>
            {item.sender?.name || 'Unknown User'}
          </Text>
        )}
        
        {item.type === 'text' ? (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.metadata?.sensitive_data 
              ? item.data?.text?.replace(/\d/g, '*') 
              : item.text || item.data?.text}
          </Text>
        ) : item.type === 'image' ? (
          item.metadata?.blocked ? (
            <View style={styles.blockedImageContainer}>
              <Text style={styles.blockedImageText}>
                ⚠️ Image blocked due to inappropriate content
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.data?.url }}
              style={styles.messageImage}
              resizeMode="contain"
            />
          )
        ) : null}
        
        <Text style={[
          styles.timestamp,
          isMyMessage ? styles.myTimestamp : styles.otherTimestamp
        ]}>
          {new Date(item.sentAt * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSmartReplies = () => {
    if (isLoadingSmartReplies) {
      return (
        <View style={styles.smartRepliesContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }

    if (smartReplies.length === 0) return null;

    return (
      <View style={styles.smartRepliesContainer}>
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
            >
              <Text style={styles.smartReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Add this useEffect to pass the toggle method to navigation params
  useEffect(() => {
    navigation.setParams({
      toggleModal: () => {
        console.log('Toggle modal called');
        setIsModalVisible(prev => !prev);
      }
    });
  }, [navigation]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.infoButtonContainer}>
        <TouchableOpacity
          onPress={() => {
            console.log('Info button pressed');
            setIsModalVisible(true);
          }}
          style={styles.infoButton}
        >
          <MaterialCommunityIcons 
            name="information"
            size={24}
            color="#24269B"
          />
          <Text style={styles.infoButtonText}>Group Info</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {renderSmartReplies()}

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
        onRequestClose={() => {
          console.log('Modal closing');
          setIsModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Information</Text>
              <TouchableOpacity 
                onPress={() => {
                  console.log('Close button pressed');
                  setIsModalVisible(false);
                }}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {groupInfo?.owner === currentUser?.uid && (
              <View style={styles.groupNameContainer}>
                <TextInput
                  style={styles.groupNameInput}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="Enter new group name"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity 
                  style={styles.updateButton}
                  onPress={updateGroupName}
                >
                  <Text style={styles.updateButtonText}>Update Name</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.membersTitle}>
              Members ({members.length}):
            </Text>
            
            <FlatList
              data={members}
              keyExtractor={item => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.memberItem}
                  onPress={() => {
                    console.log('Navigating to profile for user:', item.uid.toLowerCase());
                    setIsModalVisible(false);
                    navigation.navigate('OtherUserProfile', {
                      profileUserId: item.uid.toLowerCase(),
                      isCurrentUser: item.uid === currentUser?.uid
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.memberContent}>
                    <Image
                      source={
                        memberProfiles[item.uid]?.profilePicture 
                          ? { uri: memberProfiles[item.uid].profilePicture }
                          : require('../../assets/default-profile.png')
                      }
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {memberProfiles[item.uid]?.username || item.name || item.uid}
                      </Text>
                      <Text style={styles.memberRole}>
                        {item.uid === groupInfo?.owner 
                          ? 'Owner' 
                          : item.scope === 'admin' 
                            ? 'Admin' 
                            : 'Member'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={24} 
                      color="#666"
                      style={styles.memberChevron}
                    />
                  </View>
                </TouchableOpacity>
              )}
              style={styles.membersList}
            />

            <TouchableOpacity 
              style={styles.leaveButton}
              onPress={leaveGroup}
            >
              <Text style={styles.leaveButtonText}>Leave Group</Text>
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
    padding: 10,
    backgroundColor: 'transparent',
  },
  messageList: {
    padding: 10,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 12,
    maxWidth: '80%',
    marginVertical: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#24269B',
    marginLeft: 50,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    marginRight: 50,
    borderWidth: 1,
    borderColor: '#000000',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#24269B',
  },
  closeButton: {
    padding: 5,
  },
  groupNameContainer: {
    marginBottom: 20,
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#24269B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#24269B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  membersList: {
    maxHeight: '50%',
  },
  memberItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  memberContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  memberChevron: {
    marginLeft: 8,
  },
  leaveButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  testButton: {
    backgroundColor: '#24269B',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  infoButtonContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#fff',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  infoButtonText: {
    marginLeft: 8,
    color: '#24269B',
    fontSize: 16,
    fontWeight: '500',
  },
  blockedImageContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  blockedImageText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: '#fff',
    opacity: 0.8,
  },
  otherTimestamp: {
    color: '#666',
    opacity: 0.8,
  },
  smartRepliesContainer: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    minHeight: 56,
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

export { GroupInfoButton };
export default GroupChatScreen; 