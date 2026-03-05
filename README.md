# 🏪 دليل المستودعات والأسواق المنزلية - مدينة الرقة

<div align="center">

**تطبيق ويب تقدمي (PWA) لدليل المتاجر والمستودعات المنزلية في مدينة الرقة، سوريا**

![الإصدار](https://img.shields.io/badge/الإصدار-2.0.0-blue)
![الرخصة](https://img.shields.io/badge/الرخصة-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-v18+-brightgreen)
![PWA](https://img.shields.io/badge/PWA-متوافق-orange)
![Tables](https://img.shields.io/badge/جداول-14-purple)
![Endpoints](https://img.shields.io/badge/API-24_endpoints-red)

</div>

---

## 📖 عن المشروع

تطبيق **"دليل الرقة"** هو منصة Phygital شاملة للمستودعات والأسواق المنزلية في مدينة الرقة.
يمكن للمستخدمين تصفح المتاجر والمنتجات، مقارنة الأسعار، مشاركة المنتجات عبر واتساب،
كسب نقاط ولاء (Market Coins)، واستخدام نظام الضمان الرقمي (Escrow) — كل ذلك يعمل حتى بدون إنترنت!

### ✨ المزايا الرئيسية (17 ميزة)

- 🔍 **بحث شامل + بحث مرئي** — بالاسم أو العلامة التجارية أو بالصورة
- 📂 **33 تصنيف** — 5 أعمدة رئيسية (أثاث، مطبخ، إلكترونيات، سجاد، ديكور)
- 🏪 **دليل متاجر متعدد المستويات** — Premium / Standard / Local
- 💰 **مقارنة أسعار** — بالليرة السورية والدولار (أسعار 2026)
- ❤️ **قائمة أمنيات** — حفظ المنتجات
- 📲 **مشاركة واتساب** — مشاركة مباشرة
- 📡 **Offline-First** — يعمل بدون إنترنت + sync_queue
- 📱 **PWA** — قابل للتثبيت كتطبيق
- 🪙 **Market Coins** — نقاط ولاء (دخول يومي + مشاركة + QR)
- 🔐 **Escrow** — ضمان رقمي لحماية الشراء عبر QR
- 🏆 **Leaderboard** — لوحة متصدرين
- ☀️ **فلتر سولار** — منتجات متوافقة مع الطاقة الشمسية

---

## 🚀 التشغيل السريع

```bash
# 1. استنساخ المشروع
git clone https://github.com/abawelast-hash/market_1.git
cd market_1

# 2. تثبيت المكتبات
npm install

# 3. تعبئة البيانات التجريبية
npm run seed

# 4. تشغيل الخادم
npm start

# 5. افتح المتصفح
# http://localhost:3000
```

---

## 🛠️ التقنيات المستخدمة

| التقنية | الوصف |
|---------|-------|
| **Node.js** + **Express** | الخادم الخلفي (7 ملفات مسارات) |
| **sql.js** (SQLite) | قاعدة البيانات (14 جدول) |
| **HTML/CSS/JS** (Vanilla) | الواجهة الأمامية (10 ملفات JS) |
| **Service Worker** | العمل أوفلاين |
| **IndexedDB** | تخزين محلي |
| **PWA** | تطبيق ويب تقدمي |
| **Python 3** + Faker | مولّدات بيانات المحاكاة |

---

## 📁 هيكل المشروع

```
market_1/
├── server.js                  # الخادم الرئيسي
├── package.json               # إعدادات المشروع
├── docs-watcher.js            # 🕵️ جاسوس مراقبة الملفات
├── database/
│   ├── schema.js              # هيكل 14 جدول + helpers
│   ├── seed.js                # بيانات تجريبية
│   ├── generate_simulation.py # 🐍 مولّد V1 (1,200 متجر)
│   └── generate_souq_v2.py    # 🐍 مولّد V2 (1,500 متجر)
├── routes/
│   ├── stores.js              # 3 endpoints
│   ├── products.js            # 5 endpoints
│   ├── categories.js          # 2 endpoints
│   ├── search.js              # 2 endpoints (+ بحث مرئي)
│   ├── qr.js                  # 6 endpoints (+ Escrow)
│   ├── stats.js               # 2 endpoints
│   └── loyalty.js             # 🪙 5 endpoints (نقاط + مستويات)
├── public/
│   ├── index.html             # صفحة PWA
│   ├── sw.js                  # Service Worker
│   ├── manifest.json          # إعدادات PWA
│   ├── css/style.css          # التنسيقات RTL (~1,964 سطر)
│   ├── js/                    # 10 ملفات JS (~2,053 سطر)
│   └── icons/                 # الأيقونات
└── docs/                      # 📖 التوثيق الشامل (5 ملفات)
```

---

## 📋 الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `npm start` | تشغيل الخادم |
| `npm run seed` | تعبئة البيانات |
| `npm run setup` | تثبيت + تعبئة |
| `npm run docs:watch` | 🕵️ تشغيل جاسوس التوثيق |

---

## 🌐 API Endpoints (24 endpoint)

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/stores` | GET | قائمة المتاجر |
| `/api/stores/:slug` | GET | تفاصيل متجر |
| `/api/products` | GET | قائمة المنتجات (14 فلتر) |
| `/api/products/:id` | GET | تفاصيل منتج |
| `/api/categories` | GET | التصنيفات (33 تصنيف) |
| `/api/search?q=...` | GET | بحث شامل |
| `/api/search/visual` | GET | 🔎 بحث مرئي |
| `/api/qr/transaction` | POST | 🔐 إنشاء معاملة Escrow |
| `/api/qr/verify/:txCode` | GET | 🔐 تحقق من معاملة |
| `/api/qr/release/:txCode` | POST | 🔐 إفراج عن معاملة |
| `/api/loyalty/:device_id` | GET | 🪙 حساب الولاء |
| `/api/loyalty/checkin` | POST | 🪙 تسجيل دخول يومي |
| `/api/loyalty/leaderboard/top` | GET | 🏆 أعلى 10 |
| `/api/stats/overview` | GET | إحصائيات المنصة |

📖 [التوثيق الكامل للـ API](docs/دليل_المسارات_API.md)

---

## 🐍 مولّدات البيانات (للاختبار و ML)

| المولّد | المتاجر | المنتجات | المستخدمون | التفاعلات | الحجم |
|---------|---------|----------|-----------|----------|-------|
| V1 (`generate_simulation.py`) | 1,200 | 20,000 | 5,000 (6 شخصيات) | 164,000+ | ~38 MB |
| V2 (`generate_souq_v2.py`) | 1,500 | 25,000 | 8,000 (4 شخصيات) | 287,834 | ~57 MB |

V2 يتضمن: 70% co-occurrence, 40% last-30-day surge, 30,000 استعلام بحث بالهجة السورية, metadata JSON.

```bash
# تشغيل (يتطلب Python + Faker + pandas + tqdm)
python database/generate_souq_v2.py
```

---

## 📖 التوثيق

| الملف | المحتوى |
|-------|---------|
| [دليل التطبيق الشامل](docs/دليل_التطبيق_الشامل.md) | شرح كامل: 17 ميزة، 14 جدول، البنية التقنية |
| [دليل الملفات التفصيلي](docs/دليل_الملفات_التفصيلي.md) | شرح 42 ملف ووظائفه |
| [دليل المسارات API](docs/دليل_المسارات_API.md) | توثيق 24 API endpoint |
| [دليل التشغيل](docs/دليل_التشغيل.md) | التشغيل والإدارة وحل المشاكل |
| [سجل التغييرات](docs/سجل_التغييرات.md) | سجل كل عمليات التعديل (6 مراحل) |

---

## 📊 إحصائيات المشروع

| البند | القيمة |
|-------|--------|
| الملفات | 42 مصدري |
| الأسطر | ~9,700 |
| الجداول | 14 |
| الفهارس | 14 |
| Endpoints | 24 |
| الصفحات | 11 |

---

## 📜 الرخصة

MIT License - مفتوح المصدر

---

<div align="center">

**صُنع بـ ❤️ لمدينة الرقة، سوريا 🇸🇾**

</div>
