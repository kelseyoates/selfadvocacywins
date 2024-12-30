import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, Image } from 'react-native';


const FindScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
    <TouchableOpacity 
              style={styles.button}
              onPress={() => navigation.navigate('FindYourFriends')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                Find a Friend{' '}
                <Image 
                  source={require('../../assets/friends-active.png')} 
                  style={styles.icon}
                />
              </Text>
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
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#F0F4FF',
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: 90,
    height: 90,
  },
});

export default FindScreen; 