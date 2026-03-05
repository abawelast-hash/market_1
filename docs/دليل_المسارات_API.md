# 🔌 دليل مسارات API الكامل

> توثيق كل نقاط النهاية (Endpoints) المتاحة في التطبيق  
> كل مسار موثّق بالأمثلة والمعاملات والردود

---

## 📋 ملخص المسارات

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
| 12 | `/api/qr/store/:slug` | GET | QR لمتجر |
| 13 | `/api/qr/product/:id` | GET | QR لمنتج |
| 14 | `/api/qr/scan` | POST | تسجيل مسح QR |
| 15 | `/api/stats/overview` | GET | إحصائيات عامة |
| 16 | `/api/stats/store/:id` | GET | إحصائيات متجر |

---

## 🏪 مسارات المتاجر

### GET /api/stores - قائمة المتاجر

**المعاملات (Query Parameters):**
| المعامل | النوع | الافتراضي | الوصف |
|---------|-------|----------|-------|
| `neighborhood` | نص | - | فلترة حسب الحي |
| `featured` | `1` | - | فقط المتاجر المميزة |
| `page` | رقم | `1` | رقم الصفحة |
| `limit` | رقم | `20` | عدد النتائج بالصفحة |
| `sort` | نص | `rating` | الترتيب: `rating`, `name`, `newest`, `reviews` |

**مثال الطلب:**
```
GET /api/stores?neighborhood=المشتل&sort=rating&page=1&limit=10
```

