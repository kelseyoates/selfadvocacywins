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
import StateDropdown from '../components/StateDropdown';

const FindFriendScreen = ({ navigation }) => {
  const [selectedWords, setSelectedWords] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [ageRange, setAgeRange] = useState({ min: '18', max: '100' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);

  const handleAgeChange = (type, value) => {
    setAgeRange(prev => ({
      ...prev,
      [type]: value
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
                selectedWords.includes(word) && styles.selectedWord
              ]}
              onPress={() => toggleWord(question.text, word)}
            >
              <Text style={[
                styles.wordText,
                selectedWords.includes(word) && styles.selectedWordText
              ]}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const toggleWord = (questionText, word) => {
    setSelectedWords(prev => {
      const currentWords = prev.includes(word)
        ? prev.filter(w => w !== word)
        : [...prev, word];
      return currentWords;
    });
  };

  const handleSearch = async () => {
    try {
      const currentUserId = auth.currentUser.uid;
      console.log('DEBUG: Current user ID:', currentUserId);

      // Get selected words and text answers from all questions
      const selectedWordsList = Object.values(selectedWords || {})
        .flat()
        .filter(word => word);
      
      // Get text answers from searchCriteria
      const textAnswers = Object.values(searchCriteria.answers || {})
        .filter(text => text && text.trim());

      console.log('DEBUG: Searching for selectedWords:', selectedWordsList);
      console.log('DEBUG: Searching for textAnswers:', textAnswers);

      // Build search query
      let searchParams = {
        attributesToRetrieve: ['*'],
        hitsPerPage: 50
      };

      // Add facet filters for selected words
      let facetFilters = [];
      if (selectedWordsList.length > 0) {
        selectedWordsList.forEach(word => {
          facetFilters.push([`questionAnswers.selectedWords:${word}`]);
        });
      }

      // Add text search if there are any text answers
      if (textAnswers.length > 0) {
        searchParams.query = textAnswers.join(' '); // Combine all text answers
        searchParams.restrictSearchableAttributes = ['questionAnswers.textAnswer'];
      }

      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }

      console.log('DEBUG: Full search params:', JSON.stringify(searchParams, null, 2));

      const { hits } = await searchIndex.search(
        textAnswers.length > 0 ? searchParams.query : '',
        searchParams
      );
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
          'state',
          'questionAnswers.selectedWords',
          'questionAnswers.textAnswer',
          'username'
        ],
        attributesForFaceting: [
          'searchable(state)',
          'searchable(questionAnswers.selectedWords)'
        ]
      });
      console.log('DEBUG: Updated Algolia settings');
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

  // Keep the original searchCriteria state
  const [searchCriteria, setSearchCriteria] = useState({
    states: [],
    // searchAnywhere: false,
    ageRange: { min: '18', max: '100' },
    answers: {},
    winTopics: ''
  });

  // Handle state selection separately
  const handleStateSelect = (state) => {
    setSelectedState(state);
  };

  // Search function that handles both state and selectedWords
  const searchUsers = async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setError(null);

      const searchParams = {
        attributesToRetrieve: ['*'],
        hitsPerPage: 50,
        filters: `age >= ${ageRange.min} AND age <= ${ageRange.max}`,
      };

      // Build search query
      let searchTerms = [];
      
      // Add state to search terms if selected
      if (selectedState) {
        searchTerms.push(`state:"${selectedState}"`);
      }

      // Add selected words to search terms
      if (selectedWords.length > 0) {
        searchTerms.push(...selectedWords.map(word => 
          `questionAnswers.selectedWords:"${word}"`
        ));
      }

      const searchQuery = searchTerms.join(' OR ');
      console.log('DEBUG: Searching with query:', searchQuery);

      // Execute search
      const { hits } = await searchIndex.search('', {
        ...searchParams,
        optionalFilters: searchTerms // Use optionalFilters to rank by matches
      });
      
      // Filter out current user
      const filteredResults = hits.filter(user => user.path.split('/')[1] !== auth.currentUser.uid);
      setUsers(filteredResults);

    } catch (err) {
      console.error('Error in searchUsers:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  // Watch for changes in both state and selectedWords
  useEffect(() => {
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [selectedState, selectedWords, ageRange]);

  return (
    <View style={styles.container}>
      <StateDropdown onStateSelect={handleStateSelect} />
      
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age Range</Text>
            <View style={styles.ageInputContainer}>
              <View style={styles.ageInput}>
                <Text>Min Age:</Text>
                <TextInput
                  style={styles.ageTextInput}
                  keyboardType="numeric"
                  value={ageRange.min}
                  onChangeText={(value) => handleAgeChange('min', value)}
                  maxLength={3}
                />
              </View>
              <View style={styles.ageInput}>
                <Text>Max Age:</Text>
                <TextInput
                  style={styles.ageTextInput}
                  keyboardType="numeric"
                  value={ageRange.max}
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