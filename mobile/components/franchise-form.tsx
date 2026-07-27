import { useState } from "react";
import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Field, Chip } from "@/components/ui";
import { franchiseFormSchema, type FranchiseFormValues } from "@/lib/validations";
import {
  SECTOR_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  type BusinessSector,
  type EntityType,
} from "@/lib/constants";
import type { Franchise, FranchiseConfidential } from "@/lib/franchise-constants";
import { uploadFranchisePhoto, deleteFranchisePhoto } from "@/lib/storage";
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
      style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 4 }}
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
      style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, textAlign: "right" }}
    >
      {children}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
      {message}
    </Text>
  );
}

export function FranchiseForm({
  franchise,
  confidential,
  onSubmit,
}: {
  franchise?: Franchise;
  confidential?: FranchiseConfidential;
  onSubmit: (
    values: FranchiseFormValues,
    intent: Intent,
    extra: { franchiseId: string; logoUrl: string | null; photoUrls: string[] },
  ) => Promise<void>;
}) {
  const [franchiseId] = useState(() => franchise?.id ?? uuidv4());
  const [brandName, setBrandName] = useState(franchise?.brand_name ?? "");
  const [sector, setSector] = useState<BusinessSector>(franchise?.sector ?? "cafe");
  const [city, setCity] = useState(franchise?.city ?? "");
  const [citiesAvailable, setCitiesAvailable] = useState(
    (franchise?.cities_available ?? []).join("، "),
  );
  const [countriesAvailable, setCountriesAvailable] = useState(
    (franchise?.countries_available ?? []).join("، "),
  );
  const [franchiseFee, setFranchiseFee] = useState(
    franchise ? String(franchise.franchise_fee) : "",
  );
  const [investmentMin, setInvestmentMin] = useState(
    franchise?.initial_investment_min != null ? String(franchise.initial_investment_min) : "",
  );
  const [investmentMax, setInvestmentMax] = useState(
    franchise?.initial_investment_max != null ? String(franchise.initial_investment_max) : "",
  );
  const [royaltyPercentage, setRoyaltyPercentage] = useState(
    franchise?.royalty_percentage != null ? String(franchise.royalty_percentage) : "",
  );
  const [requiredSpace, setRequiredSpace] = useState(
    franchise?.required_space_sqm != null ? String(franchise.required_space_sqm) : "",
  );
  const [requiredEmployees, setRequiredEmployees] = useState(
    franchise?.required_employees_count != null
      ? String(franchise.required_employees_count)
      : "",
  );
  const [paybackMonths, setPaybackMonths] = useState(
    franchise?.expected_payback_months != null
      ? String(franchise.expected_payback_months)
      : "",
  );
  const [foundingYear, setFoundingYear] = useState(
    franchise?.founding_year != null ? String(franchise.founding_year) : "",
  );
  const [branchesCount, setBranchesCount] = useState(
    franchise?.current_branches_count != null
      ? String(franchise.current_branches_count)
      : "",
  );
  const [trainingProvided, setTrainingProvided] = useState(
    franchise?.training_provided ?? false,
  );
  const [operationalSupport, setOperationalSupport] = useState(
    franchise?.operational_support ?? "",
  );
  const [marketingSupport, setMarketingSupport] = useState(
    franchise?.marketing_support ?? "",
  );
  const [description, setDescription] = useState(franchise?.description ?? "");

  const [logoUrl, setLogoUrl] = useState<string | null>(franchise?.logo_url ?? null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(franchise?.photo_urls ?? []);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const [entityType, setEntityType] = useState<EntityType | undefined>(
    (confidential?.entity_type as EntityType | undefined) ?? undefined,
  );
  const [crNumber, setCrNumber] = useState(
    confidential?.commercial_registration_number ?? "",
  );
  const [confirmNoBranding, setConfirmNoBranding] = useState(
    () => (franchise?.photo_urls.length ?? 0) > 0,
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState<Intent | null>(null);

  async function pickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("امنح إذن الوصول للصور لإضافتها.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingLogo(true);
    const { url, error } = await uploadFranchisePhoto(franchiseId, result.assets[0].uri);
    setUploadingLogo(false);
    if (error || !url) {
      setPhotoError(error ?? "تعذّر رفع الشعار الآن.");
      return;
    }
    setLogoUrl(url);
  }

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
    const { url, error } = await uploadFranchisePhoto(franchiseId, result.assets[0].uri);
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
    await deleteFranchisePhoto(url);
  }

  async function handle(intent: Intent) {
    setFormError(undefined);
    const parsed = franchiseFormSchema.safeParse({
      brand_name: brandName,
      sector,
      city,
      cities_available: citiesAvailable
        .split(/[،,]/)
        .map((c) => c.trim())
        .filter(Boolean),
      countries_available: countriesAvailable
        .split(/[،,]/)
        .map((c) => c.trim())
        .filter(Boolean),
      description,
      founding_year: foundingYear,
      current_branches_count: branchesCount,
      franchise_fee: franchiseFee,
      initial_investment_min: investmentMin,
      initial_investment_max: investmentMax,
      royalty_percentage: royaltyPercentage,
      required_space_sqm: requiredSpace,
      required_employees_count: requiredEmployees,
      expected_payback_months: paybackMonths,
      training_provided: trainingProvided,
      operational_support: operationalSupport,
      marketing_support: marketingSupport,
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
      await onSubmit(parsed.data, intent, { franchiseId, logoUrl, photoUrls });
    } catch {
      setFormError("تعذّر حفظ الامتياز الآن. حاول مرة أخرى.");
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={{ gap: 20 }}>
      <Field
        label="اسم العلامة التجارية"
        value={brandName}
        onChangeText={setBrandName}
        placeholder="مثال: بن روست"
        maxLength={140}
        error={errors.brand_name}
        textAlign="right"
      />

      <View style={{ gap: 8 }}>
        <FieldLabel>القطاع</FieldLabel>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
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
        label="مدينة المقر الرئيسي"
        value={city}
        onChangeText={setCity}
        placeholder="مثال: الرياض"
        maxLength={60}
        error={errors.city}
        textAlign="right"
      />

      <Field
        label="المدن المتاحة للامتياز (افصل بينها بفاصلة، اختياري)"
        value={citiesAvailable}
        onChangeText={setCitiesAvailable}
        placeholder="الرياض، جدة، الدمام"
        textAlign="right"
      />

      <Field
        label="الدول المتاحة للامتياز (افصل بينها بفاصلة، اختياري)"
        value={countriesAvailable}
        onChangeText={setCountriesAvailable}
        placeholder="السعودية، الإمارات"
        textAlign="right"
      />

      <Field
        label="رسوم الامتياز (ر.س)"
        value={franchiseFee}
        onChangeText={setFranchiseFee}
        placeholder="150000"
        keyboardType="number-pad"
        error={errors.franchise_fee}
        style={{ fontFamily: fonts.mono, textAlign: "left" }}
      />

      <View style={{ flexDirection: "row-reverse", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="أدنى استثمار مبدئي (ر.س، اختياري)"
            value={investmentMin}
            onChangeText={setInvestmentMin}
            placeholder="200000"
            keyboardType="number-pad"
            error={errors.initial_investment_min}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="أقصى استثمار مبدئي (ر.س، اختياري)"
            value={investmentMax}
            onChangeText={setInvestmentMax}
            placeholder="400000"
            keyboardType="number-pad"
            error={errors.initial_investment_max}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
      </View>

      <Field
        label="نسبة الإتاوة الشهرية/السنوية (٪، اختياري)"
        value={royaltyPercentage}
        onChangeText={setRoyaltyPercentage}
        placeholder="5"
        keyboardType="numbers-and-punctuation"
        error={errors.royalty_percentage}
        style={{ fontFamily: fonts.mono, textAlign: "left" }}
      />

      <View style={{ flexDirection: "row-reverse", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="المساحة المطلوبة (م²، اختياري)"
            value={requiredSpace}
            onChangeText={setRequiredSpace}
            placeholder="80"
            keyboardType="number-pad"
            error={errors.required_space_sqm}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="عدد الموظفين المطلوب (اختياري)"
            value={requiredEmployees}
            onChangeText={setRequiredEmployees}
            placeholder="6"
            keyboardType="number-pad"
            error={errors.required_employees_count}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row-reverse", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="مدة استرداد رأس المال المتوقعة (بالأشهر، اختياري)"
            value={paybackMonths}
            onChangeText={setPaybackMonths}
            placeholder="18"
            keyboardType="number-pad"
            error={errors.expected_payback_months}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="سنة تأسيس العلامة (اختياري)"
            value={foundingYear}
            onChangeText={setFoundingYear}
            placeholder="2018"
            keyboardType="number-pad"
            error={errors.founding_year}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />
        </View>
      </View>

      <Field
        label="عدد الفروع الحالية (اختياري)"
        value={branchesCount}
        onChangeText={setBranchesCount}
        placeholder="12"
        keyboardType="number-pad"
        error={errors.current_branches_count}
        style={{ fontFamily: fonts.mono, textAlign: "left" }}
      />

      <ToggleRow
        checked={trainingProvided}
        label="يشمل الامتياز تدريبًا للمشغّل الجديد"
        onPress={() => setTrainingProvided((prev) => !prev)}
      />

      <Field
        label="الدعم التشغيلي المقدَّم (اختياري)"
        value={operationalSupport}
        onChangeText={setOperationalSupport}
        placeholder="افتتاح، تشغيل، سلاسل إمداد..."
        multiline
        numberOfLines={3}
        maxLength={2000}
        textAlign="right"
        style={{ height: 90, paddingTop: 12, textAlignVertical: "top" }}
      />

      <Field
        label="الدعم التسويقي المقدَّم (اختياري)"
        value={marketingSupport}
        onChangeText={setMarketingSupport}
        placeholder="حملات، هوية بصرية، مواد تسويقية..."
        multiline
        numberOfLines={3}
        maxLength={2000}
        textAlign="right"
        style={{ height: 90, paddingTop: 12, textAlignVertical: "top" }}
      />

      <Field
        label="وصف العلامة (اختياري)"
        value={description}
        onChangeText={setDescription}
        placeholder="نبذة عن العلامة التجارية وفرصة الامتياز."
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
        <FieldLabel>شعار العلامة (اختياري)</FieldLabel>
        <Pressable
          onPress={pickLogo}
          disabled={uploadingLogo}
          style={{
            width: 84,
            height: 84,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: colors.grid,
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {uploadingLogo ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ width: 84, height: 84 }} />
          ) : (
            <Text style={{ fontSize: 24, color: colors.mutedText }}>+</Text>
          )}
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <FieldLabel>{`صور الفروع/الموقع (اختياري، حتى ${MAX_PHOTOS})`}</FieldLabel>
        <ToggleRow
          checked={confirmNoBranding}
          label="أؤكد أن الصور المرفوعة لا تكشف بيانات تعاقدية سرّية."
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
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
            {photoError}
          </Text>
        ) : null}
      </View>

      {formError ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
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
        امتيازات الأعمال لا تُنشر مباشرة — يراجعها فريق معيار أولًا، ثم تظهر
        للعامة بعد الموافقة.
      </Text>
    </View>
  );
}
