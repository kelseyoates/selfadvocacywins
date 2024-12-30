import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { searchIndex } from '../config/algolia';
import { auth } from '../config/firebase';
import StateDropdown from '../components/StateDropdown';
import { questions } from '../constants/questions';
import { adminIndex } from '../config/algolia';

const FindYourFriendsScreen = ({ navigation }) => {
  const [selectedWords, setSelectedWords] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedState, setSelectedState] = useState('');
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

  const renderUserCard = (user) => (
    <TouchableOpacity 
      key={user.id} 
      style={styles.userCard}
      onPress={() => navigation.navigate('OtherUserProfile', { userId: user.id })}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {user.profilePicture ? (
            <Image 
              source={{ uri: user.profilePicture }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {user.name ? user.name[0].toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user.username}</Text>
          <Text style={styles.userLocation}>{user.state}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <StateDropdown 
        selectedState={selectedState}
        onStateChange={setSelectedState}
      />
      
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
              <View key={question.id} style={styles.questionCard}>
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

      {/* <TouchableOpacity 
        style={styles.searchButton}
        onPress={searchUsers}
        disabled={loading}
      >
        <Text style={styles.searchButtonText}>
          {loading ? 'Searching...' : 'Search'}
        </Text>
      </TouchableOpacity> */}

      {error && <Text style={styles.error}>{error}</Text>}
      
      <View style={styles.resultsContainer}>
        <Text style={styles.sectionTitle}>Results</Text>
        {users.map(user => renderUserCard(user))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#000000',
  },
  
  question: {
    fontSize: 16,
    fontWeight: '500',
    color: '#24269B',
    marginBottom: 15,
  },
  questionContainer: {
    marginBottom: 20,
    marginTop: 20,
  },

  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#24269B',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000000',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',
  },
  selectedWord: {
    backgroundColor: '#24269B',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatarContainer: {
    marginRight: 15,
  },
  
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  
  defaultAvatar: {
    backgroundColor: '#24269B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  defaultAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  userDetails: {
    flex: 1,
  },
  
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24269B',
    marginBottom: 4,
  },
  
  userLocation: {
    fontSize: 14,
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
    color: '#24269B',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#000000',
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
    gap: 10,
  },
  searchButton: {
    backgroundColor: '#24269B',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 70,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FindYourFriendsScreen; 