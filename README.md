# SIRA CRM — Backend

NestJS + TypeScript + Prisma + MySQL

## متطلبات التشغيل

- Node.js 18+
- MySQL 8+
- Google Chrome (للـ WhatsApp Web)

## خطوات الإعداد

### 1. تحميل المتطلبات
```bash
npm install
```

### 2. إعداد ملف البيئة
```bash
cp .env.example .env
```
عدّل `.env` وضع بيانات الـ database:
```
DATABASE_URL="mysql://root:PASSWORD@127.0.0.1:3306/crm"
JWT_SECRET=any_strong_secret
```

### 3. إنشاء الـ Database
```bash
# إنشاء قاعدة البيانات أول مرة
npx prisma migrate deploy

# أو لو قاعدة البيانات فارغة تماماً
npm run db:push
```

### 4. تشغيل الـ Backend
```bash
# Development
npm run dev

# Production
npm run build
npm run start:prod
```

الـ backend بيشتغل على **port 2003**.

---

## ربط WhatsApp (مرة واحدة فقط)

1. شغّل الـ backend
2. افتح الـ frontend وادخل على `/settings/whatsapp-connect`
3. امسح الـ QR بواتساب الشركة
4. ✅ خلاص — الجلسة بتتحفظ تلقائياً ومش محتاج تعيد

---

## بيانات تجريبية (Demo Data)

```bash
node scripts/demo-seed.js
```

ده بيضيف: leads، units، meetings، feedbacks، attendance، وكل البيانات التجريبية.

---

## المتغيرات المهمة في `.env`

| المتغير | الوصف |
|---------|--------|
| `DATABASE_URL` | رابط قاعدة البيانات MySQL |
| `JWT_SECRET` | مفتاح تشفير الـ tokens |
| `PORT` | port الـ server (افتراضي: 2003) |

---

## هيكل المشروع

```
src/
├── auth/          # JWT authentication
├── leads/         # إدارة الليدز
├── units/         # إدارة الوحدات العقارية
├── meetings/      # الاجتماعات
├── teams/         # الفرق والأعضاء
├── campaigns/     # الحملات التسويقية
├── whatsapp-web/  # WhatsApp Web.js (multi-session)
├── notifications/ # Real-time notifications
├── finance/       # المالية والعمولات
├── hr/            # الموارد البشرية
└── ...
```
