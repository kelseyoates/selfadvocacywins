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

const generateAltText = async (imageUrl, setLoading) => {
  try {
    setLoading(true);
    const API_KEY = 'AIzaSyBKoHkKtY1qVFkY__Kl4TfjdlzOXVbTWAo';
    
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const base64data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(imageBlob);
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Generate a brief, descriptive alt text for this image that would be helpful for screen readers."
          }, {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64data
            }
          }]
        }]
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts) {
      return data.candidates[0].content.parts[0].text;
    }
    return null;
  } catch (error) {
    console.error('Error generating alt text:', error);
    return null;
  } finally {
    setLoading(false);
  }
};

const NewWinScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const [imageHeight, setImageHeight] = useState(0);
  const [media, setMedia] = useState([]);
  const [isGeneratingAltText, setIsGeneratingAltText] = useState(false);
  const screenWidth = Dimensions.get('window').width - 40;
  const [userData, setUserData] = useState(null);

  const clearForm = () => {
    setText('');
    setImage(null);
    setVideo(null);
    setMediaType(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    try {
      if (!text.trim() && !image?.uri) {
        Alert.alert('Error', 'Please enter some text or add a photo to share your win');
        return;
      }

      setIsSubmitting(true);
      const lowerCaseUid = auth.currentUser.uid.toLowerCase();
      console.log('Starting win submission with:', {
        hasText: Boolean(text.trim()),
        hasImage: Boolean(image?.uri),
        imageDetails: image
      });

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

      let mediaUrl = null;
      let altText = null;

      if (image) {
        const imageRef = ref(storage, `wins/${lowerCaseUid}/${winId}`);
        const response = await fetch(image.uri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        mediaUrl = await getDownloadURL(imageRef);
        console.log('Image uploaded, URL:', mediaUrl);
        
        console.log('Generating alt text...');
        altText = await generateAltText(mediaUrl, setIsGeneratingAltText);
        console.log('Generated alt text:', altText);
      } else if (video) {
        const videoRef = ref(storage, `wins/${lowerCaseUid}/${winId}`);
        const response = await fetch(video.uri);
        const blob = await response.blob();
        await uploadBytes(videoRef, blob);
        mediaUrl = await getDownloadURL(videoRef);
        console.log('Video uploaded, URL:', mediaUrl);
      }

      const winData = {
        text: text.trim() || null,
        createdAt: now.toISOString(),
        localTimestamp,
        userId: lowerCaseUid,
        username: userDoc.data().username,
        cheers: 0,
        mediaType,
        mediaUrl,
        altText,
        comments: []
      };

      console.log('Saving win with data:', winData);

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

  const handleSelectVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please grant permission to access your photos in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoQuality: '480p',
        videoMaxDuration: 60,
      });

      console.log('Video picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const videoAsset = result.assets[0];
        
        if (videoAsset.type === 'video') {
          const fileSize = videoAsset.fileSize / (1024 * 1024);
          
          if (fileSize > 32) {
            Alert.alert(
              'Video Too Large',
              'Please select a shorter video or record at a lower quality. Maximum size is 32MB.'
            );
            return;
          }

          console.log('Setting video preview and type');
          setMediaPreview(videoAsset.uri);
          setMediaType('video');
        } else {
          Alert.alert('Error', 'Please select a video file');
        }
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert(
        'Error',
        'Failed to select video. Please try again.'
      );
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

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessible={true}
      accessibilityLabel="Create a new win"
      accessibilityHint="Screen for sharing your win with text and media"
    >
      <TextInput
        style={styles.input}
        placeholder="What's your win?"
        value={text}
        onChangeText={setText}
        multiline
        accessible={true}
        accessibilityLabel="Share your win"
        accessibilityHint="Enter text to describe your win"
      />
      
      {image && (
        <View
          accessible={true}
          accessibilityLabel="Selected image preview"
        >
          <Image
            source={{ uri: image.uri }}
            style={styles.previewImage}
            resizeMode="contain"
            accessibilityElementsHidden={true}
          />
          <TouchableOpacity 
            style={styles.removeMediaButton}
            onPress={() => {
              setImage(null);
              setMediaType(null);
            }}
            accessible={true}
            accessibilityLabel="Remove selected image"
            accessibilityRole="button"
            accessibilityHint="Double tap to remove the selected image"
          >
            <MaterialCommunityIcons 
              name="close" 
              size={24} 
              color="#fff" 
              accessibilityElementsHidden={true}
            />
          </TouchableOpacity>
        </View>
      )}

      <View 
        style={styles.mediaButtons}
        accessible={true}
        accessibilityLabel="Media options"
      >
        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <TouchableOpacity 
            style={styles.mediaButton} 
            onPress={() => pickMedia('photo')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            accessibilityHint="Double tap to select a photo from your library"
          >
            <MaterialCommunityIcons 
              name="camera" 
              size={24} 
              color="#24269B" 
              accessibilityElementsHidden={true}
            />
            <Text 
              style={styles.buttonText}
              accessibilityElementsHidden={true}
            >
              Photo
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <TouchableOpacity 
            style={styles.mediaButton} 
            onPress={() => pickMedia('video')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add video"
            accessibilityHint="Double tap to select a video from your library"
          >
            <MaterialCommunityIcons 
              name="video" 
              size={24} 
              color="#24269B" 
              accessibilityElementsHidden={true}
            />
            <Text 
              style={styles.buttonText}
              accessibilityElementsHidden={true}
            >
              Video
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.submitButton,
          (!text.trim() && !image) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting || (!text.trim() && !image)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={
          isSubmitting ? "Posting your win..." : 
          (!text.trim() && !image) ? "Post win button - disabled. Add text or media to enable" :
          "Post win"
        }
        accessibilityHint={
          (!text.trim() && !image) ? 
          "Add text or select media to share your win" :
          "Double tap to share your win"
        }
        accessibilityState={{
          disabled: isSubmitting || (!text.trim() && !image),
          busy: isSubmitting
        }}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Posting...' : 'Post Win'}
        </Text>
        <MaterialCommunityIcons 
          name="arrow-right" 
          size={24} 
          color="white" 
          accessibilityElementsHidden={true}
        />
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
  
  previewImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').width - 40,
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
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
  removeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#cccccc',
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

export default NewWinScreen;