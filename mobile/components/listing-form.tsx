import { useState } from "react";
import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Field, Chip } from "@/components/ui";
import { listingFormSchema, type ListingFormValues } from "@/lib/validations";
import {
  SECTOR_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  REASON_FOR_SELLING_OPTIONS,
  FINANCIAL_DATA_SHARING_OPTIONS,
  type Listing,
  type ListingConfidential,
  type BusinessSector,
  type EntityType,
  type ReasonForSelling,
  type FinancialDataSharing,
} from "@/lib/constants";
import { uploadListingPhoto, deleteListingPhoto } from "@/lib/storage";
import { uuidv4 } from "@/lib/uuid";
import { colors, fonts, radius } from "@/theme";

type Intent = "draft" | "submit";
const MAX_PHOTOS = 6;

function ToggleRow({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 10,
        paddingVertical: 4,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          borderWidth: 1.5,
          borderColor: checked ? colors.ink : colors.grid,
          backgroundColor: checked ? colors.ink : colors.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? (
          <Text style={{ color: colors.white, fontSize: 12, lineHeight: 12 }}>✓</Text>
        ) : null}
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.ink,
          textAlign: "right",
          lineHeight: 20,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.bodyMedium,
        fontSize: 14,
        color: colors.ink,
        textAlign: "right",
      }}
    >
      {children}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text
      style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}
    >
      {message}
    </Text>
  );
}

export function ListingForm({
  listing,
  confidential,
  onSubmit,
}: {
  listing?: Listing;
  confidential?: ListingConfidential;
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
  const [askingPrice, setAskingPrice] = useState(
    listing?.asking_price != null ? String(listing.asking_price) : "",
  );
  const [priceNegotiable, setPriceNegotiable] = useState(
    listing?.price_negotiable ?? true,
  );
  const [monthlyProfit, setMonthlyProfit] = useState(
    listing?.monthly_profit != null ? String(listing.monthly_profit) : "",
  );
  const [showProfit, setShowProfit] = useState(listing?.show_profit ?? false);
  const [foundingYear, setFoundingYear] = useState(
    listing?.founding_year != null ? String(listing.founding_year) : "",
  );
  const [employeeCount, setEmployeeCount] = useState(
    listing?.employee_count != null ? String(listing.employee_count) : "",
  );
  const [description, setDescription] = useState(listing?.description ?? "");
  const [photoUrls, setPhotoUrls] = useState<string[]>(listing?.photo_urls ?? []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const [hasLegalObligations, setHasLegalObligations] = useState(
    listing?.has_legal_obligations ?? false,
  );
  const [reasonForSelling, setReasonForSelling] = useState<
    ReasonForSelling | undefined
  >((listing?.reason_for_selling as ReasonForSelling | null) ?? undefined);
  const [financialDataSharing, setFinancialDataSharing] =
    useState<FinancialDataSharing>(
      (listing?.financial_data_sharing as FinancialDataSharing) ?? "on_request",
    );
  const [entityType, setEntityType] = useState<EntityType | undefined>(
    (confidential?.entity_type as EntityType | undefined) ?? undefined,
  );
  const [crNumber, setCrNumber] = useState(
    confidential?.commercial_registration_number ?? "",
  );
  // Editing an existing listing that already has photos means this gate was
  // already satisfied at least once for those same photos — only demand a
  // fresh confirmation when new photos are added (see removePhoto/pickPhoto).
  const [confirmNoBranding, setConfirmNoBranding] = useState(
    () => (listing?.photo_urls.length ?? 0) > 0,
  );

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
    setConfirmNoBranding(false);
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
      asking_price: askingPrice,
      price_negotiable: priceNegotiable,
      monthly_profit: monthlyProfit,
      show_profit: showProfit,
      founding_year: foundingYear,
      employee_count: employeeCount,
      description,
      has_legal_obligations: hasLegalObligations,
      reason_for_selling: reasonForSelling,
      financial_data_sharing: financialDataSharing,
      entity_type: entityType,
      commercial_registration_number: crNumber,
      confirm_no_branding: confirmNoBranding,
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

      <View style={{ gap: 8 }}>
        <Field
          label="سعر البيع أو المبلغ المطلوب (ر.س، اختياري)"
          value={askingPrice}
          onChangeText={setAskingPrice}
          placeholder="500000"
          keyboardType="number-pad"
          error={errors.asking_price}
          style={{ fontFamily: fonts.mono, textAlign: "left" }}
        />
        <ToggleRow
          checked={priceNegotiable}
          label="السعر قابل للتفاوض"
          onPress={() => setPriceNegotiable((prev) => !prev)}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Field
          label="صافي الربح الشهري (ر.س، اختياري)"
          value={monthlyProfit}
          onChangeText={setMonthlyProfit}
          placeholder="15000"
          keyboardType="number-pad"
          error={errors.monthly_profit}
          style={{ fontFamily: fonts.mono, textAlign: "left" }}
        />
        <ToggleRow
          checked={showProfit}
          label="إظهار الرقم مباشرة للزوار (بدل «متاح عند التواصل»)"
          onPress={() => setShowProfit((prev) => !prev)}
        />
      </View>

      <View style={{ flexDirection: "row-reverse", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="سنة التأسيس (اختياري)"
            value={foundingYear}
            onChangeText={setFoundingYear}
            placeholder="2019"
            keyboardType="number-pad"
            error={errors.founding_year}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="عدد الموظفين (اختياري)"
            value={employeeCount}
            onChangeText={setEmployeeCount}
            placeholder="6"
            keyboardType="number-pad"
            error={errors.employee_count}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
      </View>

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
        <FieldLabel>نوع الكيان</FieldLabel>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={entityType === opt.value}
              onPress={() => setEntityType(opt.value)}
            />
          ))}
        </View>
        <FieldError message={errors.entity_type} />
      </View>

      <Field
        label="رقم السجل التجاري (سرّي — لا يظهر للعامة)"
        value={crNumber}
        onChangeText={setCrNumber}
        placeholder="1010xxxxxx"
        keyboardType="number-pad"
        error={errors.commercial_registration_number}
        style={{ fontFamily: fonts.mono, textAlign: "left" }}
      />

      <View style={{ gap: 8 }}>
        <FieldLabel>هل يوجد التزامات قانونية على المشروع؟</FieldLabel>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
          <Chip
            label="نعم"
            active={hasLegalObligations}
            onPress={() => setHasLegalObligations(true)}
          />
          <Chip
            label="لا"
            active={!hasLegalObligations}
            onPress={() => setHasLegalObligations(false)}
          />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <FieldLabel>سبب البيع</FieldLabel>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
          {REASON_FOR_SELLING_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={reasonForSelling === opt.value}
              onPress={() => setReasonForSelling(opt.value)}
            />
          ))}
        </View>
        <FieldError message={errors.reason_for_selling} />
      </View>

      <View style={{ gap: 8 }}>
        <FieldLabel>مشاركة البيانات المالية مع المستثمرين</FieldLabel>
        <View style={{ gap: 8 }}>
          {FINANCIAL_DATA_SHARING_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={financialDataSharing === opt.value}
              onPress={() => setFinancialDataSharing(opt.value)}
            />
          ))}
        </View>
      </View>

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
        <ToggleRow
          checked={confirmNoBranding}
          label="أؤكد أن الصور المرفوعة خالية من أي شعار أو علامة تجارية تكشف هوية المشروع."
          onPress={() => setConfirmNoBranding((prev) => !prev)}
        />
        <FieldError message={errors.confirm_no_branding} />
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
