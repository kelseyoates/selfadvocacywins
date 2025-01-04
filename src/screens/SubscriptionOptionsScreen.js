import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { startStripeCheckout } from '../services/stripe';

const SUBSCRIPTION_OPTIONS = {
  selfAdvocate: [
    {
      id: 'selfAdvocatePlus',
      title: 'Self-Advocate Plus',
      price: '$4.99/month',
      description: 'Access to supporters',
      planType: 'selfAdvocatePlus'
    },
    {
      id: 'selfAdvocateDating',
      title: 'Self-Advocate Dating',
      price: '$9.99/month',
      description: 'Access to supporters and dating',
      planType: 'selfAdvocateDating'
    }
  ],
  supporter: [
    {
      id: 'supporterOne',
      title: 'Supporter One',
      price: '$1/month',
      description: 'Support one self-advocate',
      planType: 'supporterOne'
    },
    {
      id: 'supporterFive',
      title: 'Supporter Five',
      price: '$5/month',
      description: 'Support up to five self-advocates',
      planType: 'supporterFive'
    },
    {
      id: 'supporterTen',
      title: 'Supporter Ten',
      price: '$10/month',
      description: 'Support up toten self-advocates',
      planType: 'supporterTen'
    }
  ]
};

const SubscriptionOptionsScreen = () => {
  const handleUpgrade = async (planType) => {
    try {
      console.log('Starting checkout for plan:', planType);
      const success = await startStripeCheckout(planType);
      if (!success) {
        Alert.alert('Error', 'Could not open checkout page');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      Alert.alert('Error', 'Failed to start checkout process');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Self-Advocate Pddddlans</Text>
        {SUBSCRIPTION_OPTIONS.selfAdvocate.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.card}
            onPress={() => handleUpgrade(option.planType)}
          >
            <View style={styles.cardContent}>
              <Text style={styles.title}>{option.title}</Text>
              <Text style={styles.price}>{option.price}</Text>
              <Text style={styles.description}>{option.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supporter Plans</Text>
        {SUBSCRIPTION_OPTIONS.supporter.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.card}
            onPress={() => handleUpgrade(option.planType)}
          >
            <View style={styles.cardContent}>
              <Text style={styles.title}>{option.title}</Text>
              <Text style={styles.price}>{option.price}</Text>
              <Text style={styles.description}>{option.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#24269B',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});

export default SubscriptionOptionsScreen; 