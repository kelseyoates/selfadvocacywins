import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
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
  const { user } = useAuth();

  const searchUsers = async (text) => {
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
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
    } catch (error) {
      console.error('Error searching users:', error);
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
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'individual' && styles.activeTab]}
          onPress={() => setActiveTab('individual')}
        >
          <View style={styles.tabContent}>
            <Image 
              source={require('../../assets/individual-chat.png')} 
              style={[
                styles.tabIcon,
                activeTab === 'individual' && styles.activeTabIcon
              ]}
            />
            <Text style={[styles.tabText, activeTab === 'individual' && styles.activeTabText]}>
              Individual Chat
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'group' && styles.activeTab]}
          onPress={() => setActiveTab('group')}
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

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab === 'individual' ? 'users' : 'for group members'}...`}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
        />
      </View>

      {activeTab === 'group' && selectedMembers.length > 0 && (
        <View style={styles.selectedMembersContainer}>
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
                onPress={() => toggleMemberSelection(item)}
              >
                <Text style={styles.selectedMemberText}>{item.username}</Text>
                <MaterialCommunityIcons name="close" size={16} color="#fff" />
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
              } else {
                toggleMemberSelection(item);
              }
            }}
          >
            <Text style={styles.username}>{item.username}</Text>
            {activeTab === 'group' && 
              selectedMembers.some(member => member.id === item.id) && (
              <MaterialCommunityIcons name="check" size={24} color="#24269B" />
            )}
          </TouchableOpacity>
        )}
      />

      {activeTab === 'group' && selectedMembers.length >= 2 && (
        <TouchableOpacity 
          style={styles.createGroupButton}
          onPress={createGroupChat}
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