import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert,
  AccessibilityInfo 
} from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { auth, db} from '../config/firebase';

const AddSupporterScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Check for screen reader
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

  // Helper function for screen reader announcements
  const announceToScreenReader = (message) => {
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Please enter a username to search');
      announceToScreenReader('Please enter a username to search');
      return;
    }

    setLoading(true);
    announceToScreenReader('Searching for supporters');
    
    try {
      const usersRef = collection(db, 'users');
      const lowercaseQuery = searchQuery.toLowerCase();
      console.log('Searching for username:', lowercaseQuery);

      // Search by username (case insensitive)
      const q = query(usersRef, where('username', '>=', lowercaseQuery), 
                               where('username', '<=', lowercaseQuery + '\uf8ff'));
      const querySnapshot = await getDocs(q);

      const results = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Don't include current user in results
        if (doc.id !== auth.currentUser.uid.toLowerCase()) {
          console.log('Found user:', userData);
          results.push({
            id: doc.id,
            ...userData
          });
        }
      });

      setSearchResults(results);
      if (results.length === 0) {
        announceToScreenReader('No users found. Try searching with a different username');
        Alert.alert('No users found', 'Try searching with a different username');
      } else {
        announceToScreenReader(`Found ${results.length} users`);
      }
    } catch (error) {
      console.error('Search error:', error);
      announceToScreenReader('Error searching for users');
      Alert.alert('Error', 'Failed to search for users');
    }
    setLoading(false);
  };

  const handleAddSupporter = async (userToSupport) => {
    try {
      // Check if the supporter has reached their limit
      const supporterDoc = await getDoc(doc(db, 'users', userToSupport.id.toLowerCase()));
      const supporterData = supporterDoc.data();
      const supporterTier = supporterData.subscriptionType;

      console.log('Supporter tier:', supporterTier);

      const maxSupported = {
        'supporter1': 1,
        'supporter3': 3,
        'supporter5': 5,
        'supporter10': 10,
        'supporter25': 25,
        null: 0,
        undefined: 0
      };

      const supporterLimit = supporterTier?.startsWith('supporter') 
        ? (maxSupported[supporterTier] || 1)
        : 0;

      // Get all users this supporter is currently supporting
      const usersRef = collection(db, 'users');
      const allUsersSnapshot = await getDocs(usersRef);
      
      let currentSupportCount = 0;
      allUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.supporters?.some(supporter => 
          supporter.id.toLowerCase() === userToSupport.id.toLowerCase()
        )) {
          currentSupportCount++;
        }
      });

      console.log('Current support count:', currentSupportCount);
      console.log('Supporter limit:', supporterLimit);

      if (currentSupportCount >= supporterLimit) {
        Alert.alert(
          'Supporter Limit Reached',
          `This supporter has reached their limit of ${supporterLimit} ${supporterLimit === 1 ? 'person' : 'people'}. Please ask them to upgrade their subscription to support more users.`,
          [
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
        return;
      }

      // If within limits, add the supporter
      const userRef = doc(db, 'users', auth.currentUser.uid.toLowerCase());
      await updateDoc(userRef, {
        supporters: arrayUnion({
          id: userToSupport.id.toLowerCase(),
          addedAt: new Date().toISOString(),
          username: supporterData.username || 'Unknown User'
        })
      });

      // Show success message
      Alert.alert(
        'Success',
        'Supporter added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error('Error adding supporter:', error);
      Alert.alert('Error', 'Failed to add supporter');
    }
  };

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Add Supporter Screen"
    >
      <View 
        style={styles.searchContainer}
        accessible={true}
        accessibilityLabel="Search Section"
      >
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          accessible={true}
          accessibilityLabel="Search username input"
          accessibilityHint="Enter a username to search for supporters"
          accessibilityRole="search"
        />
        <TouchableOpacity 
          style={[
            styles.searchButton,
            loading && styles.searchButtonDisabled
          ]}
          onPress={handleSearch}
          disabled={loading}
          accessible={true}
          accessibilityLabel={loading ? "Searching" : "Search"}
          accessibilityHint="Search for users with the entered username"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          <Text style={styles.searchButtonText}>
            {loading ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        accessible={true}
        accessibilityLabel="Search Results"
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.resultItem}
            onPress={() => handleAddSupporter(item)}
            accessible={true}
            accessibilityLabel={`Add ${item.username || 'Unknown Username'} as supporter`}
            accessibilityHint="Double tap to add this user as your supporter"
            accessibilityRole="button"
          >
            <View>
              <Text style={styles.userName}>{item.username || 'Unknown Username'}</Text>
              {item.name && (
                <Text 
                  style={styles.userEmail}
                  accessibilityLabel={`Name: ${item.name}`}
                >
                  {item.name}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text 
            style={styles.emptyText}
            accessible={true}
            accessibilityLabel={searchQuery ? 'No users found' : 'Search for users by username'}
          >
            {searchQuery ? 'No users found' : 'Search for users by username'}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  searchButtonDisabled: {
    opacity: 0.7,
  }
});

export default AddSupporterScreen; 