# 🔌 دليل مسارات API الكامل

> توثيق كل نقاط النهاية (Endpoints) المتاحة في التطبيق  
> **24 endpoint** عبر **7 ملفات مسارات**  
> آخر تحديث: 2026-03-05

---

## 📋 ملخص المسارات (24 endpoint)

| # | المسار | الطريقة | الوظيفة |
|---|--------|---------|---------|
| 1 | `/api/stores` | GET | قائمة المتاجر |
| 2 | `/api/stores/neighborhoods` | GET | قائمة الأحياء |
| 3 | `/api/stores/:slug` | GET | تفاصيل متجر |
| 4 | `/api/products` | GET | قائمة المنتجات |
| 5 | `/api/products/:id` | GET | تفاصيل منتج |
| 6 | `/api/products/:id/wishlist` | POST | تبديل الأمنيات |
| 7 | `/api/products/:id/share` | POST | تسجيل مشاركة |
| 8 | `/api/products/wishlist/:device_id` | GET | أمنيات جهاز |
| 9 | `/api/categories` | GET | كل التصنيفات |
| 10 | `/api/categories/:id` | GET | تفاصيل تصنيف |
| 11 | `/api/search?q=...` | GET | بحث شامل |
| 12 | `/api/search/visual?q=...` | GET | 🔎 بحث مرئي |
| 13 | `/api/qr/store/:slug` | GET | QR لمتجر |
| 14 | `/api/qr/product/:id` | GET | QR لمنتج |
| 15 | `/api/qr/scan` | POST | تسجيل مسح QR |
| 16 | `/api/qr/transaction` | POST | 🔐 إنشاء معاملة Escrow |
| 17 | `/api/qr/verify/:txCode` | GET | 🔐 تحقق من معاملة |
| 18 | `/api/qr/release/:txCode` | POST | 🔐 إفراج عن معاملة |
| 19 | `/api/stats/overview` | GET | إحصائيات عامة |
| 20 | `/api/stats/store/:id` | GET | إحصائيات متجر |
| 21 | `/api/loyalty/:device_id` | GET | 🪙 حساب الولاء |
| 22 | `/api/loyalty/checkin` | POST | 🪙 تسجيل دخول يومي |
| 23 | `/api/loyalty/share-reward` | POST | 🪙 مكافأة مشاركة |
| 24 | `/api/loyalty/qr-reward` | POST | 🪙 مكافأة QR |
| - | `/api/loyalty/leaderboard/top` | GET | 🏆 أعلى 10 |

---

## 🏪 مسارات المتاجر (`routes/stores.js`)

### GET /api/stores — قائمة المتاجر

**المعاملات:**
| المعامل | النوع | الافتراضي | الوصف |
|---------|-------|----------|-------|
| `neighborhood` | نص | - | فلترة حسب الحي |
| `featured` | `1` | - | فقط المميزة |
| `page` | رقم | `1` | رقم الصفحة |
| `limit` | رقم | `20` | عدد النتائج |
| `sort` | نص | `rating` | `rating`, `name`, `newest`, `reviews` |

**مثال:** `GET /api/stores?neighborhood=المشتل&sort=rating&page=1&limit=10`

**الرد:**
```json
{
  "stores": [{
    "id": 1,
    "name": "مستودع الأناقة للأثاث",
    "slug": "anaqa-furniture",
    "neighborhood": "المشتل",
    "rating": 4.5,
    "rating_count": 23,
    "product_count": 45,
    "subscription_type": "premium",
    "delivery_available": 1,
    "installment_available": 1
  }],
  "pagination": { "page": 1, "limit": 10, "total": 5, "pages": 1 }
}
```

---

### GET /api/stores/neighborhoods — قائمة الأحياء
```json
[
  { "neighborhood": "المشتل", "store_count": 3 },
  { "neighborhood": "النهضة", "store_count": 2 }
]
```

---

### GET /api/stores/:slug — تفاصيل متجر

**مثال:** `GET /api/stores/anaqa-furniture`

```json
{
  "store": { "id": 1, "name": "مستودع الأناقة", "subscription_type": "premium", "…": "…" },
  "reviews": [{ "reviewer_name": "أبو أحمد", "rating": 5, "comment": "ممتاز" }],
  "products": [{ "id": 1, "name": "كنب عربي", "price": 35000000, "…": "…" }],
  "categories": [{ "id": 3, "name": "صالونات وكنبايات", "count": 5 }]
}
```

---

## 📦 مسارات المنتجات (`routes/products.js`)

### GET /api/products — قائمة المنتجات

**المعاملات:**
| المعامل | النوع | الوصف |
|---------|-------|-------|
| `category` | رقم | فلترة حسب التصنيف (ويشمل الفرعية) |
| `store` | رقم | فلترة حسب المتجر |
| `featured` | `1` | فقط المميزة |
| `solar` | `1` | فقط متوافقة مع سولار |
| `negotiable` | `1` | فقط قابلة للتفاوض |
| `min_price` / `max_price` | رقم | نطاق السعر |
| `brand` | نص | العلامة التجارية |
| `material` | نص | المادة |
| `color` | نص | اللون |
| `country` | نص | بلد المنشأ |
| `search` | نص | بحث في الاسم والوصف |
| `sort` | نص | `featured`, `price_asc`, `price_desc`, `newest`, `popular`, `wishlist` |
| `page` / `limit` | رقم | ترقيم الصفحات |

