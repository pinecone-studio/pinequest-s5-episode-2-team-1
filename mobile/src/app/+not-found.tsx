import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';

export default function NotFound() {
  return (
    <View style={styles.center}>
      <Sprite id="bear_neglected_scarf_164x280" label="Төөрсөн баавгай" />
      <Text style={type.h2}>{S.notFound}</Text>
      <Button title={S.goHome} onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.paper },
});
