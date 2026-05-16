import { Stack } from 'expo-router';

export default function DeliveryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="products" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="rating" />
    </Stack>
  );
}
