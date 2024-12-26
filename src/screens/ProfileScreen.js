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
  FlatList
} from 'react-native';
import { auth, db, storage } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import globalStyles from '../styles/styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import QuestionCard from '../components/QuestionCard';
import { Calendar } from 'react-native-calendars';
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

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [location, setLocation] = useState('');
  const [locationError, setLocationError] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [userDocId, setUserDocId] = useState(null);
  const [winDates, setWinDates] = useState({});
  const [selectedDateWins, setSelectedDateWins] = useState([]);
  const [showWinsModal, setShowWinsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

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
  ];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid.toLowerCase());
    
    // Real-time listener for user data including answers
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserData(data);
        setAnswers(data.questionAnswers || []);
      }
    }, (error) => {
      console.error("Error fetching user data:", error);
      Alert.alert('Error', 'Failed to load your profile data');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const findUserDocument = async () => {
      try {
        // Try to find the user document with either case of the UID
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('uid', 'in', [
            auth.currentUser.uid,
            auth.currentUser.uid.toLowerCase()
          ])
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setUserDocId(userDoc.id);
          if (userDoc.data().state) {
            setSelectedState(userDoc.data().state);
          }
        } else {
          console.error('User document not found');
        }
      } catch (error) {
        console.error('Error finding user document:', error);
      }
    };

    findUserDocument();
  }, []);

  const saveState = async () => {
    if (!userDocId) {
      Alert.alert('Error', 'User document not found');
      return;
    }

    try {
      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        state: selectedState,
      });
      Alert.alert('Success', 'State saved successfully');
    } catch (error) {
      console.error('Error saving state:', error);
      Alert.alert('Error', 'Failed to save state');
    }
  };

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
      
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      // Create a reference to 'profilePictures/USER_ID.jpg'
      const storageRef = ref(storage, `profilePictures/${currentUser.uid.toLowerCase()}.jpg`);
      
      // Upload the blob
      const snapshot = await uploadBytes(storageRef, blob);
      console.log('Uploaded successfully');

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL:', downloadURL);
      
      // Update Firestore
      await updateDoc(doc(db, 'users', currentUser.uid.toLowerCase()), {
        profilePicture: downloadURL
      });

      // Update local state
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAnswerSave = (newAnswer) => {
    setAnswers(prev => [...prev, newAnswer]);
  };

  const getLatestAnswer = (question) => {
    if (!answers) return null;
    
    const questionAnswers = answers.filter(a => a.question === question);
    if (questionAnswers.length === 0) return null;
    
    // Sort by timestamp and get the most recent
    return questionAnswers.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )[0];
  };

  const fetchUserWins = async () => {
    try {
      const winsQuery = query(
        collection(db, 'wins'),
        where('userId', '==', auth.currentUser.uid.toLowerCase())
      );
      
      const querySnapshot = await getDocs(winsQuery);
      const dates = {};
      
      querySnapshot.docs.forEach(doc => {
        const win = doc.data();
        let localDate;

        if (win.localTimestamp?.date) {
          // Parse the MM/DD/YYYY format into YYYY-MM-DD
          const [month, day, year] = win.localTimestamp.date.split('/');
          localDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          localDate = new Date(win.createdAt).toLocaleDateString('en-CA');
        }

        console.log('Processing win date:', {
          originalDate: win.localTimestamp?.date || win.createdAt,
          mappedDate: localDate
        });

        dates[localDate] = { marked: true, dotColor: '#24269B' };
      });
      
      console.log('Marked dates:', dates);
      setWinDates(dates);
    } catch (error) {
      console.error('Error fetching wins:', error);
    }
  };

  const fetchWinsForDate = async (date) => {
    try {
      console.log('Fetching wins for date:', date);
      
      const winsQuery = query(
        collection(db, 'wins'),
        where('userId', '==', auth.currentUser.uid.toLowerCase())
      );
      
      const querySnapshot = await getDocs(winsQuery);
      const wins = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(win => {
          let winDate;
          if (win.localTimestamp?.date) {
            // Parse the MM/DD/YYYY format into YYYY-MM-DD
            const [month, day, year] = win.localTimestamp.date.split('/');
            winDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            winDate = new Date(win.createdAt).toLocaleDateString('en-CA');
          }
          
          console.log('Comparing dates:', {
            winDate: winDate,
            selectedDate: date,
            matches: winDate === date
          });
          
          return winDate === date;
        });
      
      console.log('Found wins for date:', {
        date: date,
        count: wins.length,
        wins: wins.map(w => ({
          date: w.localTimestamp?.date,
          createdAt: w.createdAt
        }))
      });
      
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
            <Text style={styles.modalTitle}>Wins on {selectedDate}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWinsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={selectedDateWins}
            renderItem={({ item }) => <WinCard win={item} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.winsList}
          />
        </View>
      </View>
    </Modal>
  );

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleImagePicker}>
          <View style={styles.profilePictureContainer}>
            <Image
              source={{ 
                uri: userData?.profilePicture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
              }}
              style={styles.profilePicture}
            />
            <View style={styles.editIconContainer}>
              <MaterialCommunityIcons name="camera" size={20} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
        <Text style={styles.username}>{userData?.username || 'Loading...'}</Text>
       
      </View>

      {renderStateSelector()}

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

      <View style={styles.questionSection}>
        <Text style={styles.sectionTitle}>My Self-Advocacy Profile</Text>
        {questions.map(q => {
          const existingAnswer = getLatestAnswer(q.question);
          return (
            <View key={q.id} style={styles.questionContainer}>
              <QuestionCard
                question={q.question}
                presetWords={q.presetWords}
                onSave={handleAnswerSave}
                existingAnswer={existingAnswer}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.calendarContainer}>
        <Text style={styles.sectionTitle}>🏆 Win History</Text>
        <Calendar
          markedDates={winDates}
          onDayPress={day => fetchWinsForDate(day.dateString)}
          theme={{
            selectedDayBackgroundColor: '#24269B',
            todayTextColor: '#24269B',
            dotColor: '#24269B',
            arrowColor: '#24269B',
          }}
        />
      </View>

      {renderWinsModal()}
    </ScrollView>
  );
};

const additionalStyles = {
  questionSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 10,
  },
  questionContainer: {
    marginBottom: 20,
  },
  existingAnswer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 5,
  },
  answerText: {
    fontSize: 16,
    marginBottom: 5,
  },
  answerTimestamp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
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
    width: 120,
    height: 120,
    borderRadius: 60,
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
  ...additionalStyles,
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
});

export default ProfileScreen;
