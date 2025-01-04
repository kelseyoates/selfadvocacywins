import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

import QuestionCard from './QuestionCard';

// Add dating questions to the regular questions array, but mark them as dating questions
const datingQuestions = [
  {
    id: 'dating1',
    question: 'A little bit about me 😀:',
    presetWords: ['caring', 'funny', 'honest', 'kind', 'loyal', 'outgoing', 'quiet', 'serious', 'shy', 'silly'],
    isDatingQuestion: true  // Add this flag
  },
  {
    id: 'dating2',
    question: "What I'm like as a partner 💝:",
    presetWords: ['caring', 'dependable', 'honest', 'kind', 'loving', 'loyal', 'respectful', 'supportive', 'thoughtful', 'understanding'],
    isDatingQuestion: true
  },
  {
    id: 'dating3',
    question: 'My ideal first date would be 🌟:',
    presetWords: ['coffee', 'dinner', 'lunch', 'movies', 'museum', 'park', 'picnic', 'walk', 'zoo'],
    isDatingQuestion: true
  },
  {
    id: 'dating4',
    question: 'My favorite date activities are 🎉:',
    presetWords: ['bowling', 'cooking', 'dancing', 'dining out', 'hiking', 'movies', 'music', 'sports', 'walking', 'watching movies'],
    isDatingQuestion: true
  },
  {
    id: 'dating5',
    question: 'I would like to meet people in these states 🗺️:',
    presetWords: ['California', 'Florida', 'Illinois', 'Massachusetts', 'New York', 'Texas'],
    isDatingQuestion: true
  }
];

const DatingProfileForm = ({ userId, profileData }) => {
  const [hasDatingSubscription, setHasDatingSubscription] = useState(false);

  // Check subscription status when component mounts
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        if (!userId) return;

        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Check if user has selfAdvocateDating subscription type
        const hasSubscription = userData?.subscriptionType === 'selfAdvocateDating';
        console.log('Subscription check:', {
          type: userData?.subscriptionType,
          hasDating: hasSubscription,
          userData: userData
        });
        
        setHasDatingSubscription(hasSubscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [userId]);

  const handleAnswerSave = async ({ question, answer }) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }

      if (!hasDatingSubscription) {
        throw new Error('Dating subscription required');
      }

      const userRef = doc(db, 'users', userId);
      
      // Get current answers
      const userDoc = await getDoc(userRef);
      const currentAnswers = userDoc.data()?.questionAnswers || [];

      // Remove any existing answer for this question
      const filteredAnswers = currentAnswers.filter(a => a.question !== question);

      // Add new answer
      const newAnswer = {
        question: question,
        selectedWords: answer.selectedWords || [],
        textAnswer: answer.textAnswer || '',
        mediaType: answer.mediaType || null,
        mediaUrl: answer.mediaUrl || null,
        timestamp: new Date().toISOString(),
        isDatingQuestion: true
      };

      // Update Firestore
      await updateDoc(userRef, {
        questionAnswers: [...filteredAnswers, newAnswer]
      });

      console.log('Successfully saved dating answer:', newAnswer);
      Alert.alert('Success', 'Your dating profile answer has been saved!');

    } catch (error) {
      console.error('Error saving answer:', error);
      Alert.alert('Error', 'Failed to save your answer: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      {!hasDatingSubscription ? (
        <View style={styles.subscriptionBanner}>
          <Text style={styles.bannerText}>
            💝 Subscribe to Self Advocate Dating to unlock dating profile questions!
          </Text>
        </View>
      ) : (
        <View style={styles.questionsContainer}>
          {datingQuestions.map((q) => {
            const storedAnswer = profileData?.questionAnswers?.find(
              a => a.question === q.question
            );
            
            console.log('Rendering question:', q.question, 'with stored answer:', storedAnswer);

            return (
              <QuestionCard
                key={q.id}
                question={q.question}
                presetWords={q.presetWords}
                existingAnswer={{
                  selectedWords: storedAnswer?.selectedWords || [],
                  textAnswer: storedAnswer?.textAnswer || '',
                  mediaUrl: storedAnswer?.mediaUrl,
                  mediaType: storedAnswer?.mediaType
                }}
                isDatingQuestion={true}
                onSave={(answer) => handleAnswerSave({
                  question: q.question,
                  answer: {
                    ...answer,
                    question: q.question
                  }
                })}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: 16,
  },
  subscriptionBanner: {
    backgroundColor: '#FFE4E1',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  bannerText: {
    textAlign: 'center',
    color: '#FF69B4',
  },
  questionsContainer: {
    gap: 16,
  }
};

export default DatingProfileForm; 