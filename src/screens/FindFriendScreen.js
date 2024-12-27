import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { states } from '../constants/states'; // We'll need to create this
import { questions } from '../constants/questions'; // Import your existing questions
import { searchIndex } from '../config/algolia';
import { auth } from '../config/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const FindFriendScreen = ({ navigation }) => {
  const [searchCriteria, setSearchCriteria] = useState({
    states: [],
    searchAnywhere: false,
    ageRange: { min: '18', max: '100' },  // Changed to strings for TextInput
    answers: {}
  });

  const [selectedWords, setSelectedWords] = useState({});

  const handleAgeChange = (type, value) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    setSearchCriteria(prev => ({
      ...prev,
      ageRange: {
        ...prev.ageRange,
        [type]: numericValue
      }
    }));
  };

  const renderQuestion = (question) => (
    <View key={question.text} style={styles.questionContainer}>
      <Text style={styles.questionText}>{question.text}</Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer..."
        value={searchCriteria.answers[question.text]}
        onChangeText={(text) => setSearchCriteria(prev => ({
          ...prev,
          answers: { ...prev.answers, [question.text]: text }
        }))}
        multiline
      />
      {question.words && (
        <View style={styles.wordsContainer}>
          {question.words.map((word) => (
            <TouchableOpacity
              key={word}
              style={[
                styles.wordButton,
                selectedWords[question.text]?.includes(word) && styles.selectedWord
              ]}
              onPress={() => toggleWord(question.text, word)}
            >
              <Text style={[
                styles.wordText,
                selectedWords[question.text]?.includes(word) && styles.selectedWordText
              ]}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const toggleWord = (questionText, word) => {
    setSelectedWords(prev => {
      const currentWords = prev[questionText] || [];
      const newWords = currentWords.includes(word)
        ? currentWords.filter(w => w !== word)
        : [...currentWords, word];
      return { ...prev, [questionText]: newWords };
    });
  };

  const toggleState = (state) => {
    setSearchCriteria(prev => ({
      ...prev,
      states: prev.states.includes(state)
        ? prev.states.filter(s => s !== state)
        : [...prev.states, state]
    }));
  };

  const handleSearch = async () => {
    try {
      // Get all selected words from all questions
      const allSelectedWords = Object.values(selectedWords)
        .flat()
        .filter(word => word);
        
      console.log('Searching for words:', allSelectedWords);

      // First get basic user data from Algolia
      let searchParams = {
        query: '',
        filters: `NOT objectID:${auth.currentUser.uid.toLowerCase()}`,
        attributesToRetrieve: [
          'objectID',
          'username',
          'profilePicture',
          'state',
          'age'
        ],
        hitsPerPage: 50
      };

      // Add state filter if not searching anywhere
      if (!searchCriteria.searchAnywhere && searchCriteria.states.length > 0) {
        searchParams.query = searchCriteria.states[0];
        searchParams.restrictSearchableAttributes = ['state'];
      }

      const { hits } = await searchIndex.search(searchParams.query, searchParams);
      console.log('Initial hits from Algolia:', hits.length);

      // Now fetch full user data from Firestore for each hit
      const enrichedHits = await Promise.all(hits.map(async (hit) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', hit.objectID));
          if (userDoc.exists()) {
            return {
              ...hit,
              questionAnswers: userDoc.data().questionAnswers || []
            };
          }
          return hit;
        } catch (error) {
          console.error('Error fetching user data:', error);
          return hit;
        }
      }));

      // Filter results based on selected words
      let filteredHits = enrichedHits;
      
      if (allSelectedWords.length > 0) {
        filteredHits = enrichedHits.filter(hit => {
          console.log(`\nChecking user ${hit.username}:`);
          
          if (!hit.questionAnswers) {
            console.log(`- No questionAnswers found`);
            return false;
          }

          const hasMatchingWord = hit.questionAnswers.some(answer => {
            if (!answer.selectedWords) {
              return false;
            }
            
            // Check if any of the search words match any of the user's selected words
            const matchFound = allSelectedWords.some(searchWord => 
              answer.selectedWords.includes(searchWord)
            );
            
            if (matchFound) {
              console.log(`- Match found in ${answer.question}:`, 
                answer.selectedWords.filter(word => allSelectedWords.includes(word))
              );
            }
            
            return matchFound;
          });

          console.log(`- Final match for ${hit.username}:`, hasMatchingWord);
          return hasMatchingWord;
        });
      }

      // Apply age filter
      const minAge = parseInt(searchCriteria.ageRange.min);
      const maxAge = parseInt(searchCriteria.ageRange.max);
      
      filteredHits = filteredHits.filter(hit => {
        const age = hit.age || 0;
        return age >= minAge && age <= maxAge;
      });

      console.log('\nFiltering summary:');
      console.log('Initial results:', hits.length);
      console.log('Selected words:', allSelectedWords);
      console.log('After word filtering:', filteredHits.length);
      console.log('Final filtered results:', JSON.stringify(filteredHits, null, 2));

      navigation.navigate('FriendResults', { matches: filteredHits });

    } catch (error) {
      console.error('Search error details:', error);
      console.error('Error stack:', error.stack);
      Alert.alert(
        'Search Error',
        'Unable to complete the search. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Preferences</Text>
            <View style={styles.locationContainer}>
              <Text>Search Anywhere</Text>
              <Switch
                value={searchCriteria.searchAnywhere}
                onValueChange={(value) => setSearchCriteria(prev => ({
                  ...prev,
                  searchAnywhere: value,
                  states: []
                }))}
              />
            </View>
            {!searchCriteria.searchAnywhere && (
              <View style={styles.statesContainer}>
                <Text style={styles.statesLabel}>Select states:</Text>
                <View style={styles.statesGrid}>
                  {states.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.stateButton,
                        searchCriteria.states.includes(state) && styles.stateButtonSelected
                      ]}
                      onPress={() => toggleState(state)}
                    >
                      <Text 
                        style={[
                          styles.stateButtonText,
                          searchCriteria.states.includes(state) && styles.stateButtonTextSelected
                        ]}
                      >
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age Range</Text>
            <View style={styles.ageInputContainer}>
              <View style={styles.ageInput}>
                <Text>Min Age:</Text>
                <TextInput
                  style={styles.ageTextInput}
                  keyboardType="numeric"
                  value={searchCriteria.ageRange.min}
                  onChangeText={(value) => handleAgeChange('min', value)}
                  maxLength={3}
                />
              </View>
              <View style={styles.ageInput}>
                <Text>Max Age:</Text>
                <TextInput
                  style={styles.ageTextInput}
                  keyboardType="numeric"
                  value={searchCriteria.ageRange.max}
                  onChangeText={(value) => handleAgeChange('max', value)}
                  maxLength={3}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What are you looking for in friends?</Text>
            {questions.map(renderQuestion)}
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
      <TouchableOpacity 
        style={styles.searchButton}
        onPress={handleSearch}
      >
        <Text style={styles.searchButtonText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    paddingBottom: 90,
  },
  content: {
    padding: 15,
  },
  bottomSpacer: {
    height: 70,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  ageInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ageInput: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  ageTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginLeft: 10,
    width: 80,
    textAlign: 'center',
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    marginBottom: 10,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  wordButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    margin: 4,
  },
  selectedWord: {
    backgroundColor: '#24269B',
  },
  wordText: {
    color: '#000',
  },
  selectedWordText: {
    color: '#fff',
  },
  searchButton: {
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    elevation: 5,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statesContainer: {
    marginTop: 10,
    marginBottom: 60, // Add space for the fixed button
  },
  statesLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  statesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  stateButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    margin: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  stateButtonSelected: {
    backgroundColor: '#24269B',
  },
  stateButtonText: {
    color: '#000',
    fontSize: 14,
  },
  stateButtonTextSelected: {
    color: '#fff',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 90,
  },
});

export default FindFriendScreen; 