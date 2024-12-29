import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  SafeAreaView,
  Button,
} from 'react-native';
import { Video } from 'expo-av';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getRandomComments } from '../data/comments';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

const PRESET_COMMENTS = [
    "Amazing work! Keep shining 🌟",
    "You're unstoppable! 🚀💪",
    "Wow, so proud of you! 🎉🙌",
    "Keep pushing forward! You've got this 💥🔥",
    "Your energy is contagious! 💫💛",
    "Look at you go! 👏✨",
    "Brilliant! You're on fire! 🔥💯",
    "You're making magic happen! 🌟✨",
    "Keep crushing it! 👊🎉",
    "You're a rockstar! 🌟🎸",
    "Your hard work shows! 💪👏",
    "Amazing progress, keep it up! 💯🌟",
    "Proud of you, always! 💪❤️",
    "Keep the good vibes coming! 😄🌈",
    "Love your dedication! 💪💥",
    "Your spirit is inspiring! 💫🙌",
    "You're doing fantastic! 🎉👏",
    "Nothing can stop you now! 🚀🔥",
    "So inspiring! Keep it up 💯✨",
    "Keep chasing your dreams! 🌟🌈",
    "You make it look easy! 👏💯",
    "So proud of your growth! 🌱💚",
    "Keep making waves! 🌊🎉",
    "You're a true inspiration! 💫🙌",
    "You're amazing! Keep shining 🌟💖",
    "You're going places! 🛤️🌟",
    "Love seeing your journey! 🌈💫",
    "Look at all you've done! 💪✨",
    "Pure brilliance! Keep going 💡🔥",
    "Your vibe is everything! 😄🌈",
    "Your journey is inspiring! 💪🌟",
    "Keep smashing those goals! 💥👏",
    "You've got this! 💯✨",
    "The sky's the limit! 🚀🌌",
    "Can't wait to see more! 👏🌈",
    "Keep spreading positivity! 🌈💫",
    "Your effort is inspiring! 💪💖",
    "You're crushing it daily! 🎉💥",
    "Amazing progress! 💪✨",
    "The world needs more of you! 🌎💫",
    "You're doing big things! 👏💯",
    "Keep going, you're unstoppable! 🚀💪",
    "You're making a difference! 💫❤️",
    "So much to be proud of! 🎉💖",
    "You're a powerhouse! 💥💪",
    "Your positivity shines! 🌞🌈",
    "Keep inspiring us all! 💫👏",
    "Your strength is inspiring! 💪✨",
    "Great work! Keep pushing! 💯🔥",
    "Your spirit lights up the room! 🌟😊",
    "Keep bringing the good energy! 🎉🌈",
    "You're a true champion! 🏆👏",
    "Keep reaching for the stars! 🌌✨",
    "Love watching you shine! 🌞❤️",
    "Amazing work! Keep soaring! 🚀💫",
    "You're full of potential! 💥🌟",
    "Keep making magic! ✨💫",
    "You've got a heart of gold! 💛👏",
    "Keep setting those goals! 🎯💪",
    "Love your enthusiasm! 😄🔥",
    "Keep going! You're amazing! 💯👏",
    "Big things coming your way! 🎉🌈",
    "Your courage is inspiring! 💪✨",
    "Keep bringing your best! 🌞💪",
    "Look at all you've achieved! 🌟🎉",
    "Keep going, you're golden! 💫👏",
    "You're a total inspiration! 💥🌈",
    "Keep shining your light! 🌟✨",
    "You're doing so well! 🎉👏",
    "So proud of your progress! 💖🌈",
    "Keep being amazing! 💯💥",
    "Your passion is contagious! ❤️🔥",
    "Keep slaying those goals! 👊💪",
    "Your energy is uplifting! 🌞💫",
    "You're doing something special! 💫",
    "You're a joy to watch! 🌈🎉",
    "Keep reaching for greatness! 🌟💯",
    "You're absolutely crushing it! 🚀💥",
    "Keep pushing, you're unstoppable! 💪✨",
    "Your journey is amazing! 🌈🌟",
    "Keep going, superstar! 🌟💫",
    "The world's lucky to have you! ❤️👏",
    "Keep being you! 🌈💖",
    "You're a light in the world! 🌞✨",
    "Keep that positivity flowing! 💫🎉",
    "You've got the magic touch! ✨👏",
    "So inspired by you! 🌟💥",
    "Keep spreading the love! ❤️💫",
    "You're a total rockstar! 🎸👏",
    "Loving your journey! 🌈❤️",
    "You're full of greatness! 💯🔥",
    "Keep showing up strong! 💪👏",
    "Your growth is inspiring! 🌱✨",
    "You're a burst of sunshine! 🌞💫",
    "Amazing work, keep it up! 💖💯",
    "So proud of everything you do! 🎉👏",
    "Keep making dreams happen! 🌌✨",
    "You're just getting started! 🚀💥",
    "Keep up the awesome work! 👏🌟",
    "Love watching you succeed! 💫🎉",
    ];

