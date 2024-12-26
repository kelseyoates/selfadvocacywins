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

const NewWinScreen = ({ navigation }) => {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Clear form when component mounts
  useEffect(() => {
    setText('');
    setMedia(null);
    setMediaType(null);
    return () => {
      // Clear form when component unmounts
      setText('');
      setMedia(null);
      setMediaType(null);
    };
  }, []);

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
        setMedia(result.assets[0].uri);
        setMediaType(type);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const uploadMedia = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const extension = mediaType === 'photo' ? 'jpg' : 'mp4';
      const filename = `wins/${auth.currentUser.uid.toLowerCase()}/${Date.now()}.${extension}`;
      console.log('Uploading to:', filename);
      
      const storageRef = ref(storage, filename);
      
      console.log('Starting upload...');
      const uploadResult = await uploadBytes(storageRef, blob);
      console.log('Upload completed:', uploadResult);
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Detailed upload error:', error);
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  };

  const shareWin = async () => {
    if (!text && !media) {
      Alert.alert('Error', 'Please add some text or media to share your win');
      return;
    }

    setUploading(true);
    try {
      let mediaUrl = null;
      if (media) {
        mediaUrl = await uploadMedia(media);
      }

      // Create date in local timezone
      const now = new Date();
      const timezoneOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
      const localDate = new Date(now.getTime() - timezoneOffset);
      const createdAt = localDate.toISOString();

      console.log('Creating win:', {
        localDate: now.toLocaleString(),
        createdAt: createdAt,
        timezoneOffset: timezoneOffset,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      const win = {
        userId: auth.currentUser.uid.toLowerCase(),
        text: text,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        createdAt: createdAt,
        localTimestamp: {
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: now.getTime()
        },
        cheers: 0,
      };

      const docRef = await addDoc(collection(db, 'wins'), win);
      console.log('Win added with ID:', docRef.id);

      Alert.alert('Success', 'Your win has been shared!');
      navigation.goBack();
    } catch (error) {
      console.error('Detailed sharing error:', error);
      Alert.alert('Error', error.message || 'Failed to share your win');
    } finally {
      setUploading(false);
    }
  };

  const renderMedia = () => {
    if (!media) return null;

    if (mediaType === 'photo') {
      return (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: media }} style={styles.media} />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => {
              setMedia(null);
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
            source={{ uri: media }}
            style={styles.media}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => {
              setMedia(null);
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
          style={[styles.shareButton, uploading && styles.shareButtonDisabled]}
          onPress={shareWin}
          disabled={uploading}
        >
          <Text style={styles.shareButtonText}>
            {uploading ? 'Sharing...' : 'Share Win'}
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
