# معيار — تطبيق الجوال (Expo / React Native)

تطبيق جوال أصلي (iOS/Android) لمنصة معيار، مبني بـ **Expo SDK 57 + React Native
+ expo-router + TypeScript**. يستخدم **نفس قاعدة بيانات Supabase** التي يستخدمها
تطبيق الويب (نفس الجداول وسياسات RLS ومنطق المراجعة).

> **حالة المشروع:** المرحلة ١ للجوال (الأساس: المشروع + الهوية + Supabase +
> المصادقة + التنقّل). بقية الوحدات (الإعلانات، التوثيق، الرسائل...) تُبنى تباعًا.

## التشغيل محليًا

```bash
cd mobile
npm install
cp .env.example .env   # ثم املأ قيم Supabase
npx expo start
```

ثم:
- امسح رمز QR بتطبيق **Expo Go** على جوالك (Android/iOS) لتشغيله على الجهاز، أو
- اضغط `a` لمحاكي Android / `i` لمحاكي iOS، أو
- اضغط `w` لفتح نسخة الويب (تحتاج `react-native-web` و`react-dom` — مثبّتة كـ
  devDependencies).

## متغيرات البيئة

| المتغير | الوصف |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon العام |

(البادئة `EXPO_PUBLIC_` تجعل القيمة متاحة داخل التطبيق.)

## البنية

```
mobile/
  app/                  # شاشات expo-router (توجيه بالملفات)
    _layout.tsx          # الجذر: الخطوط + RTL + مزوّد المصادقة + Stack
    index.tsx            # الرئيسية
    auth.tsx             # طلب رمز تحقق الجوال (OTP)
    verify.tsx           # إدخال رمز التحقق
    demo.tsx             # دخول تجريبي (مؤقت للمعاينة)
    dashboard.tsx        # الشاشة المحمية بعد الدخول
  components/            # Logo, Caliper, Button/Field/Card
  contexts/auth.tsx      # حالة الجلسة + فحص دور المدير
  lib/
    supabase.ts          # عميل Supabase (AsyncStorage لحفظ الجلسة)
    database.types.ts     # أنواع مولّدة من مخطط Supabase (نفس الويب)
    validations.ts        # مخططات Zod (الجوال، رمز التحقق)
  theme.ts               # ألوان وخطوط الهوية
```

## ملاحظات

- **تسجيل الدخول عبر الجوال (OTP)** يحتاج تفعيل مزوّد SMS في Supabase (نفس شرط
  الويب). حتى ذلك الحين استخدم **الدخول التجريبي** (`/demo`) للمعاينة.
- **RTL**: مُفعّل عبر `I18nManager.forceRTL`. عند أول تشغيل على جهاز حقيقي قد
  يحتاج إعادة تحميل واحدة ليأخذ اتجاه RTL مفعوله بالكامل.
- الخطوط (Almarai / IBM Plex Sans Arabic / IBM Plex Mono) تُحمّل عبر
  `@expo-google-fonts` وتُضمّن في التطبيق (لا تحتاج إنترنت وقت التشغيل).
