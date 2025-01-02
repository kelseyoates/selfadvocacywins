import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_TYPES, STRIPE_PRODUCTS, USER_TYPE_FEATURES } from '../constants/userTypes';
import { createPaymentSheet, updateUserType } from '../services/stripe';

const SubscriptionScreen = () => {
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [currentUserType, setCurrentUserType] = useState(USER_TYPES.BASIC);

  useEffect(() => {
    fetchUserType();
  }, []);

  const fetchUserType = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid.toLowerCase()));
      if (userDoc.exists()) {
        setCurrentUserType(userDoc.data().userType || USER_TYPES.BASIC);
      }
    } catch (error) {
      console.error('Error fetching user type:', error);
    }
  };

  const handleSubscribe = async (productType) => {
    try {
      setLoading(true);
      
      // Get the price ID for the selected product
      const priceId = STRIPE_PRODUCTS[productType];
      
      // Create payment sheet
      const { paymentIntent, ephemeralKey, customer } = 
        await createPaymentSheet(user.uid, priceId);
      
      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Your App Name",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        Alert.alert('Error', 'Unable to initialize payment');
        return;
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        Alert.alert('Error', presentError.message);
        return;
      }

      // Payment successful - update user type
      await updateUserType(user.uid, productType);
      setCurrentUserType(productType);
      Alert.alert('Success', 'Your subscription has been updated!');
      
    } catch (error) {
      console.error('Error in subscription:', error);
      Alert.alert('Error', 'Unable to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const renderSubscriptionOption = (title, price, features, type) => (
    <TouchableOpacity
      style={[
        styles.subscriptionCard,
        currentUserType === type && styles.currentPlan
      ]}
      onPress={() => handleSubscribe(type)}
      disabled={loading || currentUserType === type}
    >
      <Text style={styles.subscriptionTitle}>{title}</Text>
      <Text style={styles.subscriptionPrice}>${price}/month</Text>
      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <Text key={index} style={styles.featureText}>
            ✓ {feature}
          </Text>
        ))}
      </View>
      {currentUserType === type ? (
        <Text style={styles.currentPlanText}>Current Plan</Text>
      ) : (
        <Text style={styles.selectPlanText}>Select Plan</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Choose Your Plan</Text>
      
      {renderSubscriptionOption(
        'Self-Advocate Plus',
        9.99,
        ['Add supporters to help manage your chats', 'All basic features included'],
        USER_TYPES.SELF_ADVOCATE_PLUS
      )}

      {renderSubscriptionOption(
        'Self-Advocate Dating',
        14.99,
        [
          'Add supporters to help manage your chats',
          'Access to dating features',
          'All basic features included'
        ],
        USER_TYPES.SELF_ADVOCATE_DATING
      )}

      {renderSubscriptionOption(
        'Supporter - 1 User',
        4.99,
        ['Support 1 user', 'Read-only access to supported user chats'],
        USER_TYPES.SUPPORTER_1
      )}

      {renderSubscriptionOption(
        'Supporter - 5 Users',
        19.99,
        ['Support up to 5 users', 'Read-only access to supported users chats'],
        USER_TYPES.SUPPORTER_5
      )}

      {renderSubscriptionOption(
        'Supporter - 10 Users',
        34.99,
        ['Support up to 10 users', 'Read-only access to supported users chats'],
        USER_TYPES.SUPPORTER_10
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    textAlign: 'center',
    color: '#24269B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentPlan: {
    borderColor: '#24269B',
    borderWidth: 2,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#24269B',
  },
  subscriptionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  featuresList: {
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  currentPlanText: {
    textAlign: 'center',
    color: '#24269B',
    fontWeight: 'bold',
  },
  selectPlanText: {
    textAlign: 'center',
    color: '#24269B',
  },
});

export default SubscriptionScreen; 