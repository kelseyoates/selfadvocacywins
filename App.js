import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CometChat } from '@cometchat-pro/react-native-chat';
import { COMETCHAT_CONSTANTS } from './src/config/cometChatConfig';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import TabNavigator from './src/navigation/TabNavigator';
import ChatConversationScreen from './src/screens/ChatConversationScreen';

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
        </Stack.Navigator>
     
    </NavigationContainer>
  );
}