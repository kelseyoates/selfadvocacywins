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
import QuestionCard from './QuestionCard';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const DatingProfileForm = ({ userId, initialData = {} }) => {
  const [formData, setFormData] = useState({
    gender: initialData.gender || '',
    lookingFor: initialData.lookingFor || '',
    ageRange: initialData.ageRange || { min: 18, max: 99 },
    datingAnswers: initialData.datingAnswers || {}
  });

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLookingForModal, setShowLookingForModal] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);

  const genderOptions = ['Man', 'Woman', 'Non-Binary'];
  const lookingForOptions = ['Man', 'Woman', 'Both'];

  const datingQuestions = [
    {
      id: 'dating1',
      question: "What I'm looking for in a partner 💝:",
      presetWords: [
        "kind", "honest", "funny", "caring", "understanding", 
        "patient", "supportive", "fun", "active", "creative", 
        "family-oriented", "ambitious", "adventurous"
      ]
    },
    {
      id: 'dating2',
      question: "My ideal first date would be 🌟:",
      presetWords: [
        "coffee", "dinner", "movies", "walk in the park", 
        "museum", "arcade", "bowling", "mini golf", 
        "ice cream", "picnic", "zoo", "aquarium"
      ]
    },
    {
      id: 'dating3',
      question: "My favorite date activities are 🎉:",
      presetWords: [
        "watching movies", "dining out", "cooking together", 
        "playing games", "sports", "shopping", "hiking", 
        "visiting museums", "trying new things", "traveling", 
        "going to events", "listening to music"
      ]
    },
    {
      id: 'dating4',
      question: "I would like to meet people in these states 🗺️:",
      presetWords: US_STATES
    }
  ];

  const handleSubmit = async () => {
    try {
      await updateUserDatingProfile(userId, formData);
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error saving dating profile:', error);
      alert('Error updating profile');
    }
  };

  const handleAnswerSave = async (newAnswer) => {
    try {
      const updatedData = {
        ...formData,
        datingAnswers: {
          ...(formData.datingAnswers || {}),
          [newAnswer.question]: {
            answer: newAnswer.answer,
            timestamp: new Date().toISOString()
          }
        }
      };
      setFormData(updatedData);
      await updateUserDatingProfile(userId, updatedData);
    } catch (error) {
      console.error('Error saving answer:', error);
      alert('Error saving answer');
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
      <Text style={styles.label}>I am a:</Text>
      <TouchableOpacity 
        style={styles.selectButton}
        onPress={() => setShowStatusModal(true)}
      >
        <Text style={styles.selectButtonText}>
          {formData.gender || 'Select gender...'}
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

      <Text style={styles.label}>Age Range:</Text>
      <TouchableOpacity 
        style={styles.selectButton}
        onPress={() => setShowAgeModal(true)}
      >
        <Text style={styles.selectButtonText}>
          {formData.ageRange ? 
            `${formData.ageRange.min} - ${formData.ageRange.max} years` : 
            'Select age range...'}
        </Text>
      </TouchableOpacity>

      <View style={styles.questionsSection}>
        <Text style={styles.sectionTitle}>Dating Profile Questions</Text>
        {datingQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q.question}
            presetWords={q.presetWords}
            initialAnswer={formData.datingAnswers?.[q.question]?.answer || ''}
            onSave={(answer) => handleAnswerSave({
              question: q.question,
              answer
            })}
          />
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
        genderOptions,
        formData.gender,
        (value) => setFormData({...formData, gender: value}),
        () => setShowStatusModal(false)
      )}

      {renderOptionModal(
        showLookingForModal,
        lookingForOptions,
        formData.lookingFor,
        (value) => setFormData({...formData, lookingFor: value}),
        () => setShowLookingForModal(false)
      )}

      <Modal
        visible={showAgeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Age Range</Text>
            
            <View style={styles.ageInputContainer}>
              <View style={styles.ageInput}>
                <Text style={styles.ageLabel}>Minimum Age:</Text>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => {
                    const newMin = Math.max(18, (formData.ageRange?.min || 18) - 1);
                    setFormData({
                      ...formData,
                      ageRange: { ...formData.ageRange, min: newMin }
                    });
                  }}
                >
                  <Text style={styles.ageButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.ageValue}>{formData.ageRange?.min || 18}</Text>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => {
                    const newMin = Math.min((formData.ageRange?.max || 99) - 1, (formData.ageRange?.min || 18) + 1);
                    setFormData({
                      ...formData,
                      ageRange: { ...formData.ageRange, min: newMin }
                    });
                  }}
                >
                  <Text style={styles.ageButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.ageInput}>
                <Text style={styles.ageLabel}>Maximum Age:</Text>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => {
                    const newMax = Math.max((formData.ageRange?.min || 18) + 1, (formData.ageRange?.max || 99) - 1);
                    setFormData({
                      ...formData,
                      ageRange: { ...formData.ageRange, max: newMax }
                    });
                  }}
                >
                  <Text style={styles.ageButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.ageValue}>{formData.ageRange?.max || 99}</Text>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => {
                    const newMax = Math.min(99, (formData.ageRange?.max || 99) + 1);
                    setFormData({
                      ...formData,
                      ageRange: { ...formData.ageRange, max: newMax }
                    });
                  }}
                >
                  <Text style={styles.ageButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAgeModal(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  questionsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 15,
    marginTop: 10,
  },
  ageInputContainer: {
    marginVertical: 20,
  },
  ageInput: {
    marginVertical: 10,
    alignItems: 'center',
  },
  ageLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#24269B',
  },
  ageButton: {
    backgroundColor: '#24269B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  ageButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  ageValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#24269B',
  },
});

export default DatingProfileForm; 