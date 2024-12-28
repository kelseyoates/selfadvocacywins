import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { firebase } from './firebaseConfig';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import MainScreen from './MainScreen'; // Your app's main screen


const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainScreen} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;