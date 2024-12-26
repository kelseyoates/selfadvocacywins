import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const QuestionCard = ({ question, presetWords, onSave, existingAnswer }) => {
  const [mode, setMode] = useState('text');
  const [textAnswer, setTextAnswer] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWords, setSelectedWords] = useState([]);
  const [video, setVideo] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (existingAnswer) {
      setTextAnswer(existingAnswer.textAnswer || '');
      setSelectedWords(existingAnswer.selectedWords || []);
      setVideo(existingAnswer.videoAnswer || null);
    }
  }, [existingAnswer]);

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        setVideo(videoUri);
        await uploadVideo(videoUri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const uploadVideo = async (uri) => {
    if (!uri) return;
    
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `videos/${auth.currentUser.uid}/${question.replace(/\s+/g, '_')}_${Date.now()}.mp4`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateFirestore({ videoAnswer: downloadURL });
      Alert.alert('Success', 'Video uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Failed to upload video');
      setVideo(null);
    } finally {
      setUploading(false);
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
          style={styles.uploadButton}
          onPress={pickVideo}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>
            {uploading ? 'Uploading...' : 'Choose Video'}
          </Text>
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
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    backgroundColor: '#24269B',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    minWidth: 120,
    alignItems: 'center',
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
});

export default QuestionCard; 