import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import FindFriendScreen from '../screens/FindFriendScreen';
import FriendResultsScreen from '../screens/FriendResultsScreen';

const Stack = createStackNavigator();

const MainNavigator = () => {
  console.log('MainNavigator rendering');
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TabScreens"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FindFriend"
        component={FindFriendScreen}
        options={{ 
          title: 'Find a Friend',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="FriendResults"
        component={FriendResultsScreen}
        options={{ 
          title: 'Potential Friends',
          headerShown: true 
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator; 