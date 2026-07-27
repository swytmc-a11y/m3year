import { useState } from "react";
import { View, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, CheckRow, Field, FieldError, FieldLabel } from "@/components/kit";
import { ChipGroup, FormSection, PhotoAddTile, PhotoGrid } from "@/components/form-parts";
import { useTheme } from "@/contexts/theme";
import { franchiseFormSchema, type FranchiseFormValues } from "@/lib/validations";
import {
  SECTOR_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  type BusinessSector,
  type EntityType,
} from "@/lib/constants";
import {
  FRANCHISE_TYPE_OPTIONS,
  type Franchise,
  type FranchiseConfidential,
  type FranchiseType,
} from "@/lib/franchise-constants";
import { uploadFranchisePhoto, deleteFranchisePhoto } from "@/lib/storage";
import { uuidv4 } from "@/lib/uuid";
import { fonts } from "@/theme";

type Intent = "draft" | "submit";
const MAX_PHOTOS = 6;

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
  const { t } = useTheme();
  const [franchiseId] = useState(() => franchise?.id ?? uuidv4());
  const [brandName, setBrandName] = useState(franchise?.brand_name ?? "");
  const [sector, setSector] = useState<BusinessSector>(franchise?.sector ?? "cafe");
  const [franchiseType, setFranchiseType] = useState<FranchiseType>(
    (franchise?.franchise_type as FranchiseType | undefined) ?? "single_unit",
  );
  const [contractDurationYears, setContractDurationYears] = useState(
    franchise?.contract_duration_years != null ? String(franchise.contract_duration_years) : "",
  );
  const [city, setCity] = useState(franchise?.city ?? "");
  const [citiesAvailable, setCitiesAvailable] = useState((franchise?.cities_available ?? []).join("، "));
  const [countriesAvailable, setCountriesAvailable] = useState((franchise?.countries_available ?? []).join("، "));
  const [franchiseFee, setFranchiseFee] = useState(franchise ? String(franchise.franchise_fee) : "");
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
    franchise?.required_employees_count != null ? String(franchise.required_employees_count) : "",
  );
  const [paybackMonths, setPaybackMonths] = useState(
    franchise?.expected_payback_months != null ? String(franchise.expected_payback_months) : "",
  );
  const [foundingYear, setFoundingYear] = useState(
    franchise?.founding_year != null ? String(franchise.founding_year) : "",
  );
  const [branchesCount, setBranchesCount] = useState(
    franchise?.current_branches_count != null ? String(franchise.current_branches_count) : "",
  );
  const [trainingProvided, setTrainingProvided] = useState(franchise?.training_provided ?? false);
  const [operationalSupport, setOperationalSupport] = useState(franchise?.operational_support ?? "");
  const [marketingSupport, setMarketingSupport] = useState(franchise?.marketing_support ?? "");
  const [description, setDescription] = useState(franchise?.description ?? "");

  const [logoUrl, setLogoUrl] = useState<string | null>(franchise?.logo_url ?? null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(franchise?.photo_urls ?? []);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const [entityType, setEntityType] = useState<EntityType | undefined>(
    (confidential?.entity_type as EntityType | undefined) ?? undefined,
  );
  const [crNumber, setCrNumber] = useState(confidential?.commercial_registration_number ?? "");
  const [confirmNoBranding, setConfirmNoBranding] = useState(() => (franchise?.photo_urls.length ?? 0) > 0);

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
      franchise_type: franchiseType,
      contract_duration_years: contractDurationYears,
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
      <FormSection title="العلامة التجارية">
        <Field
          label="اسم العلامة التجارية"
          value={brandName}
          onChangeText={setBrandName}
          placeholder="مثال: بن روست"
          maxLength={140}
          error={errors.brand_name}
        />
        <ChipGroup label="القطاع" options={SECTOR_OPTIONS} value={sector} onChange={setSector} />
        <ChipGroup
          label="نوع الامتياز"
          options={FRANCHISE_TYPE_OPTIONS}
          value={franchiseType}
          onChange={setFranchiseType}
        />
        <Field
          label="مدة عقد الامتياز (بالسنوات)"
          value={contractDurationYears}
          onChangeText={setContractDurationYears}
          placeholder="5"
          keyboardType="number-pad"
          numeric
          error={errors.contract_duration_years}
        />
        <View style={{ gap: 8 }}>
          <FieldLabel>شعار العلامة (اختياري)</FieldLabel>
          <PhotoAddTile
            onPress={pickLogo}
            uploading={uploadingLogo}
            imageUrl={logoUrl}
            accessibilityLabel="رفع شعار العلامة"
          />
        </View>
      </FormSection>

      <FormSection title="التغطية الجغرافية">
        <Field
          label="مدينة المقر الرئيسي"
          value={city}
          onChangeText={setCity}
          placeholder="مثال: الرياض"
          maxLength={60}
          error={errors.city}
        />
        <Field
          label="المدن المتاحة للامتياز (اختياري)"
          value={citiesAvailable}
          onChangeText={setCitiesAvailable}
          placeholder="الرياض، جدة، الدمام"
          hint="افصل بينها بفاصلة."
        />
        <Field
          label="الدول المتاحة للامتياز (اختياري)"
          value={countriesAvailable}
          onChangeText={setCountriesAvailable}
          placeholder="السعودية، الإمارات"
          hint="افصل بينها بفاصلة."
        />
      </FormSection>

      <FormSection title="الأرقام المالية" description="هذه الأرقام هي ما يقارنه المستثمر أولًا.">
        <Field
          label="رسوم الامتياز (ر.س)"
          value={franchiseFee}
          onChangeText={setFranchiseFee}
          placeholder="150000"
          keyboardType="number-pad"
          numeric
          error={errors.franchise_fee}
        />
        <View style={{ flexDirection: "row-reverse", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="أدنى استثمار مبدئي (اختياري)"
              value={investmentMin}
              onChangeText={setInvestmentMin}
              placeholder="200000"
              keyboardType="number-pad"
              numeric
              error={errors.initial_investment_min}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="أقصى استثمار مبدئي (اختياري)"
              value={investmentMax}
              onChangeText={setInvestmentMax}
              placeholder="400000"
              keyboardType="number-pad"
              numeric
              error={errors.initial_investment_max}
            />
          </View>
        </View>
        <Field
          label="نسبة الإتاوة (٪، اختياري)"
          value={royaltyPercentage}
          onChangeText={setRoyaltyPercentage}
          placeholder="5"
          keyboardType="numbers-and-punctuation"
          numeric
          error={errors.royalty_percentage}
        />
        <Field
          label="مدة استرداد رأس المال المتوقعة (بالأشهر، اختياري)"
          value={paybackMonths}
          onChangeText={setPaybackMonths}
          placeholder="18"
          keyboardType="number-pad"
          numeric
          error={errors.expected_payback_months}
        />
      </FormSection>

      <FormSection title="متطلبات التشغيل">
        <View style={{ flexDirection: "row-reverse", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="المساحة المطلوبة (م²، اختياري)"
              value={requiredSpace}
              onChangeText={setRequiredSpace}
              placeholder="80"
              keyboardType="number-pad"
              numeric
              error={errors.required_space_sqm}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="عدد الموظفين المطلوب (اختياري)"
              value={requiredEmployees}
              onChangeText={setRequiredEmployees}
              placeholder="6"
              keyboardType="number-pad"
              numeric
              error={errors.required_employees_count}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row-reverse", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="سنة تأسيس العلامة (اختياري)"
              value={foundingYear}
              onChangeText={setFoundingYear}
              placeholder="2018"
              keyboardType="number-pad"
              numeric
              error={errors.founding_year}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="عدد الفروع الحالية (اختياري)"
              value={branchesCount}
              onChangeText={setBranchesCount}
              placeholder="12"
              keyboardType="number-pad"
              numeric
              error={errors.current_branches_count}
            />
          </View>
        </View>
        <CheckRow
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
        />
        <Field
          label="الدعم التسويقي المقدَّم (اختياري)"
          value={marketingSupport}
          onChangeText={setMarketingSupport}
          placeholder="حملات، هوية بصرية، مواد تسويقية..."
          multiline
          numberOfLines={3}
          maxLength={2000}
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
      </FormSection>

      <FormSection title={`صور الفروع/الموقع (اختياري، حتى ${MAX_PHOTOS})`}>
        <CheckRow
          checked={confirmNoBranding}
          label="أؤكد أن الصور المرفوعة لا تكشف بيانات تعاقدية سرّية."
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
        امتيازات الأعمال لا تُنشر مباشرة — يراجعها فريق معيار أولًا، ثم تظهر للعامة بعد الموافقة.
      </Text>
    </View>
  );
}
