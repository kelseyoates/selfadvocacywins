import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ManageSubscriptionScreen = () => {
  const navigation = useNavigation();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserSubscription();
  }, []);

  const fetchUserSubscription = async () => {
    try {
      const userId = auth.currentUser.uid.toLowerCase();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setCurrentSubscription(userDoc.data().subscriptionType);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      Alert.alert('Error', 'Failed to load subscription information');
      setLoading(false);
    }
  };

  const handleSubscriptionChange = async (newType) => {
    try {
      // For all subscription changes, use the customer portal
      const portalLink = 'https://billing.stripe.com/p/login/test_7sI025bCyfKp9ryfYY';
      
      const supported = await Linking.canOpenURL(portalLink);
      
      if (supported) {
        await Linking.openURL(portalLink);
        Alert.alert(
          'Subscription Management',
          'After making changes to your subscription, please return to the app and restart it to see your updated features.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Could not open subscription management page');
      }
    } catch (error) {
      console.error('Subscription change error:', error);
      Alert.alert('Error', 'Failed to open subscription management');
    }
  };

  if (loading) {
    return (
      <View style={styles.container} accessible={true} accessibilityRole="progressbar">
        <Text style={styles.loadingText} accessibilityLabel="Loading your subscription information">
          Loading subscription info...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} accessible={true}>
      <Text 
        style={styles.title} 
        accessible={true}
        accessibilityRole="text"
      >
        Manage Your Subscription
      </Text>
      
      <View 
        style={styles.currentPlanCard} 
        accessible={true} 
        accessibilityRole="text"
        accessibilityLabel={`Current plan: ${
          currentSubscription === 'selfAdvocatePlus' ? 'Self Advocate Plus, ten dollars per month' :
          currentSubscription === 'selfAdvocateDating' ? 'Self Advocate Dating, fifteen dollars per month' :
          currentSubscription === 'supporter1' ? 'Supporter 1, ten dollars per month' :
          currentSubscription === 'supporter5' ? 'Supporter 5, fifteen dollars per month' :
          currentSubscription === 'supporter10' ? 'Supporter 10, twenty dollars per month' :
          'Self Advocate, Free plan'
        }`}
      >
        <Text style={styles.currentPlanTitle}>Current Plan:</Text>
        <Text style={styles.currentPlanName}>
          {currentSubscription === 'selfAdvocatePlus' ? 'Self Advocate Plus - $10/month' :
           currentSubscription === 'selfAdvocateDating' ? 'Self Advocate Dating - $15/month' :
           currentSubscription === 'supporter1' ? 'Supporter 1 - $10/month' :
           currentSubscription === 'supporter5' ? 'Supporter 5 - $15/month' :
           currentSubscription === 'supporter10' ? 'Supporter 10 - $20/month' :
           'Self Advocate - Free'}
        </Text>
      </View>

      <Text 
        style={styles.sectionTitle} 
        accessible={true}
        accessibilityRole="text"
      >
        Change Your Plan
      </Text>

      {/* Self Advocate Plans */}
      {!currentSubscription.startsWith('supporter') && (
        <>
          {currentSubscription !== 'selfAdvocateFree' && (
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => handleSubscriptionChange('selfAdvocateFree')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Downgrade to Self Advocate Free plan. Basic access to chat and post wins. No monthly cost."
              accessibilityHint="Double tap to change to the free plan"
            >
              <Text style={styles.planTitle}>Downgrade to Self Advocate - Free</Text>
              <Text style={styles.planPrice}>Free</Text>
              <Text style={styles.planDescription}>Basic access to chat and post wins.</Text>
            </TouchableOpacity>
          )}

          {currentSubscription !== 'selfAdvocatePlus' && (
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => handleSubscriptionChange('selfAdvocatePlus')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Switch to Self Advocate Plus plan. Add supporters, chat, and post wins. Monthly cost is ten dollars."
              accessibilityHint="Double tap to change to the plus plan"
            >
              <Text style={styles.planTitle}>Switch to Self Advocate Plus</Text>
              <Text style={styles.planPrice}>$10/month</Text>
              <Text style={styles.planDescription}>Add supporters, chat, and post wins.</Text>
            </TouchableOpacity>
          )}

          {currentSubscription !== 'selfAdvocateDating' && (
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => handleSubscriptionChange('selfAdvocateDating')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Switch to Self Advocate Dating plan. All Plus features and dating access. Monthly cost is fifteen dollars."
              accessibilityHint="Double tap to change to the dating plan"
            >
              <Text style={styles.planTitle}>Switch to Self Advocate Dating</Text>
              <Text style={styles.planPrice}>$15/month</Text>
              <Text style={styles.planDescription}>All Plus features and dating access</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Supporter Plans */}
      {!currentSubscription.includes('selfAdvocate') && (
        <>
          {currentSubscription !== 'supporter1' && (
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => handleSubscriptionChange('supporter1')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Switch to Supporter 1 plan. Support one self-advocate. Monthly cost is ten dollars."
              accessibilityHint="Double tap to change to the supporter 1 plan"
            >
              <Text style={styles.planTitle}>Switch to Supporter - 1</Text>
              <Text style={styles.planPrice}>$10/month</Text>
              <Text style={styles.planDescription}>Support one self-advocate</Text>
            </TouchableOpacity>
          )}

          {currentSubscription !== 'supporter5' && (
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => handleSubscriptionChange('supporter5')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Switch to Supporter 5 plan. Support up to five self-advocates. Monthly cost is fifteen dollars."
              accessibilityHint="Double tap to change to the supporter 5 plan"
            >
              <Text style={styles.planTitle}>Switch to Supporter - 5</Text>
              <Text style={styles.planPrice}>$15/month</Text>
              <Text style={styles.planDescription}>Support up to five self-advocates</Text>
            </TouchableOpacity>
          )}

          {currentSubscription !== 'supporter10' && (
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => handleSubscriptionChange('supporter10')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Switch to Supporter 10 plan. Support up to ten self-advocates. Monthly cost is twenty dollars."
              accessibilityHint="Double tap to change to the supporter 10 plan"
            >
              <Text style={styles.planTitle}>Switch to Supporter - 10</Text>
              <Text style={styles.planPrice}>$20/month</Text>
              <Text style={styles.planDescription}>Support up to ten self-advocates</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {currentSubscription !== 'selfAdvocateFree' && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => handleSubscriptionChange('cancel')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Cancel subscription"
          accessibilityHint="Double tap to begin subscription cancellation process"
        >
          <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>
      )}
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
  currentPlanCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  currentPlanTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
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
    borderColor: '#000000',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  planPrice: {
    fontSize: 16,
    color: '#FF69B4',
    fontWeight: '500',
  },
  cancelButton: {
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: '#f8f8f8',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default ManageSubscriptionScreen; 