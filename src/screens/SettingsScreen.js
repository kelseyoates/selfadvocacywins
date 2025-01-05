import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';


const SettingsScreen = () => {
  const navigation = useNavigation();
  const [userSubscription, setUserSubscription] = useState(null);

  const fetchUserSubscription = async () => {
    try {
      const userId = auth.currentUser.uid.toLowerCase();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserSubscription(userDoc.data().subscriptionType);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  // Add focus listener to refresh data
  useEffect(() => {
    fetchUserSubscription(); // Initial fetch

    // Set up focus listener
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserSubscription(); // Fetch when screen comes into focus
    });

    // Cleanup
    return unsubscribe;
  }, [navigation]);

  const handleSubscriptionPress = () => {
    if (!userSubscription || userSubscription === 'selfAdvocateFree') {
      navigation.navigate('SubscriptionOptions');
    } else {
      navigation.navigate('ManageSubscription');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation will be handled by your AuthProvider/Navigator
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('People')}
          >
            <Image 
              source={require('../../assets/people.png')}
              style={styles.menuIcon}
            />
            <Text style={styles.menuItemText}>People</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleSubscriptionPress}
          >
            <Image 
              source={require('../../assets/credit-card.png')}
              style={styles.menuIcon}
            />
            <Text style={styles.menuItemText}>
              {!userSubscription || userSubscription === 'selfAdvocateFree' 
                ? 'Upgrade Subscription' 
                : 'Manage Subscription'}
            </Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('SupporterManagement')}
          >
            <Image 
              source={require('../../assets/supporter-1.png')}
              style={styles.menuIcon}
            />
            <Text style={styles.menuItemText}>Supporters</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>


          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('SupporterDashboard')}
          >
            <Image 
              source={require('../../assets/people.png')}
              style={styles.menuIcon}
            />
            <Text style={styles.menuItemText}>Who I'm Supporting</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>


          
        </View>
      </View>

      <View style={styles.signOutWrapper}>
        <SafeAreaView edges={['bottom']}>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  menuIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  signOutWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingButton: {
    backgroundColor: '#ff4444',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  settingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;