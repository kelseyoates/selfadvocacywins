import React, { useState, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
import { auth, db, storage } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import globalStyles from '../styles/styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import QuestionCard from '../components/QuestionCard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import WinCard from '../components/WinCard';

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
  const [userData, setUserData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedState, setSelectedState] = useState('');

  // Add birthdate state variables
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Constants for date selection
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const years = Array.from(
    { length: 100 },
    (_, i) => (new Date().getFullYear() - i).toString()
  ).filter(year => year >= 1924);

  // Use the passed profileUserId if available, otherwise show current user's profile
  const targetUserId = (profileUserId || user?.uid)?.toLowerCase();

  // Load birthdate from userData when it's available
  useEffect(() => {
    if (userData?.birthdate) {
      const date = new Date(userData.birthdate);
      setMonth(months[date.getMonth()]);
      setDay(date.getDate().toString());
      setYear(date.getFullYear().toString());
    }
  }, [userData]);

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
      <View style={styles.stateContainer}>
        <Text style={styles.stateLabel}>📍 Your State</Text>
        
        <TouchableOpacity 
          style={styles.stateButton}
          onPress={() => setModalVisible(true)}
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
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Your State</Text>
              <ScrollView>
                {US_STATES.map((state) => (
                  <TouchableOpacity
                    key={state}
                    style={[
                      styles.stateOption,
                      selectedState === state && styles.selectedStateOption
                    ]}
                    onPress={() => {
                      setSelectedState(state);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.stateOptionText,
                      selectedState === state && styles.selectedStateOptionText
                    ]}>
                      {state}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderPersonalInfo = () => (
    <View style={styles.personalInfoContainer}>
      {renderBirthdateSelectors()}
    </View>
  );

  const renderBirthdateSelectors = () => (
    <View style={styles.birthdateContainer}>
      <Text style={styles.label}>Birthdate</Text>
      <View style={styles.datePickersRow}>
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setShowMonthPicker(true)}
        >
          <Text style={styles.datePickerButtonText}>
            {month || 'Month'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setShowDayPicker(true)}
        >
          <Text style={styles.datePickerButtonText}>
            {day || 'Day'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setShowYearPicker(true)}
        >
          <Text style={styles.datePickerButtonText}>
            {year || 'Year'}
          </Text>
        </TouchableOpacity>
      </View>

      {showMonthPicker && renderPicker(months, month, setMonth, () => setShowMonthPicker(false))}
      {showDayPicker && renderPicker(days, day, setDay, () => setShowDayPicker(false))}
      {showYearPicker && renderPicker(years, year, setYear, () => setShowYearPicker(false))}
    </View>
  );

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

  const renderMenuSection = () => (
    <View style={styles.menuSection}>
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('EditProfile')}
      >
        <MaterialCommunityIcons name="account-edit" size={24} color="#24269B" />
        <Text style={styles.menuItemText}>Edit Profile</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('Settings')}
      >
        <MaterialCommunityIcons name="cog" size={24} color="#24269B" />
        <Text style={styles.menuItemText}>Settings</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.menuItem, styles.signOutItem]}
        onPress={handleSignOut}
      >
        <MaterialCommunityIcons name="logout" size={24} color="#FF3B30" />
        <Text style={[styles.menuItemText, styles.signOutText]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', error.message);
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
      presetWords: ["Special Olympics", "Best Buddies", "sports", "theater", "watching movies", "art", "dancing", "playing with my dog", "gaming", "listening to music", "hang with friends", "traveling", "reading", "cooking", "photography", "writing", "playing with my dog"]
    },
    {
      id: 3,
      question: "What I\'m like as a friend 🤝:",
      presetWords: ["supportive", "fun", "honest", "loyal", "trustworthy", "caring", "spontaneous", "funny", "dependable", "patient", "open-minded", "positive"]
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
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Image
          source={
            userData?.profilePicture 
              ? { uri: userData.profilePicture } 
              : require('../../assets/default-profile.png')
          }
          style={styles.profilePicture}
          onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
          onLoad={() => console.log('Image loaded successfully')}
        />

        <View style={styles.userInfo}>
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

          
          {profileUserId === user?.uid && (
            <TouchableOpacity
              onPress={handleEditProfile}
              style={styles.editProfileButton}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>


      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Image 
            source={require('../../assets/wins.png')} 
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

      {!profileUserId ? ( // Only show these sections for own profile
        <>
          {renderStateSelector()}
          {renderPersonalInfo()}
          {renderMenuSection()}
        </>
      ) : null}

      <View style={styles.questionSection}>
        <Text style={styles.sectionTitle}>My Profile</Text>
        {questions.map(q => {
          const existingAnswer = getLatestAnswer(q.question);
          return (
            <View key={q.id} style={styles.questionContainer}>
              <QuestionCard
                question={q.question}
                presetWords={q.presetWords}
                onSave={handleAnswerSave}
                existingAnswer={existingAnswer}
                readOnly={!!profileUserId} // Make read-only when viewing other profiles
              />
            </View>
          );
        })}
      </View>


      <View style={styles.winsContainer}>
        <Text style={styles.sectionTitle}>Wins({wins.length})</Text>
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
  modalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 15,
    textAlign: 'center',
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
    justifyContent: 'flex-end',
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
    marginBottom: 20,
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
    borderColor: '#000000',
  },
  datePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#fff',
  },
  datePickerButtonText: {
    textAlign: 'center',
    color: '#000',
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
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    color: '#666',
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
  backgroundColor: '#fff',
  padding: 15,
  marginHorizontal: 10,
  marginVertical: 10,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  borderWidth: 1,
  borderColor: '#000000',
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

});

export default ProfileScreen;