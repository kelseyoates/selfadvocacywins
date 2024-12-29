import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getAuth } from 'firebase/auth';
import { getDoc, doc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useRoute } from '@react-navigation/native';
import OtherUserQuestionCard from '../components/OtherUserQuestionCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DEFAULT_PROFILE_IMAGE = 'https://via.placeholder.com/100';

const OtherUserProfileScreen = () => {
  const route = useRoute();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [wins, setWins] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedWin, setSelectedWin] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentUsers, setCommentUsers] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userIdToFetch = route.params?.profileUserId;
        
        console.log('Attempting to fetch user data for:', userIdToFetch);

        if (!userIdToFetch) {
          console.error('No profileUserId provided in route params:', route.params);
          setError('Unable to load profile. Please try again.');
          setIsLoading(false);
          return;
        }

        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', userIdToFetch));
        
        if (!userDoc.exists()) {
          console.error('User document not found');
          setError('User not found');
          setIsLoading(false);
          return;
        }

        const userData = userDoc.data();
        console.log('Fetched user profile:', userData);
        setProfileData(userData);

        // Fetch user's wins
        const winsRef = collection(db, 'wins');
        const q = query(
          winsRef,
          where('userId', '==', userIdToFetch),
          orderBy('createdAt', 'desc')
        );
        
        const winsSnapshot = await getDocs(q);
        console.log(`Found ${winsSnapshot.size} wins`);
        
        const winsData = winsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Processed wins data:', winsData.length, 'wins');
        setWins(winsData);

        // Process wins for calendar
        const dates = {};
        winsData.forEach(win => {
          if (win.createdAt) {
            const date = new Date(win.createdAt).toISOString().split('T')[0];
            console.log('Adding calendar mark for date:', date);
            dates[date] = {
              marked: true,
              dotColor: '#24269B',
              selected: true,
              selectedColor: '#E8E8FF'
            };
          }
        });
        console.log('Final marked dates:', Object.keys(dates).length, 'dates marked');
        setMarkedDates(dates);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [route.params?.profileUserId]);

  // Add data verification logs in render
  useEffect(() => {
    console.log('Current profile data:', profileData);
    console.log('Current wins count:', wins.length);
    console.log('Current marked dates:', Object.keys(markedDates).length);
  }, [profileData, wins, markedDates]);

  const questions = [
    {
      id: 1,
      question: "A little bit about me 😀:",
      presetWords: ["fun", "smart", "athletic", "funny", "kind", "silly", "serious", "independent", "ambitious", "caring", "creative", "thoughtful", "adventurous"]
    },
    {
      id: 2,
      question: "What I like to do for fun 🎉:",
      presetWords: ["Special Olympics", "Best Buddies", "sports", "theater", "watching movies", "art", "dancing", "playing with my dog", "gaming", "listening to music", "hang with friends", "traveling", "reading", "cooking", "photography", "writing", "playing with my dog"]
    },
    {
      id: 3,
      question: "What I\'m like as a friend 🤝:",
      presetWords: ["supportive", "fun", "honest", "loyal", "trustworthy", "caring", "spontaneous", "funny", "dependable", "patient", "open-minded", "positive"]
    },
    {
      id: 4,
      question: "What my future goals are 🎯:",
      presetWords: ["live with friends", "finish school", "make friends", "get healthy", "get a job", "learn new things", "start a business", "find love", "get a pet", "travel", "make a difference", "make money"]
    },
    {
      id: 5,
      question: "What I'm most proud of 🔥:",
      presetWords: ["finishing school", "playing sports", "making friends", "getting a job", "trying new things", "dating", "traveling", "being a good friend", "being in my family", "helping people", "my art"]
    },
    {
      id: 6,
      question: "If I won the lottery, I would 💰:",
      presetWords: ["travel the world", "buy a house", "buy a car", "buy a boat", "start a business", "buy my friends gifts", "buy my family gifts", "give to charity", "own a sports team", "buy a hot tub", "fly first class"]
    },
  ];

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const fetchCommentUserData = async (comments) => {
    const userDataPromises = comments.map(async (comment) => {
      if (!comment.userId) return null;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', comment.userId));
        if (userDoc.exists()) {
          return {
            userId: comment.userId,
            userData: userDoc.data()
          };
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      return null;
    });

    const userData = await Promise.all(userDataPromises);
    const userDataMap = {};
    userData.forEach(data => {
      if (data) {
        userDataMap[data.userId] = data.userData;
      }
    });
    setCommentUsers(userDataMap);
  };

  // Move useEffect outside of renderCommentModal
  useEffect(() => {
    if (selectedWin?.comments) {
      fetchCommentUserData(selectedWin.comments);
    }
  }, [selectedWin]);

  const renderCommentModal = () => {
    if (!selectedWin) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showComments}
        onRequestClose={() => {
          setShowComments(false);
          setSelectedWin(null);
          setCommentUsers({});
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowComments(false);
                  setSelectedWin(null);
                  setCommentUsers({});
                }}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedWin.comments && selectedWin.comments.length > 0 ? (
              selectedWin.comments.map((comment, index) => {
                const userData = commentUsers[comment.userId] || {};
                return (
                  <View key={index} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Image
                        source={
                          userData.profilePicture
                            ? { uri: userData.profilePicture }
                            : { uri: 'https://via.placeholder.com/100' }
                        }
                        style={styles.commentUserImage}
                      />
                      <View style={styles.commentUserInfo}>
                        <Text style={styles.commentUsername}>
                          {userData.username || 'User'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatDate(comment.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noComments}>No comments yet</Text>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Image
          source={
            profileData?.profilePicture
              ? { uri: profileData.profilePicture }
              : { uri: DEFAULT_PROFILE_IMAGE }
          }
          style={styles.profilePicture}
        />
        <Text style={styles.username}>{profileData?.username || 'User'}</Text>
        <Text style={styles.bio}>{profileData?.bio || ''}</Text>
        <Text style={styles.location}>{profileData?.state || ''}</Text>
      </View>

      <View style={styles.questionsContainer}>
        <Text style={styles.sectionTitle}>My Profile</Text>
        {questions.map((item) => (
          <OtherUserQuestionCard
            key={item.id}
            question={item.question}
            questionId={item.id}
            backgroundColor={item.backgroundColor}
            userId={route.params?.profileUserId}
          />
        ))}
      </View>

     

      <View style={styles.winsContainer}>
        <Text style={styles.sectionTitle}>My Wins</Text>
        {wins.map((win) => (
          <View key={win.id} style={styles.winCard}>
            <Text style={styles.winText}>{win.text}</Text>
            {win.mediaUrl && (
              <Image
                source={{ uri: win.mediaUrl }}
                style={styles.winImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.winFooter}>
              <Text style={styles.winDate}>
                {formatDate(win.createdAt)}
              </Text>
              <View style={styles.winStats}>
                <Text style={styles.statText}>
                  {win.cheers || 0} 👏
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedWin(win);
                    setShowComments(true);
                  }}
                  style={styles.commentButton}
                >
                  <MaterialCommunityIcons name="comment-outline" size={20} color="#666" />
                  <Text style={styles.statText}> {win.comments?.length || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {renderCommentModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  calendarContainer: {
    padding: 15,
    backgroundColor: 'white',
    marginTop: 10,
  },
  winsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#24269B',
  },
  winCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  winText: {
    fontSize: 16,
    marginBottom: 10,
  },
  winImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  winFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  winDate: {
    fontSize: 14,
    color: '#666',
  },
  winStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  questionsContainer: {
    padding: 15,
    backgroundColor: 'white',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#24269B',
  },
  closeButton: {
    padding: 5,
  },
  commentItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentUserInfo: {
    flex: 1,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#24269B',
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  commentText: {
    fontSize: 14,
    marginLeft: 50, // Aligns with the username
    color: '#333',
  },
  noComments: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
});

export default OtherUserProfileScreen; 