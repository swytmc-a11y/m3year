import { useState } from "react";
import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Field, Chip } from "@/components/ui";
import { listingFormSchema, type ListingFormValues } from "@/lib/validations";
import { SECTOR_OPTIONS, type Listing, type BusinessSector } from "@/lib/constants";
import { uploadListingPhoto, deleteListingPhoto } from "@/lib/storage";
import { uuidv4 } from "@/lib/uuid";
import { colors, fonts, radius } from "@/theme";

type Intent = "draft" | "submit";
const MAX_PHOTOS = 6;

export function ListingForm({
  listing,
  onSubmit,
}: {
  listing?: Listing;
  onSubmit: (
    values: ListingFormValues,
    intent: Intent,
    extra: { listingId: string; photoUrls: string[] },
  ) => Promise<void>;
}) {
  const [listingId] = useState(() => listing?.id ?? uuidv4());
  const [title, setTitle] = useState(listing?.title ?? "");
  const [sector, setSector] = useState<BusinessSector>(
    listing?.sector ?? "cafe",
  );
  const [city, setCity] = useState(listing?.city ?? "");
  const [revenue, setRevenue] = useState(
    listing ? String(listing.monthly_revenue) : "",
  );
  const [percentage, setPercentage] = useState(
    listing ? String(listing.offered_percentage) : "",
  );
  const [description, setDescription] = useState(listing?.description ?? "");
  const [photoUrls, setPhotoUrls] = useState<string[]>(listing?.photo_urls ?? []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState<Intent | null>(null);

  async function pickPhoto() {
    setPhotoError(undefined);
    if (photoUrls.length >= MAX_PHOTOS) {
      setPhotoError(`يمكن إضافة ${MAX_PHOTOS} صور كحد أقصى.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("امنح إذن الوصول للصور لإضافتها.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    const { url, error } = await uploadListingPhoto(listingId, result.assets[0].uri);
    setUploadingPhoto(false);
    if (error || !url) {
      setPhotoError(error ?? "تعذّر رفع الصورة الآن.");
      return;
    }
    setPhotoUrls((prev) => [...prev, url]);
  }

  async function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
    await deleteListingPhoto(url);
  }

  async function handle(intent: Intent) {
    setFormError(undefined);
    const parsed = listingFormSchema.safeParse({
      title,
      sector,
      city,
      monthly_revenue: revenue,
      offered_percentage: percentage,
      description,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setPending(intent);
    try {
      await onSubmit(parsed.data, intent, { listingId, photoUrls });
    } catch {
      setFormError("تعذّر حفظ الإعلان الآن. حاول مرة أخرى.");
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={{ gap: 20 }}>
      <Field
        label="عنوان المشروع"
        value={title}
        onChangeText={setTitle}
        placeholder="مثال: كوفي شوب — حي الروضة، جدة"
        maxLength={140}
        error={errors.title}
        textAlign="right"
      />

      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 14,
            color: colors.ink,
            textAlign: "right",
          }}
        >
          القطاع
        </Text>
        <View
          style={{
            flexDirection: "row-reverse",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {SECTOR_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={sector === opt.value}
              onPress={() => setSector(opt.value)}
            />
          ))}
        </View>
      </View>

      <Field
        label="المدينة"
        value={city}
        onChangeText={setCity}
        placeholder="مثال: جدة"
        maxLength={60}
        error={errors.city}
        textAlign="right"
      />

      <Field
        label="الإيراد الشهري (ر.س)"
        value={revenue}
        onChangeText={setRevenue}
        placeholder="48200"
        keyboardType="number-pad"
        error={errors.monthly_revenue}
        style={{ fontFamily: fonts.mono, textAlign: "left" }}
      />

      <Field
        label="النسبة المطروحة (٪)"
        value={percentage}
        onChangeText={setPercentage}
        placeholder="25"
        keyboardType="numbers-and-punctuation"
        error={errors.offered_percentage}
        style={{ fontFamily: fonts.mono, textAlign: "left" }}
      />

      <Field
        label="وصف المشروع (اختياري)"
        value={description}
        onChangeText={setDescription}
        placeholder="نبذة عن المشروع وسبب البحث عن شريك."
        maxLength={5000}
        multiline
        numberOfLines={5}
        error={errors.description}
        textAlign="right"
        style={{ height: 120, paddingTop: 12, textAlignVertical: "top" }}
      />

      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 14,
            color: colors.ink,
            textAlign: "right",
          }}
        >
          صور المشروع (اختياري، حتى {MAX_PHOTOS})
        </Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
          {photoUrls.map((url) => (
            <View key={url} style={{ position: "relative" }}>
              <Image
                source={{ uri: url }}
                style={{ width: 84, height: 84, borderRadius: radius.md }}
              />
              <Pressable
                onPress={() => removePhoto(url)}
                style={{
                  position: "absolute",
                  top: -6,
                  left: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: colors.danger,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.white, fontSize: 13, lineHeight: 14 }}>×</Text>
              </Pressable>
            </View>
          ))}
          {photoUrls.length < MAX_PHOTOS ? (
            <Pressable
              onPress={pickPhoto}
              disabled={uploadingPhoto}
              style={{
                width: 84,
                height: 84,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: colors.grid,
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <Text style={{ fontSize: 24, color: colors.mutedText }}>+</Text>
              )}
            </Pressable>
          ) : null}
        </View>
        {photoError ? (
          <Text
            style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}
          >
            {photoError}
          </Text>
        ) : null}
      </View>

      {formError ? (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: colors.amber,
            textAlign: "right",
          }}
        >
          {formError}
        </Text>
      ) : null}

      <View style={{ gap: 12 }}>
        <Button
          label="إرسال للمراجعة"
          fullWidth
          loading={pending === "submit"}
          disabled={pending !== null}
          onPress={() => handle("submit")}
        />
        <Button
          label="حفظ كمسودة"
          variant="ghost"
          fullWidth
          loading={pending === "draft"}
          disabled={pending !== null}
          onPress={() => handle("draft")}
        />
      </View>

      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          color: colors.mutedText,
          textAlign: "right",
          lineHeight: 20,
        }}
      >
        الإعلانات لا تُنشر مباشرة — يراجعها فريق معيار أولًا، ثم تظهر للعامة بعد
        الموافقة.
      </Text>
    </View>
  );
}