**مثال:** `GET /api/products?category=3&sort=price_asc&min_price=10000000`

```json
{
  "products": [{
    "id": 5, "name": "غسالة أوتوماتيك سامسونج",
    "price": 32000000, "price_formatted": "32 مليون ل.س",
    "price_usd": 2162, "old_price": 38000000, "discount_percent": 16,
    "brand": "Samsung", "solar_compatible": 0
  }],
  "pagination": { "page": 1, "limit": 20, "total": 8, "pages": 1, "hasMore": false }
}
```

---

### GET /api/products/:id — تفاصيل منتج

> يزيد عداد المشاهدات تلقائياً (+1)

```json
{
  "product": {
    "id": 5, "name": "غسالة أوتوماتيك سامسونج",
    "price": 32000000, "price_formatted": "32 مليون ل.س",
    "brand": "Samsung", "warranty": "سنتين ضمان وكيل",
    "energy_rating": "A+", "solar_compatible": 0,
    "is_negotiable": 1,
    "view_count": 156, "wishlist_count": 12, "share_count": 8
  },
  "images": [{ "url": "...", "is_primary": 1 }],
  "reviews": [{ "reviewer_name": "أم محمد", "rating": 4, "comment": "غسالة ممتازة" }],
  "related": [{ "id": 6, "name": "غسالة بيكو", "price": 28000000 }]
}
```

---

### POST /api/products/:id/wishlist — تبديل الأمنيات
```json
// Body:
{ "device_id": "dev_1709654321_abc123def" }

// Response (إضافة):
{ "wishlisted": true, "message": "تم الإضافة إلى قائمة الأمنيات" }

// Response (إزالة):
{ "wishlisted": false, "message": "تم الإزالة من قائمة الأمنيات" }
```

---

### POST /api/products/:id/share — تسجيل مشاركة
```json
// Body:
{ "device_id": "dev_...", "platform": "whatsapp" }

// Response:
{ "success": true }
```

---

### GET /api/products/wishlist/:device_id — أمنيات جهاز

يُرجع قائمة المنتجات المحفوظة لهذا الجهاز.

---

## 📂 مسارات التصنيفات (`routes/categories.js`)

### GET /api/categories — كل التصنيفات
```json
[{
  "id": 1, "name": "أثاث منزلي", "name_en": "Furniture", "icon": "🛋️",
  "product_count": 150,
  "subcategory_count": 6,
  "subcategories": [
    { "id": 2, "name": "غرف نوم", "product_count": 25 },
    { "id": 3, "name": "صالونات وكنبايات", "product_count": 30 }
  ]
}]
```

---

### GET /api/categories/:id — تفاصيل تصنيف
```json
{
  "category": { "id": 14, "name": "أجهزة كهربائية", "icon": "⚡" },
  "subcategories": [
    { "id": 15, "name": "برادات وفريزرات" },
    { "id": 16, "name": "غسالات" }
  ],
  "filters": [{
    "filter_name": "السعة",
    "filter_type": "select",
    "filter_options": ["5 كيلو", "7 كيلو", "8 كيلو"]
  }],
  "priceRange": { "min_price": 15000000, "max_price": 120000000 },
  "brands": ["Samsung", "LG", "Ariston", "Beko"]
}
```

---

## 🔍 مسارات البحث (`routes/search.js`)

### GET /api/search?q=... — بحث شامل

**المعاملات:** `q` (حد أدنى 2 حرف)، `page`، `limit`

```json
{
  "products": [{ "id": 7, "name": "ثلاجة سامسونج 18 قدم", "price": 45000000 }],
  "stores": [{ "id": 3, "name": "كهربائيات الشام", "product_count": 15 }],
  "suggestions": ["ثلاجة سامسونج", "ثلاجة أريستون"],
  "total": 3
}
```

---

### GET /api/search/visual?q=... — 🔎 بحث مرئي (Visual Search)

> Mock implementation — يُرجع منتجات مع درجات تشابه مولّدة

```json
{
  "results": [{
    "id": 12, "name": "كنب زاوية مودرن",
    "similarity": 0.87, "price": 25000000
  }],
  "query": "كنب"
}
```

---

## 📊 مسارات QR والضمان الرقمي (`routes/qr.js`)

### GET /api/qr/store/:slug — QR لمتجر
```json
{
  "qr_data": "http://localhost:3000/#/store/anaqa-furniture",
  "store_name": "مستودع الأناقة",
  "store_slug": "anaqa-furniture"
}
```

### GET /api/qr/product/:id — QR لمنتج
### POST /api/qr/scan — تسجيل مسح QR

```json
// Body:
{ "entity_type": "product", "entity_id": 5, "device_id": "dev_..." }
```

---

### 🔐 POST /api/qr/transaction — إنشاء معاملة Escrow

