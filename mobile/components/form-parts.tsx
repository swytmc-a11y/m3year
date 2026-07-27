import { View, Text, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Card, Chip, FieldError, FieldLabel, Tappable } from "@/components/kit";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

/**
 * Shared building blocks for the listing/franchise forms. Both forms ask for
 * broadly the same shapes of input (a titled group of fields, a row of
 * single-choice chips, a photo grid), so they share these rather than each
 * keeping a private copy that can drift.
 */

/** A titled group of fields, rendered as one card so long forms read as steps. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 3 }}>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 13.5, color: t.text, textAlign: "right" }}>
          {title}
        </Text>
        {description ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 18 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Card style={{ padding: 14, gap: 14 }}>{children}</Card>
    </View>
  );
}

/** Single-choice chip group with a label and validation message. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  wrap = true,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
  wrap?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <FieldLabel>{label}</FieldLabel>
      <View style={{ flexDirection: "row-reverse", flexWrap: wrap ? "wrap" : "nowrap", gap: 8 }}>
        {options.map((opt) => (
          <Chip key={opt.value} label={opt.label} active={value === opt.value} onPress={() => onChange(opt.value)} />
        ))}
      </View>
      <FieldError message={error} />
    </View>
  );
}

/** Yes/no chip pair — the boolean case of ChipGroup. */
export function BooleanChips({
  label,
  value,
  onChange,
  yesLabel = "نعم",
  noLabel = "لا",
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <FieldLabel>{label}</FieldLabel>
      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        <Chip label={yesLabel} active={value} onPress={() => onChange(true)} />
        <Chip label={noLabel} active={!value} onPress={() => onChange(false)} />
      </View>
    </View>
  );
}

const TILE = 82;

/** One add/upload tile — dashed outline, spinner while the upload is in flight. */
export function PhotoAddTile({
  onPress,
  uploading,
  imageUrl,
  accessibilityLabel,
}: {
  onPress: () => void;
  uploading: boolean;
  imageUrl?: string | null;
  accessibilityLabel: string;
}) {
  const { t } = useTheme();
  return (
    <Tappable onPress={uploading ? undefined : onPress} haptic="light" accessibilityLabel={accessibilityLabel}>
      <View
        style={{
          width: TILE,
          height: TILE,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: t.border,
          borderStyle: imageUrl ? "solid" : "dashed",
          backgroundColor: t.surface2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {uploading ? (
          <ActivityIndicator color={t.primary} size="small" />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: TILE, height: TILE }} contentFit="cover" />
        ) : (
          <Text style={{ fontSize: 22, color: t.textMuted, lineHeight: 26 }}>+</Text>
        )}
      </View>
    </Tappable>
  );
}

/** Grid of uploaded photos with per-photo remove, plus the add tile. */
export function PhotoGrid({
  urls,
  onRemove,
  onAdd,
  uploading,
  max,
}: {
  urls: string[];
  onRemove: (url: string) => void;
  onAdd: () => void;
  uploading: boolean;
  max: number;
}) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
      {urls.map((url) => (
        <View key={url} style={{ position: "relative" }}>
          <Image
            source={{ uri: url }}
            style={{ width: TILE, height: TILE, borderRadius: radius.lg }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Tappable onPress={() => onRemove(url)} haptic="medium" accessibilityLabel="حذف الصورة">
            <View
              style={{
                position: "absolute",
                top: -7,
                left: -7,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: t.danger,
                alignItems: "center",
                justifyContent: "center",
                ...t.shadowSm,
              }}
            >
              <Text style={{ color: t.white, fontSize: 13, lineHeight: 15 }}>×</Text>
            </View>
          </Tappable>
        </View>
      ))}
      {urls.length < max ? (
        <PhotoAddTile onPress={onAdd} uploading={uploading} accessibilityLabel="إضافة صورة" />
      ) : null}
    </View>
  );
}
