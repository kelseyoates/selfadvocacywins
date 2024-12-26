const handleLogout = async () => {
    try {
      console.log('Logging out...');
      await CometChat.logout();
      console.log('CometChat logout successful');
      await firebase.auth().signOut();
      console.log('Firebase logout successful');
      navigation.navigate('Login'); // Redirect to login screen
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };