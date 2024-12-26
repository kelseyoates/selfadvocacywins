import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Dimensions } from 'react-native';

const CommentOptionsModal = ({ visible, onClose, onSelectComment }) => {
  if (!visible) return null;

  const comments = [
    "Look at you go! 👏✨",
    "You're doing big things! 👏💯",
    "Keep spreading positivity! 🌈👊"
  ];

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={styles.sheet}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Choose a comment</Text>
          </View>

          {comments.map((comment, index) => (
            <TouchableOpacity
              key={index}
              style={styles.option}
              onPress={() => {
                onSelectComment(comment);
                onClose();
              }}
            >
              <Text style={styles.optionText}>{comment}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
};

const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -windowHeight,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: windowHeight * 0.9,
    marginBottom: windowHeight,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#24269B',
  },
  option: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  cancelButton: {
    padding: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
  },
});

export default CommentOptionsModal; 