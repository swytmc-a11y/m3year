import { useState } from "react";
import { View, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, CheckRow, Field, FieldError } from "@/components/kit";
import { BooleanChips, ChipGroup, FormSection, PhotoGrid } from "@/components/form-parts";
import { useTheme } from "@/contexts/theme";
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
import { fonts } from "@/theme";

type Intent = "draft" | "submit";
const MAX_PHOTOS = 6;

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
  const { t } = useTheme();
  const [listingId] = useState(() => listing?.id ?? uuidv4());
  const [title, setTitle] = useState(listing?.title ?? "");
  const [sector, setSector] = useState<BusinessSector>(listing?.sector ?? "cafe");
  const [city, setCity] = useState(listing?.city ?? "");
  const [revenue, setRevenue] = useState(listing ? String(listing.monthly_revenue) : "");
  const [percentage, setPercentage] = useState(listing ? String(listing.offered_percentage) : "");
  const [askingPrice, setAskingPrice] = useState(
    listing?.asking_price != null ? String(listing.asking_price) : "",
  );
  const [priceNegotiable, setPriceNegotiable] = useState(listing?.price_negotiable ?? true);
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

  const [hasLegalObligations, setHasLegalObligations] = useState(listing?.has_legal_obligations ?? false);
  const [reasonForSelling, setReasonForSelling] = useState<ReasonForSelling | undefined>(
    (listing?.reason_for_selling as ReasonForSelling | null) ?? undefined,
  );
  const [reasonForSellingOther, setReasonForSellingOther] = useState(listing?.reason_for_selling_other ?? "");
  const [financialDataSharing, setFinancialDataSharing] = useState<FinancialDataSharing>(
    (listing?.financial_data_sharing as FinancialDataSharing) ?? "on_request",
  );
  const [entityType, setEntityType] = useState<EntityType | undefined>(
    (confidential?.entity_type as EntityType | undefined) ?? undefined,
  );
  const [crNumber, setCrNumber] = useState(confidential?.commercial_registration_number ?? "");
  // Editing an existing listing that already has photos means this gate was
  // already satisfied at least once for those same photos — only demand a
  // fresh confirmation when new photos are added (see pickPhoto).
  const [confirmNoBranding, setConfirmNoBranding] = useState(() => (listing?.photo_urls.length ?? 0) > 0);

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
      reason_for_selling_other: reasonForSellingOther,
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
      <FormSection title="الأساسيات">
        <Field
          label="عنوان المشروع"
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: كوفي شوب — حي الروضة، جدة"
          maxLength={140}
          error={errors.title}
        />
        <ChipGroup label="القطاع" options={SECTOR_OPTIONS} value={sector} onChange={setSector} />
        <Field
          label="المدينة"
          value={city}
          onChangeText={setCity}
          placeholder="مثال: جدة"
          maxLength={60}
          error={errors.city}
        />
      </FormSection>

      <FormSection title="الأرقام المالية" description="هذه الأرقام هي ما يقارنه المستثمر أولًا.">
        <Field
          label="الإيراد الشهري (ر.س)"
          value={revenue}
          onChangeText={setRevenue}
          placeholder="48200"
          keyboardType="number-pad"
          numeric
          error={errors.monthly_revenue}
        />
        <Field
          label="النسبة المطروحة (٪)"
          value={percentage}
          onChangeText={setPercentage}
          placeholder="25"
          keyboardType="numbers-and-punctuation"
          numeric
          error={errors.offered_percentage}
        />
        <View style={{ gap: 6 }}>
          <Field
            label="سعر البيع أو المبلغ المطلوب (ر.س، اختياري)"
            value={askingPrice}
            onChangeText={setAskingPrice}
            placeholder="500000"
            keyboardType="number-pad"
            numeric
            error={errors.asking_price}
          />
          <CheckRow
            checked={priceNegotiable}
            label="السعر قابل للتفاوض"
            onPress={() => setPriceNegotiable((prev) => !prev)}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Field
            label="صافي الربح الشهري (ر.س، اختياري)"
            value={monthlyProfit}
            onChangeText={setMonthlyProfit}
            placeholder="15000"
            keyboardType="number-pad"
            numeric
            error={errors.monthly_profit}
          />
          <CheckRow
            checked={showProfit}
            label="إظهار الرقم مباشرة للزوار (بدل «متاح عند التواصل»)"
            onPress={() => setShowProfit((prev) => !prev)}
          />
        </View>
      </FormSection>

      <FormSection title="عن المشروع">
        <View style={{ flexDirection: "row-reverse", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="سنة التأسيس (اختياري)"
              value={foundingYear}
              onChangeText={setFoundingYear}
              placeholder="2019"
              keyboardType="number-pad"
              numeric
              error={errors.founding_year}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="عدد الموظفين (اختياري)"
              value={employeeCount}
              onChangeText={setEmployeeCount}
              placeholder="6"
              keyboardType="number-pad"
              numeric
              error={errors.employee_count}
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
          style={{ minHeight: 120 }}
        />
      </FormSection>

      <FormSection
        title="بيانات الإفصاح"
        description="رقم السجل ونوع الكيان سرّيان — يراهما فريق المراجعة فقط ولا يُنشران للعامة."
      >
        <ChipGroup
          label="نوع الكيان"
          options={ENTITY_TYPE_OPTIONS}
          value={entityType}
          onChange={setEntityType}
          error={errors.entity_type}
        />
        <Field
          label="رقم السجل التجاري"
          value={crNumber}
          onChangeText={setCrNumber}
          placeholder="1010xxxxxx"
          keyboardType="number-pad"
          numeric
          error={errors.commercial_registration_number}
        />
        <BooleanChips
          label="هل يوجد التزامات قانونية على المشروع؟"
          value={hasLegalObligations}
          onChange={setHasLegalObligations}
        />
        <ChipGroup
          label="سبب الطرح"
          options={REASON_FOR_SELLING_OPTIONS}
          value={reasonForSelling}
          onChange={setReasonForSelling}
          error={errors.reason_for_selling}
        />
        {reasonForSelling === "other" ? (
          <Field
            label="اكتب السبب"
            value={reasonForSellingOther}
            onChangeText={setReasonForSellingOther}
            placeholder="مثال: البحث عن خبرة تشغيلية إضافية"
            maxLength={200}
            error={errors.reason_for_selling_other}
          />
        ) : null}
        <ChipGroup
          label="مشاركة البيانات المالية مع المستثمرين"
          options={FINANCIAL_DATA_SHARING_OPTIONS}
          value={financialDataSharing}
          onChange={setFinancialDataSharing}
        />
      </FormSection>

      <FormSection title={`صور المشروع (اختياري، حتى ${MAX_PHOTOS})`}>
        <CheckRow
          checked={confirmNoBranding}
          label="أؤكد أن الصور المرفوعة خالية من أي شعار أو علامة تجارية تكشف هوية المشروع."
          onPress={() => setConfirmNoBranding((prev) => !prev)}
        />
        <FieldError message={errors.confirm_no_branding} />
        <PhotoGrid
          urls={photoUrls}
          onRemove={removePhoto}
          onAdd={pickPhoto}
          uploading={uploadingPhoto}
          max={MAX_PHOTOS}
        />
        <FieldError message={photoError} />
      </FormSection>

      <FieldError message={formError} />

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
          variant="secondary"
          fullWidth
          loading={pending === "draft"}
          disabled={pending !== null}
          onPress={() => handle("draft")}
        />
      </View>

      <Text
        style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}
      >
        الإعلانات لا تُنشر مباشرة — يراجعها فريق معيار أولًا، ثم تظهر للعامة بعد الموافقة.
      </Text>
    </View>
  );
}
