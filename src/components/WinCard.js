import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';

const WinCard = ({ win, onCheersPress, onCommentsPress, showActions = true }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = async () => {
    if (!videoRef.current) return;

    try {
      const status = await videoRef.current.getStatusAsync();
      console.log('Current video status:', status);
      
      if (isPlaying) {
        console.log('Pausing video...');
        await videoRef.current.pauseAsync();
      } else {
        console.log('Playing video...');
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const renderMedia = () => {
    if (!win.mediaUrl) return null;

    if (win.mediaType === 'video') {
      return (
        <View style={styles.mediaContainer}>
          <Video
            ref={videoRef}
            source={{ uri: win.mediaUrl }}
            style={styles.video}
            resizeMode="contain"
            shouldPlay={false}
            useNativeControls={true}
          />
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlayback}
          >
            <MaterialCommunityIcons
              name={isPlaying ? 'pause' : 'play'}
              size={50}
              color="white"
            />
          </TouchableOpacity>
        </View>
      );
    }

    if (win.mediaType === 'photo') {
      return (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: win.mediaUrl }}
            style={styles.media}
            resizeMode="contain"
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <MaterialCommunityIcons name="account-circle" size={40} color="#24269B" />
          <View style={styles.nameTimeContainer}>
            <Text style={styles.username}>{win.username}</Text>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(win.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>
      </View>

      {win.text && <Text style={styles.text}>{win.text}</Text>}
      
      {renderMedia()}

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onCheersPress}>
            <MaterialCommunityIcons 
              name={win.hasCheerFromCurrentUser ? "star" : "star-outline"} 
              size={24} 
              color={win.hasCheerFromCurrentUser ? "#24269B" : "#666"} 
            />
            <Text style={[
              styles.actionText,
              win.hasCheerFromCurrentUser && styles.actionTextActive
            ]}>
              {win.cheersCount || 0} Cheers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onCommentsPress}>
            <MaterialCommunityIcons name="comment-outline" size={24} color="#666" />
            <Text style={styles.actionText}>{win.commentsCount || 0} Comments</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  nameTimeContainer: {
    marginLeft: 10,
  },

  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#24269B',
  },

  timestamp: {
    fontSize: 12,
    color: '#666',
  },

  text: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },

  mediaContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    position: 'relative',
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },

  video: {
    width: '100%',
    height: '100%',
  },

  media: {
    width: '100%',
    height: '100%',
  },

  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -25 },
      { translateY: -25 }
    ],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    padding: 10,
    zIndex: 1,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },

  actionText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },

  actionTextActive: {
    color: '#24269B',
  },
});

export default WinCard; 