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
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getAuth } from 'firebase/auth';
import { getDoc, doc, collection, query, where, orderBy, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useRoute } from '@react-navigation/native';
import OtherUserQuestionCard from '../components/OtherUserQuestionCard';
import WinCard from '../components/WinCard';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import { Video } from 'expo-av';

const DEFAULT_PROFILE_IMAGE = 'https://via.placeholder.com/100';

const OtherUserProfileScreen = ({ route, navigation }) => {
  console.log('Route params:', route.params);
  
  // Get profileUserId from route.params
  const profileUserId = route.params?.profileUserId?.toLowerCase();
  console.log('Profile User ID (lowercase):', profileUserId);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [wins, setWins] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedWin, setSelectedWin] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentUsers, setCommentUsers] = useState({});
  const [userData, setUserData] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

  console.log('Current user data:', userData);
  console.log('Current profile data:', profileData);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userIdToFetch = profileUserId;
        
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
  }, [profileUserId]);

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
      presetWords: ["Special Olympics", "Best Buddies", "sports", "theater", "watching movies", "art", "dancing", "playing with my dog", "gaming", "listening to music", "hang with friends", "traveling", "reading", "cooking", "photography", "writing"]
    },
    {
      id: 3,
      question: "What I'm like as a friend 🤝:",
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
    // Dating questions - only visible with selfAdvocateDating subscription
    {
      id: 7,
      question: "What I'm like as a partner 💝:",
      presetWords: ["caring", "dependable", "honest", "kind", "loving", "loyal", "respectful", "supportive", "thoughtful", "understanding"],
      isDatingQuestion: true
    },
    {
      id: 8,
      question: "My ideal first date would be 🌟:",
      presetWords: ["coffee", "dinner", "lunch", "movies", "museum", "park", "picnic", "walk", "zoo"],
      isDatingQuestion: true
    },
    {
      id: 9,
      question: "My favorite date activities are 🎉:",
      presetWords: ["bowling", "cooking", "dancing", "dining out", "hiking", "movies", "music", "sports", "walking", "watching movies"],
      isDatingQuestion: true
    },
    {
      id: 10,
      question: "I would like to meet people in these states 🗺️:",
      presetWords: ["California", "Florida", "Illinois", "Massachusetts", "New York", "Texas"],
      isDatingQuestion: true
    }
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

  const formatBirthday = (dateString) => {
    if (!dateString) return '';
    
    // Parse the date string (which is already in YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    
    // Create a new date (months are 0-based in JavaScript)
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Update the useEffect that checks follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        if (!auth.currentUser || !profileUserId) return;

        console.log('Checking follow status for current user:', auth.currentUser.uid.toLowerCase());
        console.log('Checking against profile:', profileUserId.toLowerCase());

        const currentUserRef = doc(db, 'users', auth.currentUser.uid.toLowerCase());
        const currentUserDoc = await getDoc(currentUserRef);
        
        if (currentUserDoc.exists()) {
          const following = currentUserDoc.data().following || [];
          const isUserFollowing = following.includes(profileUserId.toLowerCase());
          console.log('Current following status:', isUserFollowing);
          setIsFollowing(isUserFollowing);
        }

        // Also ensure the target user has a followers array
        const targetUserRef = doc(db, 'users', profileUserId.toLowerCase());
        const targetUserDoc = await getDoc(targetUserRef);
        
        if (targetUserDoc.exists()) {
          if (!targetUserDoc.data().followers) {
            // Initialize followers array if it doesn't exist
            await updateDoc(targetUserRef, {
              followers: []
            });
          }
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [profileUserId, auth.currentUser]);

  // Update the handleFollowPress function
  const handleFollowPress = async () => {
    try {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid.toLowerCase());
      const targetUserRef = doc(db, 'users', profileUserId.toLowerCase());
      
      if (isFollowing) {
        // Unfollow - update both users
        await Promise.all([
          updateDoc(currentUserRef, {
            following: arrayRemove(profileUserId.toLowerCase())
          }),
          updateDoc(targetUserRef, {
            followers: arrayRemove(auth.currentUser.uid.toLowerCase())
          })
        ]);
        console.log('Unfollowed user:', profileUserId.toLowerCase());
      } else {
        // Follow - update both users
        await Promise.all([
          updateDoc(currentUserRef, {
            following: arrayUnion(profileUserId.toLowerCase())
          }),
          updateDoc(targetUserRef, {
            followers: arrayUnion(auth.currentUser.uid.toLowerCase())
          })
        ]);
        console.log('Followed user:', profileUserId.toLowerCase());
      }
      
      // Force refresh of follow status
      setIsFollowing(!isFollowing);
      
      // Trigger a re-render of the profile data
      const userDoc = await getDoc(doc(db, 'users', profileUserId.toLowerCase()));
      if (userDoc.exists()) {
        setProfileData(userDoc.data());
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
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
        <Text style={styles.bio}> 🎂 {formatBirthday(profileData?.birthdate || '')}</Text>
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

      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.chatButton]}
            onPress={() => {
              if (!profileUserId || !auth.currentUser) {
                console.log('Missing required IDs:', { profileUserId, currentUser: auth.currentUser?.uid });
                return;
              }
              
              const chatParams = {
                uid: profileUserId,
                name: profileData?.username || 'User'
              };
              
              console.log('Starting chat with params:', chatParams);
              navigation.navigate('ChatConversation', chatParams);
            }}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>
                Start Chat <MaterialCommunityIcons name="chat" size={24} color="white" />
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button, 
              isFollowing ? styles.followingButton : styles.followButton
            ]}
            onPress={handleFollowPress}
          >
            <View style={styles.buttonContent}>
              <Text style={[
                styles.buttonText,
                isFollowing && styles.followingButtonText
              ]}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Text>
              <MaterialCommunityIcons 
                name={isFollowing ? "minus" : "plus"} 
                size={20} 
                color={isFollowing ? "#24269B" : "white"} 
                style={styles.iconStyle}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.questionsContainer}>
        <Text style={styles.sectionTitle}>My Profile</Text>


        {profileData?.subscriptionType === 'selfAdvocateDating' && (
        <View style={styles.datingSection}>
          <Text style={styles.sectionTitle}>Dating Profile</Text>
          
          <View style={styles.datingInfo}>
            <View style={styles.datingInfoItem}>
              <Text style={styles.label}>My Gender:</Text>
              <Text style={styles.value}>{profileData.gender || 'Not specified'}</Text>
            </View>

            <View style={styles.datingInfoItem}>
              <Text style={styles.label}>I'm Looking For:</Text>
              <Text style={styles.value}>{profileData.lookingFor || 'Not specified'}</Text>
            </View>

            <View style={styles.datingInfoItem}>
              <Text style={styles.label}>Age Range:</Text>
              <Text style={styles.value}>
                {profileData.ageRange ? 
                  `${profileData.ageRange.min} - ${profileData.ageRange.max} years` : 
                  'Not specified'}
              </Text>
            </View>
          </View>

        </View>
      )}


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
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 10,
   
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
  buttonContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 25,
    position: 'relative',
    zIndex: 1,
  },
  chatButton: {
    backgroundColor: '#24269B',
    padding: 12,
  },
  followButton: {
    backgroundColor: '#24269B',
    padding: 12,
  },
  followingButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 2,
    borderColor: '#24269B',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#24269B',
  },
  iconStyle: {
    marginLeft: 5,
  },
  datingSection: {
    marginTop: 20,
  },
  datingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 0,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#000000',
  },
  
  datingInfoItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    ':last-child': {
      borderRightWidth: 0,
    },

  },
  
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  questionCard: {
    marginBottom: 12,
  },
  datingQuestionsContainer: {
    marginTop: 10,
  },
  subscriptionBanner: {
    backgroundColor: '#FFE4E1',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  bannerText: {
    textAlign: 'center',
    color: '#FF69B4',
  },
});

export default OtherUserProfileScreen; 