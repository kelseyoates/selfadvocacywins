import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PeopleScreen = () => {
  const [activeTab, setActiveTab] = useState('followers');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const userDocRef = doc(db, 'users', user.uid.toLowerCase());
      const userSnapshot = await getDoc(userDocRef);
      
      // Check if user document exists, if not, create it
      if (!userSnapshot.exists()) {
        // Initialize user document with empty following array
        await setDoc(userDocRef, {
          uid: user.uid.toLowerCase(), // Ensure uid is lowercase
          following: [],
          // Add any other default fields you need
        });
        setUsers([]);
        return;
      }
      
      const userData = userSnapshot.data();
      let usersList = [];
      
      if (activeTab === 'followers') {
        // Fetch users who follow the current user
        const q = query(usersRef, where('following', 'array-contains', user.uid.toLowerCase())); // Use lowercase
        const querySnapshot = await getDocs(q);
        usersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isFollowing: userData?.following?.includes(doc.id.toLowerCase()) || false // Compare with lowercase
        }));
      } else {
        // Fetch users followed by the current user
        const following = userData?.following || [];
        if (following.length > 0) {
          const q = query(usersRef, where('uid', 'in', following.map(id => id.toLowerCase()))); // Ensure all IDs are lowercase
          const querySnapshot = await getDocs(q);
          usersList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isFollowing: true
          }));
        }
      }
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFollow = async (userId) => {
    try {
      const userRef = doc(db, 'users', user.uid.toLowerCase());
      await updateDoc(userRef, {
        following: arrayUnion(userId.toLowerCase()) // Ensure lowercase when following
      });
      setUsers(users.map(u => 
        u.id === userId ? { ...u, isFollowing: true } : u
      ));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };
  
  const handleUnfollow = async (userId) => {
    try {
      const userRef = doc(db, 'users', user.uid.toLowerCase());
      await updateDoc(userRef, {
        following: arrayRemove(userId.toLowerCase()) // Ensure lowercase when unfollowing
      });
      setUsers(users.map(u => 
        u.id === userId ? { ...u, isFollowing: false } : u
      ));
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

// Update the renderUser function
const renderUser = ({ item }) => (
    <View style={styles.userItem}>
      <Image
        source={item.profilePicture ? { uri: item.profilePicture } : require('../../assets/default-profile.png')}
        style={styles.profilePicture}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        {item.state && <Text style={styles.userState}>📍 {item.state}</Text>}
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          item.isFollowing && styles.followingButton
        ]}
        onPress={() => item.isFollowing ? handleUnfollow(item.id) : handleFollow(item.id)}
      >
        <View style={styles.buttonContent}>
          <Text style={[
            styles.followButtonText,
            item.isFollowing && styles.followingButtonText
          ]}>
            {item.isFollowing ? 'Unfollow' : 'Follow'}
          </Text>
          <MaterialCommunityIcons 
            name={item.isFollowing ? "minus" : "plus"} 
            size={20} 
            color={item.isFollowing ? "#24269B" : "white"} 
            style={styles.iconStyle}
          />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#24269B" />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </Text>
          }
        />
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
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#24269B',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#24269B',
    fontWeight: '600',
  },
  list: {
    padding: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  userState: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#24269B',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#24269B',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  followingButtonText: {
    color: '#24269B',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 30,
    fontSize: 16,
  },
});

export default PeopleScreen;