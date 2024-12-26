import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView
} from 'react-native';
import { auth, db, storage } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import globalStyles from '../styles/styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import QuestionCard from '../components/QuestionCard';

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [answers, setAnswers] = useState([]);

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
        <Text style={styles.email}>{auth.currentUser?.email}</Text>
      </View>

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
});

export default ProfileScreen;
