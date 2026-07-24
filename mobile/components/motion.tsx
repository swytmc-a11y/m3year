import { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";

/**
 * Fades + lifts its children into view on mount. Used for smooth screen and
 * list-item entrances. `delay` staggers multiple items; `distance` controls
 * how far it travels up.
 */
export function FadeInView({
  children,
  delay = 0,
  distance = 12,
  duration = 420,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
