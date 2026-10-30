import { StyleSheet } from 'react-native';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';
import { wood } from './wood';

/** Ногоон модон самбар (pixel хүрээ, бараан хүрээний дотор нэг pixel-ийн хүрэн ногоон зах) дээрх pixel гарчиг. */
export function WoodSign({ text, size }: { text: string; size: 'lg' | 'sm' }) {
  const lg = size === 'lg';
  return (
    <PixelBox fill={wood.signRim} edge={wood.edge} border={2} radius={lg ? 8 : 6} style={[styles.outer, { minWidth: lg ? 230 : 160 }]}>
      <PixelBox fill={wood.sign} edge={wood.sign} border={0} radius={lg ? 5 : 3} style={[styles.inner, { paddingVertical: lg ? 9 : 6 }]}>
        <PixelText text={text} px={lg ? 4 : 3} color={wood.signInk} shadow={wood.edge} />
      </PixelBox>
    </PixelBox>
  );
}

const styles = StyleSheet.create({
  outer: { padding: 9 },
  inner: { paddingHorizontal: 21, alignItems: 'center' },
});
