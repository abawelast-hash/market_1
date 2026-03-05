#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════╗
║  Dalil Ar-Raqqah — Simulation Database Generator               ║
║  Generates a living marketplace for recommendation algorithms  ║
║  Author: Data Science & Backend Architecture Team              ║
║  Date: 2026-03-05                                              ║
╚══════════════════════════════════════════════════════════════════╝

Produces:
  - 1,200 Stores (Premium / Verified / Standard tiers)
  - 20,000 Products with metadata JSON and deep attributes
  - 5,000 Synthetic Users with persona-based behavior
  - 100,000+ User Interactions (view, wishlist, share, purchase)
  - 15,000 Reviews with persona-aware sentiment
  - Co-occurrence & time-series patterns for RecSys testing

Requirements:
  pip install Faker pandas tqdm
"""

import sqlite3
import json
import random
import math
import hashlib
import os
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

try:
    from faker import Faker
    import pandas as pd
    from tqdm import tqdm
except ImportError:
    print("❌  تثبيت المكتبات المطلوبة أولاً:")
    print("    pip install Faker pandas tqdm")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "dalil_simulation.db"

NUM_STORES       = 1_200
NUM_PRODUCTS     = 20_000
NUM_USERS        = 5_000
NUM_INTERACTIONS = 120_000   # target ≥100k
NUM_REVIEWS      = 15_000
INTERACTION_DAYS = 180       # 6 months of time-series

SEED = 42
random.seed(SEED)

fake_ar = Faker("ar_SA")
fake_ar.seed_instance(SEED)
fake_en = Faker("en_US")
fake_en.seed_instance(SEED)

NOW = datetime(2026, 3, 5, 12, 0, 0)
START_DATE = NOW - timedelta(days=INTERACTION_DAYS)

# ─────────────────────────────────────────────────────────────
# 1. DOMAIN DATA — Syrian / Ar-Raqqah Context
# ─────────────────────────────────────────────────────────────

NEIGHBORHOODS = [
    "حي الرشيد", "حي الثكنة", "المنصور", "حي الرميلة",
    "حي البريد", "حي الدرعية", "حي هشام بن عبد الملك",
    "حي النهضة", "حي الأندلس", "حي السبخة", "حي الطيار",
    "حي الحميدية", "حي الوادي", "حي المشلب", "حي الصناعة",
    "حي الفردوس", "حي البدو", "حي الهلالية", "حي الكسرة",
    "حي الرقة القديمة",
]

# Categories with subcategories and product templates
CATEGORY_TREE = [
    {
        "name": "أثاث منزلي", "name_en": "Furniture", "icon": "🪑",
        "description": "غرف نوم، صالونات، طاولات وكراسي",
        "subs": [
            {"name": "غرف نوم", "icon": "🛏️"},
            {"name": "صالونات وكنبايات", "icon": "🛋️"},
            {"name": "طاولات وكراسي", "icon": "🪑"},
            {"name": "مكتبات ورفوف", "icon": "📚"},
            {"name": "خزائن وكومودينات", "icon": "🗄️"},
        ],
        "templates": [
            "غرفة نوم كاملة {material} - {style}",
            "سرير {material} {size} مع خزانة",
            "صالون {style} {seats} مقاعد - قماش {fabric}",
            "كنبة زاوية {material} - {color}",
            "طاولة سفرة {material} {seats} كراسي",
            "طقم طاولات متداخلة {material} - صناعة محلية",
            "مكتبة حائط {material} - {color}",
            "خزانة ملابس {doors} أبواب {material}",
            "كومودينو {material} مع درجين",
            "بوفيه {style} {material} مع مرآة",
            "ركنة {style} قماش {fabric} - {color}",
            "طاولة مكتب {material} مع أدراج",
        ],
        "brands": ["صناعة محلية", "دمشقية", "حلبية", "تركي"],
        "materials": ["خشب زان", "خشب جوز", "MDF", "لاتيه", "خشب سنديان", "خشب صنوبر"],
        "colors": ["أبيض", "بني طبيعي", "بني غامق", "رمادي", "أسود", "بيج", "عسلي"],
        "price_range": (2_000_000, 25_000_000),
    },
    {
        "name": "أجهزة كهربائية", "name_en": "Electronics", "icon": "📺",
        "description": "تلفزيونات، غسالات، برادات ومكيفات",
        "subs": [
            {"name": "برادات وفريزرات", "icon": "❄️"},
            {"name": "غسالات", "icon": "🧺"},
            {"name": "تلفزيونات وشاشات", "icon": "📺"},
            {"name": "مكيفات", "icon": "🌀"},
            {"name": "مكانس كهربائية", "icon": "🧹"},
            {"name": "أفران ومايكروويف", "icon": "♨️"},
        ],
        "templates": [
            "برّاد {brand} {capacity} قدم - {energy}",
            "غسالة {brand} {capacity} كيلو - أوتوماتيك",
            "غسالة {brand} فوق أوتوماتيك {capacity} كيلو",
            "تلفزيون {brand} {size} بوصة {resolution}",
            "مكيف {brand} {capacity} BTU - {type}",
            "مكنسة كهربائية {brand} {power} واط",
            "فرن كهربائي {brand} {capacity} لتر",
            "مايكروويف {brand} {capacity} لتر ديجيتال",
            "خلاط {brand} {power} واط - {blades} شفرات",
            "ديب فريزر {brand} {capacity} لتر",
        ],
        "brands": ["LG", "Samsung", "Beko", "Arçelik", "Toshiba", "Sharp", "Midea", "TCL", "Hisense", "Hitachi"],
        "materials": ["ستانلس ستيل", "بلاستيك مقوى", "زجاج مقسى"],
        "colors": ["فضي", "أبيض", "أسود", "رمادي غامق", "ذهبي"],
        "price_range": (800_000, 30_000_000),
    },
    {
        "name": "أدوات مطبخ", "name_en": "Kitchen", "icon": "🍳",
        "description": "طناجر، صحون، أدوات طبخ ومستلزمات",
        "subs": [
            {"name": "طناجر وقدور", "icon": "🍲"},
            {"name": "صحون وأطقم سفرة", "icon": "🍽️"},
            {"name": "سكاكين وأدوات قطع", "icon": "🔪"},
            {"name": "مستلزمات طبخ", "icon": "🥄"},
        ],
        "templates": [
            "طقم طناجر {material} {pieces} قطع - {brand}",
            "طقم صحون {material} {pieces} قطعة - {design}",
            "طقم كاسات {material} {pieces} قطعة",
            "طقم سكاكين {brand} {pieces} قطع - {material}",
            "قدر ضغط {brand} {capacity} لتر {material}",
            "مقلاة {brand} {size} سم {coating}",
            "طقم ملاعق وشوك {material} {pieces} قطعة",
            "صينية فرن {material} {size} سم",
            "حلة طبخ {material} {capacity} لتر - {brand}",
            "خلاط يدوي {brand} {power} واط",
        ],
        "brands": ["OMS", "Güral", "Korkmaz", "Emsan", "Karaca", "صناعة محلية", "Zwilling"],
        "materials": ["ستانلس ستيل", "غرانيت", "بورسلان", "سيراميك", "تيفال", "نحاس"],
        "colors": ["أحمر", "أسود", "أبيض", "ذهبي", "رمادي", "أزرق"],
        "price_range": (50_000, 3_000_000),
    },
    {
        "name": "مفروشات وأقمشة", "name_en": "Textiles", "icon": "🛏️",
        "description": "فرشات، بطانيات، مخدات وملايات",
        "subs": [
            {"name": "فرشات ومراتب", "icon": "🛏️"},
            {"name": "بطانيات ولحف", "icon": "🧣"},
            {"name": "أطقم ملايات", "icon": "🛌"},
            {"name": "مخدات ووسائد", "icon": "💤"},
        ],
        "templates": [
            "فرشة {type} {brand} {size} - ارتفاع {height} سم",
            "طقم بطانيات {brand} {pieces} قطع - {material}",
            "لحاف {brand} {material} {size}",
            "طقم ملايات {brand} {pieces} قطع - {material}",
            "مخدة {type} {brand} - {size}",
            "كڤر لحاف {brand} {material} - {design}",
            "حامي فرشة {brand} {size} - مقاوم للماء",
            "وسادة {type} {brand} طبية",
        ],
        "brands": ["TAC", "English Home", "Karaca Home", "Syrian Foam", "Yataş", "صناعة محلية"],
        "materials": ["قطن مصري", "حرير", "مخمل", "ميكروفايبر", "بامبو", "صوف"],
        "colors": ["أبيض", "بيج", "رمادي", "بورجندي", "أزرق ملكي", "زهري"],
        "price_range": (80_000, 5_000_000),
    },
    {
        "name": "إضاءة وكهربائيات", "name_en": "Lighting", "icon": "💡",
        "description": "ثريات، لمبات، إضاءة LED وسبوتات",
        "subs": [
            {"name": "ثريات وإضاءة سقفية", "icon": "✨"},
            {"name": "إضاءة LED", "icon": "💡"},
            {"name": "أباجورات", "icon": "🪔"},
            {"name": "إضاءة خارجية", "icon": "🏮"},
        ],
        "templates": [
            "ثريا {material} {style} {arms} شعلة",
            "لمبة LED {brand} {watt} واط - {color_temp}",
            "سبوت لايت {brand} {watt} واط - {type}",
            "أباجورة {style} {material} - {color}",
            "شريط LED {brand} {length} متر - {color}",
            "إضاءة سقفية {brand} {style} - {size} سم",
            "كشاف LED {brand} {watt} واط خارجي",
            "إضاءة حائط {style} {material}",
        ],
        "brands": ["Philips", "OSRAM", "Xiaomi", "صناعة تركية", "صناعة محلية", "Opple"],
        "materials": ["كريستال بوهيمي", "نحاس", "حديد مطلي", "خشب", "زجاج ملون"],
        "colors": ["ذهبي", "فضي", "أسود", "أبيض", "نحاسي"],
        "price_range": (25_000, 8_000_000),
    },
    {
        "name": "حمامات وسباكة", "name_en": "Bathroom", "icon": "🚿",
        "description": "خلاطات، مغاسل، مرايا وإكسسوارات",
        "subs": [
            {"name": "خلاطات ودش", "icon": "🚿"},
            {"name": "مغاسل وأحواض", "icon": "🪥"},
            {"name": "مرايا حمامات", "icon": "🪞"},
            {"name": "إكسسوارات حمام", "icon": "🧴"},
        ],
        "templates": [
            "خلاط {brand} {type} - {material}",
            "مغسلة {brand} {type} {material}",
            "مرآة حمام {brand} {size} سم - {type}",
            "طقم إكسسوارات حمام {brand} {pieces} قطع - {material}",
            "دش {brand} {type} - {material}",
            "بانيو {brand} {size} سم - {material}",
            "شطاف {brand} {material}",
            "حامل مناشف {brand} {material} - {style}",
        ],
        "brands": ["Grohe", "TOTO", "VitrA", "Hansgrohe", "صناعة صينية", "Ideal Standard"],
        "materials": ["كروم", "ستانلس ستيل", "سيراميك", "رخام صناعي", "نيكل"],
        "colors": ["كروم", "أبيض", "أسود مطفي", "ذهبي", "برونزي"],
        "price_range": (30_000, 5_000_000),
    },
    {
        "name": "ديكور ومنزليات", "name_en": "Decor", "icon": "🖼️",
        "description": "لوحات، مزهريات، ساعات وإكسسوارات ديكور",
        "subs": [
            {"name": "لوحات جدارية", "icon": "🎨"},
            {"name": "مزهريات", "icon": "🏺"},
            {"name": "ساعات حائط", "icon": "🕰️"},
            {"name": "إكسسوارات ديكور", "icon": "🏡"},
        ],
        "templates": [
            "لوحة جدارية {style} {size} سم - {subject}",
            "مزهرية {material} {style} - ارتفاع {height} سم",
            "ساعة حائط {brand} {style} - {material}",
            "طقم شموع {scent} {pieces} قطع",
            "مرآة ديكور {style} {material} - {size} سم",
            "حامل نباتات {material} {levels} طوابق",
            "تحفة ديكور {material} {style}",
            "برواز صور {material} {size} سم - طقم {pieces} قطع",
        ],
        "brands": ["صناعة يدوية", "IKEA Style", "صناعة محلية", "تركي", "صيني"],
        "materials": ["خشب", "سيراميك", "زجاج", "معدن", "رخام", "ريزن"],
        "colors": ["متعدد الألوان", "ذهبي", "فضي", "أبيض", "أسود", "بيج"],
        "price_range": (15_000, 3_000_000),
    },
    {
        "name": "سجاد وموكيت", "name_en": "Carpets", "icon": "🟫",
        "description": "سجاد يدوي، موكيت، بسط وحصر",
        "subs": [
            {"name": "سجاد يدوي", "icon": "🧶"},
            {"name": "سجاد ماكينة", "icon": "🟫"},
            {"name": "موكيت", "icon": "🟩"},
            {"name": "حصر وبسط", "icon": "🟨"},
        ],
        "templates": [
            "سجادة {type} {origin} {size} - {design}",
            "سجادة {type} {brand} {size} - {density} عقدة/م²",
            "موكيت {brand} {width} متر - {material}",
            "بساط {origin} {size} - {material}",
            "حصيرة {material} {size} - {design}",
            "سجادة مدخل {size} - {design}",
            "سجادة أطفال {size} - {design}",
            "سجادة مطبخ {size} - مقاومة للماء",
        ],
        "brands": ["صناعة إيرانية", "صناعة تركية", "صناعة محلية", "بلجيكي", "صيني"],
        "materials": ["حرير + صوف", "بولي بروبيلين", "صوف طبيعي", "قطن", "جوت"],
        "colors": ["أحمر كلاسيكي", "بيج", "رمادي", "أزرق", "متعدد الألوان", "كحلي"],
        "price_range": (100_000, 15_000_000),
    },
    {
        "name": "طاقة شمسية", "name_en": "Solar", "icon": "☀️",
        "description": "ألواح شمسية، بطاريات، إنفرترات ومنظومات",
        "subs": [
            {"name": "ألواح شمسية", "icon": "🔆"},
            {"name": "بطاريات ليثيوم", "icon": "🔋"},
            {"name": "إنفرترات", "icon": "⚡"},
            {"name": "منظومات متكاملة", "icon": "🏠"},
        ],
        "templates": [
            "لوح شمسي {brand} {watt}W {type}",
            "بطارية ليثيوم {brand} {capacity}Ah {voltage}V",
            "إنفرتر {brand} {capacity}KW - {type}",
            "منظومة سولار {brand} {capacity}KW متكاملة",
            "منظم شحن {brand} {capacity}A MPPT",
            "كابل سولار {brand} {size}mm² - {length}م",
            "هيكل تثبيت ألواح {type} - {material}",
            "بطارية جل {brand} {capacity}Ah",
        ],
        "brands": ["JA Solar", "Huawei", "Growatt", "LONGi", "Trina", "BYD", "Pylontech", "Victron"],
        "materials": ["سيليكون أحادي", "سيليكون متعدد", "ألمنيوم", "نحاس"],
        "colors": ["أسود", "أزرق غامق", "رمادي"],
        "price_range": (200_000, 60_000_000),
    },
    {
        "name": "أدوات تنظيف", "name_en": "Cleaning", "icon": "🧹",
        "description": "مكانس، ممسحات، منظفات ومستلزمات نظافة",
        "subs": [
            {"name": "مكانس وممسحات", "icon": "🧹"},
            {"name": "منظفات ومعطرات", "icon": "🧴"},
            {"name": "سلال وحاويات", "icon": "🗑️"},
        ],
        "templates": [
            "مكنسة {brand} {type} - {material}",
            "ممسحة {brand} {type} - مع دلو عصر",
            "منظف أرضيات {brand} {capacity} لتر - {scent}",
            "معطر جو {brand} {capacity} مل - {scent}",
            "سلة غسيل {brand} {capacity} لتر - {material}",
            "حاوية قمامة {brand} {capacity} لتر - {type}",
            "طقم تنظيف {brand} {pieces} قطع",
            "صابون غسيل {brand} {weight} كغ - {type}",
        ],
        "brands": ["Vileda", "Dettol", "Fine", "Clorox", "صناعة محلية", "Vanish"],
        "materials": ["بلاستيك", "مايكروفايبر", "معدن", "خيزران"],
        "colors": ["أخضر", "أزرق", "أبيض", "رمادي", "زهري"],
        "price_range": (5_000, 500_000),
    },
]

STYLES = ["عصري", "كلاسيكي", "ريفي", "مودرن", "بوهيمي", "إسكندنافي", "شرقي"]
ORIGIN_COUNTRIES = ["سوريا", "تركيا", "الصين", "إيران", "مصر", "كوريا", "ألمانيا", "إيطاليا", "اليابان"]
WARRANTY_OPTIONS = ["بدون كفالة", "6 أشهر", "سنة", "سنتين", "3 سنوات", "5 سنوات", "10 سنوات"]
ENERGY_RATINGS = [None, None, None, "A", "A+", "A++", "A+++", "B", "C"]

# ── User Personas ──
PERSONAS = {
    "bride": {
        "name_ar": "العروس الجديدة",
        "weight": 0.22,
        "category_affinity": {0: 0.35, 1: 0.20, 2: 0.15, 3: 0.15, 7: 0.05},  # furniture, electronics, kitchen, textiles, carpets
        "price_preference": "mid_high",
        "review_style": {
            "avg_rating": 4.2,
            "positive": [
                "تصميم جميل ومناسب لتجهيز العرس",
                "جودة ممتازة تستاهل السعر",
                "اللون والتصميم طابقوا الصور بالضبط",
                "منتج راقي وفخم - أنصح فيه للعرسان",
                "الخشب طبيعي ومتين - شغل معلم",
                "التوصيل كان سريع والتركيب احترافي",
            ],
            "negative": [
                "الأسعار عالية شوي بس الجودة كويسة",
                "التوصيل تأخر أسبوع عن الموعد",
                "اللون طلع غامق شوي عن الصورة",
            ],
        },
    },
    "budget_hunter": {
        "name_ar": "صائد العروض",
        "weight": 0.30,
        "category_affinity": {2: 0.25, 9: 0.20, 3: 0.15, 0: 0.10, 1: 0.10},
        "price_preference": "low",
        "review_style": {
            "avg_rating": 3.6,
            "positive": [
                "سعر ممتاز مقارنة بالسوق",
                "منتج عملي وسعره معقول",
                "أرخص سعر لقيته بالرقة",
                "ماشي الحال بهالسعر",
            ],
            "negative": [
                "غالي شوي - لقيته أرخص عند غيرهم",
                "الجودة مو ولا بد بس السعر رخيص",
                "المنتج كويس بس السعر مبالغ فيه شوي",
                "لو تنزل السعر شوي بيصير ممتاز",
                "السعر ما يناسب الجودة صراحة",
            ],
        },
    },
    "luxury_seeker": {
        "name_ar": "عاشق الفخامة",
        "weight": 0.12,
        "category_affinity": {0: 0.30, 6: 0.20, 7: 0.15, 4: 0.15, 5: 0.10},
        "price_preference": "high",
        "review_style": {
            "avg_rating": 4.5,
            "positive": [
                "جودة استثنائية - خامات فاخرة",
                "تصميم يجنن وخشب طبيعي حقيقي",
                "يستاهل كل ليرة - تحفة فنية",
                "أجمل قطعة بالبيت - الكل يسأل عنها",
                "مستوى راقي من الصنعة والإتقان",
            ],
            "negative": [
                "التغليف ما كان بمستوى المنتج",
                "كنت أتوقع تشطيب أفضل بهالسعر",
            ],
        },
    },
    "solar_enthusiast": {
        "name_ar": "عاشق الطاقة الشمسية",
        "weight": 0.10,
        "category_affinity": {8: 0.55, 1: 0.20, 4: 0.10},
        "price_preference": "mid",
        "review_style": {
            "avg_rating": 4.3,
            "positive": [
                "النظام شغال تمام من 3 أشهر بدون مشاكل",
                "وفرت عالمازوت والاشتراك - أنصح فيه",
                "الألواح كفاءتها عالية حتى بالغيم",
                "التركيب كان احترافي والفني شاطر",
                "أفضل استثمار بهالوقت مع انقطاع الكهرباء",
            ],
            "negative": [
                "البطاريات بتخلص بسرعة بالشتاء",
                "الإنفرتر بيطلع صوت خفيف بالليل",
            ],
        },
    },
    "practical_parent": {
        "name_ar": "الأم العملية",
        "weight": 0.18,
        "category_affinity": {2: 0.30, 9: 0.20, 3: 0.15, 1: 0.10, 0: 0.10},
        "price_preference": "mid",
        "review_style": {
            "avg_rating": 4.0,
            "positive": [
                "عملي جداً ومناسب للعائلة",
                "سهل التنظيف وآمن للأطفال",
                "حجم مناسب للمطبخ - وفر وقت كثير",
                "منتج ممتاز للاستخدام اليومي",
                "يتحمل الاستخدام الكتير - متين",
            ],
            "negative": [
                "حجمه كبير شوي عالمطبخ",
                "كان أفضل لو فيه ألوان أكثر",
                "التعليمات ما كانت بالعربي",
            ],
        },
    },
    "young_professional": {
        "name_ar": "الشاب المستقل",
        "weight": 0.08,
        "category_affinity": {1: 0.30, 4: 0.20, 0: 0.15, 6: 0.15},
        "price_preference": "mid",
        "review_style": {
            "avg_rating": 3.9,
            "positive": [
                "ديزاين حلو ويناسب الشقق الصغيرة",
                "سمارت وموفر بالكهرباء",
                "شكله مودرن وعملي",
                "مناسب للشقة الجديدة",
            ],
            "negative": [
                "الجودة مو زي ما توقعت",
                "الألوان المتوفرة محدودة",
                "كان أفضل لو فيه ريموت",
            ],
        },
    },
}

# ── Co-occurrence pairs (category_index → correlated_category_index, probability) ──
CO_OCCURRENCE = {
    0: [(3, 0.60), (7, 0.40), (4, 0.35), (6, 0.30)],       # Furniture → Textiles 60%, Carpets 40%, Lighting 35%, Decor 30%
    1: [(8, 0.45), (4, 0.30)],                               # Electronics → Solar 45%, Lighting 30%
    2: [(9, 0.40), (3, 0.25)],                               # Kitchen → Cleaning 40%, Textiles 25%
    3: [(0, 0.55), (7, 0.35)],                               # Textiles → Furniture 55%, Carpets 35%
    4: [(8, 0.40), (0, 0.25)],                               # Lighting → Solar 40%, Furniture 25%
    5: [(6, 0.30), (4, 0.25)],                               # Bathroom → Decor 30%, Lighting 25%
    6: [(0, 0.40), (4, 0.35), (7, 0.25)],                   # Decor → Furniture 40%, Lighting 35%, Carpets 25%
    7: [(0, 0.60), (3, 0.40), (6, 0.25)],                   # Carpets → Furniture 60%, Textiles 40%, Decor 25%
    8: [(1, 0.50), (4, 0.35)],                               # Solar → Electronics 50%, Lighting 35%
    9: [(2, 0.45), (5, 0.30)],                               # Cleaning → Kitchen 45%, Bathroom 30%
}

# ── Arabic first names for synthetic data ──
ARABIC_FIRST_NAMES_M = [
    "أحمد", "محمد", "خالد", "عبدالله", "عمر", "يوسف", "سامي", "هاني", "فراس", "مازن",
    "علي", "حسين", "مصطفى", "إبراهيم", "سعد", "طارق", "زياد", "بشار", "نادر", "وليد",
    "ماهر", "باسل", "رامي", "عماد", "حاتم", "أنس", "كريم", "مروان", "ثامر", "غسان",
]
ARABIC_FIRST_NAMES_F = [
    "فاطمة", "نور", "هند", "لمى", "سارة", "ريم", "دانا", "ليلى", "مريم", "آلاء",
    "شهد", "رنا", "تالا", "جنى", "سلمى", "زينب", "عبير", "أسماء", "حنين", "رغد",
]
ARABIC_LAST_NAMES = [
    "المحمد", "الخليل", "العلي", "الجاسم", "العمر", "الحسين", "الأحمد", "الحمد",
    "الشعار", "الحسن", "العبدالله", "الخالد", "البكر", "الصالح", "المصطفى",
    "الإبراهيم", "الموسى", "السليمان", "القاسم", "الطاهر",
]

STORE_PREFIXES = [
    "مستودع", "معرض", "صالة", "مركز", "بيت", "دار", "كنوز", "واحة", "قصر",
    "مفروشات", "كهربائيات", "بلاط", "ديكورات", "أثاث",
]
STORE_SUFFIXES = [
    "النور", "الفرات", "الرقة", "الشام", "العائلة", "المنزل", "الأمان",
    "السعادة", "الأناقة", "الجمال", "الحياة", "الموسم", "الخير", "الزهراء",
    "الشرق", "الغرب", "التوفير", "الرخاء", "البركة", "الوفاء",
]


# ─────────────────────────────────────────────────────────────
# 2. HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Create a URL-safe slug from Arabic text."""
    h = hashlib.md5(text.encode()).hexdigest()[:8]
    clean = text.replace(" ", "-").replace("/", "-")
    return f"{clean}-{h}"


