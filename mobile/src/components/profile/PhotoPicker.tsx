import type { MeResponse, PhotoBody } from '@shared/types';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ErrorText } from '@/components/ui';
import { P } from '@/i18n/profile';

// API-ийн хязгаар (routes/photos.ts) 1.5MB; base64 нь 4/3 дахин урт
const MAX_B64 = 2_000_000;

/** Аватарын доорх товчнууд: утаснаас зураг сонгож (дөрвөлжин тайрна) шууд хадгална, эсвэл баавгай руу буцна. */
export function PhotoPicker({ photo }: { photo?: string }) {
  const { setMe } = useAuth();
  const [busy, setBusy] = useState<'add' | 'remove' | null>(null);
  const [error, setError] = useState('');

  async function run(kind: 'add' | 'remove', fn: () => Promise<MeResponse | null>) {
    setBusy(kind);
    setError('');
    try {
      const res = await fn();
      if (res) setMe(res.me);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const add = () =>
    run('add', async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      const asset = picked.canceled ? null : picked.assets[0];
      // вэб дээр base64 ирэхгүй байж болно: uri нь data URI (API угтварыг нь хасна)
      const data = asset?.base64 ?? asset?.uri;
      if (!data) return null;
      if (data.length > MAX_B64) {
        setError(P.photoTooBig);
        return null;
      }
      return api<MeResponse>('/photos', { method: 'PUT', body: { data } satisfies PhotoBody });
    });
  const remove = () => run('remove', () => api<MeResponse>('/photos', { method: 'DELETE' }));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Button title={photo ? P.photoChange : P.photoAdd} variant="white" small loading={busy === 'add'} disabled={busy !== null} onPress={add} />
        {photo ? <Button title={P.photoRemove} variant="ghost" small loading={busy === 'remove'} disabled={busy !== null} onPress={remove} /> : null}
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
});
