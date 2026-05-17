import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppModal } from '@/components/AppModal';
import { HeaderWave } from '@/components/HeaderWave';
import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryOrder, DeliveryOrderRating } from '@/types';

export default function DeliveryRatingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [existingRating, setExistingRating] = useState<DeliveryOrderRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState(false);

  const [establishmentRating, setEstablishmentRating] = useState(0);
  const [establishmentComment, setEstablishmentComment] = useState('');
  const [establishmentQuality, setEstablishmentQuality] = useState(0);
  const [establishmentPackaging, setEstablishmentPackaging] = useState(0);
  const [establishmentAccuracy, setEstablishmentAccuracy] = useState(0);

  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState('');
  const [driverPunctuality, setDriverPunctuality] = useState(0);
  const [driverCleanliness, setDriverCleanliness] = useState(0);
  const [driverProfessionalism, setDriverProfessionalism] = useState(0);
  const orderStatus = order?.status?.toUpperCase() ?? '';

  useEffect(() => {
    if (authSession?.accessToken) setDeliveryAuthToken(authSession.accessToken);
  }, [authSession]);

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [orderData, ratingData] = await Promise.all([
        deliveryApi.getOrderById(orderId),
        deliveryApi.getOrderRating(orderId),
      ]);
      setOrder(orderData);
      setExistingRating(ratingData);
      if (ratingData) {
        setEstablishmentRating(ratingData.establishmentRating ?? 0);
        setEstablishmentComment(ratingData.establishmentComment ?? '');
        setEstablishmentQuality(ratingData.establishmentQuality ?? 0);
        setEstablishmentPackaging(ratingData.establishmentPackaging ?? 0);
        setEstablishmentAccuracy(ratingData.establishmentAccuracy ?? 0);
        setDriverRating(ratingData.driverRating ?? 0);
        setDriverComment(ratingData.driverComment ?? '');
        setDriverPunctuality(ratingData.driverPunctuality ?? 0);
        setDriverCleanliness(ratingData.driverCleanliness ?? 0);
        setDriverProfessionalism(ratingData.driverProfessionalism ?? 0);
      }
    } catch {
      setErrorModal('Não foi possível carregar os dados da avaliação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orderId]);

  const canSubmit = useMemo(() => {
    return (establishmentRating > 0 || driverRating > 0) && orderStatus === 'DELIVERED' && !existingRating;
  }, [establishmentRating, driverRating, orderStatus, existingRating]);

  const handleSubmit = async () => {
    if (!orderId) return;
    if (orderStatus !== 'DELIVERED') {
      setErrorModal('Essa avaliação só pode ser enviada quando o pedido estiver entregue.');
      return;
    }
    if (!canSubmit) {
      Alert.alert('Avaliação', 'Escolha ao menos uma nota para enviar.');
      return;
    }
    setSaving(true);
    try {
      await deliveryApi.createOrderRating(orderId, {
        establishmentRating: establishmentRating > 0 ? establishmentRating : undefined,
        establishmentComment: establishmentComment.trim() || undefined,
        establishmentQuality: establishmentQuality > 0 ? establishmentQuality : undefined,
        establishmentPackaging: establishmentPackaging > 0 ? establishmentPackaging : undefined,
        establishmentAccuracy: establishmentAccuracy > 0 ? establishmentAccuracy : undefined,
        driverRating: driverRating > 0 ? driverRating : undefined,
        driverComment: driverComment.trim() || undefined,
        driverPunctuality: driverPunctuality > 0 ? driverPunctuality : undefined,
        driverCleanliness: driverCleanliness > 0 ? driverCleanliness : undefined,
        driverProfessionalism: driverProfessionalism > 0 ? driverProfessionalism : undefined,
      });
      setSuccessModal(true);
    } catch (error) {
      const raw = (error as any)?.response?.data?.message ?? (error as any)?.response?.data?.error;
      const message = Array.isArray(raw) ? raw.join('\n') : (raw ?? 'Não foi possível enviar sua avaliação.');
      setErrorModal(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Avaliar pedido</Text>
          <Text style={styles.headerSub}>{order?.orderNumber ?? 'Pedido entregue'}</Text>
        </View>
      </View>
      <HeaderWave color={primary} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={styles.loadingText}>Carregando avaliação...</Text>
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Pedido não encontrado</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="star-outline" size={22} color={primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Sua opinião ajuda muito</Text>
              <Text style={styles.infoText}>
                Você pode avaliar só o estabelecimento, só o entregador, ou os dois.
              </Text>
              {orderStatus && orderStatus !== 'DELIVERED' ? (
                <Text style={[styles.infoText, { color: '#B45309', fontWeight: '700', marginTop: 4 }]}>
                  O pedido ainda está {orderStatus}. A avaliação só libera depois da entrega.
                </Text>
              ) : null}
            </View>
          </View>

          {existingRating ? (
            <View style={[styles.warnCard, { borderColor: '#D1FAE5', backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.warnText}>Este pedido já foi avaliado.</Text>
            </View>
          ) : null}

          <RatingBlock
            title="Estabelecimento"
            subtitle="Qualidade, embalagem e precisão do pedido"
            primary={primary}
            rating={establishmentRating}
            onRatingChange={setEstablishmentRating}
            quality={establishmentQuality}
            onQualityChange={setEstablishmentQuality}
            packaging={establishmentPackaging}
            onPackagingChange={setEstablishmentPackaging}
            accuracy={establishmentAccuracy}
            onAccuracyChange={setEstablishmentAccuracy}
            comment={establishmentComment}
            onCommentChange={setEstablishmentComment}
          />

          <RatingBlock
            title="Entregador"
            subtitle="Pontualidade, limpeza e profissionalismo"
            primary={primary}
            rating={driverRating}
            onRatingChange={setDriverRating}
            quality={driverPunctuality}
            onQualityChange={setDriverPunctuality}
            packaging={driverCleanliness}
            onPackagingChange={setDriverCleanliness}
            accuracy={driverProfessionalism}
            onAccuracyChange={setDriverProfessionalism}
            comment={driverComment}
            onCommentChange={setDriverComment}
            qualityLabel="Pontualidade"
            packagingLabel="Limpeza"
            accuracyLabel="Profissionalismo"
          />

          <Pressable
            style={[styles.submitBtn, { backgroundColor: primary }, (!canSubmit || saving || !!existingRating) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || saving || !!existingRating}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.submitText}>Enviar avaliação</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      <AppModal
        visible={!!errorModal}
        title="Avaliação"
        message={errorModal ?? ''}
        icon="alert-circle-outline"
        iconColor="#EF4444"
        buttons={[
          { text: 'OK', onPress: () => setErrorModal(null) },
        ]}
        onClose={() => setErrorModal(null)}
      />

      <AppModal
        visible={successModal}
        title="Avaliação enviada"
        message="Obrigado pelo feedback. Sua avaliação foi registrada com sucesso."
        icon="checkmark-circle-outline"
        iconColor="#10B981"
        buttons={[
          { text: 'Voltar', onPress: () => router.back() },
        ]}
        onClose={() => router.back()}
      />
    </View>
  );
}

function RatingBlock({
  title,
  subtitle,
  primary,
  rating,
  onRatingChange,
  quality,
  onQualityChange,
  packaging,
  onPackagingChange,
  accuracy,
  onAccuracyChange,
  comment,
  onCommentChange,
  qualityLabel = 'Qualidade',
  packagingLabel = 'Embalagem',
  accuracyLabel = 'Precisão',
}: {
  title: string;
  subtitle: string;
  primary: string;
  rating: number;
  onRatingChange: (value: number) => void;
  quality: number;
  onQualityChange: (value: number) => void;
  packaging: number;
  onPackagingChange: (value: number) => void;
  accuracy: number;
  onAccuracyChange: (value: number) => void;
  comment: string;
  onCommentChange: (value: string) => void;
  qualityLabel?: string;
  packagingLabel?: string;
  accuracyLabel?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.badge, { borderColor: `${primary}22`, backgroundColor: `${primary}10` }]}>
          <Text style={[styles.badgeText, { color: primary }]}>{rating > 0 ? `${rating}/5` : 'Opcional'}</Text>
        </View>
      </View>

      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => onRatingChange(value)} hitSlop={8}>
            <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={28} color={value <= rating ? '#F59E0B' : '#D1D5DB'} />
          </Pressable>
        ))}
      </View>

      <MiniMetric label={qualityLabel} value={quality} onChange={onQualityChange} primary={primary} />
      <MiniMetric label={packagingLabel} value={packaging} onChange={onPackagingChange} primary={primary} />
      <MiniMetric label={accuracyLabel} value={accuracy} onChange={onAccuracyChange} primary={primary} />

      <Text style={styles.inputLabel}>Comentário</Text>
      <TextInput
        value={comment}
        onChangeText={onCommentChange}
        placeholder="Escreva sua observação..."
        placeholderTextColor="#9CA3AF"
        multiline
        maxLength={500}
        style={styles.textArea}
      />
    </View>
  );
}

function MiniMetric({
  label,
  value,
  onChange,
  primary,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  primary: string;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricStars}>
        {[1, 2, 3, 4, 5].map((step) => (
          <Pressable key={step} onPress={() => onChange(step)} hitSlop={6}>
            <Ionicons name={step <= value ? 'star' : 'star-outline'} size={18} color={step <= value ? primary : '#D1D5DB'} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 64, paddingBottom: 26, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: '500' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { color: '#6B7280', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  infoText: { fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 18 },
  warnCard: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnText: { color: '#065F46', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 17 },
  badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  starRow: { flexDirection: 'row', gap: 6 },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  metricLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  metricStars: { flexDirection: 'row', gap: 4 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
  },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 4 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  btnDisabled: { opacity: 0.55 },
});