def random_timestamp(start: datetime, end: datetime) -> str:
    """Random datetime between start and end."""
    delta = end - start
    secs = random.randint(0, int(delta.total_seconds()))
    dt = start + timedelta(seconds=secs)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def weighted_random_timestamp(start: datetime, end: datetime) -> str:
    """Biased toward recent dates (exponential distribution)."""
    delta = (end - start).total_seconds()
    # beta = 3 biases toward 1.0 (recent)
    r = random.betavariate(2.5, 1.2)
    secs = int(delta * r)
    dt = start + timedelta(seconds=secs)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def random_phone() -> str:
    """Syrian phone number."""
    prefix = random.choice(["932", "933", "934", "936", "937", "938", "944", "946", "947", "954", "956", "958"])
    return f"+963{prefix}{random.randint(100000, 999999)}"


def random_working_hours() -> str:
    """Random store working hours."""
    opens = random.choice(["7", "8", "9", "10", "11"])
    closes = random.choice(["6", "7", "8", "9", "10"])
    return f"{opens} صباحاً - {closes} مساءً"


def generate_product_name(cat_idx: int, cat: dict) -> str:
    """Generate a realistic Arabic product name from templates."""
    template = random.choice(cat["templates"])
    brand = random.choice(cat["brands"])
    material = random.choice(cat["materials"])
    color = random.choice(cat["colors"])
    style = random.choice(STYLES)

    replacements = {
        "{brand}": brand, "{material}": material, "{color}": color,
        "{style}": style, "{size}": str(random.choice([30, 40, 50, 55, 60, 65, 80, 100, 120, 150, 200])),
        "{capacity}": str(random.choice([5, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 25, 30, 40, 50, 100, 200])),
        "{pieces}": str(random.choice([3, 4, 5, 6, 7, 8, 10, 12, 16, 18, 24, 28, 32, 48, 72, 84])),
        "{seats}": str(random.choice([4, 5, 6, 7, 8, 9, 10, 12])),
        "{doors}": str(random.choice([2, 3, 4, 5, 6])),
        "{power}": str(random.choice([250, 350, 500, 600, 700, 800, 1000, 1200, 1500, 2000])),
        "{watt}": str(random.choice([5, 7, 9, 10, 12, 15, 18, 20, 30, 40, 50, 100, 200, 300, 400, 500, 550])),
        "{weight}": str(random.choice([1, 2, 3, 5, 10])),
        "{length}": str(random.choice([2, 3, 5, 10, 15, 20])),
        "{height}": str(random.choice([15, 20, 25, 28, 30, 35, 40, 50, 60, 80])),
        "{energy}": random.choice(["إنفرتر", "عادي", "موفر للطاقة", "A+", "A++"]),
        "{type}": random.choice(["هجين", "شبكي", "مستقل", "سبليت", "شباك", "يدوي", "كهربائي",
                                  "مونو كريستال", "بولي كريستال", "دائري", "مربع", "LED", "حراري"]),
        "{resolution}": random.choice(["Full HD", "4K UHD", "8K", "OLED 4K"]),
        "{fabric}": random.choice(["شانيل", "كتان", "قطيفة", "مخمل", "جلد صناعي", "قماش مقاوم للبقع"]),
        "{coating}": random.choice(["تيفال", "سيراميك", "غرانيت", "ستانلس"]),
        "{design}": random.choice(["فلورال كلاسيكي", "هندسي عصري", "عثماني", "سادة", "زهور", "مودرن"]),
        "{color_temp}": random.choice(["أبيض بارد", "أبيض دافئ", "أصفر", "RGB متغير"]),
        "{subject}": random.choice(["طبيعة", "خط عربي", "تجريدي", "ورود", "مدينة", "إسلامي"]),
        "{scent}": random.choice(["لافندر", "فانيلا", "ياسمين", "عود", "مسك", "ليمون", "صنوبر"]),
        "{voltage}": str(random.choice([12, 24, 48, 51.2])),
        "{arms}": str(random.choice([3, 5, 6, 8, 10, 12, 15, 18, 24])),
        "{levels}": str(random.choice([2, 3, 4, 5])),
        "{blades}": str(random.choice([4, 6, 8])),
        "{density}": str(random.choice([500000, 700000, 1000000, 1500000])),
        "{width}": str(random.choice([2, 3, 4, 5])),
        "{origin}": random.choice(["إيراني", "تركي", "بلجيكي", "محلي", "صيني"]),
    }
    for k, v in replacements.items():
        template = template.replace(k, v)
    return template


