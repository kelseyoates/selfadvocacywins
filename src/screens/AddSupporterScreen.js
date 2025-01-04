import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db} from '../config/firebase';

const AddSupporterScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Please enter a username to search');
      return;
    }

    setLoading(true);
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
        Alert.alert('No users found', 'Try searching with a different username');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search for users');
    }
    setLoading(false);
  };

  const handleAddSupporter = async (selectedUser) => {
    try {
      const currentUserId = auth.currentUser.uid.toLowerCase();
      console.log('Current user id:', currentUserId);
      
      // Get current user's document
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const currentSupporters = userDoc.data().supporters || [];
      
      // Check if already a supporter
      if (currentSupporters.some(supporter => supporter.id === selectedUser.id)) {
        Alert.alert('Already Added', 'This person is already one of your supporters');
        return;
      }

      // Add new supporter
      const newSupporter = {
        name: selectedUser.username || selectedUser.name || 'Unknown',
        email: selectedUser.email,
        id: selectedUser.id,
        username: selectedUser.username,
        profilePicture: selectedUser.profilePicture || null
      };

      await updateDoc(doc(db, 'users', currentUserId), {
        supporters: [...currentSupporters, newSupporter]
      });

      Alert.alert(
        'Success',
        'Supporter added successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding supporter:', error);
      Alert.alert('Error', 'Failed to add supporter');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>
            {loading ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.resultItem}
            onPress={() => handleAddSupporter(item)}
          >
            <View>
              <Text style={styles.userName}>{item.username || 'Unknown Username'}</Text>
              {item.name && <Text style={styles.userEmail}>{item.name}</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
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
  }
});

export default AddSupporterScreen; 