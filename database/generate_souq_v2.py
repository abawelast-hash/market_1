#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════╗
║  سوق الرقة V2 — Souq Al-Raqqah V2 Simulation Generator             ║
║  Hyper-realistic SQLite database for ML & RecSys stress-testing      ║
║  Author: Senior Data Architect & ML Engineering Division             ║
║  Date: 2026-03-05                                                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║  1,500  Stores   (Premium / Standard / Local)                        ║
║  25,000 Products (metadata JSON: brand, material, warranty, energy,  ║
║                   style_tags: Classic · Damascene · Modern)          ║
║  8,000  Users    (4 Personas: Bride, Budget Rebuilder, Tech, Guest)  ║
║  150k+  Interactions (view, wishlist, whatsapp_share, purchase)      ║
║  30,000 Search queries (Syrian dialect keywords)                     ║
║  12-month time-series with 40% last-30-day surge                     ║
║  70% co-occurrence correlation engine                                ║
╚═══════════════════════════════════════════════════════════════════════╝

Usage:
    pip install Faker pandas tqdm
    python database/generate_souq_v2.py

Output:
    database/souq_v2.db  (~60-80 MB)
"""

import sqlite3
import json
import random
import hashlib
import os
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
from itertools import chain

try:
    from faker import Faker
    import pandas as pd
    from tqdm import tqdm
except ImportError:
    print("❌  تثبيت المكتبات المطلوبة أولاً:")
    print("    pip install Faker pandas tqdm")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════
DB_PATH = Path(__file__).parent / "souq_v2.db"

NUM_STORES       = 1_500
NUM_PRODUCTS     = 25_000
NUM_USERS        = 8_000
NUM_INTERACTIONS = 160_000   # target ≥ 150k
NUM_SEARCHES     = 30_000
INTERACTION_DAYS = 365       # 12-month span
SURGE_DAYS       = 30        # last 30 days = 40% of interactions

BATCH_SIZE       = 5_000     # DB insert batch size
SEED             = 2026
random.seed(SEED)

fake_ar = Faker("ar_SA")
fake_ar.seed_instance(SEED)
fake_en = Faker("en_US")
fake_en.seed_instance(SEED)

NOW        = datetime(2026, 3, 5, 14, 0, 0)
START_DATE = NOW - timedelta(days=INTERACTION_DAYS)
SURGE_START = NOW - timedelta(days=SURGE_DAYS)

# 2026 exchange rate
SYP_PER_USD = 14_800

# ══════════════════════════════════════════════════════════════
#  1.  DOMAIN DATA — Ar-Raqqah / Syrian Context
# ══════════════════════════════════════════════════════════════

NEIGHBORHOODS = [
    "حي المشلب", "حي الفردوس", "شارع تل أبيض", "شارع الثورة",
    "حي الرشيد", "حي الثكنة", "حي المنصور", "حي الرميلة",
    "حي البريد", "حي الدرعية", "حي هشام بن عبد الملك",
    "حي النهضة", "حي الأندلس", "حي السبخة", "حي الطيار",
    "حي الحميدية", "حي الصناعة", "حي الهلالية", "حي الكسرة",
    "حي الرقة القديمة", "حي البدو", "حي 23 شباط",
    "شارع القوتلي", "شارع الكورنيش", "شارع الجسر",
]

SYRIAN_SURNAMES = [
    "الكردي", "العلي", "الحسين", "الحمد", "المحمد", "الخليل",
    "الجاسم", "العمر", "الأحمد", "الحسن", "العبدالله", "الخالد",
    "البكر", "الصالح", "المصطفى", "الإبراهيم", "الموسى",
    "السليمان", "القاسم", "الطاهر", "الشعار", "الشيخ",
    "الحاج", "الرشيد", "الدهام", "الفياض", "الملحم",
    "الحمادة", "العيسى", "الدرويش", "النجار", "الحداد",
]

FIRST_NAMES_M = [
    "أحمد", "محمد", "خالد", "عبدالله", "عمر", "يوسف", "سامي",
    "فراس", "مازن", "علي", "حسين", "مصطفى", "إبراهيم", "سعد",
    "طارق", "زياد", "نادر", "وليد", "باسل", "رامي", "عماد",
    "أنس", "كريم", "مروان", "غسان", "ماهر", "حاتم", "ثامر",
    "عدنان", "رياض", "محمود", "عبدالرحمن",
]

FIRST_NAMES_F = [
    "فاطمة", "نور", "هند", "لمى", "سارة", "ريم", "دانا", "ليلى",
    "مريم", "آلاء", "شهد", "رنا", "تالا", "جنى", "سلمى", "زينب",
    "عبير", "أسماء", "حنين", "رغد", "بيان", "رهف", "بتول",
    "سحر", "ميساء", "وعد", "لين", "يارا",
]

STORE_PREFIXES = [
    "مستودع", "معرض", "صالة", "مركز", "بيت", "دار", "كنوز",
    "واحة", "قصر", "مفروشات", "كهربائيات", "ديكورات", "أثاث",
    "سوق", "عالم", "بازار", "بورصة",
]

STORE_SUFFIXES = [
    "النور", "الفرات", "الرقة", "الشام", "العائلة", "المنزل",
    "الأمان", "السعادة", "الأناقة", "الجمال", "الحياة", "الموسم",
    "الخير", "الزهراء", "الشرق", "التوفير", "الرخاء", "البركة",
    "الوفاء", "النجمة", "الهدى", "الإبداع", "التميز",
]

# ─── Categories (5 pillars + subcategories) ───
CATEGORY_TREE = [
    # 0: Furniture
    {
        "name": "أثاث منزلي", "name_en": "Furniture", "icon": "🪑",
        "description": "غرف نوم، صالونات، طاولات وكراسي - أجود الأخشاب",
        "subs": [
            {"name": "غرف نوم", "icon": "🛏️"},
            {"name": "صالونات وكنبايات", "icon": "🛋️"},
            {"name": "طاولات سفرة", "icon": "🪑"},
            {"name": "طاولات وكراسي", "icon": "💺"},
            {"name": "خزائن وكومودينات", "icon": "🗄️"},
            {"name": "مكتبات ورفوف", "icon": "📚"},
        ],
        "templates": [
            "غرفة نوم كاملة {material} - تصميم {style}",
            "سرير {material} مع خزانة {doors} أبواب",
            "صالون {style} {seats} مقاعد - {fabric}",
            "كنبة زاوية {material} - {color}",
            "ركنة {style} قماش {fabric} - {color}",
            "طاولة سفرة {material} {seats} كراسي",
            "بوفيه {style} {material} مع مرآة",
            "خزانة ملابس {doors} أبواب {material}",
            "كومودينو {material} مع درجين - {color}",
            "مكتبة حائط {material} - {style}",
            "طقم طاولات متداخلة {material}",
            "طاولة مكتب {material} مع أدراج",
            "تسريحة {material} مع مرآة - {style}",
            "سرير أطفال {material} مع حماية - {color}",
        ],
        "brands": ["دمشقية", "حلبية", "صناعة محلية", "صناعة تركية", "إيطالي"],
        "materials": ["خشب زان", "خشب جوز", "MDF", "لاتيه", "خشب سنديان", "خشب صنوبر", "خشب بلوط"],
        "colors": ["أبيض", "بني طبيعي", "بني غامق", "رمادي", "أسود", "بيج", "عسلي", "جوزي"],
        "style_tags_pool": ["Classic", "Damascene", "Modern", "Rustic", "Ottoman", "Minimalist"],
        "price_range": (20_000_000, 60_000_000),  # 2026 inflation
        "warranty_months_range": (6, 60),
        "energy_class": None,
    },
    # 1: Kitchen
    {
        "name": "أدوات مطبخ", "name_en": "Kitchen", "icon": "🍳",
        "description": "طناجر، صحون، أدوات طبخ ومستلزمات المطبخ العصري",
        "subs": [
            {"name": "طناجر وقدور", "icon": "🍲"},
            {"name": "أطقم صحون وسفرة", "icon": "🍽️"},
            {"name": "سكاكين وأدوات قطع", "icon": "🔪"},
            {"name": "خلاطات وأجهزة مطبخ", "icon": "🥄"},
            {"name": "أطقم كاسات وفناجين", "icon": "☕"},
        ],
        "templates": [
            "طقم طناجر {material} {pieces} قطع - {brand}",
            "طقم صحون {material} {pieces} قطعة - {design}",
            "طقم كاسات {material} {pieces} قطعة - {design}",
            "طقم سكاكين {brand} {pieces} قطع - {material}",
            "قدر ضغط {brand} {capacity} لتر {material}",
            "مقلاة {brand} {size} سم {coating}",
            "طقم ملاعق وشوك {material} {pieces} قطعة",
            "صينية فرن {material} {size} سم",
            "خلاط {brand} {power} واط - {blades} شفرات",
            "حلة طبخ {material} {capacity} لتر",
            "إبريق شاي {material} - {brand}",
            "طقم فناجين قهوة {material} {pieces} قطع - {design}",
            "طقم ملاعق تقديم {material} - {brand}",
        ],
        "brands": ["OMS", "Güral", "Korkmaz", "Emsan", "Karaca", "صناعة محلية", "Zwilling", "WMF"],
        "materials": ["ستانلس ستيل", "غرانيت", "بورسلان", "سيراميك", "تيفال", "نحاس", "زجاج مقاوم"],
        "colors": ["أحمر", "أسود", "أبيض", "ذهبي", "رمادي", "أزرق", "بنفسجي"],
        "style_tags_pool": ["Classic", "Modern", "Ottoman", "Damascene", "Minimalist"],
        "price_range": (100_000, 8_000_000),  # 100k to 8M SYP
        "warranty_months_range": (0, 24),
        "energy_class": None,
    },
    # 2: Electronics
    {
        "name": "أجهزة كهربائية", "name_en": "Electronics", "icon": "📺",
        "description": "تلفزيونات، غسالات، برادات، مكيفات وأجهزة ذكية",
        "subs": [
            {"name": "برادات وفريزرات", "icon": "❄️"},
            {"name": "غسالات", "icon": "🧺"},
            {"name": "تلفزيونات وشاشات", "icon": "📺"},
            {"name": "مكيفات", "icon": "🌀"},
            {"name": "أجهزة سمارت هوم", "icon": "🏠"},
            {"name": "مكانس كهربائية", "icon": "🧹"},
            {"name": "أفران ومايكروويف", "icon": "♨️"},
        ],
        "templates": [
            "برّاد {brand} {capacity} قدم - {energy}",
            "غسالة {brand} {capacity} كيلو أوتوماتيك {energy}",
            "غسالة {brand} فوق أوتوماتيك {capacity} كيلو",
            "تلفزيون {brand} {size} بوصة {resolution} سمارت",
            "مكيف {brand} {capacity} BTU {type} - {energy}",
            "مكنسة كهربائية {brand} {power} واط",
            "مكنسة روبوت {brand} ذكية - WiFi",
            "فرن كهربائي {brand} {capacity} لتر",
            "مايكروويف {brand} {capacity} لتر ديجيتال",
            "ديب فريزر {brand} {capacity} لتر",
            "سماعة ذكية {brand} - مساعد صوتي",
            "كاميرا مراقبة {brand} WiFi - {resolution}",
            "قفل باب ذكي {brand} - بصمة + رقم سري",
            "ترموستات ذكي {brand} WiFi",
            "إنارة ذكية {brand} RGB WiFi - طقم {pieces} قطع",
        ],
        "brands": ["LG", "Samsung", "Beko", "Arçelik", "Toshiba", "Sharp", "Midea",
                    "TCL", "Hisense", "Hitachi", "Xiaomi", "Huawei", "Google"],
        "materials": ["ستانلس ستيل", "بلاستيك مقوى", "زجاج مقسى", "ألمنيوم"],
        "colors": ["فضي", "أبيض", "أسود", "رمادي غامق", "ذهبي", "تيتانيوم"],
        "style_tags_pool": ["Modern", "Smart", "EcoFriendly", "Minimalist", "Premium"],
        "price_range": (800_000, 35_000_000),
        "warranty_months_range": (12, 60),
        "energy_class": ["A", "A+", "A++", "A+++", "B", "C"],
    },
    # 3: Carpets
    {
        "name": "سجاد وموكيت", "name_en": "Carpets", "icon": "🟫",
        "description": "سجاد يدوي، سجاد ماكينة، موكيت وبسط",
        "subs": [
            {"name": "سجاد يدوي", "icon": "🧶"},
            {"name": "سجاد ماكينة", "icon": "🟫"},
            {"name": "موكيت", "icon": "🟩"},
            {"name": "بسط وحصر", "icon": "🟨"},
        ],
        "templates": [
            "سجادة {origin} يدوية {size} - {design}",
            "سجادة {origin} ماكينة {size} - {design}",
            "سجادة {brand} {size} - {density} عقدة/م²",
            "موكيت {brand} {width} متر - {material}",
            "بساط {origin} {size} - {material}",
            "سجادة مدخل {size} - {design}",
            "سجادة أطفال {size} - {design}",
            "سجادة مطبخ {size} مقاومة للماء",
            "حصيرة {material} {size} يدوية",
            "سجادة {style} {size} - غسيل ماكينة",
        ],
        "brands": ["صناعة إيرانية", "صناعة تركية", "صناعة محلية", "بلجيكي", "صيني", "مغربي"],
        "materials": ["حرير + صوف", "بولي بروبيلين", "صوف طبيعي", "قطن", "جوت", "بامبو"],
        "colors": ["أحمر كلاسيكي", "بيج", "رمادي", "أزرق", "كحلي", "متعدد الألوان", "عنابي"],
        "style_tags_pool": ["Classic", "Damascene", "Persian", "Modern", "Tribal", "Ottoman"],
        "price_range": (200_000, 20_000_000),
        "warranty_months_range": (0, 12),
        "energy_class": None,
    },
    # 4: Decor
    {
        "name": "ديكور ومنزليات", "name_en": "Decor", "icon": "🖼️",
        "description": "لوحات، مزهريات، ساعات، إضاءة وإكسسوارات ديكور",
        "subs": [
            {"name": "لوحات جدارية", "icon": "🎨"},
            {"name": "مزهريات وتحف", "icon": "🏺"},
            {"name": "ساعات حائط", "icon": "🕰️"},
            {"name": "إضاءة وثريات", "icon": "💡"},
            {"name": "مرايا ديكور", "icon": "🪞"},
            {"name": "شموع ومعطرات", "icon": "🕯️"},
        ],
        "templates": [
            "لوحة جدارية {style} {size} سم - {subject}",
            "مزهرية {material} {style} - ارتفاع {height} سم",
            "ساعة حائط {brand} {style} - {material}",
            "ثريا {material} {style} {arms} شعلة",
            "مرآة ديكور {style} {material} - {size} سم",
            "طقم شموع {scent} {pieces} قطع",
            "حامل نباتات {material} {levels} طوابق",
            "تحفة ديكور {material} {style}",
            "برواز صور {material} {size} سم - طقم {pieces}",
            "إضاءة أرضية {style} {material} - {brand}",
            "معطر جو فاخر {scent} - {brand}",
            "سبوت لايت {brand} {watt} واط LED",
            "شريط LED {brand} {length} متر RGB",
        ],
        "brands": ["صناعة يدوية", "صناعة محلية", "تركي", "IKEA Style", "Philips", "OSRAM", "Xiaomi"],
        "materials": ["خشب", "سيراميك", "زجاج", "معدن", "رخام", "ريزن", "كريستال", "نحاس"],
        "colors": ["ذهبي", "فضي", "أبيض", "أسود", "بيج", "متعدد الألوان", "نحاسي"],
        "style_tags_pool": ["Classic", "Damascene", "Modern", "Bohemian", "Industrial", "Scandinavian"],
        "price_range": (50_000, 12_000_000),
        "warranty_months_range": (0, 24),
        "energy_class": None,
    },
]

STYLES = ["عصري", "كلاسيكي", "ريفي", "مودرن", "إسكندنافي", "شرقي", "دمشقي", "عثماني"]
ORIGIN_COUNTRIES = ["سوريا", "تركيا", "الصين", "إيران", "مصر", "كوريا", "ألمانيا", "إيطاليا"]
WARRANTY_OPTIONS = ["بدون كفالة", "6 أشهر", "سنة", "سنتين", "3 سنوات", "5 سنوات"]

# ─── Correlation Map: category_idx → correlated sub-items ───
# If user buys from cat_idx, high chance they also browse these:
CORRELATION_MAP = {
    # Furniture → Kitchen (tableware with dining tables), Decor, Carpets
    0: [(1, 0.70, "طاولة سفرة→أطقم صحون"),
        (4, 0.55, "أثاث→ديكور"),
        (3, 0.45, "أثاث→سجاد")],
    # Kitchen → Furniture (dining tables), Electronics
    1: [(0, 0.60, "مطبخ→طاولة سفرة"),
        (2, 0.40, "مطبخ→كهربائيات")],
    # Electronics → Decor (smart lighting), Kitchen
    2: [(4, 0.45, "تقنية→إضاءة ذكية"),
        (1, 0.30, "كهربائيات→أجهزة مطبخ")],
    # Carpets → Furniture, Decor
    3: [(0, 0.65, "سجاد→أثاث"),
        (4, 0.50, "سجاد→ديكور")],
    # Decor → Furniture, Carpets, Lighting (electronics sub)
    4: [(0, 0.55, "ديكور→أثاث"),
        (3, 0.40, "ديكور→سجاد"),
        (2, 0.30, "ديكور→إلكترونيات")],
}

# ─── Personas ───
PERSONAS = {
    "bride": {
        "name_ar": "العروس",
        "weight": 0.28,
        "category_affinity": {0: 0.40, 1: 0.25, 4: 0.15, 3: 0.10, 2: 0.10},
        "price_preference": "high",
        "sessions_range": (25, 60),
        "review_style": {
            "avg_rating": 4.3,
            "positive": [
                "تصميم جميل ومناسب لتجهيز العرس",
                "جودة ممتازة تستاهل السعر",
                "اللون والتصميم طابقوا الصور بالضبط",
                "منتج راقي وفخم - أنصح فيه للعرسان",
                "الخشب طبيعي ومتين - شغل معلم",
                "التوصيل كان سريع والتركيب احترافي",
                "غرفة النوم أحلى من الصورة بكتير",
                "طقم المطبخ كامل ومتكامل - ما نقصنا شي",
            ],
            "negative": [
                "الأسعار عالية شوي بس الجودة كويسة",
                "التوصيل تأخر أسبوع عن الموعد",
                "اللون طلع غامق شوي عن الصورة",
                "كنت أتمنى يكون فيه ألوان أكثر للاختيار",
            ],
        },
        "search_terms": [
            "غرفة نوم عرسان", "طقم كنب زان", "غرفة نوم كاملة",
            "تسريحة عروس", "سرير مودرن", "صالون فخم",
            "طقم صحون بورسلان عرسان", "ستائر عرسان",
            "طقم مطبخ كامل للعروس", "خزانة ملابس كبيرة",
            "كنبة زاوية مودرن", "أثاث غرفة نوم دمشقي",
            "سجادة غرفة نوم", "لوحات ديكور غرفة نوم",
        ],
    },
    "budget_rebuilder": {
        "name_ar": "المُعمِّر",
        "weight": 0.32,
        "category_affinity": {0: 0.30, 1: 0.20, 2: 0.20, 3: 0.15, 4: 0.15},
        "price_preference": "low",
        "sessions_range": (30, 70),
        "review_style": {
            "avg_rating": 3.5,
            "positive": [
                "سعر ممتاز مقارنة بالسوق",
                "منتج عملي وسعره معقول",
                "أرخص سعر لقيته بالرقة",
                "ماشي الحال بهالسعر - منيح",
                "كويس للميزانية المحدودة",
            ],
            "negative": [
                "غالي شوي - لقيته أرخص عند غيرهم",
                "الجودة مو ولا بد بس السعر رخيص",
                "السعر مبالغ فيه لهالنوعية",
                "لو تنزل السعر شوي بيصير ممتاز",
                "السعر ما يناسب الجودة صراحة",
                "أتمنى عروض أكتر عالمنتجات الأساسية",
            ],
        },
        "search_terms": [
            "أثاث رخيص", "أرخص غسالة", "عروض أثاث",
            "طقم طناجر اقتصادي", "برّاد سعر مناسب",
            "كنبة رخيصة", "سجاد رخيص", "أثاث مستعمل",
            "تخفيضات أجهزة", "أسعار مطابخ", "غسالة أوتوماتيك رخيصة",
            "سرير اقتصادي", "أرخص تلفزيون", "عروض اليوم",
            "مكنسة كهربائية رخيصة", "طقم صحون سعر محروق",
        ],
    },
    "tech_enthusiast": {
        "name_ar": "التقني",
        "weight": 0.18,
        "category_affinity": {2: 0.50, 4: 0.20, 0: 0.10, 1: 0.10, 3: 0.10},
        "price_preference": "mid_high",
        "sessions_range": (20, 50),
        "review_style": {
            "avg_rating": 4.1,
            "positive": [
                "جهاز ممتاز - يدعم WiFi والتحكم عن بعد",
                "أداء ممتاز وتوفير بالكهرباء A+++",
                "الشاشة نوعية فوق الممتاز - ألوان حقيقية",
                "سمارت هوم بكل معنى الكلمة",
                "متوافق مع Google Home - تحكم صوتي",
                "كاميرا مراقبة نقية جداً حتى بالليل",
            ],
            "negative": [
                "التطبيق بيهنج أحياناً",
                "ما فيه دعم للغة العربية بالتطبيق",
                "الواي فاي ببعض الأحيان بينقطع عنه",
                "حبيت لو كان فيه تحديثات أسرع",
            ],
        },
        "search_terms": [
            "شاشة سمارت 4K", "غسالة إنفرتر", "مكيف سبليت إنفرتر",
            "كاميرا مراقبة واي فاي", "سمارت هوم", "قفل ذكي",
            "إنارة ذكية RGB", "مكنسة روبوت", "تلفزيون OLED",
            "أجهزة ذكية للمنزل", "ترموستات ذكي",
            "سماعة ذكية", "برّاد إنفرتر توفير", "مايكروويف ديجيتال",
            "جوجل هوم", "أليكسا عربي",
        ],
    },
    "guest": {
        "name_ar": "الزائر",
        "weight": 0.22,
        "category_affinity": {0: 0.20, 1: 0.20, 2: 0.20, 3: 0.20, 4: 0.20},
        "price_preference": "random",
        "sessions_range": (1, 10),
        "review_style": {
            "avg_rating": 3.8,
            "positive": [
                "منتج كويس", "حلو", "مناسب", "تمام",
                "شكله حلو", "ممتاز",
            ],
            "negative": [
                "مو ولا بد", "عادي", "ما عجبني",
                "أفضل منه موجود",
            ],
        },
        "search_terms": [
            "كنب", "غسالة", "برّاد", "سجاد", "تلفزيون",
            "مطبخ", "سرير", "ثريا", "طاولة", "مكيف",
            "فرن", "مرآة", "ساعة حائط", "شموع",
        ],
    },
}


# ══════════════════════════════════════════════════════════════
#  2.  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════

def slugify(text: str) -> str:
    h = hashlib.md5(text.encode()).hexdigest()[:8]
    clean = text.replace(" ", "-").replace("/", "-")
    return f"{clean}-{h}"


def timestamp_with_surge(start: datetime, end: datetime, surge_start: datetime, surge_pct: float = 0.40) -> str:
    """
    Generate timestamp with the last-30-day surge pattern.
    surge_pct of all timestamps fall within [surge_start, end].
    """
    if random.random() < surge_pct:
        # Surge period (last 30 days)
        delta = (end - surge_start).total_seconds()
        secs = int(random.uniform(0, delta))
        dt = surge_start + timedelta(seconds=secs)
    else:
        # Normal period (before surge)
        delta = (surge_start - start).total_seconds()
        if delta <= 0:
            delta = 1
        secs = int(random.uniform(0, delta))
        dt = start + timedelta(seconds=secs)
    # Add hour-of-day realism: most shopping 9am-11pm
    hour = random.choices(
        range(24),
        weights=[1,0,0,0,0,0,1,2,4,8,10,10,8,7,6,7,8,10,12,14,12,10,6,3],
        k=1
    )[0]
    dt = dt.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def random_phone() -> str:
    prefix = random.choice(["932", "933", "934", "936", "937", "938", "944", "946", "947", "954", "956", "958"])
    return f"+963{prefix}{random.randint(100000, 999999)}"


def random_working_hours() -> str:
    opens = random.choice(["7", "8", "9", "10"])
    closes = random.choice(["7", "8", "9", "10"])
    return f"{opens} صباحاً - {closes} مساءً"


def gen_product_name(cat: dict) -> str:
    template = random.choice(cat["templates"])
    brand = random.choice(cat["brands"])
    material = random.choice(cat["materials"])
    color = random.choice(cat["colors"])
    style = random.choice(STYLES)
    reps = {
        "{brand}": brand, "{material}": material, "{color}": color, "{style}": style,
        "{size}": str(random.choice([30,40,50,55,60,65,80,100,120,150,160,200,250,300])),
        "{capacity}": str(random.choice([5,7,8,9,10,12,14,15,16,18,20,25,30,40,50,100,200,400])),
        "{pieces}": str(random.choice([3,4,5,6,7,8,10,12,16,18,24,28,32,48,72,84])),
        "{seats}": str(random.choice([4,5,6,7,8,10,12])),
        "{doors}": str(random.choice([2,3,4,5,6])),
        "{power}": str(random.choice([250,350,500,600,700,800,1000,1200,1500,2000])),
        "{watt}": str(random.choice([5,7,9,10,12,15,18,20,30,50,100])),
        "{height}": str(random.choice([15,20,25,30,40,50,60,80])),
        "{energy}": random.choice(["إنفرتر", "عادي", "موفر للطاقة", "A+", "A++"]),
        "{type}": random.choice(["سبليت", "شباك", "متنقل", "كهربائي", "LED"]),
        "{resolution}": random.choice(["Full HD", "4K UHD", "8K", "OLED 4K"]),
        "{fabric}": random.choice(["شانيل", "كتان", "قطيفة", "مخمل", "جلد صناعي"]),
        "{coating}": random.choice(["تيفال", "سيراميك", "غرانيت", "ستانلس"]),
        "{design}": random.choice(["فلورال كلاسيكي", "هندسي عصري", "عثماني", "سادة", "مودرن"]),
        "{subject}": random.choice(["طبيعة", "خط عربي", "تجريدي", "ورود", "إسلامي"]),
        "{scent}": random.choice(["لافندر", "فانيلا", "ياسمين", "عود", "مسك"]),
        "{arms}": str(random.choice([3,5,6,8,10,12,15,18])),
        "{levels}": str(random.choice([2,3,4,5])),
        "{blades}": str(random.choice([4,6,8])),
        "{density}": str(random.choice([500000,700000,1000000,1500000])),
        "{width}": str(random.choice([2,3,4,5])),
        "{origin}": random.choice(["إيراني", "تركي", "بلجيكي", "محلي", "صيني", "مغربي"]),
        "{length}": str(random.choice([2,3,5,10,15,20])),
    }
    for k, v in reps.items():
        template = template.replace(k, v)
    return template


def gen_metadata(cat_idx: int, cat: dict) -> str:
    """Produce the required metadata JSON: brand, material, warranty_months, energy_class, style_tags."""
    brand = random.choice(cat["brands"])
    material = random.choice(cat["materials"])
    wm_lo, wm_hi = cat.get("warranty_months_range", (0, 24))
    warranty_months = random.choice(list(range(wm_lo, wm_hi + 1, 6)) or [0])
    energy_pool = cat.get("energy_class")
    energy_class = random.choice(energy_pool) if energy_pool else None
    n_tags = random.randint(1, 3)
    style_tags = random.sample(cat["style_tags_pool"], min(n_tags, len(cat["style_tags_pool"])))

    meta = {
        "brand": brand,
        "material": material,
        "warranty_months": warranty_months,
        "energy_class": energy_class,
        "style_tags": style_tags,
        "quality_score": round(random.uniform(2.5, 5.0), 1),
        "popularity_rank": random.randint(1, 2000),
        "is_trending": random.random() < 0.12,
    }
    if cat_idx == 0:
        meta["wood_type"] = random.choice(["زان", "جوز", "MDF", "سنديان", "بلوط"])
        meta["assembly_required"] = random.random() < 0.35
    elif cat_idx == 2:
        meta["power_consumption"] = f"{random.randint(50, 2500)}W"
        meta["smart_features"] = random.random() < 0.35
        meta["inverter_compatible"] = random.random() < 0.55
    return json.dumps(meta, ensure_ascii=False)


def gen_price(cat: dict, persona_price_pref: str = "mid") -> tuple:
    """Price generator with 2026 Syrian inflation."""
    lo, hi = cat["price_range"]
    if persona_price_pref == "high":
        price = random.randint(int(hi * 0.4) // 10_000, hi // 10_000) * 10_000
    elif persona_price_pref == "low":
        price = random.randint(lo // 10_000, int(lo + (hi - lo) * 0.35) // 10_000) * 10_000
    else:
        price = random.randint(lo // 10_000, hi // 10_000) * 10_000

    has_discount = random.random() < 0.22
    old_price = None
    if has_discount:
        old_price = int(price / (1 - random.choice([5, 10, 15, 20, 25, 30]) / 100))
        old_price = (old_price // 10_000) * 10_000
    price_usd = round(price / SYP_PER_USD, 2)
    return price, old_price, price_usd


# ══════════════════════════════════════════════════════════════
#  3.  SCHEMA CREATION
# ══════════════════════════════════════════════════════════════

def create_database(db_path: str) -> sqlite3.Connection:
    if os.path.exists(db_path):
        os.remove(db_path)
    # Also remove WAL/SHM from previous runs
    for ext in ["-wal", "-shm"]:
        p = db_path + ext
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA cache_size=-64000")  # 64 MB cache
    c = conn.cursor()
    c.executescript("""
    -- ═══════════════════════════════════════
    -- CORE TABLES (schema.js compatible)
    -- ═══════════════════════════════════════
    CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_en TEXT,
        icon TEXT,
        description TEXT,
        parent_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        owner_name TEXT,
        phone TEXT,
        whatsapp TEXT,
        address TEXT,
        neighborhood TEXT,
        latitude REAL,
        longitude REAL,
        logo_url TEXT,
        cover_url TEXT,
        is_verified INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        working_hours TEXT,
        delivery_available INTEGER DEFAULT 0,
        installment_available INTEGER DEFAULT 0,
        qr_code_url TEXT,
        subscription_type TEXT DEFAULT 'free',
        subscription_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        category_id INTEGER,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        price REAL,
        price_currency TEXT DEFAULT 'SYP',
        price_usd REAL,
        old_price REAL,
        is_negotiable INTEGER DEFAULT 0,
        brand TEXT,
        origin_country TEXT,
        material TEXT,
        dimensions TEXT,
        color TEXT,
        weight TEXT,
        energy_rating TEXT,
        solar_compatible INTEGER DEFAULT 0,
        warranty TEXT,
        in_stock INTEGER DEFAULT 1,
        stock_quantity INTEGER,
        is_featured INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        wishlist_count INTEGER DEFAULT 0,
        qr_scan_count INTEGER DEFAULT 0,
        share_count INTEGER DEFAULT 0,
        tags TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        alt_text TEXT,
        is_primary INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        width INTEGER,
        height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER,
        product_id INTEGER,
        user_id INTEGER,
        reviewer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE wishlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, product_id)
    );
    CREATE TABLE qr_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        device_id TEXT,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        store_id INTEGER,
        platform TEXT DEFAULT 'whatsapp',
        device_id TEXT,
        shared_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE category_filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        filter_name TEXT NOT NULL,
        filter_name_en TEXT,
        filter_type TEXT DEFAULT 'select',
        filter_options TEXT,
        sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE escrow_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_code TEXT UNIQUE NOT NULL,
        product_id INTEGER NOT NULL,
        store_id INTEGER NOT NULL,
        buyer_device_id TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        released_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE loyalty_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        coins INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        streak INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE loyalty_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        type TEXT NOT NULL,
        coins INTEGER NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE daily_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        date TEXT NOT NULL,
        coins_earned INTEGER DEFAULT 1,
        UNIQUE(device_id, date)
    );
    CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════
    -- V2 SIMULATION TABLES
    -- ═══════════════════════════════════════
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        persona TEXT NOT NULL,
        persona_ar TEXT NOT NULL,
        display_name TEXT,
        age_group TEXT,
        neighborhood TEXT,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        store_id INTEGER,
        category_id INTEGER,
        interaction_type TEXT NOT NULL,
        session_id TEXT,
        duration_seconds INTEGER,
        metadata TEXT,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        device_id TEXT NOT NULL,
        query TEXT NOT NULL,
        results_count INTEGER DEFAULT 0,
        clicked_product_id INTEGER,
        session_id TEXT,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)
    conn.commit()
    return conn


