import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

// TODO: Replace with reliable backend endpoint logic to fetch PaymentIntent
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';

class StripeService {
    static async fetchPaymentSheetParams(amount: number) {
        const response = await fetch(`${API_URL}/payment-sheet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
        });
        const { paymentIntent, ephemeralKey, customer } = await response.json();

        return {
            paymentIntent,
            ephemeralKey,
            customer,
        };
    }

    static async initializePaymentSheet(amount: number) {
        try {
            // Fetch PaymentIntent, EphemeralKey, and CustomerID from backend
            const { paymentIntent, ephemeralKey, customer } = await this.fetchPaymentSheetParams(amount);

            if (!paymentIntent || !ephemeralKey || !customer) {
                console.error("Stripe: Missing parameters from backend");
                return false;
            }

            const { error } = await initPaymentSheet({
                merchantDisplayName: 'AR Pet Coach',
                customerId: customer,
                customerEphemeralKeySecret: ephemeralKey,
                paymentIntentClientSecret: paymentIntent,
                allowsDelayedPaymentMethods: true,
                defaultBillingDetails: {
                    name: 'AR Pet Coach User',
                },
                returnURL: 'arpetcoach://stripe-redirect',
            });

            if (error) {
                console.error("Stripe init failed", error);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Stripe initializePaymentSheet error:", e);
            return false;
        }
    }

    static async openPaymentSheet() {
        const { error } = await presentPaymentSheet();

        if (error) {
            console.log(`Error code: ${error.code}`, error.message);
            return false;
        } else {
            console.log('Success', 'Your order is confirmed!');
            return true;
        }
    }
}

export default StripeService;
