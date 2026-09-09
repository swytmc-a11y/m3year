import { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/contexts/theme";
import { ChevronBackIcon } from "@/components/icons";
import { fonts, radius } from "@/theme";
import { toIso, todayIso, addDays } from "@/lib/dates";

/**
 * Range picker for a rental period.
 *
 * Built rather than pulled in: the two calendar libraries that work in this
 * stack style nothing like the rest of the app and need as much overriding as
 * writing this did, and neither knows how to grey out the days a specific car
 * is already taken — which is the whole reason a customer needs to see a
 * calendar here instead of typing dates and being told "unavailable" after
 * the fact.
 *
 * Dates are handled as plain yyyy-mm-dd strings throughout, never Date
 * objects, so a customer in one timezone cannot land on a different day than
 * the one the server prices.
 */

export type DayRange = { start: string; end: string | null };

const WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function DateRangeCalendar({
  range,
  onChange,
  /** Ranges the car is already taken for, half-open like the database. */
  unavailable = [],
  minDate,
}: {
  range: DayRange;
  onChange: (next: DayRange) => void;
  unavailable?: { start_date: string; end_date: string }[];
  minDate?: string;
}) {
  const { t } = useTheme();
  const floor = minDate ?? todayIso();

  const [cursor, setCursor] = useState(() => {
    const base = range.start || floor;
    return { year: +base.slice(0, 4), month: +base.slice(5, 7) - 1 };
  });

  // Expanded to a set of individual days: a calendar cell asks about one day,
  // and the ranges are few and short enough that this is cheaper than testing
  // every cell against every range on each render.
  const takenDays = useMemo(() => {
    const set = new Set<string>();
    for (const r of unavailable) {
      let day = r.start_date;
      let guard = 0;
      while (day < r.end_date && guard++ < 400) {
        set.add(day);
        day = addDays(day, 1);
      }
    }
    return set;
  }, [unavailable]);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const lead = first.getUTCDay();
    const total = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) out.push(toIso(cursor.year, cursor.month, d));
    return out;
  }, [cursor]);

  function shiftMonth(by: number) {
    setCursor((c) => {
      const m = c.month + by;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: m };
    });
  }

  /**
   * A pickup day may be taken by another booking's last day, because ranges
   * are half-open — but a day inside a booking is never selectable.
   */
  function isDisabled(day: string): boolean {
    if (day < floor) return true;
    return takenDays.has(day);
  }

  /**
   * A return date is only valid if nothing is taken between pickup and it,
   * otherwise a customer could span someone else's booking and only find out
   * when the server rejects the whole thing.
   */
  function spansTakenDay(from: string, to: string): boolean {
    let day = from;
    let guard = 0;
    while (day < to && guard++ < 400) {
      if (takenDays.has(day)) return true;
      day = addDays(day, 1);
    }
    return false;
  }

  function onPick(day: string) {
    if (isDisabled(day)) return;

    // A complete range, or a pick before the current start, begins a new one.
    if (!range.start || range.end || day <= range.start) {
      onChange({ start: day, end: null });
      return;
    }
    if (spansTakenDay(range.start, day)) {
      // Restart from the new day rather than silently keeping an impossible
      // range the server would reject at the end.
      onChange({ start: day, end: null });
      return;
    }
    onChange({ start: range.start, end: day });
  }

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => shiftMonth(-1)}
          accessibilityLabel="الشهر السابق"
          hitSlop={10}
          style={{ padding: 6 }}
        >
          <ChevronBackIcon color={t.text} />
        </Pressable>

        <Text style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: t.text }}>
          {MONTHS[cursor.month]} {cursor.year}
        </Text>

        <Pressable
          onPress={() => shiftMonth(1)}
          accessibilityLabel="الشهر التالي"
          hitSlop={10}
          style={{ padding: 6, transform: [{ scaleX: -1 }] }}
        >
          <ChevronBackIcon color={t.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap" }}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted }}>{w}</Text>
          </View>
        ))}

        {cells.map((day, i) => {
          if (!day) return <View key={`pad-${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />;

          const disabled = isDisabled(day);
          const isStart = day === range.start;
          const isEnd = day === range.end;
          const inside =
            range.end != null && day > range.start && day < range.end;
          const edge = isStart || isEnd;

          return (
            <View key={day} style={{ width: `${100 / 7}%`, height: 42, padding: 2 }}>
              <Pressable
                onPress={() => onPick(day)}
                disabled={disabled}
                accessibilityLabel={day}
                accessibilityState={{ disabled, selected: edge || inside }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.md,
                  backgroundColor: edge
                    ? t.primary
                    : inside
                      ? `${t.primary}22`
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: edge ? fonts.bodySemiBold : fonts.numeric,
                    fontSize: 13,
                    color: disabled
                      ? `${t.textMuted}66`
                      : edge
                        ? t.onPrimary
                        : t.text,
                    textDecorationLine: disabled && day >= floor ? "line-through" : "none",
                  }}
                >
                  {+day.slice(8, 10)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
