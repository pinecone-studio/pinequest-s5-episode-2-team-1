import type { FriendsResponse } from '@shared/types';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { FriendRow } from '@/components/FriendRow';
import { Enter } from '@/components/pixel';
import { Card } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';

const open = (code: string) => router.push(`/u/${code}`);

/** Ирсэн хүсэлтүүд (Зөвшөөрөх / Татгалзах). Хүсэлтгүй бол юу ч харуулахгүй. */
export function FriendRequests({ friends, busy, onAccept, onRemove }: Props) {
  const incoming = friends?.incoming ?? [];
  if (incoming.length === 0) return null;
  return (
    <Enter index={2}>
      <Card style={styles.requests}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {S.friends.requests(incoming.length)}
        </Text>
        {incoming.map((f) => (
          <View key={f.code} style={styles.request}>
            <FriendRow friend={f} onPress={() => open(f.code)} />
            <View style={styles.actions}>
              <Button title={S.friends.accept} small loading={busy === `accept-${f.code}`} onPress={() => onAccept(f.code)} style={{ flex: 1 }} />
              <Button
                title={S.friends.decline}
                variant="white"
                small
                disabled={busy !== null}
                accessibilityLabel={`${S.friends.decline}: ${f.name ?? f.username}`}
                onPress={() => onRemove(f.code)}
              />
            </View>
          </View>
        ))}
      </Card>
    </Enter>
  );
}

interface Props {
  friends: FriendsResponse | null;
  busy: string | null;
  onAccept: (code: string) => void;
  onRemove: (code: string) => void;
}

const styles = StyleSheet.create({
  requests: { backgroundColor: colors.lavender },
  request: { gap: 10 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  actions: { flexDirection: 'row', gap: 10 },
});
