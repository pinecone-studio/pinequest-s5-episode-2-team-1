import { Muted, Screen, Title } from '@/components/ui';
import { S } from '@/i18n/strings';

// Түр дэлгэц: дараагийн milestone-д бүрэн хийнэ.
export default function Placeholder() {
  return (
    <Screen>
      <Title>{S.tabs.duel}</Title>
      <Muted>{S.common.soon}</Muted>
    </Screen>
  );
}
