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
    supabase/client.ts          # عميل Supabase للمتصفح (مُنمّط بـ Database)
    supabase/server.ts          # عميل Supabase للسيرفر (Server Components/Actions)
    supabase/proxy.ts           # تحديث الجلسة (يُستدعى من proxy.ts في الجذر)
    supabase/database.types.ts  # أنواع TypeScript مولّدة من مخطط قاعدة البيانات
    validations/auth.ts          # مخططات Zod لرقم الجوال ورمز التحقق
proxy.ts                        # Next.js 16 Proxy (بديل middleware.ts السابق)
supabase/migrations/            # ملفات SQL للمخطط وسياسات RLS (مصدر الحقيقة)
```

## نموذج البيانات (المرحلة ٢)

المخطط كاملاً في `supabase/migrations/`. الجداول:

| الجدول | الغرض |
|---|---|
| `profiles` | ملف تعريف لكل مستخدم (الدور، الاسم، المدينة). لا يخزّن الجوال — يبقى في `auth.users`. يُنشأ تلقائيًا عند التسجيل عبر trigger. |
| `accountants` | بيانات المحاسب (رقم SOCPA، التفعيل، متوسط التقييم). التفعيل بموافقة الإدارة فقط. |
| `listings` | الإعلانات (القطاع، المدينة، الإيراد، النسبة، حالة النشر، حالة التوثيق). |
| `verification_requests` | طلبات التوثيق المالي وربطها بالمحاسب والتقرير. |
| `conversations` / `messages` | التواصل الداخلي بين صاحب المشروع والممول. |
| `ratings` | التقييمات المتبادلة بعد التواصل. |
| `audit_log` | سجل تدقيق للعمليات الحساسة (كتابة عبر `log_audit()` فقط). |

**نطاق تنظيمي:** لا يوجد أي جدول لتنفيذ صفقة بيع الحصة (لا عقود، لا نقل ملكية،
لا حفظ أموال). إضافة أي منها تتطلب مراجعة ترخيص هيئة السوق المالية.

### الأمان (RLS)

- **RLS مفعّلة على كل جدول** بدون استثناء.
- الحالة العامة الوحيدة (`using (true)`) هي قراءة الإعلانات **المنشورة** فقط،
  وقراءة التقييمات (إشارة ثقة عامة) — وكلاهما محتوى عام مقصود.
- **محفّزات حماية أعمدة (guard triggers)** تمنع ما لا تستطيع سياسات الصفوف
  منعه: صاحب الإعلان لا يستطيع توثيق إعلانه ذاتيًا أو تمييزه، والمستخدم لا
  يستطيع ترقية دوره إلى `admin` أو `accountant`، والمحاسب لا يفعّل نفسه.
- الدوال المساعدة (`is_admin`, `log_audit`) و`SECURITY DEFINER` مع
  `set search_path = ''`، والدوال الداخلية (triggers) غير قابلة للاستدعاء عبر
  REST.

> **تنبيه advisor مقبول:** يبقى تحذيران فقط من مدقّق Supabase الأمني —
> `is_admin` و`log_audit` قابلتان للاستدعاء من دور `authenticated`. هذا
> **مقصود ومطلوب**: RLS تستدعي `is_admin` كدور المستخدم، وSer­ver Actions
> تكتب سجل التدقيق عبر `log_audit`. لا يمكن إزالتهما دون كسر RLS/التدقيق.

### تحديث الأنواع بعد أي تعديل على المخطط

بعد أي migration جديد، أعد توليد `src/lib/supabase/database.types.ts` من مخطط
Supabase (عبر Supabase CLI: `supabase gen types typescript` أو من لوحة
التحكم) حتى تبقى الأنواع متطابقة مع قاعدة البيانات.

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
