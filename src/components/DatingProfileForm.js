import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Modal
} from 'react-native';
import { updateUserDatingProfile } from '../services/userService';

const DatingProfileForm = ({ userId, initialData = {} }) => {
  const [formData, setFormData] = useState({
    relationshipStatus: initialData.relationshipStatus || '',
    lookingFor: initialData.lookingFor || '',
    datingInterests: initialData.datingInterests || [],
    datePreferences: initialData.datePreferences || {}
  });

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLookingForModal, setShowLookingForModal] = useState(false);

  const relationshipOptions = ['Single', 'In a Relationship', "It's Complicated"];
  const lookingForOptions = ['Friendship', 'Dating', 'Long-term Relationship'];
  const interestOptions = [
    { id: 'movies', name: 'Movies' },
    { id: 'dining', name: 'Dining Out' },
    { id: 'outdoor', name: 'Outdoor Activities' },
    { id: 'sports', name: 'Sports' },
    { id: 'arts', name: 'Arts & Culture' }
  ];

  const toggleInterest = (interestId) => {
    setFormData(prev => {
      const currentInterests = prev.datingInterests || [];
      const newInterests = currentInterests.includes(interestId)
        ? currentInterests.filter(id => id !== interestId)
        : [...currentInterests, interestId];
      
      return {
        ...prev,
        datingInterests: newInterests
      };
    });
  };

  const handleSubmit = async () => {
    try {
      await updateUserDatingProfile(userId, formData);
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error saving dating profile:', error);
      alert('Error updating profile');
    }
  };

  const renderOptionModal = (visible, options, currentValue, onSelect, onClose) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  currentValue === option && styles.selectedOption
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  currentValue === option && styles.selectedOptionText
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Relationship Status</Text>
      <TouchableOpacity 
        style={styles.selectButton}
        onPress={() => setShowStatusModal(true)}
      >
        <Text style={styles.selectButtonText}>
          {formData.relationshipStatus || 'Select status...'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Looking For</Text>
      <TouchableOpacity 
        style={styles.selectButton}
        onPress={() => setShowLookingForModal(true)}
      >
        <Text style={styles.selectButtonText}>
          {formData.lookingFor || 'Select what you\'re looking for...'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Interests</Text>
      <View style={styles.interestsContainer}>
        {interestOptions.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.interestButton,
              formData.datingInterests.includes(interest.id) && styles.selectedInterest
            ]}
            onPress={() => toggleInterest(interest.id)}
          >
            <Text style={[
              styles.interestText,
              formData.datingInterests.includes(interest.id) && styles.selectedInterestText
            ]}>
              {interest.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Save Profile</Text>
      </TouchableOpacity>

      {renderOptionModal(
        showStatusModal,
        relationshipOptions,
        formData.relationshipStatus,
        (value) => setFormData({...formData, relationshipStatus: value}),
        () => setShowStatusModal(false)
      )}

      {renderOptionModal(
        showLookingForModal,
        lookingForOptions,
        formData.lookingFor,
        (value) => setFormData({...formData, lookingFor: value}),
        () => setShowLookingForModal(false)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#24269B',
  },
  selectButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  interestButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedInterest: {
    backgroundColor: '#24269B',
    borderColor: '#24269B',
  },
  interestText: {
    color: '#333',
  },
  selectedInterestText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedOption: {
    backgroundColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#24269B',
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#24269B',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DatingProfileForm; 