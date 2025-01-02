import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_TYPES, USER_TYPE_FEATURES } from '../constants/userTypes';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

const SubscriptionManagementScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid.toLowerCase()));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSubscriptionData({
          userType: userData.userType || USER_TYPES.BASIC,
          subscriptionStatus: userData.subscriptionStatus || 'inactive',
          subscriptionExpiresAt: userData.subscriptionExpiresAt?.toDate(),
          stripeCustomerId: userData.stripeCustomerId
        });

        // Fetch payment history from Stripe through your backend
        if (userData.stripeCustomerId) {
          const response = await fetch('your-backend-url/payment-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerId: userData.stripeCustomerId
            }),
          });
          const history = await response.json();
          setPaymentHistory(history);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? This will take effect at the end of your current billing period.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch('your-backend-url/cancel-subscription', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user.uid,
                  customerId: subscriptionData.stripeCustomerId
                }),
              });
              
              if (response.ok) {
                Alert.alert(
                  'Subscription Cancelled',
                  'Your subscription will remain active until the end of the current billing period.'
                );
                fetchSubscriptionData();
              } else {
                throw new Error('Failed to cancel subscription');
              }
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#24269B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Management</Text>
      </View>

      <View style={styles.subscriptionCard}>
        <Text style={styles.cardTitle}>Current Plan</Text>
        <Text style={styles.planName}>
          {subscriptionData?.userType?.replace(/-/g, ' ').toUpperCase()}
        </Text>
        <Text style={styles.status}>
          Status: {subscriptionData?.subscriptionStatus?.toUpperCase()}
        </Text>
        {subscriptionData?.subscriptionExpiresAt && (
          <Text style={styles.expiry}>
            Expires: {format(subscriptionData.subscriptionExpiresAt, 'PPP')}
          </Text>
        )}

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Plan Features:</Text>
          {USER_TYPE_FEATURES[subscriptionData?.userType]?.canHaveSupporters && (
            <Text style={styles.feature}>✓ Can have supporters</Text>
          )}
          {USER_TYPE_FEATURES[subscriptionData?.userType]?.canBeSupporter && (
            <Text style={styles.feature}>
              ✓ Can support up to {USER_TYPE_FEATURES[subscriptionData?.userType].maxSupportedUsers} users
            </Text>
          )}
          {USER_TYPE_FEATURES[subscriptionData?.userType]?.canAccessDating && (
            <Text style={styles.feature}>✓ Dating feature access</Text>
          )}
        </View>

        {subscriptionData?.subscriptionStatus === 'active' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
          >
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.changeButtonText}>Change Plan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Payment History</Text>
        {paymentHistory.map((payment, index) => (
          <View key={index} style={styles.paymentItem}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentDate}>
                {format(new Date(payment.created * 1000), 'PP')}
              </Text>
              <Text style={styles.paymentAmount}>
                ${(payment.amount / 100).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.paymentStatus}>
              {payment.status.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#24269B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    margin: 15,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#24269B',
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  expiry: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  featuresContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  feature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#24269B',
    padding: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  changeButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  historyContainer: {
    backgroundColor: '#fff',
    margin: 15,
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
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  paymentStatus: {
    fontSize: 12,
    color: '#24269B',
    fontWeight: '500',
  },
});

export default SubscriptionManagementScreen; 