def create_indexes(conn: sqlite3.Connection):
    print("📇  إنشاء الفهارس (40+ فهرس)...")
    idx = [
        # Core
        "CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id)",
        "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)",
        "CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)",
        "CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)",
        "CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock)",
        "CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)",
        "CREATE INDEX IF NOT EXISTS idx_products_tags ON products(tags)",
        "CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)",
        "CREATE INDEX IF NOT EXISTS idx_stores_neighborhood ON stores(neighborhood)",
        "CREATE INDEX IF NOT EXISTS idx_stores_featured ON stores(is_featured)",
        "CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug)",
        "CREATE INDEX IF NOT EXISTS idx_stores_rating ON stores(rating DESC)",
        "CREATE INDEX IF NOT EXISTS idx_wishlists_device ON wishlists(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_wishlists_product ON wishlists(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_pimg_product ON product_images(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews(store_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)",
        "CREATE INDEX IF NOT EXISTS idx_escrow_tx ON escrow_transactions(tx_code)",
        "CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_transactions(buyer_device_id)",
        "CREATE INDEX IF NOT EXISTS idx_loyalty_device ON loyalty_accounts(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_loyalty_tx_dev ON loyalty_transactions(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_checkins_dev ON daily_checkins(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status)",
        # Simulation
        "CREATE INDEX IF NOT EXISTS idx_users_persona ON users(persona)",
        "CREATE INDEX IF NOT EXISTS idx_users_device ON users(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_ix_user ON user_interactions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_ix_product ON user_interactions(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_ix_category ON user_interactions(category_id)",
        "CREATE INDEX IF NOT EXISTS idx_ix_type ON user_interactions(interaction_type)",
        "CREATE INDEX IF NOT EXISTS idx_ix_time ON user_interactions(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_ix_session ON user_interactions(session_id)",
        "CREATE INDEX IF NOT EXISTS idx_ix_device ON user_interactions(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_ix_store ON user_interactions(store_id)",
        # Composite (ML-critical)
        "CREATE INDEX IF NOT EXISTS idx_ix_user_type ON user_interactions(user_id, interaction_type)",
        "CREATE INDEX IF NOT EXISTS idx_ix_user_cat ON user_interactions(user_id, category_id)",
        "CREATE INDEX IF NOT EXISTS idx_ix_prod_type ON user_interactions(product_id, interaction_type)",
        "CREATE INDEX IF NOT EXISTS idx_ix_cat_time ON user_interactions(category_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_p_cat_price ON products(category_id, price)",
        "CREATE INDEX IF NOT EXISTS idx_p_store_cat ON products(store_id, category_id)",
        # Search history
        "CREATE INDEX IF NOT EXISTS idx_sh_user ON search_history(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_sh_device ON search_history(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_sh_query ON search_history(query)",
        "CREATE INDEX IF NOT EXISTS idx_sh_time ON search_history(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_sh_session ON search_history(session_id)",
        # Trending: compound timestamp + type
        "CREATE INDEX IF NOT EXISTS idx_ix_time_type ON user_interactions(created_at, interaction_type)",
    ]
    for sql in idx:
        conn.execute(sql)
    conn.commit()


