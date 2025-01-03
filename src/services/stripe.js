import { Linking } from 'react-native';
import { auth } from '../config/firebase';

const STRIPE_PAYMENT_LINKS = {
    selfAdvocatePlus: 'https://buy.stripe.com/test_bIYcP87ZlaU6dqgaEF',
    selfAdvocateDating: 'https://buy.stripe.com/test_aEU6qKdjF1jwbi8aEG',
    supporterOne: 'https://buy.stripe.com/test_dR69CW3J56DQ71ScMP',
    supporterFive: 'https://buy.stripe.com/test_8wMeXgbbxfameuk148',
    supporterTen: 'https://buy.stripe.com/test_fZe9CWfrN4vIgCsdQV'
    // Add all your subscription tiers
};

export const startStripeCheckout = async (planType) => {
    try {
        const paymentLink = STRIPE_PAYMENT_LINKS[planType];
        if (!paymentLink) {
            throw new Error(`Invalid plan type: ${planType}`);
        }
        
        // Add user ID to the URL
        const userId = auth.currentUser?.uid;
        const urlWithParams = `${paymentLink}?client_reference_id=${userId}&metadata[userId]=${userId}&metadata[planType]=${planType}`;
        
        console.log('Opening payment link for:', planType);
        console.log('URL:', urlWithParams);
        
        await Linking.openURL(urlWithParams);
        return true;
    } catch (error) {
        console.error('Stripe checkout error:', error);
        Alert.alert('Error', 'Could not open checkout page');
        return false;
    }
}; 