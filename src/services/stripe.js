import { Linking } from 'react-native';

// Your price IDs
const STRIPE_PRICES = {
    item1: 'price_1QcoKMKsSm8QZ3xYMdZytQWI',
    item2: 'price_1QZDoHKsSm8QZ3xYSkYVFVKW',
    item3: 'price_1QcsYoKsSm8QZ3xY16MyY6zn',
    item4: 'price_1Qcsa4KsSm8QZ3xYfQPyK6AA',
    item5: 'price_1QcsdUKsSm8QZ3xY5eSumBGO'
};

// Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_xNZWZmyjOMgm4GAKBKWXIU4C';

export const startStripeCheckout = async (itemKey) => {
    try {
        const priceId = STRIPE_PRICES[itemKey];
        if (!priceId) {
            throw new Error('Invalid item key');
        }
        
        const checkoutUrl = `https://checkout.stripe.com/c/pay/${priceId}?key=${STRIPE_PUBLISHABLE_KEY}`;
        
        const supported = await Linking.canOpenURL(checkoutUrl);
        if (supported) {
            await Linking.openURL(checkoutUrl);
            return true;
        } else {
            throw new Error('Cannot open URL');
        }
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return false;
    }
}; 