def generate_description(product_name: str, cat: dict) -> str:
    """Generate a realistic Arabic product description."""
    parts = [
        product_name + ".",
        random.choice([
            "منتج عالي الجودة مصنوع من أفضل الخامات.",
            "تصميم أنيق يناسب جميع الأذواق.",
            "صناعة متقنة وتشطيب فاخر.",
            "مناسب للمنازل والمكاتب.",
            "متوفر بعدة ألوان وأحجام.",
            "خامة ممتازة وعمر افتراضي طويل.",
            "يتميز بالمتانة والأناقة معاً.",
        ]),
        random.choice([
            "متوفر في مستودعاتنا في الرقة مع التوصيل.",
            "يمكن الطلب عبر واتساب.",
            "الأسعار مدروسة ومنافسة.",
            "مع إمكانية التقسيط المريح.",
            "الكمية محدودة - اطلبه الآن.",
            "ضمان حقيقي من الشركة المصنعة.",
        ]),
    ]
    return " ".join(parts)


def generate_metadata(cat_idx: int, cat: dict) -> str:
    """Generate JSON metadata for a product."""
    style = random.choice(STYLES)
    meta = {
        "style": style,
        "color": random.choice(cat["colors"]),
        "material": random.choice(cat["materials"]),
        "origin": random.choice(ORIGIN_COUNTRIES),
        "quality_score": round(random.uniform(2.5, 5.0), 1),
        "popularity_rank": random.randint(1, 1000),
        "is_trending": random.random() < 0.15,
        "seasonal": random.choice([None, "صيفي", "شتوي", "عرسان", "رمضان"]),
    }
    # Category-specific metadata
    if cat_idx == 0:  # Furniture
        meta["wood_type"] = random.choice(["زان", "جوز", "MDF", "سنديان", "لاتيه", "صنوبر"])
        meta["assembly_required"] = random.random() < 0.4
    elif cat_idx == 1:  # Electronics
        meta["power_consumption"] = f"{random.randint(50, 2500)}W"
        meta["smart_features"] = random.random() < 0.3
        meta["inverter_compatible"] = random.random() < 0.6
    elif cat_idx == 8:  # Solar
        meta["panel_efficiency"] = round(random.uniform(18.0, 23.5), 1)
        meta["daily_output_kwh"] = round(random.uniform(2.0, 25.0), 1)
        meta["lifespan_years"] = random.choice([10, 15, 20, 25, 30])
    return json.dumps(meta, ensure_ascii=False)


