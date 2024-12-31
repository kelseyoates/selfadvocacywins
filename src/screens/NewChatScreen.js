import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CometChat } from '@cometchat-pro/react-native-chat';

const NewChatScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
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

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <Text style={styles.noResults}>
            {searchQuery.length < 3 
              ? "Type at least 3 characters to search" 
              : "No users found"}
          </Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userItem}
            onPress={() => {
              if (activeTab === 'individual') {
                createIndividualChat(item);
              } else {
                console.log('Add to group:', item);
              }
            }}
          >
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
            </View>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color="#24269B" 
            />
          </TouchableOpacity>
        )}
      />
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
});

export default NewChatScreen; 