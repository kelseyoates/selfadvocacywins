import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const UserCard = ({ user }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('UserProfile', { userId: user.userId });
  };

  // Get the first question answer that has text
  const firstAnswer = user.questionAnswers?.find(qa => qa.textAnswer)?.textAnswer || '';

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={styles.card}>
        <Image 
          source={user.profilePicture ? { uri: user.profilePicture } : { uri: 'https://via.placeholder.com/60' }}
          style={styles.profilePicture}
        />
        <View style={styles.info}>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.location}>{user.state}</Text>
          <Text style={styles.bio} numberOfLines={2}>
            {firstAnswer}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#f0f0f0', // Light gray background for loading state
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#444',
  },
});

export default UserCard; 