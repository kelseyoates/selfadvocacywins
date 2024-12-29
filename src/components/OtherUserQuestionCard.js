import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const OtherUserQuestionCard = ({ question, questionId, backgroundColor, userId }) => {
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedWords, setSelectedWords] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('text');

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        if (!userId) {
          console.log('Missing userId:', userId);
          return;
        }

        // Fetch the user document which contains the questionAnswers array
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const questionAnswers = userData.questionAnswers || [];
          
          // Find the answer for this specific question
          const answer = questionAnswers.find(qa => qa.question === question);
          
          if (answer) {
            console.log('Found answer:', answer);
            setTextAnswer(answer.textAnswer || '');
            setSelectedWords(answer.selectedWords || []);
            setVideoUrl(answer.videoUrl || null);
          } else {
            console.log('No answer found for question:', question);
          }
        }

      } catch (error) {
        console.error('Error fetching answers:', error);
      }
    };

    fetchAnswers();
  }, [question, userId]);

  const renderContent = () => {
    switch (activeTab) {
      case 'text':
        return (
          <Text style={styles.textAnswer}>
            {textAnswer || 'No written answer yet'}
          </Text>
        );
      case 'words':
        return (
          <View style={styles.wordsContainer}>
            {selectedWords.length > 0 ? (
              selectedWords.map((word, index) => (
                <View key={index} style={styles.wordBubble}>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noAnswer}>No selected words yet</Text>
            )}
          </View>
        );
      case 'video':
        return videoUrl ? (
          <Video
            source={{ uri: videoUrl }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
            isLooping
            shouldPlay={isPlaying}
          />
        ) : (
          <Text style={styles.noAnswer}>No video answer yet</Text>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor }]}>
      <Text style={styles.question}>{question}</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'text' && styles.activeTab]} 
          onPress={() => setActiveTab('text')}
        >
          <MaterialCommunityIcons 
            name="pencil" 
            size={24} 
            color={activeTab === 'text' ? '#24269B' : '#666'} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'words' && styles.activeTab]} 
          onPress={() => setActiveTab('words')}
        >
          <MaterialCommunityIcons 
            name="format-list-bulleted" 
            size={24} 
            color={activeTab === 'words' ? '#24269B' : '#666'} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'video' && styles.activeTab]} 
          onPress={() => setActiveTab('video')}
        >
          <MaterialCommunityIcons 
            name="video" 
            size={24} 
            color={activeTab === 'video' ? '#24269B' : '#666'} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 5,
  },
  tab: {
    padding: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'white',
  },
  contentContainer: {
    minHeight: 100,
  },
  textAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  wordText: {
    fontSize: 14,
    color: '#444',
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  noAnswer: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default OtherUserQuestionCard; 