import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { CommonActions } from '@react-navigation/native';

const FindScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Button
        title="Find Friend"
        onPress={() => navigation.navigate('FindFriend')}
        buttonStyle={styles.button}
      />
      <Button
        title="Find Your Friends"
        onPress={() => navigation.navigate('FindYourFriends')}
        buttonStyle={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#24269B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default FindScreen; 