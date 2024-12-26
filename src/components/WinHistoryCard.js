import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Video } from 'expo-av';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { format } from 'date-fns';

const WinHistoryCard = ({ win, onPress }) => {
  if (!win) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {win.mediaUrl ? (
        <>
          <Image 
            source={{ uri: win.mediaUrl }} 
            style={styles.image}
            resizeMode="contain"
          />
          {win.text && (
            <View style={styles.textContainer}>
              <Text style={styles.text} numberOfLines={3}>
                {win.text}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.textOnlyContainer}>
          <Text style={styles.text} numberOfLines={3}>
            {win.text || 'No text provided'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  textContainer: {
    padding: 12,
  },
  textOnlyContainer: {
    padding: 16,
  },
  text: {
    fontSize: 16,
    color: '#333',
  }
});

export default WinHistoryCard; 