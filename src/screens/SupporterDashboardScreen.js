import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAccessibility } from '../context/AccessibilityContext';

const SupporterDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supportedUsers, setSupportedUsers] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const { showHelpers } = useAccessibility();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // First, fetch the user's subscription
      const userDoc = await getDoc(doc(db, 'users', user.uid.toLowerCase()));
      if (!userDoc.exists()) {
        console.error('User document not found');
        return;
      }
      
      const userData = userDoc.data();
      const subscription = userData.subscriptionType;
      console.log('Fetched subscription type:', subscription);
      setUserSubscription(subscription);

      // Then fetch supported users
      const usersRef = collection(db, 'users');
      const allUsersSnapshot = await getDocs(usersRef);
      
      let supportedUsersData = [];
      allUsersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.supporters?.some(supporter => 
          supporter.id.toLowerCase() === user.uid.toLowerCase()
        )) {
          supportedUsersData.push({
            id: doc.id,
            username: data.username || 'Anonymous',
            profilePicture: data.profilePicture || null,
            unreadMessages: data.unreadMessages || 0,
          });
        }
      });

      const maxSupported = {
        'supporter1': 1,
        'supporter3': 3,
        'supporter5': 5,
        'supporter10': 10,
        'supporter25': 25,
        null: 0,
        undefined: 0
      };

      const limit = maxSupported[subscription] || 0;
      console.log('Subscription:', subscription);
      console.log('Supported users count:', supportedUsersData.length);
      console.log('Limit for subscription:', limit);

      if (supportedUsersData.length > limit) {
        Alert.alert(
          'Subscription Limit Reached',
          `Your current subscription (${subscription}) allows you to support up to ${limit} ${limit === 1 ? 'person' : 'people'}. Please upgrade your subscription to support more users.`
        );
      }

      setSupportedUsers(supportedUsersData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load supporter data');
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