# Exchange rate: 1 USD ≈ 14,500 SYP (approximate current)
SYP_PER_USD = 14_500

def generate_price(cat: dict) -> tuple:
    """Generate price, old_price, price_usd."""
    lo, hi = cat["price_range"]
    price = random.randint(lo // 10_000, hi // 10_000) * 10_000  # round to 10k
    has_discount = random.random() < 0.25
    old_price = None
    if has_discount:
        discount_pct = random.choice([5, 10, 15, 20, 25, 30])
        old_price = int(price / (1 - discount_pct / 100))
        old_price = (old_price // 10_000) * 10_000
    price_usd = round(price / SYP_PER_USD, 2)
    return price, old_price, price_usd


# ─────────────────────────────────────────────────────────────
# 3. DATABASE CREATION
# ─────────────────────────────────────────────────────────────

def create_database(db_path: str) -> sqlite3.Connection:
    """Create the simulation SQLite database with all tables + indexes."""
    if os.path.exists(db_path):
        os.remove(db_path)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    c = conn.cursor()

    # ── Core tables (matching schema.js) ──
    c.executescript("""
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

    -- ═══════════════════════════
    -- SIMULATION-SPECIFIC TABLES
    -- ═══════════════════════════

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
    """)

    conn.commit()
    return conn


def create_indexes(conn: sqlite3.Connection):
    """Create all indexes for performance."""
    print("📇  إنشاء الفهارس...")
    indexes = [
        # Core indexes (matching schema.js)
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
        "CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews(store_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)",
        "CREATE INDEX IF NOT EXISTS idx_escrow_tx_code ON escrow_transactions(tx_code)",
        "CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_transactions(buyer_device_id)",
        "CREATE INDEX IF NOT EXISTS idx_loyalty_device ON loyalty_accounts(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_loyalty_tx_device ON loyalty_transactions(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_checkins_device ON daily_checkins(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)",
        # Simulation indexes (critical for ML workloads)
        "CREATE INDEX IF NOT EXISTS idx_users_persona ON users(persona)",
        "CREATE INDEX IF NOT EXISTS idx_users_device ON users(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_product ON user_interactions(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_category ON user_interactions(category_id)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(interaction_type)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_time ON user_interactions(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_session ON user_interactions(session_id)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_device ON user_interactions(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_store ON user_interactions(store_id)",
        # Composite indexes for recommendation queries
        "CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON user_interactions(user_id, interaction_type)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_user_cat ON user_interactions(user_id, category_id)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_product_type ON user_interactions(product_id, interaction_type)",
        "CREATE INDEX IF NOT EXISTS idx_interactions_cat_time ON user_interactions(category_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_products_cat_price ON products(category_id, price)",
        "CREATE INDEX IF NOT EXISTS idx_products_store_cat ON products(store_id, category_id)",
    ]
    for sql in indexes:
        conn.execute(sql)
    conn.commit()


# ─────────────────────────────────────────────────────────────
# 4. DATA GENERATORS
# ─────────────────────────────────────────────────────────────

def generate_categories(conn: sqlite3.Connection) -> dict:
    """Generate categories and subcategories. Returns mapping."""
    print("📂  إنشاء التصنيفات...")
    c = conn.cursor()
    cat_map = {}  # cat_idx -> {"id": ..., "subs": [sub_ids]}

    for idx, cat in enumerate(CATEGORY_TREE):
        c.execute(
            "INSERT INTO categories (name, name_en, icon, description, sort_order) VALUES (?,?,?,?,?)",
            (cat["name"], cat["name_en"], cat["icon"], cat["description"], idx + 1),
        )
        parent_id = c.lastrowid
        sub_ids = []
        for si, sub in enumerate(cat.get("subs", [])):
            c.execute(
                "INSERT INTO categories (name, icon, parent_id, sort_order) VALUES (?,?,?,?)",
                (sub["name"], sub["icon"], parent_id, si + 1),
            )
            sub_ids.append(c.lastrowid)

        cat_map[idx] = {"id": parent_id, "sub_ids": sub_ids}

        # Category filters
        if idx == 0:  # Furniture
            for fi, (fn, fen, ft, fo) in enumerate([
                ("نوع الخشب", "wood_type", "select", json.dumps(["زان", "جوز", "MDF", "سنديان", "لاتيه"], ensure_ascii=False)),
                ("اللون", "color", "select", json.dumps(["أبيض", "بني", "رمادي", "أسود", "بيج"], ensure_ascii=False)),
                ("الستايل", "style", "select", json.dumps(["عصري", "كلاسيكي", "ريفي", "مودرن"], ensure_ascii=False)),
            ]):
                c.execute("INSERT INTO category_filters (category_id,filter_name,filter_name_en,filter_type,filter_options,sort_order) VALUES (?,?,?,?,?,?)",
                          (parent_id, fn, fen, ft, fo, fi + 1))
        elif idx == 1:  # Electronics
            for fi, (fn, fen, ft, fo) in enumerate([
                ("موفر للطاقة", "energy_saver", "boolean", None),
                ("متوافق مع السولار", "solar", "boolean", None),
                ("الماركة", "brand", "select", json.dumps(["LG", "Samsung", "Beko", "Toshiba", "Midea"], ensure_ascii=False)),
            ]):
                c.execute("INSERT INTO category_filters (category_id,filter_name,filter_name_en,filter_type,filter_options,sort_order) VALUES (?,?,?,?,?,?)",
                          (parent_id, fn, fen, ft, fo, fi + 1))
        elif idx == 8:  # Solar
            for fi, (fn, fen, ft, fo) in enumerate([
                ("نوع اللوح", "panel_type", "select", json.dumps(["مونو", "بولي", "PERC"], ensure_ascii=False)),
                ("القدرة (واط)", "watt_range", "range", json.dumps({"min": 100, "max": 600})),
            ]):
                c.execute("INSERT INTO category_filters (category_id,filter_name,filter_name_en,filter_type,filter_options,sort_order) VALUES (?,?,?,?,?,?)",
                          (parent_id, fn, fen, ft, fo, fi + 1))

    conn.commit()
    return cat_map


def generate_stores(conn: sqlite3.Connection, cat_map: dict) -> list:
    """Generate 1,200 stores with tier distribution."""
    print(f"🏪  إنشاء {NUM_STORES} متجر...")
    c = conn.cursor()
    stores = []
    used_slugs = set()

    # Tier distribution: 5% Premium, 25% Verified, 70% Standard
    tiers = (
        [("premium", True, True)] * int(NUM_STORES * 0.05)
        + [("verified", True, False)] * int(NUM_STORES * 0.25)
        + [("standard", False, False)] * (NUM_STORES - int(NUM_STORES * 0.05) - int(NUM_STORES * 0.25))
    )
    random.shuffle(tiers)

    for i in tqdm(range(NUM_STORES), desc="   المتاجر", ncols=80):
        tier, is_verified, is_featured = tiers[i]

        prefix = random.choice(STORE_PREFIXES)
        suffix = random.choice(STORE_SUFFIXES)
        extra = random.choice(ARABIC_LAST_NAMES) if random.random() < 0.3 else ""
        name = f"{prefix} {suffix}" + (f" {extra}" if extra else "")

        slug = slugify(name)
        while slug in used_slugs:
            slug = slugify(name + str(random.randint(1, 9999)))
        used_slugs.add(slug)

        gender = random.choice(["M", "M", "M", "F"])  # 75% male owners
        owner_fn = random.choice(ARABIC_FIRST_NAMES_M if gender == "M" else ARABIC_FIRST_NAMES_F)
        owner_ln = random.choice(ARABIC_LAST_NAMES)
        owner_name = f"{owner_fn} {owner_ln}"

        neighborhood = random.choice(NEIGHBORHOODS)
        phone = random_phone()

        # Rating distribution by tier
        if tier == "premium":
            rating = round(random.uniform(4.2, 5.0), 1)
            rating_count = random.randint(30, 150)
        elif tier == "verified":
            rating = round(random.uniform(3.5, 4.8), 1)
            rating_count = random.randint(10, 80)
        else:
            rating = round(random.uniform(2.5, 4.5), 1)
            rating_count = random.randint(0, 40)

        address_parts = [
            random.choice(["شارع", "جادة", "سوق"]),
            random.choice(["تل أبيض", "23 شباط", "الجسر", "الكورنيش", "القوتلي", "الثورة", "فلسطين",
                           "المنصور", "حمص", "الهال", "الفرات", "الجمهورية", "الوحدة"]),
        ]
        if random.random() < 0.4:
            address_parts.append(f"- قرب {random.choice(['دوار الساعة', 'جامع النور', 'المدرسة الصناعية', 'مشفى الرقة', 'السوق المسقوف', 'البريد القديم'])}")
        address = " ".join(address_parts)

        desc = random.choice([
            f"أفضل {random.choice(['أثاث', 'أجهزة', 'مفروشات', 'أدوات منزلية', 'إضاءة', 'ديكور'])} في الرقة",
            f"تشكيلة واسعة من {random.choice(['الأثاث الفاخر', 'الأجهزة الكهربائية', 'مستلزمات المنزل', 'الطاقة الشمسية'])}",
            f"أسعار منافسة وجودة مضمونة - خدمة منذ {random.randint(2010, 2024)}",
            f"خبرة {random.randint(5, 30)} سنة في {random.choice(['تجهيز المنازل', 'الأجهزة', 'الأثاث', 'السولار'])}",
        ])

        sub_type = {"premium": "premium", "verified": "standard", "standard": "free"}[tier]
        sub_expires = (NOW + timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d") if tier != "standard" else None
        delivery = 1 if (tier == "premium" or random.random() < 0.5) else 0
        installment = 1 if (tier == "premium" or random.random() < 0.35) else 0

        lat = round(35.945 + random.uniform(-0.03, 0.03), 6)
        lon = round(38.997 + random.uniform(-0.04, 0.04), 6)

        created = random_timestamp(NOW - timedelta(days=random.randint(60, 800)), NOW - timedelta(days=30))

        c.execute("""INSERT INTO stores (name, slug, description, owner_name, phone, whatsapp, address,
                     neighborhood, latitude, longitude, is_verified, is_featured, rating, rating_count,
                     working_hours, delivery_available, installment_available, subscription_type,
                     subscription_expires, created_at, updated_at)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (name, slug, desc, owner_name, phone, phone, address, neighborhood, lat, lon,
                   1 if is_verified else 0, 1 if is_featured else 0, rating, rating_count,
                   random_working_hours(), delivery, installment, sub_type, sub_expires,
                   created, created))

        stores.append({
            "id": c.lastrowid, "name": name, "slug": slug, "tier": tier,
            "neighborhood": neighborhood, "rating": rating,
        })

    conn.commit()
    return stores


def generate_products(conn: sqlite3.Connection, stores: list, cat_map: dict) -> list:
    """Generate 20,000 products distributed across stores and categories."""
    print(f"📦  إنشاء {NUM_PRODUCTS} منتج...")
    c = conn.cursor()
    products = []
    used_slugs = set()

    # Distribution: premium stores get more products
    store_weights = []
    for s in stores:
        w = {"premium": 5.0, "verified": 2.0, "standard": 1.0}[s["tier"]]
        store_weights.append(w)

    for i in tqdm(range(NUM_PRODUCTS), desc="   المنتجات", ncols=80):
        store = random.choices(stores, weights=store_weights, k=1)[0]
        cat_idx = random.randint(0, len(CATEGORY_TREE) - 1)
        cat = CATEGORY_TREE[cat_idx]
        cat_info = cat_map[cat_idx]

        # Pick subcategory or parent
        if cat_info["sub_ids"] and random.random() < 0.7:
            category_id = random.choice(cat_info["sub_ids"])
        else:
            category_id = cat_info["id"]

        name = generate_product_name(cat_idx, cat)
        slug = slugify(name)
        while slug in used_slugs:
            slug = slugify(name + str(random.randint(1, 99999)))
        used_slugs.add(slug)

        price, old_price, price_usd = generate_price(cat)
        desc = generate_description(name, cat)
        metadata = generate_metadata(cat_idx, cat)
        brand = random.choice(cat["brands"])
        material = random.choice(cat["materials"])
        color = random.choice(cat["colors"])
        origin = random.choice(ORIGIN_COUNTRIES)
        warranty = random.choice(WARRANTY_OPTIONS)
        energy = random.choice(ENERGY_RATINGS)
        solar_compat = 1 if (cat_idx == 8 or (cat_idx == 1 and random.random() < 0.4)) else 0
        is_negotiable = 1 if random.random() < 0.3 else 0
        in_stock = 1 if random.random() < 0.88 else 0
        stock_qty = random.randint(1, 100) if in_stock else 0
        is_featured = 1 if random.random() < 0.12 else 0
        view_count = int(random.paretovariate(1.5) * 10)  # power-law distribution
        wishlist_count = max(0, int(view_count * random.uniform(0.02, 0.15)))
        share_count = max(0, int(view_count * random.uniform(0.01, 0.08)))
        qr_count = max(0, int(view_count * random.uniform(0.005, 0.03)))

        # Tags
        tag_pool = name.split() + [brand, material, color, cat["name"]]
        tags = ",".join(random.sample(tag_pool, min(len(tag_pool), random.randint(3, 6))))

        dims = None
        weight = None
        if cat_idx in [0, 1]:  # Furniture, Electronics
            dims = f"{random.randint(30, 250)}x{random.randint(30, 200)}x{random.randint(20, 150)} سم"
            weight = f"{round(random.uniform(0.5, 80), 1)} كغ"

        created = random_timestamp(NOW - timedelta(days=random.randint(1, INTERACTION_DAYS)), NOW)

        c.execute("""INSERT INTO products (store_id, category_id, name, slug, description, price,
                     price_currency, price_usd, old_price, is_negotiable, brand, origin_country,
                     material, dimensions, color, weight, energy_rating, solar_compatible, warranty,
                     in_stock, stock_quantity, is_featured, view_count, wishlist_count, qr_scan_count,
                     share_count, tags, metadata, created_at, updated_at)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (store["id"], category_id, name, slug, desc, price, "SYP", price_usd,
                   old_price, is_negotiable, brand, origin, material, dims, color, weight,
                   energy, solar_compat, warranty, in_stock, stock_qty, is_featured,
                   view_count, wishlist_count, qr_count, share_count, tags, metadata,
                   created, created))

        products.append({
            "id": c.lastrowid, "store_id": store["id"], "category_id": category_id,
            "cat_idx": cat_idx, "price": price, "name": name,
        })

    conn.commit()
    return products


def generate_users(conn: sqlite3.Connection) -> list:
    """Generate 5,000 synthetic users with persona distribution."""
    print(f"👥  إنشاء {NUM_USERS} مستخدم...")
    c = conn.cursor()
    users = []

    persona_keys = list(PERSONAS.keys())
    persona_weights = [PERSONAS[k]["weight"] for k in persona_keys]

    age_groups = ["18-24", "25-34", "35-44", "45-54", "55+"]
    # Persona-age correlations
    age_weights = {
        "bride": [0.35, 0.45, 0.15, 0.04, 0.01],
        "budget_hunter": [0.15, 0.25, 0.30, 0.20, 0.10],
        "luxury_seeker": [0.05, 0.25, 0.35, 0.25, 0.10],
        "solar_enthusiast": [0.05, 0.30, 0.35, 0.20, 0.10],
        "practical_parent": [0.05, 0.30, 0.40, 0.20, 0.05],
        "young_professional": [0.45, 0.40, 0.10, 0.04, 0.01],
    }

    for i in tqdm(range(NUM_USERS), desc="   المستخدمون", ncols=80):
        persona = random.choices(persona_keys, weights=persona_weights, k=1)[0]
        p_info = PERSONAS[persona]

        device_id = f"usr_{uuid.uuid4().hex[:16]}"

        # Gender correlation with persona
        if persona == "bride":
            gender = "F" if random.random() < 0.85 else "M"
        elif persona == "practical_parent":
            gender = "F" if random.random() < 0.70 else "M"
        else:
            gender = random.choice(["M", "F"])

        fn = random.choice(ARABIC_FIRST_NAMES_F if gender == "F" else ARABIC_FIRST_NAMES_M)
        ln = random.choice(ARABIC_LAST_NAMES)
        display_name = f"{fn} {ln[0]}."  # privacy: first letter of last name

        age_group = random.choices(age_groups, weights=age_weights[persona], k=1)[0]
        neighborhood = random.choice(NEIGHBORHOODS)

        created = random_timestamp(START_DATE, NOW - timedelta(days=1))

        c.execute("""INSERT INTO users (device_id, persona, persona_ar, display_name, age_group,
                     neighborhood, gender, created_at)
                     VALUES (?,?,?,?,?,?,?,?)""",
                  (device_id, persona, p_info["name_ar"], display_name, age_group,
                   neighborhood, gender, created))

        users.append({
            "id": c.lastrowid, "device_id": device_id, "persona": persona,
            "gender": gender, "neighborhood": neighborhood,
        })

    conn.commit()
    return users


def generate_interactions(conn: sqlite3.Connection, users: list, products: list, cat_map: dict):
    """
    Generate 100,000+ interactions with persona-based patterns,
    co-occurrence logic, and time-series distribution.
    """
    print(f"🔄  إنشاء {NUM_INTERACTIONS}+ تفاعل مع أنماط سلوكية...")
    c = conn.cursor()

    # Build category→product index for fast lookup
    cat_products = defaultdict(list)  # cat_idx → [product dicts]
    for p in products:
        cat_products[p["cat_idx"]].append(p)

    # Inverse map: category_id → cat_idx
    catid_to_idx = {}
    for idx, info in cat_map.items():
        catid_to_idx[info["id"]] = idx
        for sid in info["sub_ids"]:
            catid_to_idx[sid] = idx

    interaction_rows = []
    interaction_count = 0
    session_counter = 0

    # Funnel conversion rates
    VIEW_TO_WISHLIST = 0.12
    VIEW_TO_SHARE = 0.06
    VIEW_TO_PURCHASE = 0.025

    for user in tqdm(users, desc="   التفاعلات", ncols=80):
        persona = user["persona"]
        p_info = PERSONAS[persona]
        affinity = p_info["category_affinity"]

        # Each user gets a variable number of interactions
        base_interactions = random.randint(10, 50)
        if persona == "budget_hunter":
            base_interactions = int(base_interactions * 1.4)  # browses more
        elif persona == "luxury_seeker":
            base_interactions = int(base_interactions * 0.8)  # fewer but focused

        user_interactions_count = 0

        while user_interactions_count < base_interactions:
            session_counter += 1
            session_id = f"sess_{session_counter:08d}"

            # Pick primary category based on persona affinity
            aff_cats = list(affinity.keys())
            aff_weights = [affinity[k] for k in aff_cats]
            # Fill remaining weight uniformly across non-affinity categories
            remaining = 1.0 - sum(aff_weights)
            non_aff = [i for i in range(len(CATEGORY_TREE)) if i not in affinity]
            if non_aff and remaining > 0:
                per_cat = remaining / len(non_aff)
                aff_cats.extend(non_aff)
                aff_weights.extend([per_cat] * len(non_aff))

            primary_cat_idx = random.choices(aff_cats, weights=aff_weights, k=1)[0]

            # Session: view 1-8 products, with co-occurrence branching
            session_views = random.randint(1, 8)
            current_cat_idx = primary_cat_idx
            session_ts = weighted_random_timestamp(START_DATE, NOW)

            for sv in range(session_views):
                if user_interactions_count >= base_interactions:
                    break

                # Pick a product from current category
                pool = cat_products.get(current_cat_idx, [])
                if not pool:
                    break
                product = random.choice(pool)

                # Timestamp progresses within session
                ts_dt = datetime.strptime(session_ts, "%Y-%m-%d %H:%M:%S") + timedelta(seconds=sv * random.randint(15, 300))
                ts = ts_dt.strftime("%Y-%m-%d %H:%M:%S")

                duration = random.randint(5, 180)  # view duration in seconds

                # VIEW interaction
                interaction_rows.append((
                    user["id"], user["device_id"], product["id"], product["store_id"],
                    product["category_id"], "view", session_id, duration, None, ts
                ))
                user_interactions_count += 1
                interaction_count += 1

                # Funnel: view → wishlist
                if random.random() < VIEW_TO_WISHLIST:
                    wl_ts = (ts_dt + timedelta(seconds=random.randint(5, 60))).strftime("%Y-%m-%d %H:%M:%S")
                    interaction_rows.append((
                        user["id"], user["device_id"], product["id"], product["store_id"],
                        product["category_id"], "add_to_wishlist", session_id, None, None, wl_ts
                    ))
                    interaction_count += 1
                    user_interactions_count += 1

                # Funnel: view → share
                if random.random() < VIEW_TO_SHARE:
                    share_ts = (ts_dt + timedelta(seconds=random.randint(10, 120))).strftime("%Y-%m-%d %H:%M:%S")
                    share_meta = json.dumps({"platform": random.choice(["whatsapp", "whatsapp", "whatsapp", "telegram", "copy_link"])}, ensure_ascii=False)
                    interaction_rows.append((
                        user["id"], user["device_id"], product["id"], product["store_id"],
                        product["category_id"], "share_to_whatsapp", session_id, None, share_meta, share_ts
                    ))
                    interaction_count += 1
                    user_interactions_count += 1

                # Funnel: view → purchase (rare)
                if random.random() < VIEW_TO_PURCHASE:
                    purch_ts = (ts_dt + timedelta(seconds=random.randint(30, 600))).strftime("%Y-%m-%d %H:%M:%S")
                    purch_meta = json.dumps({"amount": product["price"], "method": random.choice(["cash", "escrow", "installment"])}, ensure_ascii=False)
                    interaction_rows.append((
                        user["id"], user["device_id"], product["id"], product["store_id"],
                        product["category_id"], "purchase", session_id, None, purch_meta, purch_ts
                    ))
                    interaction_count += 1
                    user_interactions_count += 1

                # Co-occurrence branching: chance to jump to related category
                co = CO_OCCURRENCE.get(current_cat_idx, [])
                jumped = False
                for related_cat_idx, prob in co:
                    if random.random() < prob:
                        current_cat_idx = related_cat_idx
                        jumped = True
                        break
                if not jumped:
                    # Small chance to jump to random category
                    if random.random() < 0.1:
                        current_cat_idx = random.randint(0, len(CATEGORY_TREE) - 1)

        # Batch insert every 5000 rows for memory efficiency
        if len(interaction_rows) >= 5000:
            c.executemany(
                """INSERT INTO user_interactions (user_id, device_id, product_id, store_id,
                   category_id, interaction_type, session_id, duration_seconds, metadata, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                interaction_rows,
            )
            interaction_rows = []

    # Flush remaining
    if interaction_rows:
        c.executemany(
            """INSERT INTO user_interactions (user_id, device_id, product_id, store_id,
               category_id, interaction_type, session_id, duration_seconds, metadata, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            interaction_rows,
        )

    conn.commit()
    print(f"   ✅  تم إنشاء {interaction_count:,} تفاعل")
    return interaction_count


def generate_reviews(conn: sqlite3.Connection, users: list, products: list):
    """Generate 15,000 persona-aware reviews."""
    print(f"💬  إنشاء {NUM_REVIEWS} تقييم...")
    c = conn.cursor()
    reviews = []

    for _ in tqdm(range(NUM_REVIEWS), desc="   التقييمات", ncols=80):
        user = random.choice(users)
        product = random.choice(products)
        persona = user["persona"]
        p_info = PERSONAS[persona]
        review_style = p_info["review_style"]

        # Rating based on persona avg with variance
        avg_r = review_style["avg_rating"]
        rating = max(1, min(5, round(random.gauss(avg_r, 0.8))))

        # Comment based on rating and persona
        if rating >= 4:
            comment = random.choice(review_style["positive"])
        elif rating <= 2:
            comment = random.choice(review_style["negative"])
        else:
            # Mix
            comment = random.choice(
                review_style["positive"][:2] + review_style["negative"][:2]
            )
            # Add price context for budget hunters
            if persona == "budget_hunter" and random.random() < 0.5:
                comment += " - " + random.choice(["السعر مبالغ فيه شوي", "لو أرخص كان أفضل", "السعر كويس"])

        # Reviewer name
        if user["gender"] == "F":
            reviewer = random.choice(ARABIC_FIRST_NAMES_F) + " " + random.choice(ARABIC_LAST_NAMES[0:1])[0] + "."
        else:
            reviewer = random.choice(ARABIC_FIRST_NAMES_M) + " " + random.choice(ARABIC_LAST_NAMES)[0] + "."

        is_verified = 1 if random.random() < 0.4 else 0
        ts = weighted_random_timestamp(START_DATE, NOW)

        reviews.append((
            product.get("store_id"), product["id"], user["id"],
            reviewer, rating, comment, is_verified, ts
        ))

    c.executemany(
        "INSERT INTO reviews (store_id, product_id, user_id, reviewer_name, rating, comment, is_verified, created_at) VALUES (?,?,?,?,?,?,?,?)",
        reviews,
    )
    conn.commit()


def generate_wishlists_and_shares(conn: sqlite3.Connection, users: list, products: list):
    """Populate wishlists and shares tables from interaction data."""
    print("❤️  ملء قوائم الأمنيات والمشاركات...")
    c = conn.cursor()

    # Extract wishlist interactions → wishlists table
    c.execute("""
        INSERT OR IGNORE INTO wishlists (device_id, product_id, created_at)
        SELECT device_id, product_id, MIN(created_at)
        FROM user_interactions
        WHERE interaction_type = 'add_to_wishlist'
        GROUP BY device_id, product_id
    """)
    wl_count = c.rowcount

    # Extract share interactions → shares table
    c.execute("""
        INSERT INTO shares (product_id, store_id, platform, device_id, shared_at)
        SELECT product_id, store_id, 'whatsapp', device_id, created_at
        FROM user_interactions
        WHERE interaction_type = 'share_to_whatsapp'
    """)
    sh_count = c.rowcount

    conn.commit()
    print(f"   ✅  {wl_count:,} أمنية | {sh_count:,} مشاركة")


def generate_loyalty_data(conn: sqlite3.Connection, users: list):
    """Generate loyalty accounts and transaction history."""
    print("🪙  إنشاء بيانات الولاء والعملات...")
    c = conn.cursor()

    # ~60% of users have loyalty accounts
    loyalty_users = random.sample(users, int(len(users) * 0.6))

    for user in tqdm(loyalty_users, desc="   الولاء", ncols=80):
        total_earned = random.randint(0, 500)
        coins = max(0, total_earned - random.randint(0, min(total_earned, 100)))
        level = 1
        if total_earned >= 1000: level = 5
        elif total_earned >= 500: level = 4
        elif total_earned >= 200: level = 3
        elif total_earned >= 50: level = 2
        streak = random.randint(0, 30)

        c.execute(
            "INSERT INTO loyalty_accounts (device_id, coins, total_earned, level, streak, created_at) VALUES (?,?,?,?,?,?)",
            (user["device_id"], coins, total_earned, level, streak, user.get("created_at", random_timestamp(START_DATE, NOW))),
        )

        # Loyalty transactions
        num_tx = random.randint(3, 30)
        for _ in range(num_tx):
            tx_type = random.choices(
                ["daily_checkin", "share_reward", "qr_scan", "purchase_reward", "spend"],
                weights=[0.40, 0.25, 0.15, 0.10, 0.10], k=1
            )[0]
            tx_coins = {"daily_checkin": 1, "share_reward": 2, "qr_scan": 1, "purchase_reward": 5, "spend": -random.randint(5, 50)}[tx_type]
            tx_desc = {
                "daily_checkin": f"تسجيل يومي - سلسلة {random.randint(1, 30)} يوم",
                "share_reward": "مكافأة مشاركة واتساب",
                "qr_scan": "مكافأة مسح QR",
                "purchase_reward": "مكافأة إتمام صفقة",
                "spend": f"استخدام عملات - خصم",
            }[tx_type]
            tx_ts = weighted_random_timestamp(START_DATE, NOW)
            c.execute(
                "INSERT INTO loyalty_transactions (device_id, type, coins, description, created_at) VALUES (?,?,?,?,?)",
                (user["device_id"], tx_type, tx_coins, tx_desc, tx_ts),
            )

    conn.commit()


def generate_escrow_data(conn: sqlite3.Connection, users: list, products: list):
    """Generate escrow transaction samples."""
    print("🔐  إنشاء معاملات الضمان...")
    c = conn.cursor()
    num_escrow = int(len(users) * 0.08)  # ~8% of users have escrow transactions

    escrow_users = random.sample(users, num_escrow)
    statuses = ["pending", "released", "released", "released", "disputed"]

    for user in escrow_users:
        product = random.choice(products)
        tx_code = f"TX-{uuid.uuid4().hex[:8].upper()}"
        status = random.choice(statuses)
        created = weighted_random_timestamp(START_DATE, NOW)
        released = None
        if status == "released":
            released = (datetime.strptime(created, "%Y-%m-%d %H:%M:%S") + timedelta(days=random.randint(1, 7))).strftime("%Y-%m-%d %H:%M:%S")

        c.execute("""INSERT INTO escrow_transactions (tx_code, product_id, store_id, buyer_device_id,
                     amount, status, released_at, created_at)
                     VALUES (?,?,?,?,?,?,?,?)""",
                  (tx_code, product["id"], product["store_id"], user["device_id"],
                   product["price"], status, released, created))

    conn.commit()


def update_aggregate_counts(conn: sqlite3.Connection):
    """Update stores with accurate review counts/ratings from generated data."""
    print("📊  تحديث الإحصائيات المجمّعة...")
    c = conn.cursor()

    # Update store rating from reviews
    c.execute("""
        UPDATE stores SET
            rating = COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE store_id = stores.id), stores.rating),
            rating_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE store_id = stores.id), 0)
        WHERE EXISTS (SELECT 1 FROM reviews WHERE store_id = stores.id)
    """)

    # Update product view/wishlist/share counts from interactions
    c.execute("""
        UPDATE products SET
            view_count = COALESCE((SELECT COUNT(*) FROM user_interactions WHERE product_id = products.id AND interaction_type = 'view'), 0),
            wishlist_count = COALESCE((SELECT COUNT(*) FROM user_interactions WHERE product_id = products.id AND interaction_type = 'add_to_wishlist'), 0),
            share_count = COALESCE((SELECT COUNT(*) FROM user_interactions WHERE product_id = products.id AND interaction_type = 'share_to_whatsapp'), 0)
    """)

    conn.commit()


def print_summary(conn: sqlite3.Connection):
    """Print database summary statistics."""
    c = conn.cursor()

    print("\n" + "=" * 60)
    print("  📊  ملخص قاعدة البيانات التجريبية")
    print("=" * 60)

    tables = [
        ("categories", "التصنيفات"),
        ("stores", "المتاجر"),
        ("products", "المنتجات"),
        ("users", "المستخدمون"),
        ("user_interactions", "التفاعلات"),
        ("reviews", "التقييمات"),
        ("wishlists", "قوائم الأمنيات"),
        ("shares", "المشاركات"),
        ("loyalty_accounts", "حسابات الولاء"),
        ("loyalty_transactions", "معاملات الولاء"),
        ("escrow_transactions", "معاملات الضمان"),
    ]
    for table, label in tables:
        count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {label:.<30s} {count:>10,}")

    print("\n  ── توزيع التفاعلات ──")
    for row in c.execute("SELECT interaction_type, COUNT(*) as c FROM user_interactions GROUP BY interaction_type ORDER BY c DESC"):
        print(f"    {row[0]:.<25s} {row[1]:>10,}")

    print("\n  ── توزيع المستخدمين حسب الشخصية ──")
    for row in c.execute("SELECT persona_ar, COUNT(*) as c FROM users GROUP BY persona ORDER BY c DESC"):
        print(f"    {row[0]:.<25s} {row[1]:>10,}")

    print("\n  ── توزيع المتاجر حسب الفئة ──")
    for row in c.execute("SELECT subscription_type, COUNT(*) as c FROM stores GROUP BY subscription_type ORDER BY c DESC"):
        tier_label = {"premium": "بريميوم", "standard": "موثق", "free": "عادي"}.get(row[0], row[0])
        print(f"    {tier_label:.<25s} {row[1]:>10,}")

    # Co-occurrence validation
    print("\n  ── التحقق من أنماط التفاعل (Co-occurrence) ──")
    c.execute("""
        WITH bride_interactions AS (
            SELECT ui.category_id, COUNT(*) as cnt
            FROM user_interactions ui
            JOIN users u ON u.id = ui.user_id
            WHERE u.persona = 'bride' AND ui.interaction_type = 'view'
            GROUP BY ui.category_id
        )
        SELECT category_id, cnt,
               ROUND(100.0 * cnt / (SELECT SUM(cnt) FROM bride_interactions), 1) as pct
        FROM bride_interactions ORDER BY cnt DESC LIMIT 5
    """)
    print("    العروس - توزيع المشاهدات حسب التصنيف:")
    for row in c.fetchall():
        print(f"      تصنيف {row[0]}: {row[1]:,} ({row[2]}%)")

    db_size = os.path.getsize(str(DB_PATH))
    print(f"\n  💾  حجم القاعدة: {db_size / (1024*1024):.1f} MB")
    print(f"  📁  المسار: {DB_PATH}")
    print("=" * 60)


# ─────────────────────────────────────────────────────────────
# 5. MAIN EXECUTION
# ─────────────────────────────────────────────────────────────

def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  🏪 دليل الرقة — مولّد قاعدة البيانات التجريبية         ║")
    print("╚══════════════════════════════════════════════════════════╝\n")

    print(f"🎯  الهدف: {NUM_STORES:,} متجر | {NUM_PRODUCTS:,} منتج | {NUM_USERS:,} مستخدم | {NUM_INTERACTIONS:,}+ تفاعل\n")

    conn = create_database(str(DB_PATH))

    cat_map = generate_categories(conn)
    stores = generate_stores(conn, cat_map)
    products = generate_products(conn, stores, cat_map)
    users = generate_users(conn)
    generate_interactions(conn, users, products, cat_map)
    generate_reviews(conn, users, products)
    generate_wishlists_and_shares(conn, users, products)
    generate_loyalty_data(conn, users)
    generate_escrow_data(conn, users, products)
    update_aggregate_counts(conn)
    create_indexes(conn)

    # VACUUM to optimize
    print("🗜️  تحسين القاعدة...")
    conn.execute("VACUUM")

    print_summary(conn)
    conn.close()
    print("\n✅  تم إنشاء قاعدة البيانات التجريبية بنجاح!")


if __name__ == "__main__":
    main()
