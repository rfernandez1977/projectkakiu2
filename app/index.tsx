import { Redirect } from 'expo-router';

// Redirect to tabs to avoid an extra render on initial load
export default function Index() {
  return <Redirect href="/(tabs)" />;
}