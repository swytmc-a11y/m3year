import { useState } from "react";
import { View, Text } from "react-native";
import { Button, Field, Chip } from "@/components/ui";
import { listingFormSchema, type ListingFormValues } from "@/lib/validations";
import { SECTOR_OPTIONS, type Listing, type BusinessSector } from "@/lib/constants";
import { colors, fonts } from "@/theme";

type Intent = "draft" | "submit";

export function ListingForm({
  listing,
  onSubmit,
}: {
  listing?: Listing;
  onSubmit: (values: ListingFormValues, intent: Intent) => Promise<void>;
}) {
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState<Intent | null>(null);

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
      await onSubmit(parsed.data, intent);
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