```json
// Body:
{ "product_id": 5, "buyer_device_id": "dev_...", "amount": 32000000 }

// Response:
{
  "tx_code": "ESC-ABC12345",
  "qr_data": "http://localhost:3000/api/qr/verify/ESC-ABC12345",
  "status": "pending"
}
```

### 🔐 GET /api/qr/verify/:txCode — تحقق من معاملة
```json
{
  "tx_code": "ESC-ABC12345",
  "status": "pending",
  "amount": 32000000,
  "product_name": "غسالة سامسونج",
  "created_at": "2026-03-05T10:30:00Z"
}
```

### 🔐 POST /api/qr/release/:txCode — إفراج عن معاملة

```json
// Body:
{ "buyer_device_id": "dev_..." }

// Response:
{
  "status": "released",
  "message": "تم الإفراج عن المعاملة",
  "coins_awarded": 20
}
```

> يمنح المشتري 20 Market Coin تلقائياً عند الإفراج

---

## 📈 مسارات الإحصائيات (`routes/stats.js`)

### GET /api/stats/overview
```json
{
  "total_stores": 1500,
  "verified_stores": 120,
  "total_products": 25000,
  "total_categories": 33,
  "total_reviews": 18000,
  "avg_rating": 4.2,
  "top_stores": [],
  "popular_products": [],
  "by_category": []
}
```

### GET /api/stats/store/:id
```json
{
  "total_products": 45,
  "total_views": 1200,
  "total_shares": 89,
  "total_qr_scans": 34,
  "avg_rating": 4.5
}
```

---

## 🪙 مسارات الولاء (`routes/loyalty.js`)

### GET /api/loyalty/:device_id — حساب الولاء

> يُنشئ حساباً جديداً إذا لم يكن موجوداً

```json
{
  "account": {
    "coins": 150,
    "total_earned": 350,
    "level": "silver",
    "streak": 5
  },
  "transactions": [
    { "type": "checkin", "coins": 10, "description": "تسجيل دخول يومي", "created_at": "..." },
    { "type": "share", "coins": 5, "description": "مشاركة منتج", "created_at": "..." }
  ],
  "level_info": {
    "current": "silver",
    "next": "gold",
    "progress": 30,
    "coins_needed": 350
  }
}
```

---

### POST /api/loyalty/checkin — 🪙 تسجيل دخول يومي

```json
// Body:
{ "device_id": "dev_..." }

// Response (نجاح):
{
  "coins_earned": 10,
  "streak": 6,
  "multiplier": 1,
  "total_coins": 160,
  "message": "تسجيل دخول يومي! +10 نقاط"
}

// Response (سبق التسجيل اليوم):
{ "error": "سبق التسجيل اليوم", "already_checked_in": true }
```

> Streak بعد 7 أيام = مضاعف 2×

---

### POST /api/loyalty/share-reward — 🪙 مكافأة مشاركة

```json
// Body:
{ "device_id": "dev_...", "product_id": 5, "platform": "whatsapp" }

// Response:
{ "coins_earned": 5, "total_coins": 165 }

// أو إذا تجاوز الحد:
{ "error": "وصلت الحد الأقصى للمشاركات اليومية (5)" }
```

---

### POST /api/loyalty/qr-reward — 🪙 مكافأة مسح QR

```json
// Body:
{ "device_id": "dev_..." }

// Response:
{ "coins_earned": 3, "total_coins": 168 }

// أو:
{ "error": "وصلت الحد الأقصى لمسح QR اليوم (10)" }
```

---

### GET /api/loyalty/leaderboard/top — 🏆 أعلى 10

```json
[
  { "device_id": "dev_...", "total_earned": 1500, "level": "platinum", "rank": 1 },
  { "device_id": "dev_...", "total_earned": 980, "level": "gold", "rank": 2 }
]
```

---

## ⚠️ رموز الأخطاء

| الرمز | الوصف | مثال |
|-------|-------|------|
| 200 | نجاح | البيانات تم جلبها بنجاح |
| 400 | طلب خاطئ | `{ "error": "معرّف الجهاز مطلوب" }` |
| 404 | غير موجود | `{ "error": "المنتج غير موجود" }` |
| 500 | خطأ في الخادم | `{ "error": "حدث خطأ في الخادم" }` |

---

## 💡 ملاحظات مهمة

1. **الأسعار** تُرجع كأرقام خام + نص مُنسّق (`price` + `price_formatted`)
2. **التصفّح (Pagination)** متاح في المنتجات والمتاجر
3. **البحث** يحتاج حد أدنى **حرفين**
4. **عداد المشاهدات** يتزايد تلقائياً عند فتح تفاصيل المنتج
5. **الفلاتر** تعمل جميعها مع بعض (AND logic)
6. **نظام الولاء** يُنشئ حساباً تلقائياً عند أول طلب
7. **Escrow** يمنح 20 نقطة تلقائياً عند الإفراج
8. **الحدود اليومية** تُعاد تلقائياً كل يوم

---

*تم تحديث هذا التوثيق في 2026-03-05 — 24 endpoint عبر 7 مسارات*
