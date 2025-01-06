import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const SupporterDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supportedUsers, setSupportedUsers] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const allUsersSnapshot = await getDocs(usersRef);
      
      let supportedUsersData = [];
      allUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.supporters?.some(supporter => 
          supporter.id.toLowerCase() === user.uid.toLowerCase()
        )) {
          supportedUsersData.push({
            id: doc.id,
            username: userData.username || 'Anonymous',
            profilePicture: userData.profilePicture || null,
            unreadMessages: userData.unreadMessages || 0,
          });
        }
      });

      setSupportedUsers(supportedUsersData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportedUserPress = (supportedUser) => {
    const cometChatUser = {
      uid: supportedUser.id.toLowerCase(),
      username: supportedUser.username,
    };
    
    navigation.navigate('SupportedUserChat', {
      supportedUser: cometChatUser
    });
  };

  if (loading) {
    return (
      <View 
        style={styles.loadingContainer}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading supported users"
      >
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      accessibilityRole="scrollview"
      accessibilityLabel="Supported Users List"
    >
      <Text 
        style={styles.title}
        accessibilityRole="header"
      >
        Your Supported Users
      </Text>
      
      {supportedUsers.map(supportedUser => (
        <TouchableOpacity 
          key={supportedUser.id}
          style={styles.userCard}
          onPress={() => handleSupportedUserPress(supportedUser)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${supportedUser.username}${
            supportedUser.unreadMessages > 0 
              ? `, ${supportedUser.unreadMessages} unread messages` 
              : ''
          }`}
          accessibilityHint="Double tap to view chat history"
        >
          <Image 
            source={supportedUser.profilePicture 
              ? { uri: supportedUser.profilePicture }
              : require('../../assets/default-avatar.png')}
            style={styles.userAvatar}
            accessibilityRole="image"
            accessibilityLabel={`${supportedUser.username}'s profile picture`}
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{supportedUser.username}</Text>
            {supportedUser.unreadMessages > 0 && (
              <View 
                style={styles.badge}
                accessible={true}
                accessibilityRole="text"
              >
                <Text style={styles.badgeText}>
                  {supportedUser.unreadMessages}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#24269B',
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  badge: {
    backgroundColor: '#24269B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewChatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewChatsText: {
    color: '#24269B',
    fontSize: 16,
    marginRight: 8,
    fontWeight: '500',
  },
});

export default SupporterDashboardScreen; 