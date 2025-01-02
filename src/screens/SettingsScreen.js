import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { startStripeCheckout } from '../services/stripe';

const SUBSCRIPTION_OPTIONS = {
  selfAdvocate: [
    {
      id: 'item1',
      title: 'Self-Advocate Plus',
      description: 'Add supporters to help you on your journey',
      priceKey: 'item1',
      image: require('../../assets/self-advocate-plus.png')
    },
    {
      id: 'item5',
      title: 'Self-Advocate Dating',
      description: 'Access to upcoming dating features',
      priceKey: 'item5',
      image: require('../../assets/self-advocate-dating.png')
    }
  ],
  supporter: [
    {
      id: 'item2',
      title: 'Supporter - Single User',
      description: 'Support one self-advocate',
      priceKey: 'item2',
      image: require('../../assets/supporter-one.png')
    },
    {
      id: 'item3',
      title: 'Supporter - 5 Users',
      description: 'Support up to 5 self-advocates',
      priceKey: 'item3',
      image: require('../../assets/supporter-five.png')
    },
    {
      id: 'item4',
      title: 'Supporter - 10 Users',
      description: 'Support up to 10 self-advocates',
      priceKey: 'item4',
      image: require('../../assets/supporter-ten.png')
    }
  ]
};

const SettingsScreen = () => {
  const navigation = useNavigation();

  const handleUpgrade = async (priceKey) => {
    try {
      const success = await startStripeCheckout(priceKey);
      if (success) {
        Alert.alert('Success', 'Thank you for your purchase!');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Unable to complete purchase. Please try again.');
    }
  };

  const renderSubscriptionOption = (option) => (
    <TouchableOpacity 
      key={option.id}
      style={styles.menuItem}
      onPress={() => handleUpgrade(option.priceKey)}
    >
      <Image 
        source={option.image}
        style={styles.menuIcon}
      />
      <View style={styles.optionContent}>
        <Text style={styles.menuItemText}>{option.title}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={24} 
        color="#666" 
      />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('People')}
        >
          <Image 
            source={require('../../assets/people.png')}
            style={styles.menuIcon}
          />
          <Text style={styles.menuItemText}>People</Text>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Self-Advocate Options</Text>
        {SUBSCRIPTION_OPTIONS.selfAdvocate.map(renderSubscriptionOption)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supporter Options</Text>
        {SUBSCRIPTION_OPTIONS.supporter.map(renderSubscriptionOption)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: '#f8f8f8',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionContent: {
    flex: 1,
    marginLeft: 15,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  }
});

export default SettingsScreen;