**مثال الرد:**
```json
{
  "stores": [
    {
      "id": 1,
      "name": "مستودع الأناقة للأثاث",
      "slug": "anaqa-furniture",
      "description": "أكبر مستودع أثاث في الرقة",
      "phone": "0933-XXX-XXX",
      "whatsapp": "+963933XXXXXX",
      "neighborhood": "المشتل",
      "rating": 4.5,
      "rating_count": 23,
      "product_count": 45,
      "delivery_available": 1,
      "installment_available": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

---

### GET /api/stores/neighborhoods - قائمة الأحياء

**الطلب:** `GET /api/stores/neighborhoods`

**الرد:**
```json
[
  { "neighborhood": "المشتل", "store_count": 3 },
  { "neighborhood": "النهضة", "store_count": 2 },
  { "neighborhood": "الدرعية", "store_count": 2 }
]
```

---

### GET /api/stores/:slug - تفاصيل متجر

**مثال:** `GET /api/stores/anaqa-furniture`

**الرد:**
```json
{
  "store": {
    "id": 1,
    "name": "مستودع الأناقة للأثاث",
    "slug": "anaqa-furniture",
    "…": "…"
  },
  "reviews": [
    { "reviewer_name": "أبو أحمد", "rating": 5, "comment": "ممتاز" }
  ],
  "products": [
    { "id": 1, "name": "كنب عربي", "price": 3500000, "…": "…" }
  ],
  "categories": [
    { "id": 1, "name": "كنب وجلسات", "icon": "🛋️", "count": 5 }
  ]
}
```

---

## 📦 مسارات المنتجات

### GET /api/products - قائمة المنتجات

**المعاملات (Query Parameters):**
| المعامل | النوع | الوصف |
|---------|-------|-------|
| `category` | رقم | فلترة حسب التصنيف (ويشمل الفرعية) |
| `store` | رقم | فلترة حسب المتجر |
| `featured` | `1` | فقط المميزة |
| `solar` | `1` | فقط متوافقة مع سولار |
| `negotiable` | `1` | فقط قابلة للتفاوض |
| `min_price` | رقم | الحد الأدنى للسعر |
| `max_price` | رقم | الحد الأعلى للسعر |
| `brand` | نص | فلترة حسب العلامة التجارية |
| `material` | نص | فلترة حسب المادة |
| `color` | نص | فلترة حسب اللون |
| `country` | نص | فلترة حسب بلد المنشأ |
| `search` | نص | بحث في الاسم والوصف والوسوم |
| `sort` | نص | الترتيب (أنظر الجدول أدناه) |
| `page` | رقم | رقم الصفحة |
| `limit` | رقم | عدد النتائج |

**خيارات الترتيب:**
| القيمة | الوصف |
|--------|-------|
| `featured` | الأكثر تميزاً (افتراضي) |
| `price_asc` | السعر: الأقل أولاً |
| `price_desc` | السعر: الأعلى أولاً |
| `newest` | الأحدث أولاً |
| `popular` | الأكثر مشاهدة |
| `wishlist` | الأكثر رغبة |

**مثال:**
```
GET /api/products?category=3&sort=price_asc&min_price=1000000&max_price=5000000
```

**الرد:**
```json
{
  "products": [
    {
      "id": 5,
      "name": "غسالة أوتوماتيك سامسونج 7 كيلو",
      "price": 3200000,
      "price_formatted": "3,200,000 ل.س",
      "price_usd": 225,
      "old_price": 3800000,
      "discount_percent": 16,
      "brand": "Samsung",
      "store_name": "كهربائيات الشام",
      "store_whatsapp": "+963933XXXXXX",
      "category_name": "أجهزة كهربائية",
      "solar_compatible": 0,
      "image_url": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1,
    "hasMore": false
  }
}
```

---

### GET /api/products/:id - تفاصيل منتج

**مثال:** `GET /api/products/5`

**ملاحظة:** يزيد عداد المشاهدات تلقائياً (+1)

**الرد:**
```json
{
  "product": {
    "id": 5,
    "name": "غسالة أوتوماتيك سامسونج 7 كيلو",
    "price": 3200000,
    "price_formatted": "3.2 مليون ل.س",
    "brand": "Samsung",
    "origin_country": "كوريا الجنوبية",
    "material": null,
    "dimensions": "60×55×85 سم",
    "warranty": "سنتين ضمان وكيل",
    "solar_compatible": 0,
    "store_name": "كهربائيات الشام",
    "store_whatsapp": "+963933XXXXXX",
    "store_neighborhood": "النهضة",
    "delivery_available": 1,
    "installment_available": 1,
    "view_count": 156,
    "wishlist_count": 12,
    "share_count": 8
  },
  "images": [],
  "reviews": [
    { "reviewer_name": "أم محمد", "rating": 4, "comment": "غسالة ممتازة" }
  ],
  "related": [
    { "id": 6, "name": "غسالة بيكو 8 كيلو", "price": 2800000 }
  ]
}
```

---

### POST /api/products/:id/wishlist - تبديل الأمنيات

**الجسم (Body):**
```json
{ "device_id": "dev_1709654321_abc123def" }
```

**الردود المحتملة:**
```json
// إذا أُضيف:
{ "wishlisted": true, "message": "تم الإضافة إلى قائمة الأمنيات" }

// إذا أُزيل:
{ "wishlisted": false, "message": "تم الإزالة من قائمة الأمنيات" }
```

---

### POST /api/products/:id/share - تسجيل مشاركة

**الجسم (Body):**
```json
{ "device_id": "dev_1709654321_abc123def", "platform": "whatsapp" }
```

**الرد:**
```json
{ "success": true }
```

---

## 📂 مسارات التصنيفات

### GET /api/categories - كل التصنيفات

**الرد:**
```json
[
  {
    "id": 1,
    "name": "كنب وجلسات",
    "name_en": "sofas",
    "icon": "🛋️",
    "description": "كنب عربي وعصري، أطقم صالون، جلسات أرضية",
    "product_count": 15,
    "subcategory_count": 3,
    "subcategories": [
      { "id": 11, "name": "كنب عربي", "product_count": 5 },
      { "id": 12, "name": "أطقم صالون", "product_count": 6 },
      { "id": 13, "name": "كنب زاوية", "product_count": 4 }
    ]
  }
]
```

---

### GET /api/categories/:id - تفاصيل تصنيف

**مثال:** `GET /api/categories/3`

**الرد:**
```json
{
  "category": {
    "id": 3,
    "name": "أجهزة كهربائية",
    "icon": "⚡",
    "description": "غسالات، ثلاجات، مكيفات، أفران"
  },
  "subcategories": [
    { "id": 31, "name": "غسالات" },
    { "id": 32, "name": "ثلاجات" }
  ],
  "filters": [
    {
      "filter_name": "السعة",
      "filter_type": "select",
      "filter_options": ["5 كيلو", "7 كيلو", "8 كيلو", "10 كيلو"]
    }
  ],
  "priceRange": { "min_price": 1500000, "max_price": 12000000 },
  "brands": ["Samsung", "LG", "Ariston", "Beko"]
}
```

---

## 🔍 مسار البحث

### GET /api/search - بحث شامل

**المعاملات:**
| المعامل | النوع | الوصف |
|---------|-------|-------|
| `q` | نص | كلمة البحث (حد أدنى 2 حرف) |
| `page` | رقم | رقم الصفحة |
| `limit` | رقم | عدد النتائج |

**مثال:** `GET /api/search?q=ثلاجة`

**الرد:**
```json
{
  "products": [
    { "id": 7, "name": "ثلاجة سامسونج 18 قدم", "price": 4500000, "…": "…" }
  ],
  "stores": [
    { "id": 3, "name": "كهربائيات الشام", "product_count": 15 }
  ],
  "suggestions": ["ثلاجة سامسونج", "ثلاجة أريستون"],
  "total": 3
}
```

---

## 📊 مسارات QR والإحصائيات

### GET /api/qr/store/:slug
```json
{
  "qr_data": "http://localhost:3000/#/store/anaqa-furniture",
  "store_name": "مستودع الأناقة للأثاث",
  "store_slug": "anaqa-furniture"
}
```

### GET /api/stats/overview
```json
{
  "total_stores": 12,
  "verified_stores": 8,
  "total_products": 45,
  "total_categories": 10,
  "total_reviews": 23,
  "avg_rating": 4.2,
  "top_stores": [],
  "popular_products": [],
  "by_category": []
}
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
2. **التصفّح (Pagination)** متاح في endpoints المنتجات والمتاجر
3. **البحث** يحتاج حد أدنى **حرفين** ليعمل
4. **عداد المشاهدات** يتزايد تلقائياً عند فتح تفاصيل المنتج
5. **الفلاتر** تعمل جميعها مع بعض (AND logic)

---

*تم إنشاء هذا التوثيق تلقائياً بواسطة نظام التوثيق الآلي*
