import { View, Text } from "react-native";
import { Card } from "@/components/kit";
import { VERIFICATION_STATUS_LABELS } from "@/lib/constants";
import { asMiyarGrade, explainMiyarGrade, isMiyarGraded, type MiyarFields, type MiyarGrade } from "@/lib/miyar";
import { useTheme } from "@/contexts/theme";
import { fonts, radius, type ThemeTokens } from "@/theme";

function gradeStyle(t: ThemeTokens, grade: MiyarGrade | null) {
  switch (grade) {
    case "A":
      return { bg: t.successTint, fg: t.success };
    case "B":
      return { bg: `${t.primary}1F`, fg: t.primary };
    case "C":
      return { bg: t.surface2, fg: t.text };
    case "D":
      return { bg: t.dangerTint, fg: t.danger };
    default:
      return { bg: t.surface2, fg: t.textMuted };
  }
}

/** Compact letter chip for list cards — the only مؤشر معيار signal shown while browsing. */
export function MiyarBadge({ grade }: { grade: string | null }) {
  const { t } = useTheme();
  const g = asMiyarGrade(grade);
  const s = gradeStyle(t, g);
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 4,
        backgroundColor: s.bg,
        paddingHorizontal: 9,
        height: 24,
        borderRadius: radius.pill,
      }}
    >
      <Text style={{ fontFamily: fonts.numericBold, fontSize: 11, color: s.fg }}>
        {g ?? "؟"}
      </Text>
    </View>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "primary" | "danger" }) {
  const { t } = useTheme();
  const color = tone === "success" ? t.success : tone === "primary" ? t.primary : tone === "danger" ? t.danger : t.text;
  return (
    <Card style={{ flex: 1, alignItems: "center", padding: 12, gap: 3 }}>
      <Text style={{ fontFamily: fonts.numericBold, fontSize: 15, color }}>{value}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 9.5, color: t.textMuted, textAlign: "center" }}>{label}</Text>
    </Card>
  );
}

/** Full four-card breakdown + a deterministic explanation — shown on the detail screen only. */
export function MiyarBreakdown({ fields }: { fields: MiyarFields }) {
  const { t } = useTheme();
  const graded = isMiyarGraded(fields);
  const g = graded ? (fields.miyar_grade as MiyarGrade) : null;
  const s = gradeStyle(t, g);
  const verified = fields.verification_status === "verified";

  return (
    <Card style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 13.5, color: t.text }}>مؤشر معيار</Text>
        <View style={{ backgroundColor: s.bg, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill }}>
          <Text style={{ fontFamily: fonts.numericBold, fontSize: 15, color: s.fg }}>
            {g ?? "غير مصنّف"}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        <MiniStat
          label="درجة الثقة"
          value={graded ? `${fields.miyar_confidence_score}/100` : "—"}
          tone="primary"
        />
        <MiniStat
          label="اكتمال البيانات"
          value={graded ? `${fields.miyar_completeness_pct}٪` : "—"}
        />
        <MiniStat
          label="التوثيق المالي"
          value={VERIFICATION_STATUS_LABELS[fields.verification_status]}
          tone={verified ? "success" : undefined}
        />
      </View>

      <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
        {explainMiyarGrade(fields)}
      </Text>

      {/* PLACEHOLDER — interim caption only. Replace with the reviewed legal
          wording once the feature is fully confirmed, per product owner. */}
      <Text style={{ fontFamily: fonts.body, fontSize: 9.5, color: t.textMuted, textAlign: "right", lineHeight: 15 }}>
        مؤشر معيار يقيس اكتمال بيانات الإعلان ومدى إمكانية التحقق منها، وليس توصية استثمارية أو تقييمًا ائتمانيًا.
      </Text>
    </Card>
  );
}
