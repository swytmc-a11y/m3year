import type { ColorValue } from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { colors } from "@/theme";

/**
 * Miyar tab icons — a small, consistent line-icon set in the brand's
 * "precision instrument" direction: 1.9px strokes, rounded joins, a soft
 * ink fill when active. All icons share the same 24×24 grid and optical
 * weight so the tab bar reads as one coherent set.
 */
type IconProps = {
  focused: boolean;
  color: ColorValue;
  size?: number;
};

const STROKE = 1.9;
const ACTIVE_FILL = "rgba(15,107,102,0.12)"; // brand teal @ 12%

export function HomeIcon({ focused, color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={focused ? ACTIVE_FILL : "none"}
      />
      <Path
        d="M9.5 20.5v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChatIcon({ focused, color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9.8l-4.1 3.3A.6.6 0 0 1 4.7 19v-2.7A2.5 2.5 0 0 1 4 14.5v-8Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={focused ? ACTIVE_FILL : "none"}
      />
      <Path
        d="M8.5 9.5h7M8.5 12.5h4"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ProfileIcon({ focused, color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={8.5}
        r={3.5}
        stroke={color}
        strokeWidth={STROKE}
        fill={focused ? ACTIVE_FILL : "none"}
      />
      <Path
        d="M5.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? ACTIVE_FILL : "none"}
      />
    </Svg>
  );
}

/** A compact "＋" glyph used by the create-listing action button. */
export function PlusIcon({ color = colors.white, size = 20 }: { color?: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Small filled dot indicator, used as the active-tab marker. */
export function ActiveDot({ size = 4 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 4 4">
      <Rect width={4} height={4} rx={2} fill={colors.verify} />
    </Svg>
  );
}

// ---- New-identity general purpose icons (color/size supplied by caller) ----

export function BellIcon({ color, size = 18 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18.5 16.5v-5a6.5 6.5 0 1 0-13 0v5l-1.7 2h16.4Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 21h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function SearchIcon({ color, size = 15 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="M21 21l-4.3-4.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronBackIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 6l-6.5 6 6.5 6" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HeartIcon({ color, size = 16, filled = false }: { color: ColorValue; size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20.3s-6.6-4.2-8.7-8.3C1.4 8.2 3.3 5.2 6.2 5.2c1.9 0 3.3 1.1 4.3 2.5 1-1.4 2.4-2.5 4.3-2.5 2.9 0 4.8 3 3 6.8-2.2 4.1-8.8 8.3-8.8 8.3Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StarIcon({ color, size = 10 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.7 6.2 20.8l1.1-6.4-4.7-4.6 6.5-.9Z" fill={color} />
    </Svg>
  );
}
