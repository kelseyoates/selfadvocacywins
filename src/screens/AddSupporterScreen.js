import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { USER_TYPES, USER_TYPE_FEATURES } from '../constants/userTypes';

const AddSupporterScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      Alert.alert('Error', 'Please enter at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', searchQuery.toLowerCase()),
        where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
      );

      const querySnapshot = await getDocs(q);
      const results = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        if (
          doc.id !== user.uid.toLowerCase() &&
          USER_TYPE_FEATURES[userData.userType]?.canBeSupporter
        ) {
          results.push({ id: doc.id, ...userData });
        }
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupporter = async (supporterId) => {
    try {
      // Check if current user can have supporters
      const userAccess = await checkSubscriptionAccess(user.uid, 'canHaveSupporters');
      if (!userAccess.hasAccess) {
        if (userAccess.requiredUpgrade) {
          Alert.alert(
            'Subscription Required',
            'Please upgrade your subscription to add supporters',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Upgrade',
                onPress: () => navigation.navigate('Subscription')
              }
            ]
          );
        } else {
          Alert.alert('Error', userAccess.message);
        }
        return;
      }

      // Check if supporter can support more users
      const supporterAccess = await checkSubscriptionAccess(supporterId, 'canBeSupporter');
      if (!supporterAccess.hasAccess) {
        Alert.alert('Error', supporterAccess.message);
        return;
      }

      // Add supporter to user's supporters
      await updateDoc(doc(db, 'users', user.uid.toLowerCase()), {
        supporters: arrayUnion(supporterId.toLowerCase())
      });

      // Add user to supporter's supporting list
      await updateDoc(doc(db, 'users', supporterId.toLowerCase()), {
        supporting: arrayUnion(user.uid.toLowerCase())
      });

      Alert.alert('Success', 'Supporter added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding supporter:', error);
      Alert.alert('Error', 'Failed to add supporter');
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleAddSupporter(item.id)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.userType}>{item.userType}</Text>
      </View>
      <MaterialCommunityIcons name="plus" size={24} color="#24269B" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#24269B" style={styles.loader} />
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery ? 'No supporters found' : 'Search for supporters'}
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 25,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#24269B',
    padding: 10,
    borderRadius: 25,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  userType: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  list: {
    flex: 1,
  },
});

export default AddSupporterScreen; 