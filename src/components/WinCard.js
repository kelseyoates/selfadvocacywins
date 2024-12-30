import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../config/firebase';




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


const WinCard = ({ win, onCheersPress, onCommentsPress, lazyLoad = false }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cheerCount, setCheerCount] = useState(win.cheers || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const cheerScale = useSharedValue(0);
  const cheerOpacity = useSharedValue(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(win.comments || []);
  const [showAllComments, setShowAllComments] = useState(false);
  const [randomComments] = useState(() => 
    [...PRESET_COMMENTS].sort(() => 0.5 - Math.random()).slice(0, 3)
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(!lazyLoad);

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

    if (win.userId) {
      fetchUserData();
    }
  }, [win.userId]);

  const togglePlayback = async () => {
    if (!videoRef.current) return;

    try {
      const status = await videoRef.current.getStatusAsync();
      console.log('Current video status:', status);

      if (status.isPlaying) {
        console.log('Pausing video...');
        await videoRef.current.pauseAsync();
      } else {
        console.log('Playing video...');
        await videoRef.current.playAsync();
      }
      
      const newStatus = await videoRef.current.getStatusAsync();
      setIsPlaying(newStatus.isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const renderMedia = () => {
    if (!win.mediaUrl) return null;

    if (win.mediaType === 'video') {
      if (!shouldLoadVideo) {
        return (
          <TouchableOpacity 
            style={styles.mediaContainer}
            onPress={() => setShouldLoadVideo(true)}
          >
            <View style={styles.videoPlaceholder}>
              <MaterialCommunityIcons 
                name="play-circle" 
                size={50} 
                color="white" 
              />
              <Text style={styles.tapToLoadText}>Tap to load video</Text>
            </View>
          </TouchableOpacity>
        );
      }

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
      // animateCheer();
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



  // const animateCheer = () => {
  //   cheerScale.value = withSequence(
  //     withSpring(1, { damping: 5 }),
  //     withTiming(0, { duration: 500 })
  //   );
  //   cheerOpacity.value = withSequence(
  //     withTiming(1, { duration: 100 }),
  //     withTiming(0, { duration: 500 })
  //   );
  // };

  // const cheerAnimatedStyle = useAnimatedStyle(() => {
  //   return {
  //     transform: [{ scale: cheerScale.value }],
  //     opacity: cheerOpacity.value,
  //   };
  // });

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
        <View style={styles.userInfo}>
          {userData?.profilePicture ? (
            <Image 
              source={{ uri: userData.profilePicture }} 
              style={styles.profilePicture}
            />
          ) : (
            <MaterialCommunityIcons 
              name="account-circle" 
              size={40} 
              color="#24269B" 
            />
          )}
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

      {/* <Animated.View style={[styles.cheerOverlay, cheerAnimatedStyle]}>
        <Text style={styles.bigCheerEmoji}>👏</Text>
      </Animated.View> */}

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
          <MaterialCommunityIcons name="comment-outline" size={40} color="#24269B" />
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
    borderWidth: 1,
    borderColor: '#000000',
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
    
  },
  cheerButtonDisabled: {
    opacity: 0.7,
  },
  cheerEmoji: {
    fontSize: 40,
    marginRight: 5,
  },
  cheerCount: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  commentButton: {
    padding: 8,
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
    padding: 10,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
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
    fontSize: 16,
    fontWeight: '500',
  },
  commentOptions: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  commentOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  commentOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
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
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nameTimeContainer: {
    flex: 1,
    justifyContent: 'center',
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
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToLoadText: {
    color: 'white',
    marginTop: 10,
  }
});

export default WinCard; 