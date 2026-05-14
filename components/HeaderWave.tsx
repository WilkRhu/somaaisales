import { StyleSheet, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

export function HeaderWave({
  color,
  height = 44,
  flipped = false,
}: {
  color: string;
  height?: number;
  flipped?: boolean;
}) {
  return (
    <View style={[styles.wrap, { height, marginTop: -1, transform: [{ scaleY: flipped ? -1 : 1 }] }]}>
      <Svg width="100%" height={height} viewBox="0 0 390 44" preserveAspectRatio="none">
        <Path
          d="M0,0 C65,44 130,44 195,22 C260,0 325,0 390,22 L390,0 L0,0 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
});