# ══════════════════════════════════════════════════════════════
#  4.  DATA GENERATORS (batch-optimized)
# ══════════════════════════════════════════════════════════════

def gen_categories(conn: sqlite3.Connection) -> dict:
    print("📂  إنشاء التصنيفات...")
    c = conn.cursor()
    cat_map = {}
    for idx, cat in enumerate(CATEGORY_TREE):
        c.execute("INSERT INTO categories (name, name_en, icon, description, sort_order) VALUES (?,?,?,?,?)",
                  (cat["name"], cat["name_en"], cat["icon"], cat["description"], idx + 1))
        pid = c.lastrowid
        subs = []
        for si, sub in enumerate(cat.get("subs", [])):
            c.execute("INSERT INTO categories (name, icon, parent_id, sort_order) VALUES (?,?,?,?)",
                      (sub["name"], sub["icon"], pid, si + 1))
            subs.append(c.lastrowid)
        cat_map[idx] = {"id": pid, "sub_ids": subs}

        # Category-specific filters
        filters = []
        if idx == 0:  # Furniture
            filters = [
                ("نوع الخشب", "wood_type", "select", json.dumps(["زان","جوز","MDF","سنديان","بلوط"], ensure_ascii=False)),
                ("اللون", "color", "select", json.dumps(["أبيض","بني","رمادي","أسود","بيج"], ensure_ascii=False)),
                ("الستايل", "style", "select", json.dumps(["عصري","كلاسيكي","دمشقي","مودرن"], ensure_ascii=False)),
            ]
        elif idx == 1:  # Kitchen
            filters = [
                ("المادة", "material", "select", json.dumps(["ستانلس ستيل","غرانيت","بورسلان","سيراميك","تيفال"], ensure_ascii=False)),
                ("الماركة", "brand", "select", json.dumps(["OMS","Korkmaz","Emsan","Karaca","Zwilling"], ensure_ascii=False)),
            ]
        elif idx == 2:  # Electronics
            filters = [
                ("موفر للطاقة", "energy_saver", "boolean", None),
                ("سمارت", "smart", "boolean", None),
                ("الماركة", "brand", "select", json.dumps(["LG","Samsung","Beko","Toshiba","Xiaomi"], ensure_ascii=False)),
            ]
        elif idx == 3:  # Carpets
            filters = [
                ("المنشأ", "origin", "select", json.dumps(["إيراني","تركي","بلجيكي","محلي"], ensure_ascii=False)),
                ("الخامة", "material", "select", json.dumps(["صوف","حرير","بولي بروبيلين","قطن"], ensure_ascii=False)),
            ]
        elif idx == 4:  # Decor
            filters = [
                ("الستايل", "style", "select", json.dumps(["عصري","كلاسيكي","بوهيمي","صناعي"], ensure_ascii=False)),
            ]
        for fi, (fn, fen, ft, fo) in enumerate(filters):
            c.execute("INSERT INTO category_filters (category_id,filter_name,filter_name_en,filter_type,filter_options,sort_order) VALUES (?,?,?,?,?,?)",
                      (pid, fn, fen, ft, fo, fi + 1))
    conn.commit()
    return cat_map


