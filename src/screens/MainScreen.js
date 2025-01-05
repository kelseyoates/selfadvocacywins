import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { firestore } from '../config/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import WinCard from '../components/WinCard';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../config/firebase';
import { addDoc, onSnapshot, collection as firestoreCollection } from 'firebase/firestore';

const MainScreen = ({ navigation }) => {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWins = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching wins:', error);
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
    fetchWins();
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWins();
    }, [])
  );

  const testGeminiAPI = async () => {
    try {
      console.log('Testing Gemini API directly...');
      const API_KEY = 'AIzaSyBKoHkKtY1qVFkY__Kl4TfjdlzOXVbTWAo';
      
      // Using a smaller, simpler test image
      const imageUrl = "https://picsum.photos/100/100.jpg";
      console.log('Fetching image from:', imageUrl);
      
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      
      const imageBlob = await imageResponse.blob();
      console.log('Image blob size:', imageBlob.size);
      
      const base64data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const base64String = reader.result.split(',')[1];
            console.log('Base64 string length:', base64String.length);
            console.log('First 50 chars of base64:', base64String.substring(0, 50));
            resolve(base64String);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });

      console.log('Image converted to base64');
      
      const requestBody = {
        contents: [{
          parts: [{
            text: "Describe this image"
          }, {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64data
            }
          }]
        }]
      };
      
      console.log('Sending request to Gemini API...');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('Direct API Response:', data);
      
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const description = data.candidates[0].content.parts[0].text;
        console.log('Image Description:', description);
        Alert.alert('Image Description', description);
      }
      
    } catch (error) {
      console.error('Error testing Gemini API:', error.message);
      console.error('Full error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={() => {
          console.log('Direct API test button pressed');
          testGeminiAPI();
        }}
      >
        <Text style={styles.buttonText}>Test Gemini API Directly</Text>
      </TouchableOpacity>
      <FlatList
        data={wins}
        renderItem={({ item }) => <WinCard win={item} />}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#24269B']}
          />
        }
        contentContainerStyle={styles.listContent}
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
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    margin: 10,
    alignSelf: 'center',
    width: '80%',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MainScreen;