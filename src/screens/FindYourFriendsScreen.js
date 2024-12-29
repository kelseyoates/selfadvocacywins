import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { searchIndex } from '../config/algolia';
import { auth } from '../config/firebase';
import StateDropdown from '../components/StateDropdown';
import { questions } from '../constants/questions';
import { adminIndex } from '../config/algolia';

const FindYourFriendsScreen = ({ navigation }) => {
  const [selectedWords, setSelectedWords] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedState, setSelectedState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const currentUser = auth.currentUser;

  // Handle state selection
  const handleStateSelect = (state) => {
    setSelectedState(state);
  };

  // Handle word selection
  const toggleWord = (word) => {
    setSelectedWords(prev => {
      if (prev.includes(word)) {
        return prev.filter(w => w !== word);
      }
      return [...prev, word];
    });
  };

  // Search function
  const searchUsers = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);

      const searchParams = {
        attributesToRetrieve: ['*'],
        hitsPerPage: 50,
      };

      // Add filters for state and exclude current user
      let filters = [];
      if (selectedState) {
        filters.push(`state:"${selectedState}"`);
      }
      filters.push(`NOT path:"users/${currentUser.uid.toLowerCase()}"`);
      
      searchParams.filters = filters.join(' AND ');

      // Build search query for text matching
      let searchTerms = [];
      
      // Add text answer - will search across all searchable attributes
      if (textAnswer.trim()) {
        searchTerms.push(textAnswer.trim());
      }

      // Add selected words
      if (selectedWords.length > 0) {
        searchTerms.push(...selectedWords);
      }

      const searchQuery = searchTerms.join(' ');
      console.log('DEBUG: Search query:', searchQuery);
      console.log('DEBUG: Search params:', searchParams);
      console.log('DEBUG: Current user path:', `users/${currentUser.uid.toLowerCase()}`);

      const { hits } = await searchIndex.search(searchQuery, searchParams);
      
      // Log the first few hits to see their path format
      if (hits.length > 0) {
        console.log('DEBUG: First hit data:', JSON.stringify(hits[0], null, 2));
      }
      console.log('DEBUG: Found users:', hits.length);

      // Double-check filtering on the client side
      const filteredResults = hits.filter(hit => 
        hit.path !== `users/${currentUser.uid.toLowerCase()}`
      );
      
      console.log('DEBUG: Users after client filtering:', filteredResults.length);
      setUsers(filteredResults);

    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  // Search when inputs change
  useEffect(() => {
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [selectedState, selectedWords, textAnswer]);

  // Update Algolia settings
  useEffect(() => {
    const setupAlgolia = async () => {
      try {
        await adminIndex.setSettings({
          searchableAttributes: [
            'questionAnswers.selectedWords',
            'questionAnswers.textAnswer',
            'winTopics',
            'state'
          ],
          attributesForFaceting: [
            'state',
            'path'
          ]
        });
        console.log('DEBUG: Algolia settings updated');
      } catch (error) {
        console.error('Error setting up Algolia:', error);
      }
    };
    setupAlgolia();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <StateDropdown onStateSelect={handleStateSelect} />
      
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Search by Text</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter text to search..."
          value={textAnswer}
          onChangeText={setTextAnswer}
          multiline
        />
      </View>

      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Select Words</Text>
        <View style={styles.wordsContainer}>
          {questions.map(question => 
            question.words ? (
              <View key={question.id}>
                <Text style={styles.questionText}>{question.text}</Text>
                <View style={styles.wordsGrid}>
                  {question.words.map((word) => (
                    <TouchableOpacity
                      key={word}
                      style={[
                        styles.wordButton,
                        selectedWords.includes(word) && styles.selectedWord
                      ]}
                      onPress={() => toggleWord(word)}
                    >
                      <Text style={[
                        styles.wordText,
                        selectedWords.includes(word) && styles.selectedWordText
                      ]}>
                        {word}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.searchButton}
        onPress={searchUsers}
        disabled={loading}
      >
        <Text style={styles.searchButtonText}>
          {loading ? 'Searching...' : 'Search'}
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}
      
      <View style={styles.resultsContainer}>
        {users.map(user => (
          <TouchableOpacity 
            key={user.objectID}
            style={styles.userCard}
            onPress={() => navigation.navigate('OtherUserProfile', { 
              profileUserId: user.path.split('/')[1],
              isCurrentUser: false
            })}
          >
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.stateText}>State: {user.state}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  wordButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedWord: {
    backgroundColor: '#007AFF',
  },
  wordText: {
    color: '#333',
    fontSize: 14,
  },
  selectedWordText: {
    color: '#fff',
  },
  resultsContainer: {
    marginTop: 20,
  },
  userCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stateText: {
    fontSize: 16,
    color: '#666',
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
  searchSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  searchButton: {
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FindYourFriendsScreen; 