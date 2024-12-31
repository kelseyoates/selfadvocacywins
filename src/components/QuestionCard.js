import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // Increase to 50MB limit
const MAX_DURATION = 120; // Increase to 120 seconds (2 minutes)

const QuestionCard = ({ question, presetWords, onSave, existingAnswer, readOnly }) => {
  console.log('Question data received:', question);

  const [mode, setMode] = useState('text');
  const [textAnswer, setTextAnswer] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWords, setSelectedWords] = useState([]);
  const [video, setVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [questionData, setQuestionData] = useState({
    mediaUrl: existingAnswer?.mediaUrl || null,
    mediaType: existingAnswer?.mediaType || null,
    question: question.text
  });

  // Reset video visibility when question changes
  useEffect(() => {
    setShowVideo(false);
    setQuestionData(prev => ({
      ...prev,
      mediaUrl: existingAnswer?.mediaUrl || null,
      mediaType: existingAnswer?.mediaType || null,
      question: question.text
    }));
  }, [question.text, existingAnswer]);

  useEffect(() => {
    if (existingAnswer) {
      setTextAnswer(existingAnswer.textAnswer || '');
      setSelectedWords(existingAnswer.selectedWords || []);
      setVideo(existingAnswer.videoAnswer || null);
    }
  }, [existingAnswer]);

  const handleLocationSubmit = async () => {
    try {
      await updateFirestore({ location });
      Alert.alert('Success', 'Location saved successfully');
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Failed to save location');
    }
  };

  const renderLocation = () => {
    return (
      <View style={styles.locationContainer}>
        <TextInput
          style={styles.locationInput}
          placeholder="Enter your location"
          value={location}
          onChangeText={setLocation}
        />
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={handleLocationSubmit}
        >
          <MaterialCommunityIcons name="map-marker" size={20} color="#fff" />
          <Text style={styles.buttonText}>Save Location</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const pickVideo = async () => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        setUploading(false);
        return;
      }

      // Pick the video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: MAX_DURATION,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
      const fileSizeMB = fileInfo.size / (1024 * 1024);
      console.log(`Video size: ${fileSizeMB.toFixed(2)} MB`);

      if (fileInfo.size > MAX_FILE_SIZE) {
        alert(`Video is too large (${fileSizeMB.toFixed(2)} MB). Please choose a video smaller than 50MB.`);
        setUploading(false);
        return;
      }

      const durationSeconds = result.assets[0].duration / 1000;
      if (durationSeconds > MAX_DURATION) {
        alert(`Video is too long (${Math.round(durationSeconds)} seconds). Please choose a video shorter than ${MAX_DURATION} seconds.`);
        setUploading(false);
        return;
      }

      console.log('Starting upload process...');
      console.log(`Video details: ${durationSeconds.toFixed(1)} seconds, ${fileSizeMB.toFixed(2)} MB`);
      await uploadVideo(result.assets[0].uri);

    } catch (error) {
      console.error('Error in pickVideo:', error);
      alert('Error selecting video. Please try again.');
      setUploading(false);
    }
  };

  const uploadVideo = async (uri) => {
    try {
      console.log('Starting video upload with URI:', uri);
      
      const response = await fetch(uri);
      const blob = await response.blob();

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const filename = `questions/${auth.currentUser.uid.toLowerCase()}/${timestamp}_${random}.mp4`;
      
      const storageRef = ref(storage, filename);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          console.log('Upload progress:', progress + '%');
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          alert('Error uploading video. Please check your internet connection and try again.');
          setUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await handleMediaUpload(downloadURL, 'video');
            setUploading(false);
            setUploadProgress(0);
          } catch (error) {
            console.error('Error finishing upload:', error);
            alert('Error saving video. Please try again.');
            setUploading(false);
          }
        }
      );

    } catch (error) {
      console.error('Error in uploadVideo:', error);
      console.error('Error details:', error.message);
      alert('Error uploading video. Please check your internet connection and try again.');
      setUploading(false);
    }
  };

  const handleMediaUpload = async (url, type) => {
    try {
      // Get the correct lowercase user ID
      const userId = auth.currentUser.uid.toLowerCase();
      console.log('Using user ID:', userId);
      
      // Reference to the user's document with correct case
      const userRef = doc(db, 'users', userId);
      
      // Get the current user document
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log('Creating new user document');
        // Create the user document if it doesn't exist
        await setDoc(userRef, {
          questionAnswers: []
        });
      }
      
      // Initialize questionAnswers array
      let currentAnswers = userDoc.exists() ? (userDoc.data().questionAnswers || []) : [];
      
      // Prepare the new answer data
      const answerData = {
        question: "A little bit about me 😀:", // Using the known question text
        selectedWords: existingAnswer?.selectedWords || [],
        textAnswer: existingAnswer?.textAnswer || '',
        mediaUrl: url,
        mediaType: type,
        timestamp: new Date().toISOString()
      };

      console.log('Answer data being prepared:', answerData);

      // Find the index of the existing answer
      const answerIndex = currentAnswers.findIndex(
        answer => answer.question === answerData.question
      );
      
      let updatedAnswers = [...currentAnswers];
      
      if (answerIndex >= 0) {
        // Update existing answer
        updatedAnswers[answerIndex] = {
          ...updatedAnswers[answerIndex],
          ...answerData
        };
      } else {
        // Add new answer
        updatedAnswers.push(answerData);
      }

      console.log('Final answers array:', updatedAnswers);

      // Update the user document
      await updateDoc(userRef, {
        questionAnswers: updatedAnswers
      });

      console.log('Answer saved with video URL in user document');
      
      // Update local state
      setQuestionData(prev => ({
        ...prev,
        mediaUrl: url,
        mediaType: type
      }));

    } catch (error) {
      console.error('Error saving answer:', error);
      console.error('Error details:', error.message);
      console.error('Current question object:', question);
      alert('Error saving video. Please try again.');
    }
  };

  const renderVideoMode = () => {
    if (video) {
      return (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: video }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
          <TouchableOpacity 
            style={styles.newVideoButton}
            onPress={pickVideo}
          >
            <Text style={styles.buttonText}>Choose New Video</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.videoContainer}>
        <MaterialCommunityIcons 
          name="video-plus" 
          size={48} 
          color="#24269B" 
        />
        <Text style={styles.messageText}>
          Upload a video answer
        </Text>
        <TouchableOpacity 
          style={[styles.uploadButton, uploading && styles.uploadingButton]}
          onPress={pickVideo}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <Text style={styles.uploadingText}>
                Uploading: {uploadProgress}%
              </Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${uploadProgress}%` }
                  ]} 
                />
              </View>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {questionData?.mediaUrl ? 'Change Video' : 'Add Video'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const handleAnswerChange = (text) => {
    setTextAnswer(text);
    setIsEditing(true);
  };

  const handlePresetSelect = async (word) => {
    let newSelectedWords;
    if (selectedWords.includes(word)) {
      newSelectedWords = selectedWords.filter(w => w !== word);
    } else {
      newSelectedWords = [...selectedWords, word];
    }
    setSelectedWords(newSelectedWords);
    await updateFirestore({ selectedWords: newSelectedWords });
  };

  const updateFirestore = async (newData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      const userRef = doc(db, 'users', currentUser.uid.toLowerCase());
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const currentAnswers = userDoc.data().questionAnswers || [];
      const otherAnswers = currentAnswers.filter(a => a.question !== question);
      
      const existingAnswer = currentAnswers.find(a => a.question === question) || {};
      const updatedAnswer = {
        question,
        timestamp: new Date().toISOString(),
        ...existingAnswer,
        ...newData
      };

      await updateDoc(userRef, {
        questionAnswers: [...otherAnswers, updatedAnswer]
      });

      onSave(updatedAnswer);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save answer');
    }
  };

  const handleTextSave = async () => {
    try {
      await updateFirestore({ textAnswer });
      Alert.alert('Success', 'Answer saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving text answer:', error);
      Alert.alert('Error', 'Failed to save answer');
    }
  };

  const handleVideoPress = () => {
    setShowVideo(!showVideo);
  };

  const toggleVideo = () => {
    setShowVideo(!showVideo);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.question}>{question}</Text>
      
      <View style={styles.modeButtons}>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'text' && styles.selectedMode]}
          onPress={() => setMode('text')}
        >
          <MaterialCommunityIcons name="text" size={24} color={mode === 'text' ? '#fff' : '#24269B'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'preset' && styles.selectedMode]}
          onPress={() => setMode('preset')}
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={24} color={mode === 'preset' ? '#fff' : '#24269B'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'video' && styles.selectedMode]}
          onPress={() => setMode('video')}
        >
          <MaterialCommunityIcons name="video" size={24} color={mode === 'video' ? '#fff' : '#24269B'} />
        </TouchableOpacity>
      </View>

      {mode === 'text' && (
        <>
          <TextInput
            style={styles.input}
            value={textAnswer}
            onChangeText={handleAnswerChange}
            placeholder="Type your answer..."
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity 
            style={[styles.saveButton, !textAnswer && styles.disabledButton]}
            onPress={handleTextSave}
            disabled={!textAnswer}
          >
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'preset' && (
        <View style={styles.presetContainer}>
          {presetWords.map((word, index) => {
            const isSelected = selectedWords.includes(word);
            return (
              <TouchableOpacity 
                key={index}
                style={[styles.presetButton, isSelected && styles.selectedPreset]}
                onPress={() => handlePresetSelect(word)}
              >
                <Text style={[styles.presetText, isSelected && styles.selectedPresetText]}>
                  {word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {mode === 'video' && renderVideoMode()}

      {/* Show preview after upload */}
      {questionData.mediaUrl && questionData.mediaType === 'video' && (
        <View style={styles.previewContainer}>
          <Video
            source={{ uri: questionData.mediaUrl }}
            style={styles.videoPreview}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
          />
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#000000',
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  modeButton: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  selectedMode: {
    backgroundColor: '#24269B',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  presetButton: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#24269B',
    marginBottom: 10,
  },
  selectedPreset: {
    backgroundColor: '#24269B',
  },
  presetText: {
    color: '#24269B',
  },
  selectedPresetText: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginTop: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    backgroundColor: '#24269B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  newVideoButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#24269B',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  locationContainer: {
    marginVertical: 10,
    padding: 10,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
    fontSize: 14,
  },
  locationButton: {
    backgroundColor: '#24269B',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 5,
  },
  uploadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 6,
  },
  progressBarContainer: {
    width: '90%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  previewContainer: {
    marginTop: 10,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  videoButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#24269B',
    borderRadius: 8,
    alignItems: 'center',
  },
  videoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  uploadingButton: {
    backgroundColor: '#1a1b6e',
  },
  videoToggleButton: {
    backgroundColor: '#24269B',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  videoToggleButtonActive: {
    backgroundColor: '#1a1b6e',
  },
  videoToggleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default QuestionCard; 