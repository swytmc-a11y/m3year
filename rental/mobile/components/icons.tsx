import type { ColorValue } from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { colors } from "@/theme";

/**
 * Icon set — a small, consistent line-icon set in the brand's
 * "precision instrument" direction: 1.9px strokes, rounded joins, a soft
 * ink fill when active. All icons share the same 24×24 grid and optical
 * weight so the tab bar reads as one coherent set.
 */
type IconProps = {
  focused: boolean;
  color: ColorValue;
  size?: number;
  /** Soft fill behind the glyph when active. Caller supplies it so the icon
   *  set follows the live theme instead of hard-coding a brand colour. */
  activeFill?: string;
};

const STROKE = 1.9;

export function HomeIcon({ focused, color, size = 24, activeFill = "none" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={focused ? activeFill : "none"}
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

export function ChatIcon({ focused, color, size = 24, activeFill = "none" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9.8l-4.1 3.3A.6.6 0 0 1 4.7 19v-2.7A2.5 2.5 0 0 1 4 14.5v-8Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={focused ? activeFill : "none"}
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

export function ProfileIcon({ focused, color, size = 24, activeFill = "none" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={8.5}
        r={3.5}
        stroke={color}
        strokeWidth={STROKE}
        fill={focused ? activeFill : "none"}
      />
      <Path
        d="M5.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? activeFill : "none"}
      />
    </Svg>
  );
}

/** A compact "＋" glyph. */
export function PlusIcon({ color = colors.white, size = 20 }: { color?: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
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

/**
 * The tab-bar search glyph. Deliberately separate from `SearchIcon`, which is
 * the small 15px mark that sits inside the search field: this one belongs to
 * the tab set and has to share its 24-grid, 1.9px stroke and active fill or
 * it reads as a foreign icon next to the other four.
 */
export function SearchTabIcon({ focused, color, size = 24, activeFill = "none" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={STROKE} fill={focused ? activeFill : "none"} />
      <Path
        d="M20 20l-4.4-4.4"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
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

export function CloseIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
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

export function StarIcon({
  color,
  size = 10,
  filled = true,
}: {
  color: ColorValue;
  size?: number;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.7 6.2 20.8l1.1-6.4-4.7-4.6 6.5-.9Z"
        fill={filled ? color : "none"}
        stroke={filled ? "none" : color}
        strokeWidth={filled ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SendIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 4 3 11l6 2.5M20 4l-7 16-3-6.5M20 4 9 13.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ImagePickIcon({ color, size = 18 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={4.5} width={17} height={15} rx={2.4} stroke={color} strokeWidth={1.8} />
      <Circle cx={8.8} cy={9.6} r={1.5} stroke={color} strokeWidth={1.6} />
      <Path
        d="M4.5 16.8l4.4-4.4a1.4 1.4 0 0 1 2 0l2.2 2.2M13.6 14.9l1.6-1.6a1.4 1.4 0 0 1 2 0l2.3 2.3"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FileClipIcon({ color, size = 18 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.6 6.4v9.9a3.4 3.4 0 0 1-6.8 0V5.7a2.1 2.1 0 1 1 4.2 0v9.5a.9.9 0 0 1-1.8 0V7.1"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Sliders glyph for the compact "filters" affordance. */
export function FilterIcon({ color, size = 17 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={9} cy={7} r={2.4} fill={color} />
      <Circle cx={15} cy={12} r={2.4} fill={color} />
      <Circle cx={8} cy={17} r={2.4} fill={color} />
    </Svg>
  );
}

/** Growth glyph. */
export function OpportunityIcon({ color, size = 20 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19V10M9.3 19V5.5M14.7 19v-7M20 19V8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Storefront glyph — the branches tab and anything branch-related. */
export function StorefrontIcon({ color, size = 20 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10v9.2h16V10M3 5.5h18l-1 3.2a3 3 0 0 1-2.9 2.2 3 3 0 0 1-2.9-2.2 3 3 0 0 1-2.9 2.2 3 3 0 0 1-2.9-2.2A3 3 0 0 1 5.4 11 3 3 0 0 1 4 8.7Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path d="M10 19.2v-4.4h4v4.4" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

export function SettingsIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.1} stroke={color} strokeWidth={1.7} />
      <Path
        d="M19.4 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HelpIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
      <Path
        d="M9.4 9.3a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.7-2.6 2.7"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path d="M12 17h.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function InfoIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
      <Path d="M12 11v5.2" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M12 7.8h.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function DocumentIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3.5h7.5L18.5 8.5v12H6Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M13.2 3.6v5.2h5.1M9 13h6M9 16.4h4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function ShieldIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2 5 6v5.6c0 4.2 2.9 7.5 7 9.2 4.1-1.7 7-5 7-9.2V6Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalculatorIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={3} width={14} height={18} rx={2.4} stroke={color} strokeWidth={1.7} />
      <Rect x={8} y={6.2} width={8} height={3.2} rx={1} stroke={color} strokeWidth={1.5} />
      <Path
        d="M8.6 13h.01M12 13h.01M15.4 13h.01M8.6 16.6h.01M12 16.6h.01M15.4 16.6h.01"
        stroke={color}
        strokeWidth={2.1}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LogoutIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 4.5h-8a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h8"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M17.5 15.5 21 12l-3.5-3.5M20.5 12H11" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function EditIcon({ color, size = 14 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.4 4.6a2.1 2.1 0 0 1 3 3L9.2 17.8l-4 1 1-4Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ListIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={5} height={5} rx={1.4} stroke={color} strokeWidth={1.7} />
      <Rect x={3.5} y={14} width={5} height={5} rx={1.4} stroke={color} strokeWidth={1.7} />
      <Path d="M11.5 7.5h9M11.5 16.5h9" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function CompareIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5v17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path
        d="M8.5 8 5 14.5h7L8.5 8ZM15.5 6 12 12.5h7L15.5 6Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BlockIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.7} />
      <Path d="m6.2 6.2 11.6 11.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function FlagIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.5v17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path
        d="M6 4.5c2.2-1.3 4.4-1.3 6.5 0 2.1 1.3 4.3 1.3 6.5 0v8c-2.2 1.3-4.4 1.3-6.5 0-2.1-1.3-4.3-1.3-6.5 0v-8Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Car silhouette. Stands in for a photo the operator has not uploaded yet. */
export function CarIcon({ color, size = 24 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 14.5v3.2a.8.8 0 0 0 .8.8h1.6a.8.8 0 0 0 .8-.8v-1.2h10.6v1.2a.8.8 0 0 0 .8.8h1.6a.8.8 0 0 0 .8-.8v-3.2"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 14.5 5 9.6a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9.6l1.5 4.9H3.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Circle cx={7.3} cy={12.4} r={0.9} fill={color} />
      <Circle cx={16.7} cy={12.4} r={0.9} fill={color} />
    </Svg>
  );
}

// ---- Spec icons ----
// Small, single-weight glyphs for the spec row on a car card. Deliberately
// simpler than the navigation icons above: at 13px a detailed drawing turns
// into a smudge, so each of these reads from two or three strokes.

/** Gear lever in its gate — automatic vs manual transmission. */
export function TransmissionIcon({ color, size = 14 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4.5v15M18 4.5v15M6 12h12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={6} cy={4.5} r={1.6} fill={color} />
      <Circle cx={18} cy={4.5} r={1.6} fill={color} />
      <Circle cx={6} cy={19.5} r={1.6} fill={color} />
    </Svg>
  );
}

/** Head and shoulders — seat count. */
export function SeatsIcon({ color, size = 14 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4.8 19.5a7.2 7.2 0 0 1 14.4 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Fuel pump. */
export function FuelIcon({ color, size = 14 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 20.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14.5M3.8 20.5h10.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M6.8 9.5h4.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M13 8.5h2.6a1.4 1.4 0 0 1 1.4 1.4v5.7a1.6 1.6 0 0 0 3.2 0V11l-2-2.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Speedometer — the daily kilometre allowance. */
export function GaugeIcon({ color, size = 14 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 17a9 9 0 1 1 16 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M12 16.5 15.5 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={1.4} fill={color} />
    </Svg>
  );
}

/** Map pin — the pickup branch. */
export function PinIcon({ color, size = 14 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.6} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

/** Calendar — the date fields in the search widget. */
export function CalendarIcon({ color, size = 14 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5.5} width={17} height={15} rx={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M3.5 10.5h17M8.5 3.5v4M15.5 3.5v4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Arrow pointing along the reading direction (leftwards in RTL). */
export function ArrowLeftIcon({ color, size = 16 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5m0 0 6-6m-6 6 6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
