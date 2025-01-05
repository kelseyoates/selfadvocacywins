import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  AccessibilityInfo
} from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import WinCard from '../components/WinCard';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../config/firebase';

const MainScreen = ({ navigation }) => {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchWins = async () => {
    try {
      announceToScreenReader('Fetching recent wins');
      const winsQuery = query(
        collection(db, 'wins'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(winsQuery);
      const winsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setWins(winsData);
      announceToScreenReader(`Loaded ${winsData.length} wins`);
    } catch (error) {
      console.error('Error fetching wins:', error);
      announceToScreenReader('Failed to load wins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWins();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    announceToScreenReader('Refreshing wins');
    fetchWins();
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWins();
    }, [])
  );

  if (loading) {
    return (
      <View 
        style={styles.loadingContainer}
        accessible={true}
        accessibilityLabel="Loading wins"
        accessibilityRole="progressbar"
      >
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Main Screen"
    >
      <FlatList
        data={wins}
        renderItem={({ item }) => (
          <View
            accessible={true}
            accessibilityLabel={`Win by ${item.userName || 'Unknown user'}`}
            accessibilityHint="Double tap to view details"
          >
            <WinCard win={item} />
          </View>
        )}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#24269B']}
            accessible={true}
            accessibilityLabel={refreshing ? 'Refreshing wins' : 'Pull to refresh'}
            accessibilityHint="Pull down to refresh the list of wins"
            accessibilityRole="adjustable"
          />
        }
        contentContainerStyle={styles.listContent}
        accessible={true}
        accessibilityLabel={`List of ${wins.length} wins`}
        accessibilityHint="Scroll to view more wins"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 10,
  }
});

export default MainScreen;