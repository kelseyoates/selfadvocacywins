import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CometChat } from '@cometchat-pro/react-native-chat';
import { COMETCHAT_CONSTANTS } from './src/config/cometChatConfig';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import TabNavigator from './src/navigation/TabNavigator';
import ChatConversationScreen from './src/screens/ChatConversationScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import UserSearchScreen from './src/screens/UserSearchScreen';
import GroupChatSetupScreen from './src/screens/GroupChatSetupScreen';
import FindFriendScreen from './src/screens/FindFriendScreen';
import FriendResultsScreen from './src/screens/FriendResultsScreen';
import FindYourFriendsScreen from './src/screens/FindYourFriendsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OtherUserProfileScreen from './src/screens/OtherUserProfileScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PeopleScreen from './src/screens/PeopleScreen';
import MainNavigator from './src/navigation/MainNavigator';
import SupporterManagementScreen from './src/screens/SupporterManagementScreen';
import AddSupporterScreen from './src/screens/AddSupporterScreen';
import SupporterDashboardScreen from './src/screens/SupporterDashboardScreen';
import { AuthProvider } from './src/contexts/AuthContext';
import { useEffect } from 'react';

const Stack = createNativeStackNavigator();

const appSettings = new CometChat.AppSettingsBuilder()
  .subscribePresenceForAllUsers()
  .setRegion(COMETCHAT_CONSTANTS.REGION)
  .build();

// Initialize CometChat
const initCometChat = async () => {
  try {
    const response = await CometChat.init(COMETCHAT_CONSTANTS.APP_ID, appSettings);
    console.log("CometChat initialization successful:", response);
  } catch (error) {
    console.log("CometChat initialization failed:", error);
  }
};

// Call initialization
initCometChat();

export default function App() {


  return (
    <AuthProvider>
      <NavigationContainer>
        
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChatConversation"
              component={ChatConversationScreen}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="NewChat"
              component={NewChatScreen}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="UserSearch"
              component={UserSearchScreen}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="GroupChatSetup"
              component={GroupChatSetupScreen}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="MainNavigator"
              component={MainNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FindFriend"
              component={FindFriendScreen}
              options={{ title: 'Find a Friend' }}
            />
            <Stack.Screen
              name="FindYourFriends"
              component={FindYourFriendsScreen}
              options={{ title: 'Find Your Friends' }}
            />
            <Stack.Screen
              name="FriendResults"
              component={FriendResultsScreen}
              options={{ title: 'Potential Friends' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="OtherUserProfile"
              component={OtherUserProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="GroupChat"
              component={GroupChatScreen}
              options={{ title: 'Group Chat' }}
            />
              <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="People"
              component={PeopleScreen}
              options={{ title: 'People' }}
            />
         
            <Stack.Screen
              name="SupporterManagement"
              component={SupporterManagementScreen}
              options={{ title: 'Supporters' }}
            />
            <Stack.Screen
              name="AddSupporter"
              component={AddSupporterScreen}
              options={{ title: 'Add Supporter' }}
            />
            <Stack.Screen
              name="SupporterDashboard"
              component={SupporterDashboardScreen}
              options={{ title: 'Supporter Dashboard' }}
            />
          

          </Stack.Navigator>
       
      </NavigationContainer>
    </AuthProvider>
  );
}