def gen_stores(conn: sqlite3.Connection) -> list:
    """1,500 stores: ~8% Premium, ~30% Standard, ~62% Local."""
    print(f"🏪  إنشاء {NUM_STORES:,} متجر...")
    c = conn.cursor()
    stores = []
    used_slugs = set()

    n_premium  = int(NUM_STORES * 0.08)   # 120
    n_standard = int(NUM_STORES * 0.30)    # 450
    n_local    = NUM_STORES - n_premium - n_standard  # 930

    tiers = (
        [("premium", True, True)]  * n_premium +
        [("standard", True, False)] * n_standard +
        [("local", False, False)]   * n_local
    )
    random.shuffle(tiers)

    rows = []
    for i in tqdm(range(NUM_STORES), desc="   المتاجر", ncols=80):
        tier, is_verified, is_featured = tiers[i]
        prefix = random.choice(STORE_PREFIXES)
        suffix = random.choice(STORE_SUFFIXES)
        extra = random.choice(SYRIAN_SURNAMES) if random.random() < 0.35 else ""
        name = f"{prefix} {suffix}" + (f" {extra}" if extra else "")

        slug = slugify(name)
        while slug in used_slugs:
            slug = slugify(name + str(random.randint(1, 99999)))
        used_slugs.add(slug)

        gender = "M" if random.random() < 0.78 else "F"
        fn = random.choice(FIRST_NAMES_M if gender == "M" else FIRST_NAMES_F)
        ln = random.choice(SYRIAN_SURNAMES)
        owner = f"{fn} {ln}"
        neighborhood = random.choice(NEIGHBORHOODS)
        phone = random_phone()

        if tier == "premium":
            rating = round(random.uniform(4.2, 5.0), 1)
            rating_count = random.randint(40, 200)
        elif tier == "standard":
            rating = round(random.uniform(3.5, 4.8), 1)
            rating_count = random.randint(10, 90)
        else:
            rating = round(random.uniform(2.0, 4.5), 1)
            rating_count = random.randint(0, 40)

        street = random.choice(["شارع", "جادة", "سوق"])
        road = random.choice(["تل أبيض", "23 شباط", "الجسر", "الكورنيش", "القوتلي", "الثورة",
                               "فلسطين", "حمص", "الفرات", "الجمهورية", "الوحدة", "الهال"])
        near = ""
        if random.random() < 0.45:
            near = f" - قرب {random.choice(['دوار الساعة','جامع النور','المدرسة الصناعية','مشفى الرقة','السوق المسقوف','البريد القديم','الحديقة العامة'])}"
        address = f"{street} {road}{near}"

        cat_focus = random.choice(["أثاث","أجهزة","مفروشات","منزليات","إضاءة","ديكور","سجاد","مطابخ"])
        desc = random.choice([
            f"أفضل {cat_focus} في الرقة - خدمة متميزة وأسعار منافسة",
            f"تشكيلة واسعة من {cat_focus} بأجود الخامات",
            f"أسعار منافسة وجودة مضمونة - خبرة {random.randint(5,30)} سنة",
            f"مركز متخصص في {cat_focus} - توصيل لجميع الأحياء",
        ])

        sub_type = {"premium":"premium","standard":"standard","local":"free"}[tier]
        sub_expires = (NOW + timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d") if tier != "local" else None
        delivery = 1 if (tier == "premium" or random.random() < 0.45) else 0
        installment = 1 if (tier == "premium" or random.random() < 0.30) else 0
        lat = round(35.945 + random.uniform(-0.035, 0.035), 6)
        lon = round(38.997 + random.uniform(-0.045, 0.045), 6)
        created = timestamp_with_surge(START_DATE - timedelta(days=200), NOW - timedelta(days=30), SURGE_START, surge_pct=0.1)

        rows.append((
            name, slug, desc, owner, phone, phone, address, neighborhood, lat, lon,
            1 if is_verified else 0, 1 if is_featured else 0, rating, rating_count,
            random_working_hours(), delivery, installment, sub_type, sub_expires, created, created
        ))
        stores.append({"id": i + 1, "name": name, "slug": slug, "tier": tier, "neighborhood": neighborhood, "rating": rating})

    c.executemany("""INSERT INTO stores (name,slug,description,owner_name,phone,whatsapp,address,
                     neighborhood,latitude,longitude,is_verified,is_featured,rating,rating_count,
                     working_hours,delivery_available,installment_available,subscription_type,
                     subscription_expires,created_at,updated_at)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", rows)
    conn.commit()
    return stores


def gen_products(conn: sqlite3.Connection, stores: list, cat_map: dict) -> list:
    print(f"📦  إنشاء {NUM_PRODUCTS:,} منتج مع metadata JSON...")
    c = conn.cursor()
    products = []
    used_slugs = set()

    store_weights = [{"premium": 5.0, "standard": 2.0, "local": 1.0}[s["tier"]] for s in stores]

    rows = []
    for i in tqdm(range(NUM_PRODUCTS), desc="   المنتجات", ncols=80):
        store = random.choices(stores, weights=store_weights, k=1)[0]
        cat_idx = random.choices(range(len(CATEGORY_TREE)), weights=[0.28, 0.22, 0.22, 0.14, 0.14], k=1)[0]
        cat = CATEGORY_TREE[cat_idx]
        cat_info = cat_map[cat_idx]

        category_id = random.choice(cat_info["sub_ids"]) if (cat_info["sub_ids"] and random.random() < 0.75) else cat_info["id"]

        name = gen_product_name(cat)
        slug = slugify(name)
        while slug in used_slugs:
            slug = slugify(name + str(random.randint(1, 99999)))
        used_slugs.add(slug)

        price, old_price, price_usd = gen_price(cat)
        desc_parts = [
            name + ".",
            random.choice([
                "منتج عالي الجودة مصنوع من أفضل الخامات.",
                "تصميم أنيق يناسب جميع الأذواق.",
                "خامة ممتازة وعمر افتراضي طويل.",
                "يتميز بالمتانة والأناقة معاً.",
                "متوفر بعدة ألوان وأحجام.",
            ]),
            random.choice([
                "متوفر في مستودعاتنا مع التوصيل لكل أحياء الرقة.",
                "يمكن الطلب عبر واتساب.",
                "الكمية محدودة - اطلبه الآن.",
                "مع إمكانية التقسيط المريح.",
                "ضمان حقيقي من الشركة المصنعة.",
            ])
        ]
        desc = " ".join(desc_parts)
        metadata = gen_metadata(cat_idx, cat)
        brand = random.choice(cat["brands"])
        material = random.choice(cat["materials"])
        color = random.choice(cat["colors"])
        origin = random.choice(ORIGIN_COUNTRIES)
        warranty = random.choice(WARRANTY_OPTIONS)
        energy = random.choice(cat.get("energy_class") or [None])
        solar_compat = 1 if (cat_idx == 2 and random.random() < 0.35) else 0
        is_negotiable = 1 if random.random() < 0.28 else 0
        in_stock = 1 if random.random() < 0.87 else 0
        stock_qty = random.randint(1, 80) if in_stock else 0
        is_featured = 1 if random.random() < 0.10 else 0
        view_count = int(random.paretovariate(1.5) * 12)
        wishlist_count = max(0, int(view_count * random.uniform(0.02, 0.12)))
        share_count = max(0, int(view_count * random.uniform(0.01, 0.07)))
        qr_count = max(0, int(view_count * random.uniform(0.005, 0.025)))

        tag_pool = name.split()[:5] + [brand, material, color, cat["name"]]
        tags = ",".join(random.sample(tag_pool, min(len(tag_pool), random.randint(3, 6))))

        dims, weight = None, None
        if cat_idx in [0, 2]:
            dims = f"{random.randint(30,250)}x{random.randint(30,200)}x{random.randint(20,150)} سم"
            weight = f"{round(random.uniform(0.5, 80), 1)} كغ"

        created = timestamp_with_surge(START_DATE, NOW, SURGE_START, surge_pct=0.25)

        rows.append((
            store["id"], category_id, name, slug, desc, price, "SYP", price_usd, old_price,
            is_negotiable, brand, origin, material, dims, color, weight, energy, solar_compat,
            warranty, in_stock, stock_qty, is_featured, view_count, wishlist_count, qr_count,
            share_count, tags, metadata, created, created
        ))
        products.append({
            "id": i + 1, "store_id": store["id"], "category_id": category_id,
            "cat_idx": cat_idx, "price": price, "name": name,
        })

        if len(rows) >= BATCH_SIZE:
            c.executemany("""INSERT INTO products (store_id,category_id,name,slug,description,price,
                price_currency,price_usd,old_price,is_negotiable,brand,origin_country,material,
                dimensions,color,weight,energy_rating,solar_compatible,warranty,in_stock,
                stock_quantity,is_featured,view_count,wishlist_count,qr_scan_count,share_count,
                tags,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", rows)
            rows = []

    if rows:
        c.executemany("""INSERT INTO products (store_id,category_id,name,slug,description,price,
            price_currency,price_usd,old_price,is_negotiable,brand,origin_country,material,
            dimensions,color,weight,energy_rating,solar_compatible,warranty,in_stock,
            stock_quantity,is_featured,view_count,wishlist_count,qr_scan_count,share_count,
            tags,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", rows)
    conn.commit()
    return products


def gen_users(conn: sqlite3.Connection) -> list:
    print(f"👥  إنشاء {NUM_USERS:,} مستخدم (4 شخصيات)...")
    c = conn.cursor()
    users = []
    persona_keys = list(PERSONAS.keys())
    persona_weights = [PERSONAS[k]["weight"] for k in persona_keys]

    age_groups = ["18-24", "25-34", "35-44", "45-54", "55+"]
    age_w = {
        "bride":             [0.30, 0.45, 0.18, 0.05, 0.02],
        "budget_rebuilder":  [0.10, 0.20, 0.35, 0.25, 0.10],
        "tech_enthusiast":   [0.35, 0.40, 0.15, 0.08, 0.02],
        "guest":             [0.20, 0.25, 0.25, 0.20, 0.10],
    }

    rows = []
    for i in tqdm(range(NUM_USERS), desc="   المستخدمون", ncols=80):
        persona = random.choices(persona_keys, weights=persona_weights, k=1)[0]
        p = PERSONAS[persona]
        device_id = f"usr_{uuid.uuid4().hex[:16]}"

        if persona == "bride":
            gender = "F" if random.random() < 0.82 else "M"
        elif persona == "tech_enthusiast":
            gender = "M" if random.random() < 0.80 else "F"
        else:
            gender = random.choice(["M", "F"])

        fn = random.choice(FIRST_NAMES_F if gender == "F" else FIRST_NAMES_M)
        ln = random.choice(SYRIAN_SURNAMES)
        display_name = f"{fn} {ln[0]}."
        age_group = random.choices(age_groups, weights=age_w[persona], k=1)[0]
        neighborhood = random.choice(NEIGHBORHOODS)
        created = timestamp_with_surge(START_DATE, NOW - timedelta(days=1), SURGE_START, surge_pct=0.15)

        rows.append((device_id, persona, p["name_ar"], display_name, age_group, neighborhood, gender, created))
        users.append({"id": i + 1, "device_id": device_id, "persona": persona, "gender": gender, "neighborhood": neighborhood})

    c.executemany("INSERT INTO users (device_id,persona,persona_ar,display_name,age_group,neighborhood,gender,created_at) VALUES (?,?,?,?,?,?,?,?)", rows)
    conn.commit()
    return users


def gen_interactions(conn: sqlite3.Connection, users: list, products: list, cat_map: dict) -> int:
    """
    150,000+ interactions with:
    - Persona-based category affinity
    - 70% co-occurrence correlation (Dining Table → Tableware/Chairs)
    - 40% surge in last 30 days
    - Session-based browsing with funnel conversion
    """
    print(f"🔄  إنشاء {NUM_INTERACTIONS:,}+ تفاعل (correlation + time-decay)...")
    c = conn.cursor()

    cat_products = defaultdict(list)
    for p in products:
        cat_products[p["cat_idx"]].append(p)

    # Inverse map
    catid_to_idx = {}
    for idx, info in cat_map.items():
        catid_to_idx[info["id"]] = idx
        for sid in info["sub_ids"]:
            catid_to_idx[sid] = idx

    # Store → nearby stores (same neighborhood)
    store_id_to_neighborhood = {}
    for p in products:
        pass  # We'll use products' store mapping instead

    interaction_rows = []
    total_count = 0
    session_counter = 0

    VIEW_TO_WISHLIST = 0.10
    VIEW_TO_SHARE = 0.05
    VIEW_TO_PURCHASE = 0.022

    for user in tqdm(users, desc="   التفاعلات", ncols=80):
        persona = user["persona"]
        p_info = PERSONAS[persona]
        affinity = p_info["category_affinity"]
        lo_sess, hi_sess = p_info["sessions_range"]

        # Guest users have very few interactions
        if persona == "guest":
            base_interactions = random.randint(1, 12)
        else:
            base_interactions = random.randint(lo_sess, hi_sess)

        user_count = 0
        while user_count < base_interactions:
            session_counter += 1
            session_id = f"s_{session_counter:08d}"

            # Pick primary category via persona affinity
            aff_cats = list(affinity.keys())
            aff_weights = [affinity[k] for k in aff_cats]
            remaining = 1.0 - sum(aff_weights)
            non_aff = [i for i in range(len(CATEGORY_TREE)) if i not in affinity]
            if non_aff and remaining > 0:
                per = remaining / len(non_aff)
                aff_cats.extend(non_aff)
                aff_weights.extend([per] * len(non_aff))

            primary_cat_idx = random.choices(aff_cats, weights=aff_weights, k=1)[0]
            current_cat_idx = primary_cat_idx

            session_views = random.randint(1, 8)
            session_ts = timestamp_with_surge(START_DATE, NOW, SURGE_START, surge_pct=0.40)

            for sv in range(session_views):
                if user_count >= base_interactions:
                    break

                pool = cat_products.get(current_cat_idx, [])
                if not pool:
                    break
                product = random.choice(pool)
                ts_dt = datetime.strptime(session_ts, "%Y-%m-%d %H:%M:%S") + timedelta(seconds=sv * random.randint(20, 300))
                ts = ts_dt.strftime("%Y-%m-%d %H:%M:%S")
                duration = random.randint(5, 240)

                # VIEW
                interaction_rows.append((
                    user["id"], user["device_id"], product["id"], product["store_id"],
                    product["category_id"], "view", session_id, duration, None, ts
                ))
                total_count += 1
                user_count += 1

                # Funnel: wishlist
                if random.random() < VIEW_TO_WISHLIST:
                    wts = (ts_dt + timedelta(seconds=random.randint(5, 90))).strftime("%Y-%m-%d %H:%M:%S")
                    interaction_rows.append((
                        user["id"], user["device_id"], product["id"], product["store_id"],
                        product["category_id"], "add_to_wishlist", session_id, None, None, wts
                    ))
                    total_count += 1
                    user_count += 1

                # Funnel: share
                if random.random() < VIEW_TO_SHARE:
                    sts = (ts_dt + timedelta(seconds=random.randint(10, 120))).strftime("%Y-%m-%d %H:%M:%S")
                    smeta = json.dumps({"platform": random.choice(["whatsapp","whatsapp","whatsapp","telegram","copy_link"])}, ensure_ascii=False)
                    interaction_rows.append((
                        user["id"], user["device_id"], product["id"], product["store_id"],
                        product["category_id"], "whatsapp_share", session_id, None, smeta, sts
                    ))
                    total_count += 1
                    user_count += 1

                # Funnel: purchase
                if random.random() < VIEW_TO_PURCHASE:
                    pts = (ts_dt + timedelta(seconds=random.randint(60, 900))).strftime("%Y-%m-%d %H:%M:%S")
                    pmeta = json.dumps({"amount": product["price"], "method": random.choice(["cash","escrow","installment"])}, ensure_ascii=False)
                    interaction_rows.append((
                        user["id"], user["device_id"], product["id"], product["store_id"],
                        product["category_id"], "purchase", session_id, None, pmeta, pts
                    ))
                    total_count += 1
                    user_count += 1

                    # ═══ 70% CO-OCCURRENCE CORRELATION ═══
                    # After purchase, high chance to browse correlated category
                    corr = CORRELATION_MAP.get(current_cat_idx, [])
                    for related_idx, prob, _label in corr:
                        if random.random() < prob:
                            corr_pool = cat_products.get(related_idx, [])
                            if corr_pool:
                                corr_product = random.choice(corr_pool)
                                cts = (ts_dt + timedelta(seconds=random.randint(120, 600))).strftime("%Y-%m-%d %H:%M:%S")
                                interaction_rows.append((
                                    user["id"], user["device_id"], corr_product["id"],
                                    corr_product["store_id"], corr_product["category_id"],
                                    "view", session_id, random.randint(10, 120), None, cts
                                ))
                                total_count += 1
                                user_count += 1

                                # Correlated wishlist
                                if random.random() < 0.20:
                                    cwts = (ts_dt + timedelta(seconds=random.randint(300, 900))).strftime("%Y-%m-%d %H:%M:%S")
                                    interaction_rows.append((
                                        user["id"], user["device_id"], corr_product["id"],
                                        corr_product["store_id"], corr_product["category_id"],
                                        "add_to_wishlist", session_id, None, None, cwts
                                    ))
                                    total_count += 1
                                    user_count += 1
                            break  # Only follow one correlation branch per purchase

                # Normal co-occurrence browsing (without purchase)
                corr = CORRELATION_MAP.get(current_cat_idx, [])
                jumped = False
                for related_idx, prob, _ in corr:
                    if random.random() < (prob * 0.5):  # Half probability for pure browsing
                        current_cat_idx = related_idx
                        jumped = True
                        break
                if not jumped and random.random() < 0.08:
                    current_cat_idx = random.randint(0, len(CATEGORY_TREE) - 1)

            # Batch flush
            if len(interaction_rows) >= BATCH_SIZE:
                c.executemany("""INSERT INTO user_interactions (user_id,device_id,product_id,store_id,
                    category_id,interaction_type,session_id,duration_seconds,metadata,created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?)""", interaction_rows)
                interaction_rows = []

    if interaction_rows:
        c.executemany("""INSERT INTO user_interactions (user_id,device_id,product_id,store_id,
            category_id,interaction_type,session_id,duration_seconds,metadata,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)""", interaction_rows)

    conn.commit()
    print(f"   ✅  تم: {total_count:,} تفاعل")
    return total_count


def gen_search_history(conn: sqlite3.Connection, users: list, products: list):
    """30,000 search queries using Syrian dialect keywords."""
    print(f"🔍  إنشاء {NUM_SEARCHES:,} استعلام بحث...")
    c = conn.cursor()
    rows = []
    session_counter = 0

    # Build all search terms per persona
    all_terms = {}
    for pkey, pinfo in PERSONAS.items():
        all_terms[pkey] = pinfo["search_terms"]

    # Additional generic Syrian search terms
    generic_terms = [
        "أثاث", "أجهزة كهربائية", "سجاد", "ديكور", "مطبخ",
        "طقم كنب زان", "شاشة سمارت", "طناجر جرانيت",
        "برّاد بيكو", "غسالة سامسونج", "مكيف LG",
        "سجاد إيراني يدوي", "ثريا كريستال", "طاولة سفرة خشب",
        "فرشة طبية", "بطانية شتوية", "ستائر مودرن",
        "طقم حمام", "مرآة ديكور", "إضاءة LED",
        "طقم كاسات بورسلان", "صينية تقديم", "سكاكين ألمانية",
        "كنب جلد", "خزانة أحذية", "رفوف حائط",
        "سجاد بلجيكي ماكينة", "موكيت تركي", "حصير بامبو",
        "شمع معطر عود", "مزهرية سيراميك", "ساعة حائط خشب",
        "غرفة نوم مودرن 2026", "صالون دمشقي فاخر",
        "أسعار غسالات 2026", "أفضل برّاد توفير كهرباء",
        "عروض أثاث الرقة", "توصيل مجاني مفروشات",
    ]

    for i in tqdm(range(NUM_SEARCHES), desc="   البحث", ncols=80):
        user = random.choice(users)
        persona = user["persona"]

        # 70% persona-specific, 30% generic
        if random.random() < 0.70:
            query = random.choice(all_terms[persona])
        else:
            query = random.choice(generic_terms)

        # Add variation: misspellings, extra words
        if random.random() < 0.15:
            query += " " + random.choice(["رخيص", "فخم", "جديد", "مستعمل", "عرض", "أفضل", "أجود"])

        results_count = random.choices(
            [0, random.randint(1, 5), random.randint(5, 20), random.randint(20, 100)],
            weights=[0.05, 0.15, 0.40, 0.40], k=1
        )[0]

        clicked_product_id = None
        if results_count > 0 and random.random() < 0.55:
            clicked_product_id = random.choice(products)["id"]

        session_counter += 1
        session_id = f"search_{session_counter:07d}"
        ts = timestamp_with_surge(START_DATE, NOW, SURGE_START, surge_pct=0.40)

        rows.append((user["id"], user["device_id"], query, results_count, clicked_product_id, session_id, ts))

        if len(rows) >= BATCH_SIZE:
            c.executemany("INSERT INTO search_history (user_id,device_id,query,results_count,clicked_product_id,session_id,created_at) VALUES (?,?,?,?,?,?,?)", rows)
            rows = []

    if rows:
        c.executemany("INSERT INTO search_history (user_id,device_id,query,results_count,clicked_product_id,session_id,created_at) VALUES (?,?,?,?,?,?,?)", rows)
    conn.commit()


def gen_reviews(conn: sqlite3.Connection, users: list, products: list):
    """Persona-aware reviews."""
    num_reviews = 18_000
    print(f"💬  إنشاء {num_reviews:,} تقييم...")
    c = conn.cursor()
    rows = []

    for _ in tqdm(range(num_reviews), desc="   التقييمات", ncols=80):
        user = random.choice(users)
        product = random.choice(products)
        persona = user["persona"]
        rs = PERSONAS[persona]["review_style"]

        rating = max(1, min(5, round(random.gauss(rs["avg_rating"], 0.8))))
        if rating >= 4:
            comment = random.choice(rs["positive"])
        elif rating <= 2:
            comment = random.choice(rs["negative"])
        else:
            comment = random.choice(rs["positive"][:2] + rs["negative"][:2])

        if persona == "budget_rebuilder" and random.random() < 0.4:
            comment += " - " + random.choice(["السعر مبالغ فيه", "لو أرخص كان أفضل", "السعر كويس"])

        fn = random.choice(FIRST_NAMES_F if user["gender"] == "F" else FIRST_NAMES_M)
        reviewer = f"{fn} {random.choice(SYRIAN_SURNAMES)[0]}."
        is_verified = 1 if random.random() < 0.35 else 0
        ts = timestamp_with_surge(START_DATE, NOW, SURGE_START, surge_pct=0.35)

        rows.append((product.get("store_id"), product["id"], user["id"], reviewer, rating, comment, is_verified, ts))

    c.executemany("INSERT INTO reviews (store_id,product_id,user_id,reviewer_name,rating,comment,is_verified,created_at) VALUES (?,?,?,?,?,?,?,?)", rows)
    conn.commit()


def gen_wishlists_shares(conn: sqlite3.Connection):
    """Populate wishlists and shares from interaction data."""
    print("❤️  ملء الأمنيات والمشاركات من التفاعلات...")
    c = conn.cursor()
    c.execute("""INSERT OR IGNORE INTO wishlists (device_id, product_id, created_at)
                 SELECT device_id, product_id, MIN(created_at)
                 FROM user_interactions WHERE interaction_type = 'add_to_wishlist'
                 GROUP BY device_id, product_id""")
    wl = c.rowcount
    c.execute("""INSERT INTO shares (product_id, store_id, platform, device_id, shared_at)
                 SELECT product_id, store_id, 'whatsapp', device_id, created_at
                 FROM user_interactions WHERE interaction_type = 'whatsapp_share'""")
    sh = c.rowcount
    conn.commit()
    print(f"   ✅  {wl:,} أمنية | {sh:,} مشاركة")


def gen_loyalty(conn: sqlite3.Connection, users: list):
    print("🪙  إنشاء بيانات الولاء...")
    c = conn.cursor()
    loyalty_users = random.sample(users, int(len(users) * 0.55))
    rows_acc, rows_tx = [], []

    for user in loyalty_users:
        total_earned = random.randint(0, 600)
        coins = max(0, total_earned - random.randint(0, min(total_earned, 150)))
        level = 1
        if total_earned >= 1000: level = 5
        elif total_earned >= 500: level = 4
        elif total_earned >= 200: level = 3
        elif total_earned >= 50: level = 2
        streak = random.randint(0, 45)
        ts = timestamp_with_surge(START_DATE, NOW, SURGE_START, 0.20)
        rows_acc.append((user["device_id"], coins, total_earned, level, streak, ts))

        for _ in range(random.randint(2, 25)):
            tx_type = random.choices(["daily_checkin","share_reward","qr_scan","purchase_reward","spend"], weights=[0.40,0.25,0.15,0.10,0.10], k=1)[0]
            tx_coins = {"daily_checkin":1,"share_reward":2,"qr_scan":1,"purchase_reward":5,"spend":-random.randint(5,50)}[tx_type]
            tx_ts = timestamp_with_surge(START_DATE, NOW, SURGE_START, 0.30)
            rows_tx.append((user["device_id"], tx_type, tx_coins, f"مكافأة {tx_type}", tx_ts))

    c.executemany("INSERT INTO loyalty_accounts (device_id,coins,total_earned,level,streak,created_at) VALUES (?,?,?,?,?,?)", rows_acc)
    c.executemany("INSERT INTO loyalty_transactions (device_id,type,coins,description,created_at) VALUES (?,?,?,?,?)", rows_tx)
    conn.commit()


def gen_escrow(conn: sqlite3.Connection, users: list, products: list):
    print("🔐  إنشاء معاملات الضمان...")
    c = conn.cursor()
    n = int(len(users) * 0.06)
    rows = []
    for user in random.sample(users, n):
        product = random.choice(products)
        tx_code = f"TX-{uuid.uuid4().hex[:8].upper()}"
        status = random.choice(["pending","released","released","released","disputed"])
        created = timestamp_with_surge(START_DATE, NOW, SURGE_START, 0.35)
        released = None
        if status == "released":
            released = (datetime.strptime(created, "%Y-%m-%d %H:%M:%S") + timedelta(days=random.randint(1,7))).strftime("%Y-%m-%d %H:%M:%S")
        rows.append((tx_code, product["id"], product["store_id"], user["device_id"], product["price"], status, released, created))
    c.executemany("INSERT INTO escrow_transactions (tx_code,product_id,store_id,buyer_device_id,amount,status,released_at,created_at) VALUES (?,?,?,?,?,?,?,?)", rows)
    conn.commit()


def update_aggregates(conn: sqlite3.Connection):
    print("📊  تحديث الإحصائيات المجمّعة...")
    c = conn.cursor()
    c.execute("""UPDATE stores SET
        rating = COALESCE((SELECT ROUND(AVG(rating),1) FROM reviews WHERE store_id=stores.id), stores.rating),
        rating_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE store_id=stores.id), 0)
        WHERE EXISTS (SELECT 1 FROM reviews WHERE store_id=stores.id)""")
    c.execute("""UPDATE products SET
        view_count = COALESCE((SELECT COUNT(*) FROM user_interactions WHERE product_id=products.id AND interaction_type='view'), 0),
        wishlist_count = COALESCE((SELECT COUNT(*) FROM user_interactions WHERE product_id=products.id AND interaction_type='add_to_wishlist'), 0),
        share_count = COALESCE((SELECT COUNT(*) FROM user_interactions WHERE product_id=products.id AND interaction_type='whatsapp_share'), 0)""")
    conn.commit()


def print_summary(conn: sqlite3.Connection, interaction_count: int):
    c = conn.cursor()
    print("\n" + "═" * 65)
    print("  📊  سوق الرقة V2 — ملخص قاعدة البيانات التجريبية")
    print("═" * 65)

    for table, label in [
        ("categories","التصنيفات"), ("stores","المتاجر"), ("products","المنتجات"),
        ("users","المستخدمون"), ("user_interactions","التفاعلات"), ("search_history","سجل البحث"),
        ("reviews","التقييمات"), ("wishlists","قوائم الأمنيات"), ("shares","المشاركات"),
        ("loyalty_accounts","حسابات الولاء"), ("escrow_transactions","معاملات الضمان"),
    ]:
        cnt = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {label:.<30s} {cnt:>12,}")

    print("\n  ── توزيع التفاعلات ──")
    for r in c.execute("SELECT interaction_type, COUNT(*) FROM user_interactions GROUP BY interaction_type ORDER BY COUNT(*) DESC"):
        print(f"    {r[0]:.<25s} {r[1]:>12,}")

    print("\n  ── توزيع الشخصيات ──")
    for r in c.execute("SELECT persona_ar, COUNT(*) FROM users GROUP BY persona ORDER BY COUNT(*) DESC"):
        print(f"    {r[0]:.<25s} {r[1]:>12,}")

    print("\n  ── توزيع المتاجر ──")
    for r in c.execute("SELECT subscription_type, COUNT(*) FROM stores GROUP BY subscription_type ORDER BY COUNT(*) DESC"):
        lbl = {"premium":"بريميوم","standard":"موثق","free":"محلي"}.get(r[0], r[0])
        print(f"    {lbl:.<25s} {r[1]:>12,}")

    # Co-occurrence validation
    print("\n  ── التحقق من التلازم (Co-occurrence) ──")
    # Brides who purchased furniture and also viewed kitchen
    c.execute("""
        WITH bride_purchases AS (
            SELECT DISTINCT ui.user_id FROM user_interactions ui
            JOIN users u ON u.id = ui.user_id
            WHERE u.persona = 'bride' AND ui.interaction_type = 'purchase'
            AND ui.category_id IN (SELECT id FROM categories WHERE parent_id IS NULL AND name = 'أثاث منزلي'
                                   UNION SELECT id FROM categories WHERE parent_id IN (SELECT id FROM categories WHERE name = 'أثاث منزلي'))
        ),
        bride_kitchen_views AS (
            SELECT DISTINCT ui.user_id FROM user_interactions ui
            WHERE ui.user_id IN (SELECT user_id FROM bride_purchases)
            AND ui.interaction_type = 'view'
            AND ui.category_id IN (SELECT id FROM categories WHERE parent_id IS NULL AND name = 'أدوات مطبخ'
                                   UNION SELECT id FROM categories WHERE parent_id IN (SELECT id FROM categories WHERE name = 'أدوات مطبخ'))
        )
        SELECT
            (SELECT COUNT(*) FROM bride_purchases) as total_purchasers,
            (SELECT COUNT(*) FROM bride_kitchen_views) as also_viewed_kitchen
    """)
    row = c.fetchone()
    if row and row[0] > 0:
        pct = round(100 * row[1] / row[0], 1)
        print(f"    عرسان اشتروا أثاث وشاهدوا مطبخ: {row[1]}/{row[0]} ({pct}%)")

    # Time-decay: % of interactions in last 30 days
    c.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as last_30
        FROM user_interactions
    """, (SURGE_START.strftime("%Y-%m-%d %H:%M:%S"),))
    row = c.fetchone()
    if row and row[0] > 0:
        pct = round(100 * row[1] / row[0], 1)
        print(f"    تفاعلات آخر 30 يوم: {row[1]:,}/{row[0]:,} ({pct}%) [الهدف: ~40%]")

    # Top search queries
    print("\n  ── أكثر 10 عمليات بحث ──")
    for r in c.execute("SELECT query, COUNT(*) FROM search_history GROUP BY query ORDER BY COUNT(*) DESC LIMIT 10"):
        print(f"    {r[0]:.<35s} {r[1]:>6,}")

    db_size = os.path.getsize(str(DB_PATH))
    print(f"\n  💾  حجم القاعدة: {db_size / (1024*1024):.1f} MB")
    print(f"  📁  المسار: {DB_PATH}")
    print("═" * 65)


# ══════════════════════════════════════════════════════════════
#  5.  MAIN
# ══════════════════════════════════════════════════════════════

def main():
    print("╔═══════════════════════════════════════════════════════════════╗")
    print("║  🏪 سوق الرقة V2 — مولّد قاعدة البيانات الضخمة              ║")
    print("║  Souq Al-Raqqah V2 — Hyper-Realistic Simulation Generator   ║")
    print("╚═══════════════════════════════════════════════════════════════╝\n")
    print(f"🎯  {NUM_STORES:,} متجر | {NUM_PRODUCTS:,} منتج | {NUM_USERS:,} مستخدم | {NUM_INTERACTIONS:,}+ تفاعل | {NUM_SEARCHES:,} بحث\n")

    conn = create_database(str(DB_PATH))
    cat_map = gen_categories(conn)
    stores = gen_stores(conn)
    products = gen_products(conn, stores, cat_map)
    users = gen_users(conn)
    ix_count = gen_interactions(conn, users, products, cat_map)
    gen_search_history(conn, users, products)
    gen_reviews(conn, users, products)
    gen_wishlists_shares(conn)
    gen_loyalty(conn, users)
    gen_escrow(conn, users, products)
    update_aggregates(conn)
    create_indexes(conn)

    print("🗜️  تحسين القاعدة (VACUUM)...")
    conn.execute("VACUUM")

    print_summary(conn, ix_count)
    conn.close()
    print("\n✅  سوق الرقة V2 — تم إنشاء قاعدة البيانات بنجاح!")


if __name__ == "__main__":
    main()