const WinCard = ({ win }) => {
  const [userData, setUserData] = useState(null);
  const [timeAgo, setTimeAgo] = useState('');
  const [imageHeight, setImageHeight] = useState(300);
  const [cheerCount, setCheerCount] = useState(win.cheers || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(win.comments || []);
  const cheerScale = useSharedValue(0);
  const cheerOpacity = useSharedValue(0);
  const [showAllComments, setShowAllComments] = useState(false);
  const [randomComments] = useState(() => 
    [...PRESET_COMMENTS].sort(() => 0.5 - Math.random()).slice(0, 3)
  );
  const [currentUser, setCurrentUser] = useState(null);

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

    const calculateTimeAgo = () => {
      const now = new Date().getTime();
      const createdAt = win.localTimestamp?.timestamp || new Date(win.createdAt).getTime();
      const diffInSeconds = Math.floor((now - createdAt) / 1000);

      if (diffInSeconds < 60) {
        setTimeAgo('Just now');
      } else if (diffInSeconds < 3600) {
        setTimeAgo(`${Math.floor(diffInSeconds / 60)}m ago`);
      } else if (diffInSeconds < 86400) {
        setTimeAgo(`${Math.floor(diffInSeconds / 3600)}h ago`);
      } else {
        if (win.localTimestamp) {
          setTimeAgo(`${win.localTimestamp.date} at ${win.localTimestamp.time}`);
        } else {
          const date = new Date(createdAt);
          setTimeAgo(date.toLocaleString());
        }
      }
    };

    calculateTimeAgo();
    const timer = setInterval(calculateTimeAgo, 60000);

    // Calculate image height if there's an image
    if (win.mediaType === 'photo' && win.mediaUrl) {
      Image.getSize(win.mediaUrl, (width, height) => {
        const screenWidth = Dimensions.get('window').width - 50; // Account for padding
        const scaledHeight = (height / width) * screenWidth;
        setImageHeight(scaledHeight);
      }, (error) => {
        console.error('Error getting image size:', error);
      });
    }

    // Check auth state when component mounts
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      console.log('Auth state changed:', user?.uid); // Debug log
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [win]);

  const renderMedia = () => {
    if (!win.mediaUrl) return null;

    if (win.mediaType === 'photo') {
      console.log('Rendering image with URL:', win.mediaUrl); // Debug log
      return (
        <Image
          source={{ uri: win.mediaUrl }}
          style={styles.media}
          resizeMode="contain"
        />
      );
    }

    if (win.mediaType === 'video') {
      return (
        <Video
          source={{ uri: win.mediaUrl }}
          style={styles.media}
          useNativeControls
          resizeMode="contain"
          isLooping
        />
      );
    }
  };

  const renderProfilePicture = () => {
    if (userData?.profilePicture) {
      return (
        <Image
          source={{ uri: userData.profilePicture }}
          style={styles.profilePic}
        />
      );
    }

    return (
      <View style={[styles.profilePic, styles.defaultProfilePic]}>
        <MaterialCommunityIcons 
          name="account" 
          size={24} 
          color="#fff" 
        />
      </View>
    );
  };

  const handleCheer = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const winRef = doc(db, 'wins', win.id);
      const newCheerCount = cheerCount + 1;
      
      await updateDoc(winRef, {
        cheers: newCheerCount
      });
      
      setCheerCount(newCheerCount);
      animateCheer();
    } catch (error) {
      console.error('Error updating cheers:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShowCommentOptions = () => {
    setShowComments(!showComments);
  };

  const handleAddComment = async (commentText) => {
    try {
      if (!auth.currentUser) {
        console.log('No user found:', auth.currentUser);
        Alert.alert('Error', 'You must be logged in to comment');
        return;
      }

      console.log('Adding comment with user:', auth.currentUser.uid);
      
      const winRef = doc(db, 'wins', win.id);
      const newComment = {
        text: commentText,
        userId: auth.currentUser.uid,
        timestamp: new Date().toISOString()
      };

      // Use arrayUnion to add the comment to the array
      await updateDoc(winRef, {
        comments: arrayUnion(newComment)
      });
      
      setComments(prev => [...prev, newComment]);
      setShowComments(false);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', `Failed to add comment: ${error.message}`);
    }
  };

  const animateCheer = () => {
    cheerScale.value = withSequence(
      withSpring(1, { damping: 5 }),
      withTiming(0, { duration: 500 })
    );
    cheerOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 500 })
    );
  };

  const cheerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cheerScale.value }],
      opacity: cheerOpacity.value,
    };
  });

  const renderComments = () => {
    if (comments.length === 0) return null;

    const commentsToShow = showAllComments ? comments : comments.slice(0, 3);
    const hasMoreComments = comments.length > 3;

    return (
      <View style={styles.commentsSection}>
        {commentsToShow.map((comment, index) => (
          <CommentItem key={index} comment={comment} />
        ))}
        {hasMoreComments && !showAllComments && (
          <TouchableOpacity 
            style={styles.moreCommentsButton}
            onPress={() => setShowAllComments(true)}
          >
            <Text style={styles.moreCommentsText}>
              Show {comments.length - 3} more {comments.length - 3 === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
        )}
        {showAllComments && hasMoreComments && (
          <TouchableOpacity 
            style={styles.moreCommentsButton}
            onPress={() => setShowAllComments(false)}
          >
            <Text style={styles.moreCommentsText}>Show less</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {renderProfilePicture()}
        <View style={styles.headerText}>
          <Text style={styles.username}>{userData?.username || 'User'}</Text>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
      </View>

      {win.text && <Text style={styles.text}>{win.text}</Text>}
      {renderMedia()}

      <Animated.View style={[styles.cheerOverlay, cheerAnimatedStyle]}>
        <Text style={styles.bigCheerEmoji}>👏</Text>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.cheerButton, isUpdating && styles.cheerButtonDisabled]}
          onPress={handleCheer}
          disabled={isUpdating}
        >
          <Text style={styles.cheerEmoji}>👏</Text>
          <Text style={styles.cheerCount}>{cheerCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.commentButton}
          onPress={handleShowCommentOptions}
        >
          <MaterialCommunityIcons name="comment-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {showComments && (
        <View style={styles.commentOptions}>
          {randomComments.map((comment, index) => (
            <TouchableOpacity
              key={index}
              style={styles.commentOption}
              onPress={() => handleAddComment(comment)}
            >
              <Text style={styles.commentOptionText}>{comment}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {renderComments()}
    </View>
  );
};

const CommentItem = ({ comment }) => {
  const [commentUserData, setCommentUserData] = useState(null);

  useEffect(() => {
    const fetchCommentUserData = async () => {
      try {
        const userId = comment.userId.toLowerCase();
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('User data for comment:', {
            userId: userId,
            username: userData.username,
            profilePicture: userData.profilePicture
          });
          setCommentUserData(userData);
        }
      } catch (error) {
        console.error('Error fetching comment user data:', error);
      }
    };

    fetchCommentUserData();
  }, [comment.userId]);

  return (
    <View style={styles.commentContainer}>
      {commentUserData?.profilePicture ? (
        <Image
          source={{ uri: commentUserData.profilePicture }}
          style={styles.commentProfilePic}
          onError={(e) => {
            console.log('Error loading profile picture:', {
              uri: commentUserData.profilePicture,
              error: e.nativeEvent.error
            });
          }}
        />
      ) : (
        <View style={[styles.commentProfilePic, styles.defaultProfilePic]}>
          <MaterialCommunityIcons name="account" size={16} color="#fff" />
        </View>
      )}
      <View style={styles.commentTextContainer}>
        <Text style={styles.commentUsername}>
          {commentUserData?.username || 'User'}
        </Text>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  defaultProfilePic: {
    backgroundColor: '#24269B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
    color: '#24269B',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    lineHeight: 22,
  },
  media: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  cheerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  cheerButtonDisabled: {
    opacity: 0.7,
  },
  cheerEmoji: {
    fontSize: 20,
    marginRight: 5,
  },
  cheerCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  commentButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginLeft: 10,
  },
  commentButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  commentsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  commentProfilePic: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  defaultProfilePic: {
    backgroundColor: '#24269B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentTextContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 8,
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  cheerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bigCheerEmoji: {
    fontSize: 100,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  moreCommentsButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 5,
  },
  moreCommentsText: {
    color: '#24269B',
    fontSize: 14,
    fontWeight: '500',
  },
  commentOptions: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  commentOption: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentOptionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});

export default WinCard; 