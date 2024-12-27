import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebase';
import { collection, addDoc, doc, serverTimestamp, runTransaction, setDoc, updateDoc, arrayUnion, getDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';

const NewWinScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const [imageHeight, setImageHeight] = useState(0);
  const [media, setMedia] = useState([]);
  const screenWidth = Dimensions.get('window').width - 40;

  const clearForm = () => {
    setText('');
    setImage(null);
    setVideo(null);
    setMediaType(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text about your win');
      return;
    }

    setIsSubmitting(true);
    const lowerCaseUid = auth.currentUser.uid.toLowerCase();
    console.log('Starting win submission...');

    try {
      const userRef = doc(db, 'users', lowerCaseUid);
      const winRef = doc(collection(db, 'wins'));
      
      // Check if user exists and get current winTopics
      const userDoc = await getDoc(userRef);
      console.log('User document exists:', userDoc.exists());
      
      // Get current timestamp
      const now = new Date();
      const localTimestamp = {
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Create win data to match existing structure
      const winData = {
        text: text,
        createdAt: now.toISOString(),
        localTimestamp,
        userId: lowerCaseUid,
        username: userDoc.data().username,
        profilePicture: userDoc.data().profilePicture,
        cheers: 0,
        mediaType: null,
        mediaUrl: null
      };

      // Extract topics
      const topics = text.toLowerCase()
        .split(/[\s,.-]+/)
        .filter(word => word.length > 3)
        .filter(word => !['this', 'that', 'with', 'from', 'what', 'have', 'and', 'the'].includes(word));

      console.log('About to save win with topics:', topics);

      // Initialize or update winTopics array
      const currentTopics = userDoc.data().winTopics || [];
      const newTopics = Array.from(new Set([...currentTopics, ...topics]));

      // Save win and update user's topics in a batch
      const batch = writeBatch(db);
      batch.set(winRef, winData);
      batch.update(userRef, {
        winTopics: newTopics, // Use the merged array instead of arrayUnion
        lastModified: serverTimestamp()
      });

      await batch.commit();
      console.log('Win saved successfully:', winRef.id);
      
      navigation.goBack();

    } catch (error) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error('Error saving win:', {
        message: errorMessage,
        code: error.code,
        stack: error.stack
      });
      Alert.alert('Error', `Failed to save win: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear form when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      clearForm();
    });

    return unsubscribe;
  }, [navigation]);

  const pickMedia = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'photo' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0]);
        setMediaType(type);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const renderMedia = () => {
    if (!image && !video) return null;

    if (mediaType === 'photo') {
      return (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: image.uri }} style={styles.media} />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => {
              setImage(null);
              setMediaType(null);
            }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }

    if (mediaType === 'video') {
      return (
        <View style={styles.mediaContainer}>
          <Video
            source={{ uri: video.uri }}
            style={styles.media}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => {
              setVideo(null);
              setMediaType(null);
            }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  useEffect(() => {
    if (image) {
      Image.getSize(image.uri, (width, height) => {
        const scaledHeight = (height / width) * screenWidth;
        setImageHeight(scaledHeight);
      });
    }
  }, [image]);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <TextInput
        style={styles.input}
        placeholder="What's your win?"
        value={text}
        onChangeText={setText}
        multiline
      />
      
      {image && (
        <Image
          source={{ uri: image.uri }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      )}

      <View style={styles.mediaButtonContainer}>
        <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('photo')}>
          <MaterialCommunityIcons name="camera" size={24} color="white" />
          <Text style={styles.buttonText}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('video')}>
          <MaterialCommunityIcons name="video" size={24} color="white" />
          <Text style={styles.buttonText}>Video</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Posting...' : 'Post Win'}
        </Text>
        <MaterialCommunityIcons name="arrow-right" size={24} color="white" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  previewImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').width - 40,
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
  },
  mediaButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mediaButton: {
    backgroundColor: '#24269B',
    padding: 10,
    borderRadius: 8,
    flex: 0.45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ddd',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 5,
  },
});

export default NewWinScreen;

