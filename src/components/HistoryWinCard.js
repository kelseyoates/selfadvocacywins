import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { Video } from 'expo-av';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const HistoryWinCard = ({ win }) => {
  const [userData, setUserData] = useState(null);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', win.userId));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [win.userId]);

  useEffect(() => {
    if (win.localTimestamp?.timestamp) {
      try {
        const timestamp = new Date(win.localTimestamp.timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - timestamp);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        let timeString;
        if (diffDays > 0) {
          timeString = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        } else if (diffHours > 0) {
          timeString = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else if (diffMinutes > 0) {
          timeString = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
        } else {
          timeString = 'Just now';
        }

        setTimeAgo(timeString);
      } catch (error) {
        console.error('Error calculating time:', error);
        // Fallback to using the formatted date and time from localTimestamp
        if (win.localTimestamp.date && win.localTimestamp.time) {
          setTimeAgo(`${win.localTimestamp.date} at ${win.localTimestamp.time}`);
        }
      }
    } else if (win.createdAt) {
      // Fallback to using createdAt if localTimestamp is not available
      const timestamp = new Date(win.createdAt);
      setTimeAgo(timestamp.toLocaleString());
    }
  }, [win.localTimestamp, win.createdAt]);

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          {userData?.profilePicture && (
            <Image
              source={{ uri: userData.profilePicture }}
              style={styles.profilePic}
            />
          )}
          <View style={styles.headerText}>
            <Text style={styles.username}>{userData?.username || 'User'}</Text>
            <Text style={styles.timeAgo}>{timeAgo || 'Time not available'}</Text>
          </View>
        </View>
        
        {win.text && (
          <Text style={styles.text}>{win.text}</Text>
        )}
        
        {win.mediaUrl && (
          <View style={styles.mediaContainer}>
            {win.mediaType === 'image' ? (
              <Image
                source={{ uri: win.mediaUrl }}
                style={styles.media}
                resizeMode="cover"
              />
            ) : win.mediaType === 'video' ? (
              <Video
                source={{ uri: win.mediaUrl }}
                style={styles.media}
                useNativeControls
                resizeMode="contain"
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#24269B',
  },
  timeAgo: {
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
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  media: {
    width: '100%',
    height: '100%',
  },
});

export default HistoryWinCard; 