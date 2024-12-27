import React, { useState, useEffect } from 'react';
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
import { searchIndex, adminIndex } from '../config/algolia';
import { auth } from '../config/firebase';
import { getDoc, doc, getDocs, collection, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const FindFriendScreen = ({ navigation }) => {
  const [searchCriteria, setSearchCriteria] = useState({
    states: [],
    searchAnywhere: false,
    ageRange: { min: '18', max: '100' },  // Changed to strings for TextInput
    answers: {},
    winTopics: ''
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
      const currentUserId = auth.currentUser.uid;
      console.log('DEBUG: Current user ID:', currentUserId);

      // Get win topics
      const winTopics = searchCriteria.winTopics
        .toLowerCase()
        .split(',')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0);
      
      // Get selected words from state and flatten them
      const selectedWordsList = Object.values(selectedWords || {})
        .flat()
        .filter(word => word);
      
      console.log('DEBUG: Searching for winTopics:', winTopics);
      console.log('DEBUG: Searching for selectedWords:', selectedWordsList);

      // Build search query
      let searchParams = {
        attributesToRetrieve: ['*'],
        hitsPerPage: 50
      };

      let facetFilters = [];
      
      // Add win topics condition if any exist
      if (winTopics.length > 0) {
        const topicsFilter = winTopics.map(topic => 
          `winTopics:${topic}`
        );
        facetFilters.push(topicsFilter);
      }

      // Add selected words condition if any exist
      if (selectedWordsList.length > 0) {
        selectedWordsList.forEach(word => {
          // Add each word as a separate facet filter
          facetFilters.push([`questionAnswers.selectedWords:${word}`]);
        });
      }

      // Add state filter if needed
      if (!searchCriteria.searchAnywhere && searchCriteria.states.length > 0) {
        facetFilters.push([`state:${searchCriteria.states[0]}`]);
      }

      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }

      // Let's also try searching in the text
      if (selectedWordsList.length > 0) {
        searchParams.query = selectedWordsList.join(' ');
        searchParams.restrictSearchableAttributes = ['questionAnswers.selectedWords'];
      }

      console.log('DEBUG: Full search params:', JSON.stringify(searchParams, null, 2));

      const { hits } = await searchIndex.search('', searchParams);
      console.log('DEBUG: Raw hits:', JSON.stringify(hits, null, 2));
      console.log('DEBUG: Search hits:', hits.length);
      
      // Filter out current user and apply age filter
      const filteredHits = hits
        .filter(hit => {
          const hitUserId = hit.path?.split('/')?.[1];
          return hitUserId?.toLowerCase() !== currentUserId?.toLowerCase();
        })
        .filter(hit => {
          const age = hit.age || 0;
          return age >= parseInt(searchCriteria.ageRange.min) && 
                 age <= parseInt(searchCriteria.ageRange.max);
        });

      console.log('Final filtered results:', filteredHits.length);

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

  const updateAlgoliaSettings = async () => {
    try {
      await adminIndex.setSettings({
        searchableAttributes: [
          'winTopics',
          'questionAnswers.selectedWords',
          'username',
          'state'
        ],
        attributesForFaceting: [
          'searchable(questionAnswers.selectedWords)',
          'searchable(winTopics)',
          'state'
        ]
      });
      console.log('Algolia settings updated successfully');
    } catch (error) {
      console.error('Error updating Algolia settings:', error);
    }
  };

  useEffect(() => {
    updateAlgoliaSettings();
  }, []);

  useEffect(() => {
    const debugAlgoliaIndex = async () => {
      console.log('Starting Algolia debug...');
      try {
        // First check if we can connect to Algolia
        const indexName = searchIndex.indexName;
        console.log('Connected to Algolia index:', indexName);

        // Get all records
        const { hits } = await searchIndex.search('');
        console.log('Total records in Algolia:', hits.length);
        
        // Log the first record as a sample
        if (hits.length > 0) {
          console.log('Sample record structure:', JSON.stringify(hits[0], null, 2));
        } else {
          console.log('No records found in Algolia index');
        }

        // Check settings
        const settings = await adminIndex.getSettings();
        console.log('Current Algolia settings:', settings);

      } catch (error) {
        console.error('Debug error:', error);
        console.error('Error stack:', error.stack);
      }
    };

    debugAlgoliaIndex();
  }, []);

  useEffect(() => {
    const debugAlgoliaData = async () => {
      try {
        // Get all records
        const { hits } = await searchIndex.search('', {
          attributesToRetrieve: ['*'],
          hitsPerPage: 100
        });
        
        console.log('DEBUG: All records in Algolia:', JSON.stringify(hits, null, 2));
        
        // Check questionAnswers structure
        hits.forEach((hit, index) => {
          console.log(`\nRecord ${index + 1}:`);
          console.log('questionAnswers:', hit.questionAnswers);
          if (hit.questionAnswers) {
            hit.questionAnswers.forEach((qa, i) => {
              console.log(`Question ${i}:`, qa.selectedWords);
            });
          }
        });
      } catch (error) {
        console.error('Debug error:', error);
      }
    };

    debugAlgoliaData();
  }, []);

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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search by Topics</Text>
            <Text style={styles.sectionDescription}>
              Enter topics you're interested in (e.g., baseball, cooking, music) to find friends who post about these topics
            </Text>
            <TextInput
              style={styles.topicsInput}
              placeholder="Enter topics separated by commas (e.g., baseball, cooking)"
              value={searchCriteria.winTopics}
              onChangeText={(text) => setSearchCriteria(prev => ({
                ...prev,
                winTopics: text
              }))}
              multiline
            />
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
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  topicsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top'
  }
});

export default FindFriendScreen; 