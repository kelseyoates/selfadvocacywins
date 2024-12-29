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
import { Calendar } from 'react-native-calendars';
import WinHistoryCard from '../components/WinHistoryCard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

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
      question: "What I would do if I won the lottery 💰:",
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

  const [showWinsModal, setShowWinsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateWins, setSelectedDateWins] = useState([]);

  const formatSelectedDate = (dateString) => {
    if (!dateString) return '';
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    try {
      // Assuming dateString is in format "2024-12-26"
      const [year, month, day] = dateString.split('-');
      return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
    } catch (error) {
      console.log("Date formatting error:", error, "for date:", dateString);
      return dateString;
    }
  };

  const fetchWinsForDate = async (date) => {
    try {
      console.log('Fetching wins for date:', date);
      const winsQuery = query(
        collection(db, 'wins'),
        where('userId', '==', targetUserId)
      );
      
      const querySnapshot = await getDocs(winsQuery);
      const wins = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(win => {
          if (win.localTimestamp?.date) {
            let winDate;
            if (win.localTimestamp.date.includes('/')) {
              const [month, day, year] = win.localTimestamp.date.split('/');
              winDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (win.localTimestamp.date.includes('-')) {
              winDate = win.localTimestamp.date;
            }
            console.log('Comparing dates:', { winDate, targetDate: date });
            return winDate === date;
          }
          return false;
        });
      
      console.log('Filtered wins:', wins);
      setSelectedDateWins(wins);
      setSelectedDate(date);
      setShowWinsModal(true);
    } catch (error) {
      console.error('Error fetching wins for date:', error);
    }
  };

  const renderWinsModal = () => (
    <Modal
      visible={showWinsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowWinsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Wins on {formatSelectedDate(selectedDate)}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowWinsModal(false)}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={selectedDateWins}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.winCardContainer}>
                <WinHistoryCard
                  win={item}
                  onPress={() => console.log('Win pressed:', item)}
                />
              </View>
            )}
            ListEmptyComponent={() => (
              <Text style={styles.noWinsText}>
                No wins recorded for this date
              </Text>
            )}
            contentContainerStyle={styles.winsList}
          />
        </View>
      </View>
    </Modal>
  );

  const [winDates, setWinDates] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUserWins = async () => {
    try {
      console.log('Fetching wins for user:', targetUserId); // Debug log
      
      const winsQuery = query(
        collection(db, 'wins'),
        where('userId', '==', targetUserId)
      );
      
      const querySnapshot = await getDocs(winsQuery);
      console.log(`Found ${querySnapshot.size} wins`); // Debug log
      
      const newMarkedDates = {};
      
      querySnapshot.docs.forEach(doc => {
        const win = doc.data();
        console.log('Processing win:', win); // Debug log
        
        if (win.localTimestamp?.date) {
          // Handle different date formats
          let formattedDate;
          if (win.localTimestamp.date.includes('/')) {
            const [month, day, year] = win.localTimestamp.date.split('/');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else if (win.localTimestamp.date.includes('-')) {
            formattedDate = win.localTimestamp.date;
          }
          
          if (formattedDate) {
            console.log('Adding mark for date:', formattedDate); // Debug log
            newMarkedDates[formattedDate] = {
              marked: true,
              dotColor: '#24269B',
              selected: true,
              selectedColor: '#E8E8FF'
            };
          }
        }
      });

      console.log('Final marked dates:', newMarkedDates); // Debug log
      setWinDates(newMarkedDates);

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

  const renderCalendarSection = () => (
    <View style={styles.calendarContainer}>
      <Text style={styles.sectionTitle}>🏆 Win History</Text>
      <Calendar
        style={styles.calendar}
        current={new Date().toISOString().split('T')[0]}
        minDate={'2024-01-01'}
        maxDate={'2024-12-31'}
        onDayPress={handleDayPress}
        markedDates={winDates}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#24269B',
          selectedDayBackgroundColor: '#24269B',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#24269B',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#24269B',
          selectedDotColor: '#ffffff',
          arrowColor: '#24269B',
          monthTextColor: '#24269B',
          indicatorColor: '#24269B'
        }}
      />
      {/* <Text style={styles.debug}>
        Debug - Marked Dates: {JSON.stringify(winDates, null, 2)}
      </Text> */}
    </View>
  );

  // Format birthdate function
  const formatBirthdate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
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
              🎂 {formatBirthdate(userData.birthdate)}
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

      {!profileUserId ? ( // Only show these sections for own profile
        <>
          {renderStateSelector()}
          {renderPersonalInfo()}
          {renderMenuSection()}
        </>
      ) : null}

      <View style={styles.questionSection}>
        <Text style={styles.sectionTitle}>Self-Advocacy Profile</Text>
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

      {!profileUserId && renderCalendarSection()}

      {renderWinsModal()}
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


  birthdateContainer: {
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
  },
  birthdateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 10,
  },

  saveButton: {
    backgroundColor: '#24269B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
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
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
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

});

export default ProfileScreen;