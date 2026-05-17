import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="catalogo" />
      <Stack.Screen name="favoritos" />
      <Stack.Screen name="produto/[id]" />
      <Stack.Screen name="carrinho" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="pedidos" />
      <Stack.Screen name="perfil" />
      <Stack.Screen name="promocoes" />
    </Stack>
  );
}
