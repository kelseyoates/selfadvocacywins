import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, Image } from 'react-native';


const FindScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
    <View style={styles.buttonContainer}>
      <View style={styles.buttonShadow} />
      <TouchableOpacity 
        style={styles.findFriendButton} 
        onPress={() => navigation.navigate('FindYourFriends')}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Find a Friend</Text>
          <Image 
            source={require('../../assets/friends-active.png')} 
            style={styles.buttonIcon}
          />
        </View>
      </TouchableOpacity>
    </View>


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
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 120,
    width: 300,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonIcon: {
    marginLeft: 2,
  },

  buttonContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginVertical: 10,
  },

  buttonShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    backgroundColor: '#000',
    borderRadius: 8,
  },

  findFriendButton: {
    backgroundColor: '#24269B',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    width: 300,
    height: 120,
    borderWidth: 1,
    borderColor: '#24269B',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },

  buttonIcon: {
    width: 90,
    height: 90,
    borderRadius: 15,
  }
});

export default FindScreen; 