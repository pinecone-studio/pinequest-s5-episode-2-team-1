import { PLAN_PRICE, PLAN_TUTOR_DAILY } from '@shared/plan';
import type { Payment, PaymentResponse } from '@shared/types';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { BackButton, Card, ErrorText, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { goBack } from '@/lib/nav';

/** Төлбөр орсон эсэхийг хэдэн мс тутам асуух, хэр удаан хүлээх (нэхэмжлэл ихэвчлэн ~15 мин хүчинтэй). */
const POLL_MS = 4000;
const POLL_FOR_MS = 15 * 60_000;

/** Hosted төлбөрийн хуудас (Wire) руу шилжүүлнэ: вэб дээр тухайн tab-аараа, утсанд browser-оор. */
function openCheckout(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(url);
  else Linking.openURL(url).catch(() => {});
}

/**
 * KUMA Plus худалдан авах: нэхэмжлэл үүсгээд QR, банкны холбоосыг харуулна, эсвэл (Wire) төлбөрийн хуудас руу шилжүүлнэ.
 * Төлбөрийн хуудаснаас `/pay?payment=:id` гэж буцаж ирэхэд шинээр үүсгэхгүй, тэр төлбөрийг шалгана. Төлбөр орохыг хэдэн секунд тутам шалгаж,
 * орвол багц шинэчлэгдэнэ. Багцын дэлгэцийн товч сервер худалдан авалт нээлттэй үед л энд хүргэнэ.
 */
export default function PayScreen() {
  const { me, setMe } = useAuth();
  const { payment: returned } = useLocalSearchParams<{ payment?: string }>();
  const returnedId = Number(returned);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const started = useRef(Date.now());

  const create = useCallback(async () => {
    setError(null);
    setPayment(null);
    started.current = Date.now();
    try {
      const res = await api<PaymentResponse>('/payments', { body: { plan: 'plus' } });
      setPayment(res.payment);
      if (res.payment.checkoutUrl) openCheckout(res.payment.checkoutUrl);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  /** Төлбөрийн хуудаснаас буцаж ирсэн: тэр төлбөрийн төлвийг шууд асууна. */
  const resume = useCallback(async (id: number) => {
    setError(null);
    started.current = Date.now();
    try {
      const res = await api<PaymentResponse>(`/payments/${id}`);
      if (res.me) setMe(res.me);
      setPayment(res.payment);
    } catch (e) {
      setError(errorText(e));
    }
  }, [setMe]);

  const check = useCallback(
    async (manual: boolean) => {
      if (!payment || payment.status !== 'pending') return;
      if (manual) setChecking(true);
      try {
        const res = await api<PaymentResponse>(`/payments/${payment.id}`);
        if (res.me) setMe(res.me);
        setPayment((p) => (p ? { ...p, status: res.payment.status } : p));
        if (manual && res.payment.status === 'pending') setNote(S.pay.notYet);
      } catch (e) {
        if (manual) setNote(errorText(e));
      } finally {
        if (manual) setChecking(false);
      }
    },
    [payment, setMe],
  );

  useEffect(() => {
    if (Number.isInteger(returnedId) && returnedId > 0) resume(returnedId);
    else create();
  }, [create, resume, returnedId]);

  useEffect(() => {
    if (payment?.status !== 'pending') return;
    const timer = setInterval(() => {
      if (Date.now() - started.current > POLL_FOR_MS) clearInterval(timer);
      else check(false);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [payment?.status, check]);

  const paid = payment?.status === 'paid';

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/plans')} />
        <Text accessibilityRole="header" style={[type.h1, { flex: 1 }]}>
          {S.pay.title}
        </Text>
      </View>

      <Card style={styles.card}>
        <Text style={type.h3}>{S.plans.price(PLAN_PRICE.plus)}</Text>

        {paid ? (
          <>
            <Text style={type.h2}>{S.pay.paid}</Text>
            <Text style={type.body}>{S.plans.tutorDaily(PLAN_TUTOR_DAILY.plus)}</Text>
            {(me?.plusBoxes ?? 0) > 0 ? (
              <Button title={S.plusBox.openButton(me?.plusBoxes ?? 0)} variant="lemon" onPress={() => router.replace('/plus-box')} />
            ) : null}
            <Button title={S.pay.done} onPress={() => router.replace('/plans')} />
          </>
        ) : error ? (
          <>
            <ErrorText>{error}</ErrorText>
            <Button title={S.pay.retry} variant="ink" onPress={create} />
          </>
        ) : !payment ? (
          <Text style={type.bodyMuted}>{S.pay.waiting}</Text>
        ) : (
          <>
            {payment.checkoutUrl ? (
              <>
                <Text style={type.body}>{S.pay.redirecting}</Text>
                <Button title={S.pay.openCheckout} onPress={() => openCheckout(payment.checkoutUrl!)} />
              </>
            ) : payment.qrImage || payment.links?.length ? (
              <Text style={type.body}>{S.pay.scan}</Text>
            ) : null}
            {payment.qrImage ? (
              <Image
                accessibilityLabel="QR"
                source={{ uri: `data:image/png;base64,${payment.qrImage}` }}
                style={styles.qr}
              />
            ) : null}
            {payment.links?.length ? (
              <>
                <Text style={type.bodyMuted}>{S.pay.banks}</Text>
                <View style={styles.banks}>
                  {payment.links.map((l) => (
                    <Pressable
                      key={l.name}
                      accessibilityRole="link"
                      onPress={() => Linking.openURL(l.link).catch(() => {})}
                      style={styles.bank}
                    >
                      {l.logo ? <Image source={{ uri: l.logo }} style={styles.logo} /> : null}
                      <Text style={styles.bankName} numberOfLines={1}>
                        {l.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Text style={type.bodyMuted}>{S.pay.waiting}</Text>
            <Button title={S.pay.check} variant="ink" loading={checking} onPress={() => check(true)} />
            {note ? <Text style={[type.bodyMuted, styles.center]}>{note}</Text> : null}
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  card: { gap: 14, backgroundColor: colors.lime },
  qr: { width: 220, height: 220, alignSelf: 'center', borderRadius: radius.md, backgroundColor: colors.white },
  banks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    maxWidth: '48%',
  },
  logo: { width: 22, height: 22, borderRadius: 6 },
  bankName: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, flexShrink: 1 },
  center: { textAlign: 'center' },
});
