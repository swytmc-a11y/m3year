import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { reportError } from "@/lib/error-reporting";
import { fonts, lightTokens, radius } from "@/theme";

// This boundary wraps ThemeProvider itself, so it cannot read the theme context
// (the crash it renders for may well be the provider failing). It pins the
// light tokens statically rather than reaching for a context that may be gone.
const t = lightTokens;

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches render/lifecycle errors anywhere below it. Without this, an
 * unhandled JS error in a release build reaches RCTExceptionsManager and
 * hard-aborts the process (SIGABRT) with no message on screen, which is
 * indistinguishable from a native crash when triaging. Showing the message
 * instead keeps the app inspectable in the field.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[error-boundary]", error, info?.componentStack);
    // console.error is invisible in a release build. Send it somewhere we can
    // actually read it, without awaiting — rendering the fallback must not
    // wait on a network call.
    void reportError(error, `render:${info?.componentStack?.trim().split("\n")[0] ?? "unknown"}`);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, justifyContent: "center" }}>
        <View
          style={{
            backgroundColor: t.surface,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: 20,
            gap: 12,
            maxHeight: "80%",
          }}
        >
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: t.text, textAlign: "right" }}>
            حدث خطأ غير متوقع
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: t.textMuted,
              textAlign: "right",
              lineHeight: 22,
            }}
          >
            أعد فتح التطبيق. إن تكرر الخطأ، أرسل النص التالي للدعم:
          </Text>
          <ScrollView style={{ maxHeight: 220 }}>
            <Text
              selectable
              style={{
                fontFamily: fonts.numeric,
                fontSize: 12,
                color: t.danger,
                textAlign: "left",
                lineHeight: 18,
              }}
            >
              {String(error?.message ?? error)}
              {error?.stack ? `\n\n${error.stack.split("\n").slice(0, 12).join("\n")}` : ""}
            </Text>
          </ScrollView>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{
              height: 48,
              borderRadius: radius.lg,
              backgroundColor: t.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.onPrimary }}>
              إعادة المحاولة
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
}
