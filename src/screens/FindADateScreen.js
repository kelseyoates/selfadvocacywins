import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  AccessibilityInfo
} from 'react-native';
import { searchIndex, adminIndex } from '../config/algolia';
import { auth } from '../config/firebase';
import StateDropdown from '../components/StateDropdown';
import { questions } from '../constants/questions';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Only include dating questions
const allQuestions = [
  {
    id: 'dating_1',
    question: "What I'm looking for in a partner 💝:",
    words: [
      "kind", "honest", "funny", "caring", "understanding", 
      "patient", "supportive", "fun", "active", "creative", 
      "family-oriented", "ambitious", "adventurous"
    ]
  },
  {
    id: 'dating_2',
    question: "My ideal first date would be 🌟:",
    words: [
      "coffee", "dinner", "movies", "walk in the park", 
      "museum", "arcade", "bowling", "mini golf", 
      "ice cream", "picnic", "zoo", "aquarium"
    ]
  },
  {
    id: 'dating_3',
    question: "My favorite date activities are 🎉:",
    words: [
      "watching movies", "dining out", "cooking together", 
      "playing games", "sports", "shopping", "hiking", 
      "visiting museums", "trying new things", "traveling", 
      "going to events", "listening to music"
    ]
  },
  {
    id: 'dating_4',
    question: "I would like to meet people in these places 🗺️:",
    words: [
      "watching movies", "dining out", "cooking together", 
      "playing games", "sports", "shopping", "hiking", 
      "visiting museums", "trying new things", "traveling", 
      "going to events", "listening to music"
    ]
  }
];

