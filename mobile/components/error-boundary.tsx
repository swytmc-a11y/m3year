import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { colors, fonts, radius } from "@/theme";

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
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 24, justifyContent: "center" }}>
        <View
          style={{
            backgroundColor: colors.white,
            borderColor: colors.grid,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: 20,
            gap: 12,
            maxHeight: "80%",
          }}
        >
          <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.ink, textAlign: "right" }}>
            حدث خطأ غير متوقع
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.mutedText,
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
                fontFamily: fonts.mono,
                fontSize: 12,
                color: colors.danger,
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
              borderRadius: radius.md,
              backgroundColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white }}>
              إعادة المحاولة
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
}
