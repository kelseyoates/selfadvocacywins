import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
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

const CommentModal = ({ visible, onClose, options, onSelect }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose a comment</Text>
          {options.map((comment, index) => (
            <TouchableOpacity
              key={index}
              style={styles.commentOption}
              onPress={() => onSelect(comment)}
            >
              <Text style={styles.commentOptionText}>{comment}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const WinCard = ({ win }) => {
  const [userData, setUserData] = useState(null);
  const [timeAgo, setTimeAgo] = useState('');
  const [imageHeight, setImageHeight] = useState(300);
  const [cheerCount, setCheerCount] = useState(win.cheers || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentOptions, setCommentOptions] = useState([]);
  const [comments, setComments] = useState(win.comments || []);
  const [lastTap, setLastTap] = useState(null);
  const cheerScale = useSharedValue(0);
  const cheerOpacity = useSharedValue(0);
  const [showAllComments, setShowAllComments] = useState(false);

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

    return () => clearInterval(timer);
  }, [win]);

  const renderMedia = () => {
    if (!win.mediaUrl) return null;

    if (win.mediaType === 'photo') {
      return (
        <Image
          source={{ uri: win.mediaUrl }}
          style={[styles.media, { height: imageHeight }]}
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
    } catch (error) {
      console.error('Error updating cheers:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShowCommentOptions = () => {
    const options = getRandomComments(3);
    console.log('Opening modal with options:', options);
    setCommentOptions(options);
    setShowCommentModal(true);
  };

  const handleAddComment = async (commentText) => {
    try {
      const winRef = doc(db, 'wins', win.id);
      const currentUser = auth.currentUser;
      console.log('Adding comment with user:', {
        uid: currentUser.uid,
        email: currentUser.email
      });

      const comment = {
        text: commentText,
        userId: currentUser.uid.toLowerCase(),
        createdAt: new Date().toISOString(),
        localTimestamp: {
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: new Date().getTime()
        }
      };

      // Get current comments array
      const winDoc = await getDoc(winRef);
      const currentComments = winDoc.data().comments || [];
      
      // Update with new comment
      await updateDoc(winRef, {
        comments: [...currentComments, comment]
      });

      setComments([...currentComments, comment]);
      setShowCommentModal(false);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDoubleTap = async (event) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (!isUpdating) {
        await handleCheer();
        animateCheer();
      }
    }
    setLastTap(now);
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
    <>
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

        {renderComments()}
      </View>

      {showCommentModal && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose a comment</Text>
              {commentOptions.map((comment, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.commentOption}
                  onPress={() => {
                    handleAddComment(comment);
                    setShowCommentModal(false);
                  }}
                >
                  <Text style={styles.commentOptionText}>{comment}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCommentModal(false)}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxWidth: 400,
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 15,
    textAlign: 'center',
  },
  commentOption: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  commentOptionText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
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
});

export default WinCard; 