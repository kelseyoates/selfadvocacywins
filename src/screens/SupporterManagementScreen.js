import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { USER_TYPES, USER_TYPE_FEATURES } from '../constants/userTypes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { 
  grantSupporterAccess, 
  revokeSupporterAccess, 
  updateUserRole 
} from '../services/cometChat';

const SupporterManagementScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [supporters, setSupporters] = useState([]);
  const [supportedUsers, setSupportedUsers] = useState([]);
  const [canAddSupporters, setCanAddSupporters] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid.toLowerCase()));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserType(userData.userType || USER_TYPES.BASIC);
        setCanAddSupporters(
          USER_TYPE_FEATURES[userData.userType]?.canHaveSupporters || false
        );

        // Fetch supporters if user can have them
        if (userData.supporters) {
          const supporterPromises = userData.supporters.map(supporterId =>
            getDoc(doc(db, 'users', supporterId.toLowerCase()))
          );
          const supporterDocs = await Promise.all(supporterPromises);
          setSupporters(
            supporterDocs
              .filter(doc => doc.exists())
              .map(doc => ({ id: doc.id, ...doc.data() }))
          );
        }

        // Fetch supported users if user is a supporter
        if (USER_TYPE_FEATURES[userData.userType]?.canBeSupporter) {
          const supportedQuery = query(
            collection(db, 'users'),
            where('supporters', 'array-contains', user.uid.toLowerCase())
          );
          const supportedDocs = await getDocs(supportedQuery);
          setSupportedUsers(
            supportedDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load supporter data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupporter = async (supporterId) => {
    try {
      // ... existing supporter limit checks ...

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid.toLowerCase()), {
        supporters: arrayUnion(supporterId.toLowerCase())
      });

      await updateDoc(doc(db, 'users', supporterId.toLowerCase()), {
        supporting: arrayUnion(user.uid.toLowerCase())
      });

      // Grant CometChat access
      await grantSupporterAccess(supporterId.toLowerCase(), user.uid.toLowerCase());

      Alert.alert('Success', 'Supporter added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding supporter:', error);
      Alert.alert('Error', 'Failed to add supporter');
    }
  };

  const handleRemoveSupporter = async (supporterId) => {
    Alert.alert(
      'Remove Supporter',
      'Are you sure you want to remove this supporter?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update Firestore
              await updateDoc(doc(db, 'users', user.uid.toLowerCase()), {
                supporters: arrayRemove(supporterId.toLowerCase())
              });

              await updateDoc(doc(db, 'users', supporterId.toLowerCase()), {
                supporting: arrayRemove(user.uid.toLowerCase())
              });

              // Revoke CometChat access
              await revokeSupporterAccess(supporterId.toLowerCase(), user.uid.toLowerCase());

              setSupporters(supporters.filter(s => s.id !== supporterId));
            } catch (error) {
              console.error('Error removing supporter:', error);
              Alert.alert('Error', 'Failed to remove supporter');
            }
          }
        }
      ]
    );
  };

  const renderSupporterItem = ({ item }) => (
    <View style={styles.supporterItem}>
      <View style={styles.supporterInfo}>
        <Text style={styles.supporterName}>{item.username}</Text>
        <Text style={styles.supporterType}>{item.userType}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveSupporter(item.id)}
      >
        <MaterialCommunityIcons name="close" size={24} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );

  const renderSupportedUserItem = ({ item }) => (
    <View style={styles.supporterItem}>
      <View style={styles.supporterInfo}>
        <Text style={styles.supporterName}>{item.username}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {canAddSupporters && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Supporters</Text>
            {supporters.length > 0 ? (
              <FlatList
                data={supporters}
                renderItem={renderSupporterItem}
                keyExtractor={item => item.id}
                style={styles.list}
              />
            ) : (
              <Text style={styles.emptyText}>No supporters added yet</Text>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddSupporter}
            >
              <Text style={styles.addButtonText}>Add Supporter</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {USER_TYPE_FEATURES[userType]?.canBeSupporter && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>People I Support</Text>
          {supportedUsers.length > 0 ? (
            <FlatList
              data={supportedUsers}
              renderItem={renderSupportedUserItem}
              keyExtractor={item => item.id}
              style={styles.list}
            />
          ) : (
            <Text style={styles.emptyText}>
              You are not supporting anyone yet
            </Text>
          )}
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#24269B',
  },
  supporterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  supporterInfo: {
    flex: 1,
  },
  supporterName: {
    fontSize: 16,
    fontWeight: '500',
  },
  supporterType: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 5,
  },
  addButton: {
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
});

export default SupporterManagementScreen; 