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
import { getSupporterStats } from '../services/analytics';
import { LineChart } from 'react-native-chart-kit';
import { formatDistanceToNow } from 'date-fns';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { auth, db} from '../config/firebase';

const SupporterDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    lastActive: null,
    totalSupportedUsers: 0,
    activeChats: 0,
    totalMessagesViewed: 0
  });
  const [supportedUsers, setSupportedUsers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

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
            // Add any other user data you want to display
          });
        }
      });

      setSupportedUsers(supportedUsersData);
      setStats(prev => ({
        ...prev,
        totalSupportedUsers: supportedUsersData.length
      }));

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportedUserPress = (supportedUser) => {
    // Convert Firebase user format to what CometChat expects
    const cometChatUser = {
      uid: supportedUser.id.toLowerCase(), // CometChat uses lowercase UIDs
      username: supportedUser.username,
      // Add any other needed fields
    };
    
    console.log('Navigating to supported user chats with:', cometChatUser);
    
    navigation.navigate('SupportedUserChat', {
      supportedUser: cometChatUser
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Supporter Dashboard</Text>
        <Text style={styles.subtitle}>
          Last active: {stats.lastActive 
            ? formatDistanceToNow(
                stats.lastActive.toDate ? stats.lastActive.toDate() : new Date(stats.lastActive),
                { addSuffix: true }
              )
            : 'Never'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalSupportedUsers}</Text>
          <Text style={styles.statLabel}>Supported Users</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeChats}</Text>
          <Text style={styles.statLabel}>Active Chats</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalMessagesViewed}</Text>
          <Text style={styles.statLabel}>Messages Viewed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Supported Users</Text>
      
      {supportedUsers.map(supportedUser => (
        <TouchableOpacity 
          key={supportedUser.id}
          style={styles.userCard}
          onPress={() => handleSupportedUserPress(supportedUser)}
        >
          <Image 
            source={supportedUser.profilePicture 
              ? { uri: supportedUser.profilePicture }
              : require('../../assets/default-avatar.png')}
            style={styles.userAvatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{supportedUser.username}</Text>
            {supportedUser.unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {supportedUser.unreadMessages}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}

      {/* Temporarily remove chart until we implement proper data */}
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
  header: {
    padding: 20,
    backgroundColor: '#24269B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#24269B',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  selectedPeriod: {
    backgroundColor: '#24269B',
  },
  periodButtonText: {
    color: '#24269B',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 20,
    paddingBottom: 10,
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
});

export default SupporterDashboardScreen; 