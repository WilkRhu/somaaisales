import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useTenant } from '@/contexts/TenantContext';

export default function StoreSelectionScreen() {
  const [code, setCode] = useState('mercado-joao');
  const [loading, setLoading] = useState(false);
  const { loadTenantByCode } = useTenant();

  const submit = async () => {
    setLoading(true);
    try {
      const ok = await loadTenantByCode(code.trim());
      if (!ok) throw new Error('Loja não encontrada');
      router.replace('/app/home');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar a loja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Seleção da Loja" subtitle="Informe o código da sua unidade para carregar o tema e catálogo.">
      <View style={styles.card}>
        <Input label="Código da loja" value={code} onChangeText={setCode} placeholder="mercado-joao" />
        <Button title="Continuar" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
});
