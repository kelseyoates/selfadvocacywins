import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, Image, Alert, AccessibilityInfo } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CometChat } from '@cometchat-pro/react-native-chat';

const NewChatScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const { user } = useAuth();

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

  const searchUsers = async (text) => {
    if (text.length < 3) {
      setSearchResults([]);
      announceToScreenReader('Enter at least 3 characters to search');
      return;
    }

    try {
      announceToScreenReader('Searching for users');
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', text.toLowerCase()),
        where('username', '<=', text.toLowerCase() + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid);
      
      setSearchResults(users);
      announceToScreenReader(`Found ${users.length} users`);
    } catch (error) {
      announceToScreenReader('Error searching for users');
    }
  };

  const createIndividualChat = async (selectedUser) => {
    try {
      const receiverId = selectedUser.originalUid || selectedUser.uid;
      
      console.log('Selected user full data:', selectedUser);
      console.log('Profile picture URL:', selectedUser.profilePicture);
      
      // Navigate to chat with all user details
      const navigationParams = {
        uid: receiverId,
        name: selectedUser.username,
        profilePicture: selectedUser.profilePicture,
        conversationType: 'user',
        otherUser: selectedUser
      };
      
      console.log('Navigation params:', navigationParams);
      
      navigation.navigate('ChatConversation', navigationParams);

    } catch (error) {
      console.error('Error creating chat:', error);
      console.error('Error details:', error.message);
    }
  };

  const toggleMemberSelection = (selectedUser) => {
    setSelectedMembers(prevMembers => {
      const isAlreadySelected = prevMembers.some(member => member.id === selectedUser.id);
      if (isAlreadySelected) {
        return prevMembers.filter(member => member.id !== selectedUser.id);
      } else {
        return [...prevMembers, selectedUser];
      }
    });
  };

  const createGroupChat = async () => {
    if (selectedMembers.length < 2) {
      Alert.alert('Error', 'Please select at least 2 members for the group chat');
      return;
    }

    try {
      // Create a unique group ID
      const groupId = 'group_' + Date.now();
      
      // Create the group
      const groupType = CometChat.GROUP_TYPE.PRIVATE;
      const groupName = `Group Chat (${selectedMembers.length + 1})`;
      
      const group = new CometChat.Group(
        groupId,
        groupName,
        groupType,
        ''  // Empty string for password as it's not needed for private groups
      );

      console.log('Creating group:', group);
      
      const createdGroup = await CometChat.createGroup(group);
      console.log('Group created:', createdGroup);

      // Add members to the group
      const membersList = selectedMembers.map(member => {
        return new CometChat.GroupMember(
          member.uid || member.id,
          CometChat.GROUP_MEMBER_SCOPE.PARTICIPANT
        );
      });

      console.log('Adding members:', membersList);
      
      await CometChat.addMembersToGroup(groupId, membersList, []);
      console.log('Members added to group');

      // Send initial message to the group
      const textMessage = new CometChat.TextMessage(
        groupId,
        '👋 Group chat created!',
        CometChat.RECEIVER_TYPE.GROUP
      );
      
      await CometChat.sendMessage(textMessage);
      console.log('Initial message sent');

      // Navigate to the new group chat
      navigation.navigate('GroupChat', {
        uid: groupId,
        name: groupName
      });

      // Clear selected members
      setSelectedMembers([]);
      setSearchQuery('');
      setSearchResults([]);

      // Show success message
      Alert.alert(
        'Success',
        'Group chat created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the group chat after a short delay
              setTimeout(() => {
                navigation.navigate('ChatConversation', {
                  uid: groupId,
                  name: groupName,
                  conversationType: CometChat.RECEIVER_TYPE.GROUP
                });
              }, 100);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert(
        'Error',
        'Failed to create group chat. Please try again.'
      );
    }
  };

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="New Chat Screen"
    >
      <View 
        style={styles.tabContainer}
        accessible={true}
        accessibilityRole="tablist"
      >
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'individual' && styles.activeTab]}
          onPress={() => {
            setActiveTab('individual');
            announceToScreenReader('Switched to individual chat');
          }}
          accessible={true}
          accessibilityRole="tab"
          accessibilityLabel="Individual Chat tab"
          accessibilityState={{ selected: activeTab === 'individual' }}
        >
          <View style={styles.tabContent}>
            <Image 
              source={require('../../assets/individual-chat.png')} 
              style={[styles.tabIcon, activeTab === 'individual' && styles.activeTabIcon]}
              accessible={true}
              accessibilityLabel="Individual chat icon"
              accessibilityRole="image"
            />
            <Text style={[styles.tabText, activeTab === 'individual' && styles.activeTabText]}>
              Individual Chat
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'group' && styles.activeTab]}
          onPress={() => {
            setActiveTab('group');
            announceToScreenReader('Switched to group chat');
          }}
          accessible={true}
          accessibilityRole="tab"
          accessibilityLabel="Group Chat tab"
          accessibilityState={{ selected: activeTab === 'group' }}
        >
          <View style={styles.tabContent}>
            <Image 
              source={require('../../assets/group-chat.png')} 
              style={[
                styles.tabIcon,
                activeTab === 'group' && styles.activeTabIcon
              ]}
            />
            <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>
              Group Chat
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View 
        style={styles.searchContainer}
        accessible={true}
        accessibilityRole="search"
      >
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab === 'individual' ? 'users' : 'for group members'}...`}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
          accessible={true}
          accessibilityLabel={`Search ${activeTab === 'individual' ? 'users' : 'group members'}`}
          accessibilityHint="Enter at least 3 characters to search"
        />
      </View>

      {activeTab === 'group' && selectedMembers.length > 0 && (
        <View 
          style={styles.selectedMembersContainer}
          accessible={true}
          accessibilityLabel={`Selected members: ${selectedMembers.length}`}
        >
          <Text style={styles.selectedMembersTitle}>
            Selected Members ({selectedMembers.length}):
          </Text>
          <FlatList
            horizontal
            data={selectedMembers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.selectedMemberChip}
                onPress={() => {
                  toggleMemberSelection(item);
                  announceToScreenReader(`Removed ${item.username} from selection`);
                }}
                accessible={true}
                accessibilityLabel={`${item.username}, selected member`}
                accessibilityHint="Double tap to remove from selection"
                accessibilityRole="button"
              >
                <Text style={styles.selectedMemberText}>{item.username}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.selectedMembersList}
          />
        </View>
      )}

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.userItem,
              activeTab === 'group' && 
              selectedMembers.some(member => member.id === item.id) && 
              styles.selectedUserItem
            ]}
            onPress={() => {
              if (activeTab === 'individual') {
                createIndividualChat(item);
                announceToScreenReader(`Opening chat with ${item.username}`);
              } else {
                toggleMemberSelection(item);
                const isSelected = selectedMembers.some(member => member.id === item.id);
                announceToScreenReader(
                  isSelected ? 
                  `Removed ${item.username} from selection` : 
                  `Added ${item.username} to selection`
                );
              }
            }}
            accessible={true}
            accessibilityLabel={`${item.username}${
              activeTab === 'group' && 
              selectedMembers.some(member => member.id === item.id) 
                ? ', selected' 
                : ''
            }`}
            accessibilityHint={
              activeTab === 'individual' 
                ? 'Double tap to start chat' 
                : 'Double tap to toggle selection'
            }
            accessibilityRole="button"
          >
            <Text style={styles.username}>{item.username}</Text>
          </TouchableOpacity>
        )}
        accessible={true}
        accessibilityLabel={`Search results: ${searchResults.length} users found`}
      />

      {activeTab === 'group' && selectedMembers.length >= 2 && (
        <TouchableOpacity 
          style={styles.createGroupButton}
          onPress={createGroupChat}
          accessible={true}
          accessibilityLabel={`Create group chat with ${selectedMembers.length} members`}
          accessibilityHint="Double tap to create group chat"
          accessibilityRole="button"
        >
          <Text style={styles.createGroupButtonText}>
            Create Group Chat ({selectedMembers.length} members)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 2,
    
    borderRadius: 5,
  },
  tabButton: {
    flex: 1,
    padding: 15,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#24269B',
    borderRadius: 5,
    padding: 5,
  },
  tabIcon: {
    width: 115,
    height: 90,
    marginBottom: 8,
  },
 
  activeTab: {
    backgroundColor: '#24269B',
  },

  tabText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#24269B',
    height: 40,
    width: '100%',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  username: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
  selectedMembersContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectedMembersTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  selectedMembersList: {
    paddingVertical: 5,
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24269B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedMemberText: {
    color: '#fff',
    marginRight: 6,
  },
  selectedUserItem: {
    backgroundColor: '#f0f0f0',
  },
  createGroupButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default NewChatScreen; 