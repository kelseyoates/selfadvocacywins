import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { CometChat } from '@cometchat-pro/react-native-chat';
import { COMETCHAT_CONSTANTS } from '../config/cometChatConfig';
import { Dimensions } from 'react-native';

const windowHeight = Dimensions.get('window').height;


const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');

  const handleUserNameChange = (text) => {
    setUserName(text.toLowerCase());
  };

  const handleSignup = async () => {
    try {
      if (!userName.trim()) {
        Alert.alert('Error', 'Please enter a username');
        return;
      }

      // Firebase Auth Signup
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const originalUid = userCredential.user.uid;
      const uid = originalUid.toLowerCase();

      // Create user document in Firestore with lowercase UID
      const userDoc = {
        uid: uid,
        originalUid: originalUid, // Store original UID if needed for reference
        email: email,
        username: userName.toLowerCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profilePicture: null,
        bio: '',
        followers: [],
        following: [],
        posts: [],
      };

      // Use lowercase UID for Firestore document
      await setDoc(doc(db, 'users', uid), userDoc);
      console.log('Firestore user document created successfully');

      // CometChat Signup with lowercase UID
      const user = new CometChat.User(uid);
      user.setName(userName.toLowerCase());
      
      await CometChat.createUser(user, COMETCHAT_CONSTANTS.AUTH_KEY);
      console.log('CometChat user created successfully');

      // Login to CometChat with lowercase UID
      await CometChat.login(uid, COMETCHAT_CONSTANTS.AUTH_KEY);
      console.log('CometChat login successful');

      // Navigate to main app screen
      navigation.navigate('Main');
    } catch (error) {
      console.error('Signup error details:', error);
      
      // Better error messages for users
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Email Already Registered',
          'This email address is already registered. Please use a different email or try logging in.',
          [
            { text: 'OK', onPress: () => console.log('OK Pressed') },
            { 
              text: 'Go to Login', 
              onPress: () => navigation.navigate('Login'),
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('Signup Failed', error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.headerImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>Create Account</Text>
          
          <View style={styles.labelContainer}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="email-outline" 
                size={24} 
                color="black" 
              />
            </View>
            <Text style={styles.formLabel}>Email:</Text>
          </View>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.labelContainer}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="account-outline" 
                size={24} 
                color="black" 
              />
            </View>
            <Text style={styles.formLabel}>Username:</Text>
          </View>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={handleUserNameChange}
            placeholder="choose a username (lowercase)"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.labelContainer}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="lock-outline" 
                size={24} 
                color="black" 
              />
            </View>
            <Text style={styles.formLabel}>Password:</Text>
          </View>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
          />


          <View style={styles.container}>
    <View style={styles.buttonContainer}>
      <View style={styles.buttonShadow} />

      <TouchableOpacity 
        style={styles.signupButton} 
        onPress={handleSignup}
      >
        
        <View style={styles.buttonContent}>
        <Text style={styles.signupButtonText}>
                Sign Up <MaterialCommunityIcons name="arrow-right" size={24} color="white" />
              </Text>
        </View>
      </TouchableOpacity>
    </View>


    </View>

    



          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    minHeight: windowHeight,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerImage: {
    width: '100%',
    height: windowHeight * 0.2, // 20% of screen height
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginTop: 0,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 30,
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 20,
    lineHeight: 24,
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  
 
  signupButtonText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
  },
  footerLink: {
    fontSize: 16,
    color: '#24269B',
  },
  bottomPadding: {
    height: 100,
  },
 
  buttonText: {
    color: '#FFF',
    fontSize: 18,
  },

  buttonContainer: {
    position: 'relative',
    marginVertical: 40,
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

  signupButton: {
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
    height: 60,
    borderWidth: 1,
    borderColor: '#24269B',
  },

  buttonContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },


  buttonIcon: {
    width: 90,
    height: 90,
    borderRadius: 15,
  }
});

export default SignUpScreen;