import React, { useState, useEffect, useCallback } from 'react';
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
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system';

// Add video size limit constant
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const NewWinScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const [media, setMedia] = useState([]);
  const [mediaPreview, setMediaPreview] = useState(null);

  const clearForm = () => {
    setText('');
    setImage(null);
    setVideo(null);
    setMediaType(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    try {
      if (!text.trim()) {
        Alert.alert('Please enter your win');
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Please log in to share your win');
        return;
      }

      // First, upload media if it exists
      let mediaUrl = null;
      
      if (mediaPreview) {
        try {
          // Create a reference to the file in Firebase Storage
          const mediaRef = ref(storage, `wins/${user.uid}/${Date.now()}-${mediaType}`);
          
          // Read the file
          const fileInfo = await FileSystem.getInfoAsync(mediaPreview);
          if (!fileInfo.exists) {
            throw new Error('File does not exist');
          }

          // Convert file to blob
          const response = await fetch(mediaPreview);
          const blob = await response.blob();

          // Upload the blob
          const uploadTask = await uploadBytesResumable(mediaRef, blob);
          
          // Get the download URL
          mediaUrl = await getDownloadURL(uploadTask.ref);
          
          console.log('Media uploaded successfully:', mediaUrl);
        } catch (uploadError) {
          console.error('Error uploading media:', uploadError);
          throw new Error('Failed to upload media');
        }
      }

      // Create the win document
      const winData = {
        text: text.trim(),
        userId: user.uid,
        timestamp: serverTimestamp(),
        mediaUrl: mediaUrl,
        mediaType: mediaType, // This will be either 'photo' or 'video'
      };

      console.log('Saving win data:', winData); // Debug log

      // Add to Firestore
      await addDoc(collection(db, 'wins'), winData);

      // Reset form and navigate
      setText('');
      setMediaPreview(null);
      setMediaType(null);
      navigation.navigate('Home');

    } catch (error) {
      console.error('Error submitting win:', error);
      Alert.alert(
        'Error', 
        'Failed to share your win. Please try again. ' + error.message
      );
    }
  };

  // Clear form when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      clearForm();
    });

    return unsubscribe;
  }, [navigation]);

  // Clear media preview and text when screen is focused
  useFocusEffect(
    useCallback(() => {
      setMediaPreview(null);
      setMediaType(null);
      setText('');
    }, [])
  );

  const handleSelectPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setMediaPreview(result.assets[0].uri);
      setMediaType('photo');
    }
  };

  const handleSelectVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setMediaPreview(result.assets[0].uri);
      setMediaType('video');
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

  const renderPreview = () => {
    if (!mediaPreview) return null;

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewLabel}>
            {mediaType === 'photo' ? 'Photo Selected' : 'Video Selected'}
          </Text>
          <TouchableOpacity 
            style={styles.removeButton} 
            onPress={() => {
              setMediaPreview(null);
              setMediaType(null);
            }}
          >
            <MaterialIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        {mediaType === 'photo' ? (
          <Image 
            source={{ uri: mediaPreview }} 
            style={styles.preview} 
            resizeMode="cover"
          />
        ) : (
          <Video
            source={{ uri: mediaPreview }}
            style={styles.preview}
            useNativeControls
            resizeMode="cover"
            isLooping
          />
        )}
      </View>
    );
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
      
      {mediaPreview && (
        <View style={styles.previewContainer}>
          {mediaType === 'photo' ? (
            <Image 
              source={{ uri: mediaPreview }} 
              style={styles.mediaPreview} 
            />
          ) : (
            <Video
              source={{ uri: mediaPreview }}
              style={styles.mediaPreview}
              useNativeControls
              resizeMode="contain"
            />
          )}
        </View>
      )}

      <View style={styles.mediaButtons}>
        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={handleSelectPhoto}
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
            onPress={handleSelectVideo}
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
    marginTop: 20,
  },
  previewContainer: {
    margin: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#24269B',
  },
  previewLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  removeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
});

export default NewWinScreen;

