# معيار (Miyar)

منصة إعلانات وتواصل وتوثيق مالي لأصحاب المشاريع التشغيلية الصغيرة الباحثين
عن شريك ممول. المنصة لا تُنفّذ أو تُدير صفقة بيع الحصة نفسها — فقط عرض
الإعلانات، التواصل الداخلي، وخدمة التوثيق المالي المدفوعة.

> **حالة المشروع:** المرحلة ١ فقط (الأساس: المشروع + Supabase + تسجيل الدخول
> عبر الجوال). بقية الوحدات (الإعلانات، التوثيق، الرسائل، لوحة التحكم،
> الدفع) لم تُبنَ بعد.

## المكدس التقني

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** (Postgres + Auth) عبر `@supabase/ssr`
- **Zod** للتحقق من صحة المدخلات على السيرفر
- **shadcn/ui**-style components (مبنية يدويًا؛ راجع "ملاحظة" أدناه)

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local   # ثم املأ القيم (راجع القسم التالي)
npm run dev
```

يعمل التطبيق على http://localhost:3000

## متغيرات البيئة

| المتغير | الوصف |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon العام لمشروع Supabase |

## إعداد Supabase المطلوب لتسجيل الدخول

تسجيل الدخول يعتمد على **رمز تحقق SMS (OTP)** عبر جوال المستخدم. لتفعيله:

1. من لوحة Supabase: **Authentication → Providers → Phone** فعّل مزود Phone.
2. اربط مزود رسائل نصية (Twilio أو MessageBird أو Vonage) بمفاتيح API خاصة به
   — Supabase لا يرسل رسائل SMS بدون مزود مُهيّأ.
3. بدون هذا الإعداد، محاولة تسجيل الدخول ستفشل برسالة "تعذّر إرسال رمز
   التحقق الآن" (هذا سلوك متوقع وليس خطأ في الكود).

## بنية المشروع

```
src/
  app/
    page.tsx              # الصفحة الرئيسية
    auth/page.tsx          # طلب رمز التحقق (إدخال الجوال)
    auth/verify/           # إدخال رمز التحقق وتأكيده
    dashboard/page.tsx      # صفحة مبدئية بعد تسجيل الدخول (محمية)
    actions/auth.ts         # Server Actions: requestOtp / verifyOtp / signOut
  components/
    ui/                    # مكونات shadcn/ui الأساسية (button, input, label)
    logo.tsx, caliper-mark.tsx
  lib/
    supabase/client.ts      # عميل Supabase للمتصفح
    supabase/server.ts      # عميل Supabase للسيرفر (Server Components/Actions)
    supabase/proxy.ts       # تحديث الجلسة (يُستدعى من proxy.ts في الجذر)
    validations/auth.ts      # مخططات Zod لرقم الجوال ورمز التحقق
proxy.ts                    # Next.js 16 Proxy (بديل middleware.ts السابق)
```

## النشر على Vercel

1. اربط المستودع بمشروع Vercel جديد.
2. أضف متغيرات البيئة أعلاه في **Project Settings → Environment Variables**.
3. انشر — Vercel يكتشف Next.js تلقائيًا (لا إعدادات بناء إضافية مطلوبة).

## ملاحظة حول shadcn/ui

عادةً تُضاف مكونات shadcn/ui عبر `npx shadcn add <component>`، لكن الوصول
لـ `ui.shadcn.com` كان محجوبًا في بيئة البناء الحالية. لذلك بُنيت المكونات
الأساسية (`button`, `input`, `label`) يدويًا باتباع نفس تصميم واتفاقيات
shadcn/ui حرفيًا (`class-variance-authority` + `cn()` + بنية الملفات نفسها)،
و`components.json` موجود بالإعدادات الصحيحة — لذلك يمكن تشغيل
`npx shadcn add <component>` بشكل طبيعي لإضافة مكونات جديدة لاحقًا من أي بيئة
لديها وصول للإنترنت.
