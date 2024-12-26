import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CommentModal = ({ visible, onClose, onSelectComment }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Choose a comment</Text>
          
          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onSelectComment("Look at you go! 👏✨");
              onClose();
            }}
          >
            <Text style={styles.optionText}>Look at you go! 👏✨</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onSelectComment("You're doing big things! 👏💯");
              onClose();
            }}
          >
            <Text style={styles.optionText}>You're doing big things! 👏💯</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onSelectComment("Keep spreading positivity! 🌈👊");
              onClose();
            }}
          >
            <Text style={styles.optionText}>Keep spreading positivity! 🌈👊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#24269B',
  },
  option: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
  },
  cancelText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default CommentModal; 