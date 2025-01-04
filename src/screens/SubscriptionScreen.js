import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const SubscriptionScreen = () => {
  const navigation = useNavigation();

  const handleSubscription = async (type) => {
    try {
      let paymentLink = '';
      
      // Your Stripe Payment Links
      switch(type) {
        case 'selfAdvocatePlus':
          paymentLink = 'https://buy.stripe.com/your_plus_payment_link';
          break;
        case 'selfAdvocateDating':
          paymentLink = 'https://buy.stripe.com/your_dating_payment_link';
          break;
        default:
          throw new Error('Invalid subscription type');
      }

      // Open payment link in browser
      const supported = await Linking.canOpenURL(paymentLink);
      
      if (supported) {
        await Linking.openURL(paymentLink);
        
        // Show instructions to user
        Alert.alert(
          'Payment Processing',
          'After completing your payment, please return to the app and restart it to see your upgraded features.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to refresh the app
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Could not open payment page');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'Failed to process subscription request');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Plan</Text>
      
      <TouchableOpacity 
        style={styles.planButton}
        onPress={() => handleSubscription('selfAdvocatePlus')}
      >
        <Text style={styles.planTitle}>Self Advocate Plus</Text>
        <Text style={styles.planPrice}>$4.99/month</Text>
        <Text style={styles.planDescription}>
          Add supporters to help you on your journey
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.planButton}
        onPress={() => handleSubscription('selfAdvocateDating')}
      >
        <Text style={styles.planTitle}>Self Advocate Dating</Text>
        <Text style={styles.planPrice}>$9.99/month</Text>
        <Text style={styles.planDescription}>
          All Plus features and access to dating features
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  planButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  planPrice: {
    fontSize: 18,
    color: '#FF69B4',
    marginBottom: 8,
    fontWeight: '500',
  },
  planDescription: {
    fontSize: 16,
    color: '#666',
  },
});

export default SubscriptionScreen; 