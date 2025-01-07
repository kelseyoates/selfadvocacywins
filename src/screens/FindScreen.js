import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  AccessibilityInfo 
} from 'react-native';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const FindScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (auth.currentUser) {
          const userDocRef = doc(db, 'users', auth.currentUser.uid.toLowerCase());
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserData(data);
            console.log('Fetched profile picture:', data.profilePicture);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Set up header with profile button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
          accessible={true}
          accessibilityLabel="Go to profile"
          accessibilityHint="Navigate to your profile page"
        >
          <Image
            source={
              userData?.profilePicture 
                ? { uri: userData.profilePicture } 
                : require('../../assets/default-profile.png')
            }
            style={styles.profileImage}
          />
          <Text style={styles.profileText}>Profile</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, userData]);

  // Add screen reader detection
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

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Find Screen"
      accessibilityRole="menu"
    >
      <View style={styles.buttonContainer}>
        <View style={styles.buttonShadow} />
        <TouchableOpacity 
          style={styles.findFriendButton} 
          onPress={() => {
            announceToScreenReader('Opening Find a Friend screen');
            navigation.navigate('FindYourFriends');
          }}
          accessible={true}
          accessibilityLabel="Find a Friend"
          accessibilityHint="Navigate to screen to search for friends"
          accessibilityRole="button"
        >
          <View 
            style={styles.buttonContent}
            accessible={true}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.buttonText}>Find a Friend</Text>
            <Image 
              source={require('../../assets/friends-icon.png')} 
              style={styles.buttonIcon}
              accessible={true}
              accessibilityLabel="three friends together in a group"
              accessibilityRole="image"
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonShadow} />
        <TouchableOpacity 
          style={styles.findDateButton} 
          onPress={() => {
            announceToScreenReader('Opening Find a Date screen');
            navigation.navigate('FindADate');
          }}
          accessible={true}
          accessibilityLabel="Find a Date"
          accessibilityHint="Navigate to screen to search for potential dates"
          accessibilityRole="button"
        >
          <View 
            style={styles.buttonContent}
            accessible={true}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.buttonDateText}>Find a Date</Text>
            <Image 
              source={require('../../assets/dating-icon.png')} 
              style={styles.buttonIcon}
              accessible={true}
              accessibilityLabel="two people chatting on their phones"
              accessibilityRole="image"
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#24269B',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 120,
    width: 300,
  },

  
  buttonDateText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '600',
  },

  buttonIcon: {
    marginLeft: 2,
  },

  buttonContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginVertical: 10,
  },

  buttonShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    backgroundColor: '#000',
    borderRadius: 8,
  },

  findFriendButton: {
    backgroundColor: '#24269B',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    width: 300,
    height: 120,
    borderWidth: 1,
    borderColor: '#24269B',
  },

  findDateButton: {
    backgroundColor: '#F2C8E4',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    width: 300,
    height: 120,
    borderWidth: 1,
    borderColor: '#24269B',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },

  buttonIcon: {
    width: 90,
    height: 90,
    borderRadius: 15,
  },

  profileButton: {
    alignItems: 'center',
    marginRight: 15,
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#24269B',
  },
  profileText: {
    fontSize: 12,
    color: '#24269B',
    marginTop: 2,
  },
});

export default FindScreen; 