import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  AccessibilityInfo,
  Image,
  Text,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback
} from 'react-native';
import { collection, query, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import WinCard from '../components/WinCard';
import { useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../config/firebase';

const MainScreen = ({ navigation }) => {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [userData, setUserData] = useState(null);

  const scale = useRef(new Animated.Value(1)).current;
  const clapScale = useRef(new Animated.Value(1)).current;
  const commentScale = useRef(new Animated.Value(1)).current;

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

  const fetchWins = async () => {
    try {
      announceToScreenReader('Fetching recent wins');
      const winsQuery = query(
        collection(db, 'wins'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(winsQuery);
      const winsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setWins(winsData);
      announceToScreenReader(`Loaded ${winsData.length} wins`);
    } catch (error) {
      console.error('Error fetching wins:', error);
      announceToScreenReader('Failed to load wins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWins();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    announceToScreenReader('Refreshing wins');
    fetchWins();
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWins();
    }, [])
  );

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
            setProfilePicture(data.profilePicture);
            console.log('Fetched profile picture:', data.profilePicture); // Debug log
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

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    const pulseAnimation = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(clapScale, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(clapScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(commentScale, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(commentScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => pulseAnimation()); // This makes both loop
    };

    pulseAnimation();

    return () => {
      // Cleanup animations when component unmounts
      clapScale.setValue(1);
      commentScale.setValue(1);
    };
  }, []);

  if (loading) {
    return (
      <View 
        style={styles.loadingContainer}
        accessible={true}
        accessibilityLabel="Loading wins"
        accessibilityRole="progressbar"
      >
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  // Add this component to replace the arrow containers
  const ArrowAnimation = () => {
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: 10,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };

      animate();
    }, []);

    return (
      <View style={styles.arrowContainer}>
        <Animated.Text 
          style={[
            styles.arrow,
            {
              transform: [{ translateY }],
            },
          ]}
          accessible={true}
          accessibilityLabel="Scroll down indicator"
        >
          ↓
        </Animated.Text>
      </View>
    );
  };
  

  const ListHeader = () => (
    <>
     
        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/wins.png')}
            style={styles.headerImage}
            accessible={true}
            accessibilityLabel="Three self-advocates holding a trophy, a flag, and a medal"
          />
        </View>
        <View style={styles.headerRow}>
        <Text style={styles.headerText}>Welcome to Self-Advocacy Wins! This is your home feed where you can see what your friends have posted.</Text>

        </View>
        <View style={styles.headerRow}>
        <View style={styles.headerSmallContent}>
          <View style={styles.headerIconContainer}>
          <TouchableWithoutFeedback onPress={animatePress}>
            <Animated.Image 
              source={require('../../assets/clapping.png')} 
              style={[
                styles.headerIcon,
                {
                  transform: [{ scale: clapScale }]
                }
              ]}
              accessible={true}
              accessibilityLabel="the clapping hands emoji"
            />
          </TouchableWithoutFeedback>
          </View>
          <View style={styles.headerTextContainer}>
          <Text style={styles.headerText}>tap the clapping emoji to cheer people on</Text>
          </View>
        </View>

        <View style={styles.headerSmallContent}>
          <View style={styles.headerIconContainer}>
          <TouchableWithoutFeedback onPress={animatePress}>
            <Animated.Image 
              source={require('../../assets/new-comment.png')} 
              style={[
                styles.headerIcon,
                {
                  transform: [{ scale: clapScale }]
                }
              ]}
              accessible={true}
              accessibilityLabel="a new comment icon"
            />
          </TouchableWithoutFeedback>
          </View>
          <View style={styles.headerTextContainer}>
          <Text style={styles.headerText}>tap the comment icon to leave a positive comment</Text>
          </View>
        </View> 
        </View>       
    
      <View style={styles.headerScroll}>
          <Text style={styles.scrollText}>scroll down to see your friends' wins</Text>
          <ArrowAnimation />
        </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={ListHeader}
        data={wins}
        renderItem={({ item }) => (
          <View
            accessible={true}
            accessibilityLabel={`Win by ${item.userName || 'Unknown user'}`}
            accessibilityHint="Double tap to view details"
          >
            <WinCard win={item} />
          </View>
        )}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#24269B']}
            accessible={true}
            accessibilityLabel={refreshing ? 'Refreshing wins' : 'Pull to refresh'}
            accessibilityHint="Pull down to refresh the list of wins"
            accessibilityRole="adjustable"
          />
        }
        contentContainerStyle={styles.listContent}
        accessible={true}
        accessibilityLabel={`List of ${wins.length} wins`}
        accessibilityHint="Scroll to view more wins"
      />
    </View>
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
  listContent: {
    paddingVertical: 10,
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
  sectionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#24269B',
    flex: 1,
  },
  sectionContainer: {
    padding: 20,
  },
  sectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginRight: 12,
  },
  arrowContainer: {
    alignItems: 'center',
    height: 140,
    width: 40,
  
  },
  arrow: {
    fontSize: 100,
    color: '#24269B',
    fontWeight: 'bold',
  },
  headerContainer: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  headerSmallContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#24269B',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 5,
    marginVertical: 5,
  },
  headerIconContainer: {
    alignItems: 'center',
    marginBottom: 5,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerImage: {
    width: 300,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  headerIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  headerScroll: {
    alignItems: 'center',
    marginTop: 22,
  },
  scrollText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#24269B',
    borderRadius: 10,
    padding: 10,
  },
});

export default MainScreen;