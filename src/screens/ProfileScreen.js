import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  AccessibilityInfo
} from 'react-native';
import { auth, db, storage } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import QuestionCard from '../components/QuestionCard';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import WinCard from '../components/WinCard';
import { CometChat } from '@cometchat-pro/react-native-chat';
import { checkCometChatState, cleanupCometChat } from '../services/cometChat';
import StateDropdown from '../components/StateDropdown';
import { useAccessibility } from '../context/AccessibilityContext';




const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const ProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { profileUserId } = route.params || {};
  const { user } = useAuth();
  const { showHelpers } = useAccessibility();
  
  // Accessibility-related state and refs
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [lastAnnouncedMessage, setLastAnnouncedMessage] = useState('');
  const profileImageRef = useRef(null);
  const statsRef = useRef(null);

  // Other state variables
  const [userData, setUserData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedState, setSelectedState] = useState('');

  // Add birthdate state variables
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedYear, setSelectedYear] = useState('');



  // Add accessibility check effect
  useEffect(() => {
    const checkAccessibility = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
    };

    checkAccessibility();
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Add accessibility announcement helper
  const announceUpdate = (message) => {
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  // Generate arrays for the pickers
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: 100 }, 
    (_, i) => (currentYear - i).toString()
  );

  // Use the passed profileUserId if available, otherwise show current user's profile
  const targetUserId = (profileUserId || user?.uid)?.toLowerCase();

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [initialBirthdate, setInitialBirthdate] = useState(null);
  const [shouldUpdate, setShouldUpdate] = useState(false);




  // Add a ref to track if this is the initial set of values
  const isSettingInitialValues = useRef(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        isSettingInitialValues.current = true;
        setIsInitialLoad(true);
        const userDoc = await getDoc(doc(db, 'users', targetUserId));
        const data = userDoc.data();
        
        setUserData(data);
        
        if (data?.birthdate) {
          const [year, month, day] = data.birthdate.split('-');
          const monthName = months[parseInt(month) - 1];
          
          setSelectedDay(day);
          setSelectedMonth(monthName);
          setSelectedYear(year);
          setInitialBirthdate(data.birthdate);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setTimeout(() => {
          setIsInitialLoad(false);
          isSettingInitialValues.current = false;
        }, 1000);
      }
    };

    fetchUserData();
  }, [targetUserId]);

  const updateBirthdateWithValues = async (day, month, year) => {
    // Multiple checks to prevent automatic updates
    if (isInitialLoad || !shouldUpdate) {
      console.log('Skipping update: initial load or update not requested');
      return;
    }

    console.log('Starting manual birthdate update with:', {
      day,
      month,
      year,
      isInitialLoad,
      shouldUpdate
    });

    if (month && day && year) {
      try {
        const paddedDay = day.toString().padStart(2, '0');
        const monthIndex = months.indexOf(month);
        const paddedMonth = (monthIndex + 1).toString().padStart(2, '0');
        const birthdate = `${year}-${paddedMonth}-${paddedDay}`;

        if (birthdate === initialBirthdate) {
          console.log('Birthday unchanged, skipping update');
          return;
        }

        const userRef = doc(db, 'users', targetUserId);
        await updateDoc(userRef, {
          birthdate: birthdate
        });
        
        setUserData(prev => ({
          ...prev,
          birthdate
        }));
        
        setInitialBirthdate(birthdate);
        setShouldUpdate(false); // Reset update flag
        Alert.alert('Success', 'Birthday updated successfully');
      } catch (error) {
        console.error('Error updating birthdate:', error);
        Alert.alert('Error', 'Failed to update birthday');
      }
    }
  };

  // Add this function to handle the save button press
  const handleSaveBirthdate = () => {
    setShouldUpdate(true);
    updateBirthdateWithValues(selectedDay, selectedMonth, selectedYear);
  };

  useEffect(() => {
    console.log('DEBUG: ProfileScreen - Loading profile for:', {
      profileUserId,
      currentUserId: user?.uid,
      targetUserId,
      hasRouteParams: !!route.params
    });

    if (!targetUserId) {
      console.log('DEBUG: No targetUserId available');
      return;
    }

    const fetchProfileData = async () => {
      try {
        // Get user profile data
        const userRef = doc(db, 'users', targetUserId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('DEBUG: Got profile data:', {
            username: data.username,
            state: data.state
          });
          setUserData(data);
          setAnswers(data.questionAnswers || []);
          
          // Only fetch wins if viewing own profile
          if (!profileUserId) {
            await fetchUserWins();
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [targetUserId]);

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePicture = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      if (!targetUserId) throw new Error('No user ID available');

      const storageRef = ref(storage, `profilePictures/${targetUserId}.jpg`);
      
      const snapshot = await uploadBytes(storageRef, blob);
      console.log('Uploaded successfully');

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL:', downloadURL);
      
      await updateDoc(doc(db, 'users', targetUserId), {
        profilePicture: downloadURL
      });

      setUserData(prev => ({
        ...prev,
        profilePicture: downloadURL
      }));

      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to update profile picture: ' + error.message);
    }
  };

  const renderStateSelector = () => {
    return (
      <View 
        style={styles.stateContainer}
        accessible={true}
        accessibilityLabel="State selection section"
      >
        <Text style={styles.stateLabel}>📍 Your State</Text>
        
        <TouchableOpacity 
          style={styles.stateButton}
          onPress={() => setModalVisible(true)}
          accessible={true}
          accessibilityLabel={`Current state: ${selectedState || 'None selected'}. Double tap to change`}
          accessibilityHint="Opens state selection modal"
          accessibilityRole="button"
        >
          <Text style={styles.stateButtonText}>
            {selectedState || 'Select your state'}
          </Text>
        </TouchableOpacity>

        {selectedState && (
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={saveState}
          >
            <Text style={styles.buttonText}>Save State</Text>
          </TouchableOpacity>
        )}

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your State</Text>
                <TouchableOpacity 
                  style={styles.closeModalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeModalButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.stateListContainer}>
                {US_STATES.map((state) => (
                  <TouchableOpacity
                    key={state}
                    style={styles.stateItem}
                    onPress={() => {
                      setSelectedState(state);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.stateItemText}>{state}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderPersonalInfo = () => (
    <View style={styles.personalInfoContainer}>
      {renderBirthdateSelectors()}
    </View>
  );

  // Modify the handlers to prevent updates during initial load
  const handleMonthSelect = (month) => {
    if (isSettingInitialValues.current) return;
    setSelectedMonth(month);
    setShowMonthPicker(false);
  };

  const handleDaySelect = (day) => {
    if (isSettingInitialValues.current) return;
    setSelectedDay(day);
    setShowDayPicker(false);
  };

  const handleYearSelect = (year) => {
    if (isSettingInitialValues.current) return;
    setSelectedYear(year);
    setShowYearPicker(false);
  };

  // Update your picker render code to use these new handlers
  const renderBirthdateSelectors = () => {
    return (
      <View 
        style={styles.birthdateContainer}
        accessible={true}
        accessibilityLabel="Birthday selection section"
      >
        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowMonthPicker(true)}
          accessible={true}
          accessibilityLabel={`Month: ${selectedMonth || 'Not selected'}. Double tap to change`}
          accessibilityHint="Opens month selection picker"
          accessibilityRole="button"
        >
          <Text style={styles.pickerButtonText}>
            {selectedMonth || 'Month'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowDayPicker(true)}
          accessible={true}
          accessibilityLabel={`Day: ${selectedDay || 'Not selected'}. Double tap to change`}
          accessibilityHint="Opens day selection picker"
          accessibilityRole="button"
        >
          <Text style={styles.pickerButtonText}>
            {selectedDay || 'Day'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowYearPicker(true)}
          accessible={true}
          accessibilityLabel={`Year: ${selectedYear || 'Not selected'}. Double tap to change`}
          accessibilityHint="Opens year selection picker"
          accessibilityRole="button"
        >
          <Text style={styles.pickerButtonText}>
            {selectedYear || 'Year'}
          </Text>
        </TouchableOpacity>

        {/* Add Save button
        {selectedMonth && selectedDay && selectedYear && (
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveBirthdate}
          >
            <Text style={styles.saveButtonText}>Save Birthday</Text>
          </TouchableOpacity>
        )} */}

        {/* Your existing picker modals with updated handlers */}
        {showMonthPicker && renderPicker(
          months,
          selectedMonth,
          handleMonthSelect,
          () => setShowMonthPicker(false)
        )}

        {showDayPicker && renderPicker(
          days,
          selectedDay,
          handleDaySelect,
          () => setShowDayPicker(false)
        )}

        {showYearPicker && renderPicker(
          years,
          selectedYear,
          handleYearSelect,
          () => setShowYearPicker(false)
        )}
      </View>
    );
  };

  const saveState = async () => {
    if (!targetUserId) {
      Alert.alert('Error', 'User document not found');
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, {
        state: selectedState,
      });
      Alert.alert('Success', 'State saved successfully');
    } catch (error) {
      console.error('Error saving state:', error);
      Alert.alert('Error', 'Failed to save state');
    }
  };




  const questions = [
    {
      id: 1,
      question: "A little bit about me 😀:",
      presetWords: ["fun", "smart", "athletic", "funny", "kind", "silly", "serious", "independent", "ambitious", "caring", "creative", "thoughtful", "adventurous"]
    },
    {
      id: 2,
      question: "What I like to do for fun 🎉:",
      presetWords: ["Special Olympics", "Best Buddies", "sports", "theater", "watching movies", "art", "dancing", "playing with my dog", "gaming", "listening to music", "hang with friends", "traveling", "reading", "cooking", "photography", "writing"]
    },
    {
      id: 3,
      question: "What I'm like as a friend 🤝:",
      presetWords: ["supportive", "hilarious", "honest", "loyal", "trustworthy", "caring", "spontaneous", "very fun", "dependable", "patient", "open-minded", "positive"]
    },
    {
      id: 4,
      question: "What my future goals are 🎯:",
      presetWords: ["live with friends", "finish school", "make friends", "get healthy", "get a job", "learn new things", "start a business", "find love", "get a pet", "travel", "make a difference", "make money"]
    },
    {
      id: 5,
      question: "What I'm most proud of 🔥:",
      presetWords: ["finishing school", "playing sports", "making friends", "getting a job", "trying new things", "dating", "traveling", "being a good friend", "being in my family", "helping people", "my art"]
    },
    {
      id: 6,
      question: "If I won the lottery, I would 💰:",
      presetWords: ["travel the world", "buy a house", "buy a car", "buy a boat", "start a business", "buy my friends gifts", "buy my family gifts", "give to charity", "own a sports team", "buy a hot tub", "fly first class"]
    },
    // Dating questions - only visible with selfAdvocateDating subscription
    {
      id: 7,
      question: "What I'm like as a partner 💝:",
      presetWords: ["caring", "dependable", "honest", "kind", "loving", "loyal", "respectful", "supportive", "thoughtful", "understanding"],
      isDatingQuestion: true
    },
    {
      id: 8,
      question: "My ideal first date would be 🌟:",
      presetWords: ["coffee", "dinner", "lunch", "movies", "museum", "park", "picnic", "walk", "zoo"],
      isDatingQuestion: true
    },
    {
      id: 9,
      question: "My favorite date activities are 🎉:",
      presetWords: ["bowling", "cooking", "dancing", "dining out", "hiking", "movies", "music", "sports", "walking", "watching movies"],
      isDatingQuestion: true
    },
  ];

  const getLatestAnswer = (question) => {
    if (!answers) return null;
    
    const questionAnswers = answers.filter(a => a.question === question);
    if (questionAnswers.length === 0) return null;
    
    // Sort by timestamp and get the most recent
    return questionAnswers.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )[0];
  };

  const handleAnswerSave = async (newAnswer) => {
    try {
      if (!targetUserId) {
        console.error('No user ID available');
        return;
      }

      // Add timestamp to the answer
      const answerWithTimestamp = {
        ...newAnswer,
        timestamp: new Date().toISOString()
      };

      // Get current answers array from Firestore
      const userRef = doc(db, 'users', targetUserId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('User document not found');
        return;
      }

      // Get existing answers or initialize empty array
      const currentAnswers = userDoc.data().questionAnswers || [];

      // Add new answer to the array
      const updatedAnswers = [...currentAnswers, answerWithTimestamp];

      // Update Firestore
      await updateDoc(userRef, {
        questionAnswers: updatedAnswers
      });

      // Update local state
      setAnswers(updatedAnswers);

      console.log('Answer saved successfully');
    } catch (error) {
      console.error('Error saving answer:', error);
      Alert.alert('Error', 'Failed to save your answer');
    }
  };


  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUserWins = async () => {
    try {
      console.log('Fetching wins for user:', targetUserId);
      
      const winsQuery = query(
        collection(db, 'wins'),
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(winsQuery);
      console.log(`Found ${querySnapshot.size} wins`);
      
      const userWins = [];
      
      querySnapshot.docs.forEach(doc => {
        const win = { id: doc.id, ...doc.data() };
        userWins.push(win);
      });

      setWins(userWins);

    } catch (error) {
      console.error('Error fetching wins:', error);
    }
  };

  // Add this useEffect to refresh wins when needed
  useEffect(() => {
    if (targetUserId) {
      fetchUserWins();
    }
  }, [refreshKey, targetUserId]);

  // Add this useEffect to listen for wins collection changes
  useEffect(() => {
    if (!targetUserId) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'wins'),
        where('userId', '==', targetUserId)
      ),
      (snapshot) => {
        console.log('Wins collection updated');
        setRefreshKey(prev => prev + 1);
      }
    );

    return () => unsubscribe();
  }, [targetUserId]);

  const handleDayPress = async (day) => {
    console.log('Day pressed:', day);
    await fetchWinsForDate(day.dateString);
  };

  const formatBirthday = (dateString) => {
    if (!dateString) return '';
    
    // Parse the date string (which is already in YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    
    // Create a new date (months are 0-based in JavaScript)
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const [showComments, setShowComments] = useState(false);
  const [selectedWin, setSelectedWin] = useState(null);
  const [commentUsers, setCommentUsers] = useState({});

  const renderCommentModal = () => {
    if (!selectedWin) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showComments}
        onRequestClose={() => {
          setShowComments(false);
          setSelectedWin(null);
          setCommentUsers({});
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.commentModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowComments(false);
                  setSelectedWin(null);
                  setCommentUsers({});
                }}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.commentsList}>
              {selectedWin.comments && selectedWin.comments.length > 0 ? (
                selectedWin.comments.map((comment, index) => {
                  const userData = commentUsers[comment.userId];
                  return (
                    <View key={index} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <Image
                          source={
                            userData?.profilePicture
                              ? { uri: userData.profilePicture }
                              : require('../../assets/default-profile.png')
                          }
                          style={styles.commentUserImage}
                        />
                        <View style={styles.commentUserInfo}>
                          <Text style={styles.commentUsername}>
                            {userData?.username || 'Loading...'}
                          </Text>
                          <Text style={styles.commentTime}>
                            {formatDate(comment.timestamp || comment.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noComments}>No comments yet</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date from timestamp:', timestamp);
        return '';
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.log('Error formatting date:', error, 'for timestamp:', timestamp);
      return '';
    }
  };

  // Add this function to fetch user data for comments
  const fetchCommentUserData = async (comments) => {
    try {
      console.log('Starting to fetch comment user data');
      const userPromises = comments.map(async (comment) => {
        // Use the same approach as profile data fetching
        const userRef = doc(db, 'users', comment.userId.toLowerCase());
        console.log('Fetching user data for:', comment.userId.toLowerCase());
        
        try {
          const userSnapshot = await getDoc(userRef);
          console.log('User snapshot exists:', userSnapshot.exists());
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            console.log('Found user data:', userData);
            return {
              userId: comment.userId,
              userData: {
                username: userData.username,
                state: userData.state,
                profilePicture: userData.profilePicture
              }
            };
          }
        } catch (e) {
          console.error('Error fetching user:', e);
        }
        return null;
      });

      const users = await Promise.all(userPromises);
      const userDataMap = {};
      users.forEach(user => {
        if (user) {
          userDataMap[user.userId] = user.userData;
        }
      });
      
      console.log('Final user data map:', userDataMap);
      setCommentUsers(userDataMap);
    } catch (error) {
      console.error('Error in fetchCommentUserData:', error);
    }
  };

  // Update the handleShowComments to be async and await the fetch
  const handleShowComments = async (win) => {
    try {
      console.log('Showing comments for win:', win.id);
      setSelectedWin(win);
      setShowComments(true);
      
      if (win.comments && win.comments.length > 0) {
        console.log('Found comments:', win.comments);
        await fetchCommentUserData(win.comments);
      }
    } catch (error) {
      console.error('Error in handleShowComments:', error);
    }
  };

  // Add this function to calculate total cheers and comments
  const calculateStats = (userWins) => {
    return userWins.reduce((acc, win) => {
      acc.totalCheers += win.cheers || 0;
      acc.totalComments += (win.comments?.length || 0);
      return acc;
    }, { totalCheers: 0, totalComments: 0 });
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleProfilePictureUpdate = async () => {
    try {
      announceUpdate('Opening image picker');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        announceUpdate('Uploading new profile picture');
        setIsUploading(true);
        const imageUri = result.assets[0].uri;

        // Convert URI to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const storageRef = ref(storage, `profilePictures/${userData.uid}.jpg`);
        await uploadBytes(storageRef, blob);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Update Firestore
        const userRef = doc(db, 'users', userData.uid);
        await updateDoc(userRef, {
          profilePicture: downloadURL
        });

        // Update CometChat user
        try {
          const user = new CometChat.User(userData.uid);
          user.setAvatar(downloadURL);
          await CometChat.updateCurrentUserDetails(user);
          console.log('CometChat profile updated successfully');
        } catch (cometChatError) {
          console.error('CometChat update error:', cometChatError);
          // Continue even if CometChat update fails
        }

        // Update local state
        setUserData(prev => ({
          ...prev,
          profilePicture: downloadURL
        }));

        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  // Add these state variables
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Add this function to handle date changes
  const onDateChange = (event, selectedDate) => {
    if (selectedDate) {
      // Calculate age
      const today = new Date();
      let age = today.getFullYear() - selectedDate.getFullYear();
      if (today.getMonth() < selectedDate.getMonth() || 
          (today.getMonth() === selectedDate.getMonth() && today.getDate() < selectedDate.getDate())) {
        age--;
      }

      // Update state
      setSelectedDate(selectedDate);
      setUserData(prev => ({
        ...prev,
        birthdate: selectedDate.toISOString().split('T')[0],
        age: age
      }));
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  // Add this function to show the date picker
  const showPicker = () => {
    setShowDatePicker(true);
  };

  const renderPicker = (items, selectedValue, onSelect, onClose) => {
    return (
      <Modal
        transparent={true}
        visible={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {items.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.pickerItem,
                    selectedValue === item && styles.selectedItem
                  ]}
                  onPress={() => {
                    console.log('Selected value in picker:', item);
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedValue === item && styles.selectedItemText
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Add this function to your ProfileScreen component
  const updateBirthdate = async () => {
    // Get the latest state values at the time of the update
    const currentState = {
      day: selectedDay,
      month: selectedMonth,
      year: selectedYear
    };
    
    console.log('Starting updateBirthdate with latest state:', currentState);

    if (currentState.month && currentState.day && currentState.year) {
      try {
        const paddedDay = currentState.day.toString().padStart(2, '0');
        const monthIndex = months.indexOf(currentState.month);
        const paddedMonth = (monthIndex + 1).toString().padStart(2, '0');
        
        const birthdate = `${currentState.year}-${paddedMonth}-${paddedDay}`;
        console.log('About to save birthdate:', birthdate);
        
        const userRef = doc(db, 'users', targetUserId);
        await updateDoc(userRef, {
          birthdate: birthdate
        });
        
        console.log('Successfully updated Firestore with:', birthdate);
        
        setUserData(prev => ({
          ...prev,
          birthdate
        }));
        
        Alert.alert('Success', 'Birthday updated successfully');
      } catch (error) {
        console.error('Error updating birthdate:', error);
        Alert.alert('Error', 'Failed to update birthday');
      }
    } else {
      console.log('Missing required date information:', currentState);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const refreshUserData = async () => {
        if (!user?.uid) return;
        
        try {
          const userRef = doc(db, 'users', user.uid.toLowerCase());
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            console.log('Refreshed user data:', data);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      };

      refreshUserData();
    }, [user])
  );

  // Filter questions based on subscription
  const visibleQuestions = questions.filter(q => 
    !q.isDatingQuestion || (q.isDatingQuestion && userData?.subscriptionType === 'selfAdvocateDating')
  );

  useEffect(() => {
    const checkChat = async () => {
      const chatState = await checkCometChatState();
      console.log('CometChat state in ProfileScreen:', chatState);
    };
    
    checkChat();

    return () => {
      // Optional: cleanup when leaving profile screen
      // cleanupCometChat();
    };
  }, []);

  // Add this useEffect to check for screen reader
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
    };

    checkScreenReader();

    // Listen for screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      // Clean up subscription on unmount
      subscription.remove();
    };
  }, []);

  // Add helper function for accessibility announcements
  const announceMessage = (message) => {
    if (isScreenReaderEnabled && message !== lastAnnouncedMessage) {
      AccessibilityInfo.announceForAccessibility(message);
      setLastAnnouncedMessage(message);
    }
  };

  // Add these accessibility helper functions
  const announceDateSelection = (type, value) => {
    if (isScreenReaderEnabled) {
      let message = '';
      switch (type) {
        case 'month':
          message = `Selected month: ${value}`;
          break;
        case 'day':
          message = `Selected day: ${value}`;
          break;
        case 'year':
          message = `Selected year: ${value}`;
          break;
      }
      AccessibilityInfo.announceForAccessibility(message);
      setLastAnnouncedMessage(message);
    }
  };

  const formatDateForAccessibility = () => {
    if (selectedMonth && selectedDay && selectedYear) {
      return `Birth date: ${selectedMonth} ${selectedDay}, ${selectedYear}`;
    }
    return 'Birth date not set';
  };

  // Add this function to handle picker visibility with accessibility
  const togglePicker = (pickerType, isVisible) => {
    switch (pickerType) {
      case 'month':
        setShowMonthPicker(isVisible);
        if (isScreenReaderEnabled) {
          AccessibilityInfo.announceForAccessibility(
            isVisible ? 'Month picker opened' : 'Month picker closed'
          );
        }
        break;
      case 'day':
        setShowDayPicker(isVisible);
        if (isScreenReaderEnabled) {
          AccessibilityInfo.announceForAccessibility(
            isVisible ? 'Day picker opened' : 'Day picker closed'
          );
        }
        break;
      case 'year':
        setShowYearPicker(isVisible);
        if (isScreenReaderEnabled) {
          AccessibilityInfo.announceForAccessibility(
            isVisible ? 'Year picker opened' : 'Year picker closed'
          );
        }
        break;
    }
  };

  // Add this function to handle profile updates with accessibility
  const handleProfileUpdate = async () => {
    try {
      setIsUpdatingProfile(true);
      if (isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Updating profile...');
      }

      // Your existing profile update logic here

      if (isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Profile updated successfully');
      }
    } catch (error) {
      if (isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Error updating profile');
      }
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Add to your utility functions
  const hasGoodContrast = (color1, color2) => {
    // Implement WCAG contrast ratio calculation
    // Return true if contrast ratio is at least 4.5:1
  };

  if (!user && !profileUserId) {
    return (
      <View style={styles.container}>
        <Text>Please log in to view your profile</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Profile screen"
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
          <Text style={styles.helperTextBold}>
            Your Profile Picture
          </Text>
          <Text style={styles.helperText}>
            This image is your profile picture. Tap the circle to upload or change your profile picture.
          </Text>
        </View>
      )}

      <View style={styles.profileHeader}>
        <TouchableOpacity 
          ref={profileImageRef}
          onPress={handleProfilePictureUpdate}
          disabled={isUploading}
          style={styles.profileImageContainer}
          accessible={true}
          accessibilityLabel={`Profile picture for ${userData?.username || 'User'}. Double tap to change`}
          accessibilityHint="Opens image picker to select new profile picture"
          accessibilityRole="button"
        >
          <Image
            source={{ 
              uri: userData?.profilePicture || 'https://www.gravatar.com/avatar'
            }}
            style={styles.profileImage}
          />
          {isUploading ? (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View style={styles.editOverlay}>
              <Text style={styles.editText}>Edit</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <View 
          style={styles.userInfo}
          accessible={true}
          accessibilityLabel={`Profile information for ${userData?.username || 'User'}`}
        >
          <Text style={styles.username}>{userData?.username || 'User'}</Text>
          
         
          {/* State */}
          {userData?.state && (
            <Text style={styles.infoText}>📍 {userData.state}</Text>
          )}
          
          {/* Birthday */}
          {userData?.birthdate && (
            <Text style={styles.infoText}>
              🎂 {formatBirthday(userData.birthdate)}
            </Text>
          )}

    
        </View>
      </View>

     

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
          <Text style={styles.helperTextBold}>
            Your Stats
          </Text>
          <Text style={styles.helperText}>
            Your stats show your total number of wins, how many cheers you've received, and how many comments people have left on your wins. They will automatically update.
          </Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Image 
            source={require('../../assets/wins-stats.png')} 
            style={styles.statIcon}
          />
          <Text style={styles.statNumber}>{wins.length}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>

        <View style={styles.statItem}>
          <Image 
            source={require('../../assets/cheers.png')} 
            style={styles.statIcon}
          />
          <Text style={styles.statNumber}>
            {calculateStats(wins).totalCheers}
          </Text>
          <Text style={styles.statLabel}>Cheers</Text>
        </View>

        <View style={styles.statItem}>
          <Image 
            source={require('../../assets/comments.png')} 
            style={styles.statIcon}
          />
          <Text style={styles.statNumber}>
            {calculateStats(wins).totalComments}
          </Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
      </View>

      {showHelpers && !profileUserId && (
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
          <Text style={styles.helperTextBold}>
            Your State
          </Text>
          <Text style={styles.helperText}>
            Select your state to help other people find you better in the Find a Friend feature.
          </Text>
        </View>
      )}

  
      {!profileUserId ? ( // Only show these sections for own profile
        <>
          <StateDropdown
            selectedState={userData.state}
            onStateSelect={(state) => setUserData(prev => ({ ...prev, state }))}
            style={styles.stateDropdown}
          />

{showHelpers && !profileUserId && (
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
          <Text style={styles.helperTextBold}>
            Your Birthday
          </Text>
          <Text style={styles.helperText}>
            Tap to select your birthday. This helps people find you better in the Find a Friend feature.
          </Text>
        </View>
      )}

          {renderPersonalInfo()}
        </>
      ) : null}


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
          <Text style={styles.helperTextBold}>
            Your Profile Questions
          </Text>
          <Text style={styles.helperText}>
            Answer these questions to tell people about yourself. You can:
          </Text>
          <View style={styles.helperList}>
            <Text style={styles.helperListItem}>• Tap the pencil icon to write your own answer.</Text>
            <Text style={styles.helperListItem}>• Tap the list icon to pick from suggested words.</Text>
            <Text style={styles.helperListItem}>• Tap the video icon to record a video answer.</Text>
            <Text style={styles.helperListItem}>If you subscribe to the Dating plan, you will see questions about dating here as well.</Text>
          </View>
        </View>
      )}

      <View style={styles.questionSection}>
        <Text style={styles.sectionTitle}>My Profile</Text>
        {visibleQuestions.map((question) => (
          <View key={question.id} style={styles.questionContainer}>
            <QuestionCard
              question={question.question}
              presetWords={question.presetWords}
              onSave={handleAnswerSave}
              existingAnswer={getLatestAnswer(question.question)}
              readOnly={!!profileUserId} // Make read-only when viewing other profiles
              isDatingQuestion={question.isDatingQuestion}
            />
          </View>
        ))}
      </View>

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
          <Text style={styles.helperTextBold}>
            Your Win History
          </Text>
          <Text style={styles.helperText}>
            View all of your previous wins here.
          </Text>
        </View>
      )}

      <View style={styles.winsContainer}>
        <Text style={styles.sectionTitle}>My Win History</Text>
        {wins && wins.length > 0 ? (
          wins.map((win) => (
            <WinCard 
              key={win.id} 
              win={win}
              onCheersPress={() => handleCheersPress(win)}
              onCommentsPress={() => handleCommentsPress(win)}
              lazyLoad={true}
            />
          ))
        ) : (
          <Text style={styles.noWinsText}>No wins yet</Text>
        )}
      </View>

      {renderCommentModal()}

   
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#000000',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#24269B',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  menuSection: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
  },
  signOutItem: {
    marginTop: 20,
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#FF3B30',
  },
  
  stateContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#000000',
  },
  stateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 10,
  },
  stateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
  },
  stateButtonText: {
    fontSize: 14,
    color: '#333',
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },

  stateOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedStateOption: {
    backgroundColor: '#24269B',
  },
  stateOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedStateOptionText: {
    color: '#fff',
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  commentModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24269B',
  },
  winsList: {
    padding: 10,
  },
  calendar: {
    marginBottom: 10,
  },
  debug: {
    padding: 10,
    fontSize: 12,
    color: '#666',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    height: '80%', // Make modal take up most of the screen
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  scrollView: {
    width: '100%',
    flex: 1, // This allows the ScrollView to take up available space
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#24269B',
    borderRadius: 8,
    width: '100%',
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  birthdateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  birthdateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    backgroundColor: '#fff',
  },
  birthdateText: {
    fontSize: 16,
  },
  webDateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    width: '100%',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    width: '100%',
    marginBottom: 10,
  },
  personalInfoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  datePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    maxHeight: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  pickerItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#24269B',
  },
  selectedPickerItem: {
    backgroundColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedPickerItemText: {
    color: '#24269B',
    fontWeight: 'bold',
  },
  userDetails: {
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },

sectionTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#24269B',
  marginBottom: 10,
  marginTop: 20,
  marginLeft: 10,
  marginRight: 10,
  marginBottom: 10,
  alignSelf: 'center',
},
winCard: {
  backgroundColor: 'white',
  borderRadius: 10,
  padding: 15,
  marginBottom: 15,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
winText: {
  fontSize: 16,
  marginBottom: 10,
},
winImage: {
  width: '100%',
  height: undefined,
  aspectRatio: 1, // This will adjust based on the actual image
  borderRadius: 8,
  marginVertical: 10,
},
winFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
winDate: {
  fontSize: 14,
  color: '#666',
},
winStats: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 15,
},
statText: {
  fontSize: 14,
  color: '#666',
},
questionsContainer: {
  padding: 15,
  backgroundColor: 'white',
  marginTop: 10,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
},
modalContent: {
  backgroundColor: 'white',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  maxHeight: '80%',
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  paddingBottom: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#24269B',
},
closeButton: {
  padding: 5,
},
commentItem: {
  marginBottom: 15,
  padding: 10,
  backgroundColor: '#f8f8f8',
  borderRadius: 10,
},
commentHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
commentUserImage: {
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 10,
},
commentUserInfo: {
  flex: 1,
  justifyContent: 'center',
},
commentUsername: {
  fontWeight: 'bold',
  fontSize: 14,
  color: '#24269B',
},
commentTime: {
  fontSize: 12,
  color: '#666',
  marginTop: 2,
},
commentText: {
  fontSize: 14,
  marginLeft: 50, // Aligns with the username
  color: '#333',
},
noComments: {
  textAlign: 'center',
  color: '#666',
  fontStyle: 'italic',
  marginTop: 20,
},
commentButton: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 5,
},

statsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
 
  padding: 15,
  marginHorizontal: 10,
  marginVertical: 10,
  
},

statItem: {
  alignItems: 'center',
  flex: 1,
},

statIcon: {
  width: 90,
  height: 90,
  marginBottom: 5,
},

statNumber: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#24269B',
  marginBottom: 2,
},

statLabel: {
  fontSize: 12,
  color: '#666',
},

profileImageContainer: {
  width: 150,
  height: 150,
  borderRadius: 75,
  overflow: 'hidden',
  marginBottom: 20,
},

profileImage: {
  width: '100%',
  height: '100%',
},

uploadingOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},

editOverlay: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: 8,
  alignItems: 'center',
},

editText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},

modalContainer: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},

modalContent: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 20,
},

pickerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},

pickerButton: {
  padding: 8,
},

pickerButtonText: {
  fontSize: 16,
  color: '#666',
},

datePickerIOS: {
  height: 200,
},

datingProfileContainer: {
  backgroundColor: '#fff',
  padding: 15,
  marginHorizontal: 10,
  marginVertical: 5,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  borderWidth: 1,
  borderColor: '#000000',
},

stateDropdown: {
  marginBottom: 16,
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
helperText: {
  fontSize: 16,
  color: '#333',
  lineHeight: 22,
  marginTop: 20,
},
helperList: {
  marginTop: 10,
  paddingLeft: 10,
},
helperListItem: {
  fontSize: 16,
  color: '#333',
  lineHeight: 22,
  marginBottom: 5,
},
helperTextBold: {
  fontSize: 18,
  color: '#24269B',
  fontWeight: 'bold',
},
});

export default ProfileScreen;