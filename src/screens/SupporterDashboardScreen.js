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
import { useAccessibility } from '../context/AccessibilityContext';

const SupporterDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supportedUsers, setSupportedUsers] = useState([]);
  const { showHelpers } = useAccessibility();

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
      {showHelpers && (
        <View style={styles.helperSection}>
          <View style={styles.helperHeader}>
            <MaterialCommunityIcons 
              name="information" 
              size={24} 
              color="#24269B"
              style={styles.infoIcon}
              accessible={true}
              accessibilityLabel="Helper information"
            />
          </View>
          <View style={styles.helperContent}>
            <Image 
              source={require('../../assets/read-only-chats.png')}
              style={styles.helperImage}
              accessible={true}
              accessibilityLabel="Ezra explaining supporter features"
            />
            <Text style={styles.helperTitle}>Being a Supporter!</Text>
            <View style={styles.helperTextContainer}>
            <Text style={styles.helperText}>
                • A user must add you as a supporter before you can view their chats.
              </Text>
              <Text style={styles.helperText}>
                • Once you are a supporter, you can view that user's chats
              </Text>
              <Text style={styles.helperText}>
                • These chats are read-only and you will not be able to send, edit, or delete messages.
              </Text>
              <Text style={styles.helperText}>
                • If you see concerning behavior, have the user block and report
              </Text>
              <Text style={styles.helperText}>
                • Email safety concerns to:
              </Text>
              <Text style={styles.helperEmail}>
                kelsey.oates@selfadvocacywins.com
              </Text>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.title} accessibilityRole="header">
        You are supporting:
      </Text>
      
      {supportedUsers.map(supportedUser => (
        <TouchableOpacity 
          key={supportedUser.id}
          style={styles.userCard}
          onPress={() => handleSupportedUserPress(supportedUser)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`View chats with ${supportedUser.username}`}
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
            <View 
              style={styles.viewChatsContainer}
              accessible={true}
              accessibilityRole="text"
            >
              <Text style={styles.viewChatsText}>View Chats</Text>
              <MaterialCommunityIcons 
                name="arrow-right" 
                size={20} 
                color="#24269B" 
              />
            </View>
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
  viewChatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewChatsText: {
    color: '#24269B',
    fontSize: 14,
    marginRight: 4,
    fontWeight: '500',
  },
  helperSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#24269B',
    marginVertical: 10,
    marginHorizontal: 10,
    padding: 12,
    alignSelf: 'center',
    width: '95%',
  },
  helperHeader: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: -20,
    zIndex: 1,
  },
  infoIcon: {
    padding: 5,
  },
  helperContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  helperImage: {
    width: 200,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  helperTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#24269B',
    marginBottom: 10,
    textAlign: 'center',
  },
  helperTextContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  helperText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  helperEmail: {
    fontSize: 16,
    color: '#24269B',
    marginBottom: 8,
    lineHeight: 22,
    fontWeight: '500',
  },
});

export default SupporterDashboardScreen; 