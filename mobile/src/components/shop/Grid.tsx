import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const chunk = <T,>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** `cols` баганат мөрүүд; сүүлийн мөрийн хоосон нүд нь картуудыг ижил өргөнтэй байлгана. */
export function Grid<T>({ items, render, cols = 3, gap = 10 }: { items: T[]; render: (item: T) => ReactNode; cols?: number; gap?: number }) {
  return (
    <View style={styles.grid}>
      {chunk(items, cols).map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {row.map(render)}
          {Array.from({ length: cols - row.length }, (_, i) => (
            <View key={`e${i}`} style={styles.empty} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 18 },
  row: { flexDirection: 'row' },
  empty: { flex: 1 },
});
