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
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebase';
import { collection, addDoc, doc, serverTimestamp, runTransaction, setDoc, updateDoc, arrayUnion, getDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// Add video size limit constant
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const NewWinScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const [media, setMedia] = useState([]);

  const clearForm = () => {
    setText('');
    setImage(null);
    setVideo(null);
    setMediaType(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image?.uri && !video?.uri) {
      Alert.alert('Error', 'Please enter some text or add media to share your win');
      return;
    }

    // Check video size again before upload
    if (video && video.fileSize > MAX_VIDEO_SIZE) {
      Alert.alert(
        'Video too large',
        'Please select a video that is smaller than 50MB or shorter in duration.'
      );
      return;
    }

    setIsSubmitting(true);
    const lowerCaseUid = auth.currentUser.uid.toLowerCase();
    console.log('Starting win submission with:', {
      hasText: Boolean(text.trim()),
      hasImage: Boolean(image?.uri),
      hasVideo: Boolean(video?.uri),
      mediaType: mediaType
    });

    try {
      const userRef = doc(db, 'users', lowerCaseUid);
      const winRef = doc(collection(db, 'wins'));
      const winId = winRef.id;
      console.log('Generated win ID:', winId);
      
      const userDoc = await getDoc(userRef);
      console.log('User document exists:', userDoc.exists());
      
      const now = new Date();
      const localTimestamp = {
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Handle media upload if present
      let mediaUrl = null;
      let mediaType = null;
      if (image) {
        const imageRef = ref(storage, `wins/${lowerCaseUid}/${winId}`);
        const response = await fetch(image.uri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        mediaUrl = await getDownloadURL(imageRef);
        mediaType = 'photo';
        console.log('Image uploaded, URL:', mediaUrl);
      } else if (video) {
        const videoRef = ref(storage, `wins/${lowerCaseUid}/${winId}`);
        const response = await fetch(video.uri);
        const blob = await response.blob();
        await uploadBytes(videoRef, blob);
        mediaUrl = await getDownloadURL(videoRef);
        mediaType = 'video';
        console.log('Video uploaded, URL:', mediaUrl);
      }

      // Create win data with correct media fields
      const winData = {
        text: text.trim() || null, // Store null if no text
        createdAt: now.toISOString(),
        localTimestamp,
        userId: lowerCaseUid,
        username: userDoc.data().username,
        cheers: 0,
        mediaType,
        mediaUrl,
        comments: []
      };

      console.log('Saving win with data:', winData);

      // Only process topics if there's text
      let newTopics = userDoc.data().winTopics || [];
      if (text.trim()) {
        const topics = text.toLowerCase()
          .split(/[\s,.-]+/)
          .filter(word => word.length > 3)
          .filter(word => !['this', 'that', 'with', 'from', 'what', 'have', 'and', 'the'].includes(word));

        const currentTopics = userDoc.data().winTopics || [];
        newTopics = Array.from(new Set([...currentTopics, ...topics]));
      }

      const batch = writeBatch(db);
      batch.set(winRef, winData);
      batch.update(userRef, {
        winTopics: newTopics,
        lastModified: serverTimestamp()
      });

      await batch.commit();
      console.log('Win saved successfully:', winId);
      
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

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setVideo(null);
        setMediaType('photo');
        setImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 30,
        videoQuality: '480p',
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const videoAsset = result.assets[0];
        
        if (videoAsset.fileSize > MAX_VIDEO_SIZE) {
          Alert.alert(
            'Video too large',
            'Please select a video that is smaller than 50MB or shorter in duration.'
          );
          return;
        }

        setImage(null);
        setMediaType('video');
        setVideo(videoAsset);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const renderMediaIndicator = () => {
    if (!mediaType) return null;

    if (mediaType === 'video' && video) {
      return (
        <View style={styles.mediaIndicator}>
          <MaterialCommunityIcons name="video" size={24} color="#24269B" />
          <Text style={styles.mediaText}>
            Video selected ({(video.fileSize / (1024 * 1024)).toFixed(1)}MB)
          </Text>
          <TouchableOpacity
            style={styles.removeMediaButton}
            onPress={() => {
              setVideo(null);
              setMediaType(null);
            }}
          >
            <MaterialCommunityIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    if (mediaType === 'photo' && image) {
      return (
        <View style={styles.mediaIndicator}>
          <MaterialCommunityIcons name="image" size={24} color="#24269B" />
          <Text style={styles.mediaText}>Photo selected</Text>
          <TouchableOpacity
            style={styles.removeMediaButton}
            onPress={() => {
              setImage(null);
              setMediaType(null);
            }}
          >
            <MaterialCommunityIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

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
      
      {renderMediaIndicator()}

      <View style={styles.mediaButtons}>
        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={pickPhoto}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Photo</Text>
              <MaterialIcons name="photo-camera" size={24} color="#24269B" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={pickVideo}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Video</Text>
              <MaterialIcons name="videocam" size={24} color="#24269B" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
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
    borderColor: '#24269B',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  buttonContainer: {
    position: 'relative',
    width: '40%',
  },
  buttonShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  mediaButton: {
    backgroundColor: '#ffffff',
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
    color: '#24269B',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    tintColor: '#24269B',
  },
  mediaIndicator: {
    width: '100%',
    height: 100,
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
    zIndex: 1,
  },
  submitButton: {
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#24269B',
  },
});

export default NewWinScreen;

