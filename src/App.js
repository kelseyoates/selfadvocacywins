import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './navigation/MainNavigator';
import messaging from '@react-native-firebase/messaging';
import { CometChat } from '@cometchat-pro/react-native-chat';
import { View, ActivityIndicator } from 'react-native';

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      console.log('App initialization starting...');
      try {
        await Promise.all([
          CometChat.init(/* your config */),
          initializeNotifications()
        ]);
        console.log('All initialization complete');
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        // Still set initialized to true to prevent infinite white screen
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default App; 