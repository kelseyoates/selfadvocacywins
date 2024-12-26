import React, { useState, useEffect } from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import MainScreen from '../screens/MainScreen';
import ChatMainScreen from '../screens/ChatMainScreen';
import NewWinScreen from '../screens/NewWinScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const [profilePicture, setProfilePicture] = useState(null);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const uid = auth.currentUser?.uid.toLowerCase();
        if (uid) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfilePicture(userData.profilePicture);
          }
        }
      } catch (error) {
        console.error('Error fetching profile picture:', error);
      }
    };

    fetchProfilePicture();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#24269B',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          paddingBottom: 5,
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={MainScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('../../assets/bottom-nav-images/home-active.png') 
                            : require('../../assets/bottom-nav-images/home-inactive.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatMainScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('../../assets/bottom-nav-images/chat-active.png')
                            : require('../../assets/bottom-nav-images/chat-inactive.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="New Win"
        component={NewWinScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('../../assets/bottom-nav-images/plus-active.png')
                            : require('../../assets/bottom-nav-images/plus-inactive.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                profilePicture
                  ? { uri: profilePicture }
                  : require('../../assets/bottom-nav-images/profile-inactive.png')
              }
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                borderWidth: focused ? 2 : 0,
                borderColor: '#24269B'
              }}
              resizeMode="cover"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator; 