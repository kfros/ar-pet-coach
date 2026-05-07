import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SubscriptionProvider } from './components/SubscriptionManager';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { LogBox } from 'react-native';

export default function App() {
  LogBox.ignoreLogs([
    'This method is deprecated (as well as all React Native Firebase namespaced API) and will be removed in the next major release as part of move to match Firebase Web modular SDK API. Please see migration guide for more details: https://rnfirebase.io/migrating-to-v22. Method called was `collection`. Please use `collection()` instead.'
  ]);
  return (
    <SafeAreaProvider>
      <SubscriptionProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SubscriptionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
