import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SubscriptionProvider } from './components/SubscriptionManager';
import AppNavigator from './navigation/AppNavigator';
// StripeProvider is commented out because @stripe/stripe-react-native requires native code
// that is not available in Expo Go. Re-enable this when using a development build.
// import { StripeProvider } from '@stripe/stripe-react-native';

export default function App() {
  // Stripe is disabled for Expo Go compatibility.
  // Wrap with <StripeProvider> when using a development build.
  return (
    <SubscriptionProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </SubscriptionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
