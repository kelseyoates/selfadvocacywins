import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CommonActions } from '@react-navigation/native';

const FindScreen = ({ navigation }) => {
  const navigateToFindFriend = () => {
    console.log('Attempting to navigate to FindFriend');
    navigation.dispatch(
      CommonActions.navigate({
        name: 'FindFriend',
      })
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button}
        onPress={navigateToFindFriend}
      >
        <Text style={styles.buttonText}>Find a Friend</Text>
      </TouchableOpacity>
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