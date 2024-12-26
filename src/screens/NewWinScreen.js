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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';

const NewWinScreen = () => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const navigation = useNavigation();

  const clearForm = () => {
    setText('');
    setImage(null);
    setVideo(null);
    setMediaType(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image && !video) {
      Alert.alert('Error', 'Please enter text or add media to share your win.');
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl = null;

      if (image || video) {
        const file = image || video;
        const extension = file.uri.split('.').pop();
        const fileName = `${auth.currentUser.uid}_${Date.now()}.${extension}`;
        const mediaRef = ref(storage, `media/${fileName}`);
        
        const response = await fetch(file.uri);
        const blob = await response.blob();
        await uploadBytes(mediaRef, blob);
        mediaUrl = await getDownloadURL(mediaRef);
      }

      const win = {
        userId: auth.currentUser.uid.toLowerCase(),
        text: text.trim(),
        mediaUrl,
        mediaType: mediaType,
        createdAt: new Date().toISOString(),
        localTimestamp: {
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: new Date().getTime()
        },
        cheers: 0
      };

      const docRef = await addDoc(collection(db, 'wins'), win);
      console.log('Win added with ID:', docRef.id);

      // Clear form
      clearForm();
      
      // Navigate back
      navigation.goBack();

    } catch (error) {
      console.error('Error adding win:', error);
      Alert.alert('Error', 'Failed to share your win. Please try again.');
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Share your win..."
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
        />

        {renderMedia()}

        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={() => pickMedia('photo')}
          >
            <MaterialCommunityIcons name="image" size={24} color="#24269B" />
            <Text style={styles.mediaButtonText}>Add Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={() => pickMedia('video')}
          >
            <MaterialCommunityIcons name="video" size={24} color="#24269B" />
            <Text style={styles.mediaButtonText}>Add Video</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.shareButton, isSubmitting && styles.shareButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.shareButtonText}>
            {isSubmitting ? 'Sharing...' : 'Share Win'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    minHeight: 100,
    fontSize: 16,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 16/9,
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
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mediaButtonText: {
    marginLeft: 8,
    color: '#24269B',
    fontSize: 14,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewWinScreen;