const FindADateScreen = ({ navigation }) => {
  const [selectedWords, setSelectedWords] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const currentUser = auth.currentUser;
  const [selectedAgeRange, setSelectedAgeRange] = useState({ min: 18, max: 99 });
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Add screen reader detection
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
    };

    checkScreenReader();
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const announceToScreenReader = (message) => {
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  // Handle state selection
  const handleStateSelect = (state) => {
    setSelectedState(state);
    announceToScreenReader(`Selected state: ${state}`);
  };

  // Handle word selection
  const toggleWord = (word) => {
    setSelectedWords(prev => {
      const newWords = prev.includes(word) 
        ? prev.filter(w => w !== word)
        : [...prev, word];
      
      announceToScreenReader(prev.includes(word) 
        ? `Removed ${word}` 
        : `Added ${word}`);
      
      return newWords;
    });
  };

  // Search function
  const searchUsers = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const lowerCaseUid = currentUser.uid.toLowerCase();

      // First get all dating subscribers from Firestore
      const datingUsersQuery = query(
        collection(db, 'users'),
        where('subscriptionType', '==', 'selfAdvocateDating')
      );
      const datingUsersSnapshot = await getDocs(datingUsersQuery);
      const datingUserIds = new Set(
        datingUsersSnapshot.docs.map(doc => doc.id.toLowerCase())
      );

      const searchParams = {
        attributesToRetrieve: ['*'],
        hitsPerPage: 50,
      };

      // Start with basic filters
      let filters = [`NOT path:"users/${lowerCaseUid}"`];
      
      if (selectedState) {
        filters.push(`state:"${selectedState}"`);
      }

      if (selectedAgeRange) {
        filters.push(`age:${selectedAgeRange.min} TO ${selectedAgeRange.max}`);
      }

      searchParams.filters = filters.join(' AND ');

      // Build search query for text matching
      let searchTerms = [];
      
      if (textAnswer.trim()) {
        searchTerms.push(textAnswer.trim());
      }

      if (selectedWords.length > 0) {
        searchTerms.push(...selectedWords);
      }

      const searchQuery = searchTerms.join(' ');
      
      // Debug logs
      console.log('Search Debug Info:', {
        query: searchQuery,
        filters: searchParams.filters,
        currentUserPath: `users/${currentUser.uid.toLowerCase()}`,
        selectedState,
        selectedAgeRange,
        selectedWords,
        datingUserIds: Array.from(datingUserIds)
      });

      const { hits } = await searchIndex.search(searchQuery, searchParams);
      
      // Filter hits to only include dating subscribers
      const filteredHits = hits.filter(hit => {
        const hitUserId = hit.path.split('/')[1].toLowerCase();
        return datingUserIds.has(hitUserId);
      });
      
      console.log('Total hits:', hits.length);
      console.log('Dating subscriber hits:', filteredHits.length);

      setUsers(filteredHits);

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
            'datingAnswers.selectedWords',
            'datingAnswers.textAnswer',
            'winTopics',
            'state',
            'age'
          ],
          attributesForFaceting: [
            'state',
            'path',
            'age',
            'subscriptionType'
          ]
        });
        console.log('DEBUG: Algolia settings updated');
      } catch (error) {
        console.error('Error setting up Algolia:', error);
      }
    };
    setupAlgolia();
  }, []);

  const handleMinAgeChange = (text) => {
    const newMin = parseInt(text) || 18;
    if (newMin < 18) {
      announceToScreenReader('Minimum age must be at least 18');
      Alert.alert('Invalid Age', 'Minimum age must be at least 18');
      return;
    }
    if (newMin > selectedAgeRange.max) {
      Alert.alert('Invalid Age', 'Minimum age cannot be greater than maximum age');
      return;
    }
    setSelectedAgeRange(prev => ({ ...prev, min: newMin }));
    announceToScreenReader(`Minimum age set to ${newMin}`);
  };

  const handleMaxAgeChange = (text) => {
    const newMax = parseInt(text) || 99;
    if (newMax > 99) {
      Alert.alert('Invalid Age', 'Maximum age cannot exceed 99');
      return;
    }
    if (newMax < selectedAgeRange.min) {
      Alert.alert('Invalid Age', 'Maximum age cannot be less than minimum age');
      return;
    }
    setSelectedAgeRange(prev => ({ ...prev, max: newMax }));
    announceToScreenReader(`Maximum age set to ${newMax}`);
  };

  // Add subscription check
  useEffect(() => {
    const checkSubscription = async () => {
      if (!currentUser) {
        navigation.replace('Login');
        return;
      }

      try {
        const lowerCaseUid = currentUser.uid.toLowerCase();
        console.log('Checking subscription for UID:', lowerCaseUid);
        
        const userDoc = await getDoc(doc(db, 'users', lowerCaseUid));
        const userData = userDoc.data();
        
        console.log('User data:', userData);

        if (!userData || userData.subscriptionType !== 'selfAdvocateDating') {
          Alert.alert(
            'Subscription Required',
            'You need a Dating subscription to access this feature.',
            [
              {
                text: 'Learn More',
                onPress: () => navigation.replace('ManageSubscription'),
              },
              {
                text: 'Go Back',
                onPress: () => navigation.goBack(),
                style: 'cancel',
              },
            ]
          );
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        Alert.alert('Error', 'Could not verify subscription status');
        navigation.goBack();
      }
    };

    checkSubscription();
  }, [currentUser, navigation]);

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
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userLocation}>{user.state}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Find a Date Screen"
    >
      <StateDropdown 
        selectedState={selectedState}
        onStateChange={handleStateSelect}
      />
      
      <View 
        style={styles.searchSection}
        accessible={true}
        accessibilityLabel="Age Range Section"
      >
        <Text style={styles.sectionTitle}>Age Range</Text>
        <View style={styles.ageRangeContainer}>
          <View style={styles.ageInputRow}>
            <View style={styles.ageInputContainer}>
              <Text style={styles.ageLabel}>Min Age:</Text>
              <TextInput
                style={styles.ageInput}
                value={selectedAgeRange.min.toString()}
                onChangeText={handleMinAgeChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="18"
                accessible={true}
                accessibilityLabel={`Minimum age: ${selectedAgeRange.min}`}
                accessibilityHint="Enter minimum age, must be at least 18"
              />
            </View>

            <View style={styles.ageSeparator}>
              <Text style={styles.ageSeparatorText}>to</Text>
            </View>

            <View style={styles.ageInputContainer}>
              <Text style={styles.ageLabel}>Max Age:</Text>
              <TextInput
                style={styles.ageInput}
                value={selectedAgeRange.max.toString()}
                onChangeText={handleMaxAgeChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="99"
                accessible={true}
                accessibilityLabel={`Maximum age: ${selectedAgeRange.max}`}
                accessibilityHint="Enter maximum age, up to 99"
              />
            </View>
          </View>
        </View>

        <View 
          style={styles.searchSection}
          accessible={true}
          accessibilityLabel="Text Search Section"
        >
          <Text style={styles.sectionTitle}>Search by Text</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Type in topics to search..."
            value={textAnswer}
            onChangeText={setTextAnswer}
            multiline
            accessible={true}
            accessibilityLabel="Search text input"
            accessibilityHint="Enter topics to search for matches"
          />
        </View>

        <Text style={styles.sectionTitle}>Select Words</Text>
        <View style={styles.wordsContainer}>
          {allQuestions.map((q) => (
            <View 
              key={q.id} 
              style={styles.questionCard}
              accessible={true}
              accessibilityLabel={q.question}
            >
              <Text style={styles.questionText}>{q.question}</Text>
              <View style={styles.wordsGrid}>
                {q.words.map((word) => (
                  <TouchableOpacity
                    key={word}
                    style={[
                      styles.wordButton,
                      selectedWords.includes(word) && styles.selectedWord
                    ]}
                    onPress={() => toggleWord(word)}
                    accessible={true}
                    accessibilityLabel={`${word}, ${selectedWords.includes(word) ? 'selected' : 'not selected'}`}
                    accessibilityHint={`Double tap to ${selectedWords.includes(word) ? 'remove' : 'add'} this word`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedWords.includes(word) }}
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
          ))}
        </View>
      </View>

      {error && (
        <Text 
          style={styles.error}
          accessible={true}
          accessibilityLabel={`Error: ${error}`}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}

      <View style={styles.resultsContainer}>
        {users.map(user => (
          <View key={user.objectID} style={styles.cardContainer}>
            <View style={styles.cardShadow} />
            <TouchableOpacity 
              style={styles.userCard}
              onPress={() => {
                announceToScreenReader(`Opening profile for ${user.username}`);
                navigation.navigate('OtherUserProfile', { 
                  profileUserId: user.path.split('/')[1],
                  isCurrentUser: false
                });
              }}
              accessible={true}
              accessibilityLabel={`${user.username}, ${user.age} years old, from ${user.state}`}
              accessibilityHint="Double tap to view full profile"
              accessibilityRole="button"
            >
              <View style={styles.cardContent}>
                <Image 
                  source={{ uri: user.profilePicture }} 
                  style={styles.avatar}
                  accessible={true}
                  accessibilityLabel={`${user.username}'s profile picture`}
                  accessibilityRole="image"
                />
                <View 
                  style={styles.userInfo}
                  accessible={true}
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no-hide-descendants"
                >
                  <Text style={styles.username}>{user.username}</Text>
                  <Text style={styles.infoText}>{user.age} years old</Text>
                  <Text style={styles.infoText}>{user.state}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbfd',
    padding: 15,
  },
  
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#24269B',
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
    borderColor: '#24269B',
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
    // borderRadius: 20,
    backgroundColor: '#f6fbfd',
    borderWidth: 1,
    borderColor: '#000000',

    borderRadius: 10,
    boxShadow: '0.3rem 0.3rem 0.6rem var(--greyLight-2), -0.2rem -0.2rem 0.5rem var(--white)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#24269B',
  },

  buttonShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    backgroundColor: '#000',
    borderRadius: 8,
  },

  topRow: {
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
  
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24269B',
  },

  stateText: {
    fontSize: 16,
  },
  
  ageText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
    borderColor: '#24269B',
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
  userInfo: {
    flex: 1,
  },
  cardContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageRangeContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#24269B',
  },
  ageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  ageInputContainer: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#000000',
  },
  ageInput: {
    borderWidth: 1,
    borderColor: '#24269B',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#f8f8f8',
  },
  ageSeparator: {
    paddingHorizontal: 16,
  },
  ageSeparatorText: {
    fontSize: 16,
    color: '#666',
  },
});

export default FindADateScreen; 