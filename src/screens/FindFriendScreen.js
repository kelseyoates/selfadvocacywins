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
      // Prepare search filters
      let filters = [];
      
      // Add states filter if not searching anywhere
      if (!searchCriteria.searchAnywhere && searchCriteria.states.length > 0) {
        console.log('Selected states:', searchCriteria.states);
        const statesFilter = searchCriteria.states
          .map(state => `state:"${state.trim()}"`)  // Trim any whitespace
          .join(' OR ');
        filters.push(`(${statesFilter})`);
      }

      // Add age range filter
      const minAge = parseInt(searchCriteria.ageRange.min) || 18;
      const maxAge = parseInt(searchCriteria.ageRange.max) || 100;
      filters.push(`age >= ${minAge} AND age <= ${maxAge}`);

      console.log('Search filters:', filters.join(' AND '));

      const { hits } = await searchIndex.search('', {
        filters: filters.join(' AND '),
        attributesToRetrieve: [
          'objectID',
          'username',
          'profilePicture',
          'state',
          'questionAnswers',
          'age'
        ],
        hitsPerPage: 50  // Increased from 20 to ensure we get all results
      });

      console.log('Raw search results:', JSON.stringify(hits, null, 2));
      console.log('Number of matches:', hits.length);

      if (hits.length === 0) {
        Alert.alert(
          'No Matches Found',
          'Try adjusting your search criteria or selecting different states.'
        );
        return;
      }

      navigation.navigate('FriendResults', { matches: hits });

    } catch (error) {
      console.error('Search error details:', error);
      Alert.alert(
        'Search Error',
        'Unable to complete the search. Please try again.'
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
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

      <TouchableOpacity 
        style={styles.searchButton}
        onPress={handleSearch}
      >
        <Text style={styles.searchButtonText}>Find Friends</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 15,
  },
  bottomSpacer: {
    height: 120, // Adjust this value as needed
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
});

export default FindFriendScreen; 