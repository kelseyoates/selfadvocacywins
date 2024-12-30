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
import WinCard from '../components/WinCard';

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
    try {
      console.log('Starting to fetch comment user data');
      const userPromises = comments.map(async (comment) => {
        const userRef = doc(db, 'users', comment.userId.toLowerCase());
        console.log('Fetching user data for:', comment.userId.toLowerCase());
        
        try {
          const userSnapshot = await getDoc(userRef);
          console.log('User snapshot exists:', userSnapshot.exists());
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            console.log('Found user data:', userData);
            return {
              userId: comment.userId,
              userData: {
                username: userData.username,
                state: userData.state,
                profilePicture: userData.profilePicture
              }
            };
          }
        } catch (e) {
          console.error('Error fetching user:', e);
        }
        return null;
      });

      const users = await Promise.all(userPromises);
      const userDataMap = {};
      users.forEach(user => {
        if (user) {
          userDataMap[user.userId] = user.userData;
        }
      });
      
      console.log('Final user data map:', userDataMap);
      setCommentUsers(userDataMap);
    } catch (error) {
      console.error('Error in fetchCommentUserData:', error);
    }
  };

  // Move useEffect outside of renderCommentModal
  useEffect(() => {
    if (selectedWin?.comments) {
      fetchCommentUserData(selectedWin.comments);
    }
  }, [selectedWin]);

  const handleShowComments = async (win) => {
    try {
      console.log('Showing comments for win:', win.id);
      setSelectedWin(win);
      setShowComments(true);
      
      if (win.comments && win.comments.length > 0) {
        console.log('Found comments:', win.comments);
        await fetchCommentUserData(win.comments);
      }
    } catch (error) {
      console.error('Error in handleShowComments:', error);
    }
  };

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
                const userData = commentUsers[comment.userId];
                return (
                  <View key={index} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Image
                        source={
                          userData?.profilePicture
                            ? { uri: userData.profilePicture }
                            : require('../../assets/default-profile.png')
                        }
                        style={styles.commentUserImage}
                      />
                      <View style={styles.commentUserInfo}>
                        <Text style={styles.commentUsername}>
                          {userData?.username || 'Loading...'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatDate(comment.timestamp || comment.createdAt)}
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

  // Add the stats calculation function
  const calculateStats = (userWins) => {
    return userWins.reduce((acc, win) => {
      acc.totalCheers += win.cheers || 0;
      acc.totalComments += (win.comments?.length || 0);
      return acc;
    }, { totalCheers: 0, totalComments: 0 });
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

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Image 
            source={require('../../assets/wins.png')} 
            style={styles.statIcon}
          />
          <Text style={styles.statNumber}>{wins.length}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>

        <View style={styles.statItem}>
          <Image 
            source={require('../../assets/cheers.png')} 
            style={styles.statIcon}
          />
          <Text style={styles.statNumber}>
            {calculateStats(wins).totalCheers}
          </Text>
          <Text style={styles.statLabel}>Cheers</Text>
        </View>

        <View style={styles.statItem}>
          <Image 
            source={require('../../assets/comments.png')} 
            style={styles.statIcon}
          />
          <Text style={styles.statNumber}>
            {calculateStats(wins).totalComments}
          </Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
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
        <Text style={styles.sectionTitle}>Wins({wins.length})</Text>
        {wins && wins.length > 0 ? (
          wins.map((win) => (
            <WinCard 
              key={win.id} 
              win={win}
              onCheersPress={() => handleCheersPress(win)}
              onCommentsPress={() => handleCommentsPress(win)}
              lazyLoad={true}
            />
          ))
        ) : (
          <Text style={styles.noWinsText}>No wins yet</Text>
        )}
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
    height: undefined,
    aspectRatio: 1,
    borderRadius: 8,
    marginVertical: 10,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 90,
    height: 90,
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#24269B',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
});

export default OtherUserProfileScreen; 