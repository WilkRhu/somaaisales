import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type ModalButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: ModalButton[];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onClose?: () => void;
};

export function AppModal({ visible, title, message, buttons = [], icon, iconColor = '#1677FF', onClose }: Props) {
  const defaultButtons: ModalButton[] = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onClose }];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
              <Ionicons name={icon} size={32} color={iconColor} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.buttons, defaultButtons.length > 2 && styles.buttonsColumn]}>
            {defaultButtons.map((btn, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.button,
                  defaultButtons.length <= 2 && { flex: 1 },
                  btn.style === 'cancel' && styles.buttonCancel,
                  btn.style === 'destructive' && styles.buttonDestructive,
                  btn.style !== 'cancel' && btn.style !== 'destructive' && { backgroundColor: iconColor },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => { btn.onPress?.(); onClose?.(); }}>
                <Text style={[
                  styles.buttonText,
                  btn.style === 'cancel' && styles.buttonTextCancel,
                  btn.style === 'destructive' && styles.buttonTextDestructive,
                ]}>
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#071B5A', textAlign: 'center' },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },
  buttons: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  buttonsColumn: { flexDirection: 'column' },
  button: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: { backgroundColor: '#F3F4F6' },
  buttonDestructive: { backgroundColor: '#FEE2E2' },
  buttonPressed: { opacity: 0.8 },
  buttonText: { fontWeight: '800', fontSize: 14, color: '#fff' },
  buttonTextCancel: { color: '#374151' },
  buttonTextDestructive: { color: '#EF4444' },
});
