import type { VerificationStatus } from "@/lib/constants";

export type MiyarGrade = "A" | "B" | "C" | "D";

/**
 * The subset of listing/franchise columns مؤشر معيار reads. Both tables carry
 * the same five miyar_* columns with the same meaning, computed server-side
 * by `recompute_miyar_index_listing`/`recompute_miyar_index_franchise`
 * (migration 0032) — this module never computes a score itself, it only
 * reads and explains what the database already decided.
 */
export type MiyarFields = {
  miyar_grade: string | null;
  miyar_quality_score: number | null;
  miyar_confidence_score: number | null;
  miyar_completeness_pct: number | null;
  verification_status: VerificationStatus;
};

export const MIYAR_GRADE_LABELS: Record<MiyarGrade, string> = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
};

/** Narrows a raw miyar_grade column value, or null if ungraded ("بيانات غير كافية"). */
export function asMiyarGrade(grade: string | null): MiyarGrade | null {
  return grade === "A" || grade === "B" || grade === "C" || grade === "D" ? grade : null;
}

/** True once the row has enough disclosed data to be graded at all. */
export function isMiyarGraded(fields: Pick<MiyarFields, "miyar_grade">): fields is { miyar_grade: MiyarGrade } {
  return asMiyarGrade(fields.miyar_grade) !== null;
}

/**
 * Renders the four components into a short, deterministic Arabic explanation
 * — a fixed template over the stored numbers, not a live model call. Every
 * reader of the same four numbers gets the exact same sentence, which is the
 * whole point: the "why" must be as reproducible as the score itself.
 *
 * A future upgrade can hand these same numbers to an LLM purely to vary the
 * *phrasing*, never the underlying reasons — see the ai-analysis Edge
 * Function's existing dormant scaffold for that pattern.
 */
export function explainMiyarGrade(fields: MiyarFields): string {
  if (!isMiyarGraded(fields)) {
    return "بيانات هذا الإعلان غير مكتملة بعد لاحتساب مؤشر معيار. أكمل الحقول الاختيارية (الوصف، الصور، الأرقام المالية) ليُحتسب المؤشر تلقائيًا.";
  }

  const parts: string[] = [];

  switch (fields.verification_status) {
    case "verified":
      parts.push("أرقامه موثَّقة من محاسب معتمد، وهذا العامل الأكبر في درجة الثقة.");
      break;
    case "pending":
      parts.push("طلب التوثيق المالي قيد المراجعة حاليًا.");
      break;
    case "rejected":
      parts.push("طلب توثيقه المالي مرفوض، ما أثّر بشدة على درجة الثقة.");
      break;
    default:
      parts.push("لم يُطلب توثيق مالي بعد، فدرجة الثقة تعتمد فقط على اكتمال البيانات المُصرَّح بها ذاتيًا.");
  }

  const completeness = fields.miyar_completeness_pct ?? 0;
  if (completeness >= 80) {
    parts.push("بياناته شبه مكتملة.");
  } else if (completeness >= 50) {
    parts.push("بياناته مكتملة جزئيًا، وإكمالها يرفع درجة الثقة.");
  } else {
    parts.push("لا تزال حقول كثيرة اختيارية غير مُعبَّأة.");
  }

  const quality = fields.miyar_quality_score ?? 0;
  if (quality >= 70) {
    parts.push("مؤشراته المالية ضمن النطاق المعتاد لقطاعه.");
  } else if (quality >= 50) {
    parts.push("مؤشراته المالية مقبولة بوجه عام.");
  } else {
    parts.push("بعض مؤشراته المالية خارج النطاق المعتاد لمشاريع قطاعه.");
  }

  return parts.join(" ");
}
