<View style={styles.buttonContainer}>
<View style={styles.buttonShadow} />
<TouchableOpacity 
  style={styles.chatButton}
  onPress={() => navigation.navigate('Chat', {
    screen: 'ChatConversation',
    params: {
      otherUserId: userId
    }
  })}
>
  <View style={styles.buttonContent}>
    <Text style={styles.chatButtonText}>
      Start Chat <MaterialCommunityIcons name="chat" size={24} color="white" />
    </Text>
  </View>
</TouchableOpacity>
</View>