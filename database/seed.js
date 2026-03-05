/**
 * Seed Data - دليل الرقة
 * Sample data for development/testing
 */
const { getDb, allRows, getRow, run, saveDb } = require('./schema');

async function seed() {
  await getDb();

  // Check if already seeded
  const existing = getRow('SELECT COUNT(*) as c FROM categories');
  if (existing && existing.c > 0) {
    console.log('⚠️ البيانات موجودة مسبقاً، تجاوز...');
    return;
  }

  console.log('🌱 بدء إدراج البيانات التجريبية...');

  // === Categories ===
  const categories = [
    { name: 'أثاث منزلي', name_en: 'Furniture', icon: '🪑', description: 'غرف نوم، صالونات، طاولات', sort_order: 1 },
    { name: 'أجهزة كهربائية', name_en: 'Electronics', icon: '📺', description: 'تلفزيونات، غسالات، برادات', sort_order: 2 },
    { name: 'أدوات مطبخ', name_en: 'Kitchen', icon: '🍳', description: 'طناجر، صحون، أدوات طبخ', sort_order: 3 },
    { name: 'مفروشات', name_en: 'Textiles', icon: '🛏️', description: 'فرشات، بطانيات، مخدات', sort_order: 4 },
    { name: 'إضاءة', name_en: 'Lighting', icon: '💡', description: 'ثريات، لمبات، إضاءة LED', sort_order: 5 },
    { name: 'حمامات', name_en: 'Bathroom', icon: '🚿', description: 'خلاطات، مرايا، إكسسوارات', sort_order: 6 },
    { name: 'ديكور', name_en: 'Decor', icon: '🖼️', description: 'لوحات، مزهريات، إكسسوارات', sort_order: 7 },
    { name: 'سجاد', name_en: 'Carpets', icon: '🟫', description: 'سجاد يدوي، موكيت، بسط', sort_order: 8 },
    { name: 'طاقة شمسية', name_en: 'Solar', icon: '☀️', description: 'ألواح، بطاريات، إنفرترات', sort_order: 9 },
    { name: 'أدوات تنظيف', name_en: 'Cleaning', icon: '🧹', description: 'مكانس، ممسحات، منظفات', sort_order: 10 },
  ];

  categories.forEach((c, i) => {
    try {
      run('INSERT INTO categories (name, name_en, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
        [c.name, c.name_en || null, c.icon, c.description || null, c.sort_order]);
    } catch(e) { console.error(`Category ${i} error:`, e); }
  });

  // Subcategories
  const subcats = [
    { parent: 1, name: 'غرف نوم', icon: '🛏️', sort_order: 1 },
    { parent: 1, name: 'صالونات', icon: '🛋️', sort_order: 2 },
    { parent: 1, name: 'طاولات وكراسي', icon: '🪑', sort_order: 3 },
    { parent: 1, name: 'مكتبات', icon: '📚', sort_order: 4 },
    { parent: 2, name: 'برادات', icon: '❄️', sort_order: 1 },
    { parent: 2, name: 'غسالات', icon: '🧺', sort_order: 2 },
    { parent: 2, name: 'تلفزيونات', icon: '📺', sort_order: 3 },
    { parent: 2, name: 'مكيفات', icon: '🌀', sort_order: 4 },
    { parent: 2, name: 'مكانس كهربائية', icon: '🧹', sort_order: 5 },
    { parent: 9, name: 'ألواح شمسية', icon: '🔆', sort_order: 1 },
    { parent: 9, name: 'بطاريات', icon: '🔋', sort_order: 2 },
    { parent: 9, name: 'إنفرترات', icon: '⚡', sort_order: 3 },
  ];
  subcats.forEach((sc, i) => {
    try {
      run('INSERT INTO categories (name, icon, parent_id, sort_order) VALUES (?, ?, ?, ?)',
        [sc.name, sc.icon, sc.parent, sc.sort_order]);
    } catch(e) { console.error(`Subcat ${i} error:`, e); }
  });

  // === Stores ===
  const stores = [
    { name: 'مستودع النور', slug: 'al-nour', description: 'أكبر مستودع أثاث في الرقة - تجهيزات كاملة للمنازل', owner_name: 'أحمد المحمد', phone: '+963932100001', whatsapp: '+963932100001', address: 'شارع تل أبيض - قرب دوار الساعة', neighborhood: 'حي الرشيد', rating: 4.5, rating_count: 28, is_verified: 1, is_featured: 1, delivery_available: 1, installment_available: 1, working_hours: '9 صباحاً - 9 مساءً' },
    { name: 'بيت العائلة', slug: 'bait-al-aila', description: 'كل ما تحتاجه العائلة تحت سقف واحد', owner_name: 'محمود خليل', phone: '+963932100002', whatsapp: '+963932100002', address: 'شارع 23 شباط', neighborhood: 'حي الثكنة', rating: 4.2, rating_count: 15, is_verified: 1, is_featured: 1, delivery_available: 1, installment_available: 0, working_hours: '10 صباحاً - 8 مساءً' },
    { name: 'كهربائيات الفرات', slug: 'furat-electronics', description: 'وكيل معتمد للأجهزة الكهربائية - ضمان حقيقي', owner_name: 'عبدالله الجاسم', phone: '+963932100003', whatsapp: '+963932100003', address: 'سوق الهال الجديد', neighborhood: 'المنصور', rating: 4.8, rating_count: 42, is_verified: 1, is_featured: 1, delivery_available: 1, installment_available: 1, working_hours: '9 صباحاً - 10 مساءً' },
    { name: 'سولار الرقة', slug: 'raqqa-solar', description: 'حلول متكاملة للطاقة الشمسية مع التركيب', owner_name: 'خالد العمر', phone: '+963932100004', whatsapp: '+963932100004', address: 'شارع الجسر', neighborhood: 'حي الرميلة', rating: 4.6, rating_count: 19, is_verified: 1, is_featured: 0, delivery_available: 1, installment_available: 1, working_hours: '8 صباحاً - 6 مساءً' },
    { name: 'مفروشات دمشق', slug: 'dimashq-textiles', description: 'أفخر المفروشات السورية والتركية', owner_name: 'هاني الشعار', phone: '+963932100005', whatsapp: '+963932100005', address: 'سوق الصاغة', neighborhood: 'حي الثكنة', rating: 4.0, rating_count: 11, is_verified: 0, is_featured: 0, delivery_available: 0, installment_available: 0, working_hours: '10 صباحاً - 7 مساءً' },
    { name: 'ديكورات الشام', slug: 'sham-decor', description: 'ديكورات وإكسسوارات عصرية لمنزلك', owner_name: 'سامر حسن', phone: '+963932100006', whatsapp: '+963932100006', address: 'شارع القوتلي', neighborhood: 'حي الرشيد', rating: 3.8, rating_count: 8, is_verified: 1, is_featured: 0, delivery_available: 1, installment_available: 0, working_hours: '11 صباحاً - 8 مساءً' },
  ];

  stores.forEach((s, i) => {
    try {
      run(`INSERT INTO stores (name, slug, description, owner_name, phone, whatsapp, address, neighborhood, rating, rating_count, is_verified, is_featured, delivery_available, installment_available, working_hours)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.name, s.slug, s.description, s.owner_name, s.phone, s.whatsapp, s.address, s.neighborhood, s.rating, s.rating_count, s.is_verified, s.is_featured, s.delivery_available, s.installment_available, s.working_hours]);
    } catch(e) { console.error(`Store ${i} error:`, e); }
  });

  // === Products ===
  const products = [
    // Store 1 - مستودع النور (Furniture)
    { store_id: 1, category_id: 1, name: 'غرفة نوم كاملة - خشب زان', slug: 'bedroom-set-beech', description: 'غرفة نوم 7 قطع: سرير 180x200 + 2 كومودينو + تسريحة + خزانة 6 أبواب. خشب زان طبيعي مع لاكيه أبيض.', price: 12500000, old_price: 15000000, brand: 'صناعة محلية', origin_country: 'سوريا', material: 'خشب زان', color: 'أبيض/بني', warranty: '3 سنوات', in_stock: 1, is_featured: 1, tags: 'غرفة نوم,زان,لاكيه,عرسان' },
    { store_id: 1, category_id: 1, name: 'صالون كلاسيك 9 مقاعد', slug: 'classic-salon-9', description: 'صالون كلاسيكي فاخر 4 قطع - 3+3+2+1 مقعد. قماش شانيل مقاوم للبقع.', price: 8000000, brand: 'صناعة محلية', material: 'خشب + قماش شانيل', color: 'بيج/ذهبي', warranty: '2 سنة', in_stock: 1, is_featured: 1, tags: 'صالون,كلاسيك,جلوس' },
    { store_id: 1, category_id: 1, name: 'طاولة سفرة 8 كراسي', slug: 'dining-table-8', description: 'طاولة سفرة MDF مع 8 كراسي مبطنة. قابلة للتمديد حتى 3 أمتار.', price: 4500000, old_price: 5200000, material: 'MDF', color: 'بني غامق', in_stock: 1, tags: 'سفرة,طاولة,كراسي' },

    // Store 2 - بيت العائلة
    { store_id: 2, category_id: 3, name: 'طقم طناجر ستيل 10 قطع', slug: 'steel-pots-10', description: 'طقم طناجر ستانلس ستيل 18/10 مع أغطية زجاجية. متوافق مع جميع أنواع المواقد.', price: 850000, old_price: 1100000, brand: 'OMS', origin_country: 'تركيا', material: 'ستانلس ستيل', warranty: '5 سنوات', in_stock: 1, is_featured: 1, tags: 'طناجر,مطبخ,ستيل,طبخ' },
    { store_id: 2, category_id: 3, name: 'طقم صحون 72 قطعة', slug: 'dishes-set-72', description: 'طقم صحون بورسلان فاخر 72 قطعة - 12 شخص. تصميم زهور كلاسيكي.', price: 650000, brand: 'Güral', origin_country: 'تركيا', material: 'بورسلان', in_stock: 1, tags: 'صحون,مطبخ,بورسلان,عرسان' },
    { store_id: 2, category_id: 4, name: 'فرشة إسفنج طبية 200x180', slug: 'medical-mattress', description: 'فرشة إسفنج طبية مضغوط عالي الكثافة. ارتفاع 25 سم مع غطاء قابل للغسل.', price: 1200000, old_price: 1500000, brand: 'Syrian Foam', material: 'إسفنج طبي', warranty: '10 سنوات', in_stock: 1, is_featured: 1, tags: 'فرشة,نوم,طبية,إسفنج' },

    // Store 3 - كهربائيات الفرات
    { store_id: 3, category_id: 2, name: 'برّاد LG 20 قدم - إنفرتر', slug: 'lg-fridge-20', description: 'برّاد LG موديل 2024 - 20 قدم مع تقنية إنفرتر لتوفير الكهرباء. نظام تبريد ذكي.', price: 18000000, old_price: 21000000, brand: 'LG', origin_country: 'كوريا', material: 'ستانلس ستيل', color: 'فضي', energy_rating: 'A++', solar_compatible: 1, warranty: '5 سنوات', in_stock: 1, is_featured: 1, is_negotiable: 1, tags: 'برّاد,LG,إنفرتر,سولار' },
    { store_id: 3, category_id: 2, name: 'غسالة Samsung 9 كيلو', slug: 'samsung-washer-9', description: 'غسالة أوتوماتيك Samsung 9 كيلو - 14 برنامج غسيل. موفرة للماء والكهرباء.', price: 8500000, brand: 'Samsung', origin_country: 'كوريا', color: 'أبيض', energy_rating: 'A+', solar_compatible: 1, warranty: '3 سنوات', in_stock: 1, is_featured: 1, tags: 'غسالة,سامسونغ,أوتوماتيك' },
    { store_id: 3, category_id: 2, name: 'تلفزيون Samsung 55 بوصة 4K', slug: 'samsung-tv-55', description: 'شاشة Samsung Crystal UHD 55 بوصة - 4K Smart TV. نظام Tizen OS.', price: 14000000, brand: 'Samsung', origin_country: 'كوريا', dimensions: '55 بوصة', energy_rating: 'A', solar_compatible: 1, warranty: '2 سنة', in_stock: 1, tags: 'تلفزيون,شاشة,سمارت,4K' },

    // Store 4 - سولار الرقة
    { store_id: 4, category_id: 9, name: 'نظام سولار منزلي 5 كيلو واط', slug: 'solar-system-5kw', description: 'نظام طاقة شمسية متكامل: 10 ألواح 500W + إنفرتر هجين + 4 بطاريات ليثيوم. يشغل برّاد + غسالة + إضاءة كاملة.', price: 45000000, old_price: 52000000, brand: 'Huawei + JA Solar', origin_country: 'الصين', solar_compatible: 1, warranty: '10 سنوات ألواح / 5 سنوات بطاريات', in_stock: 1, is_featured: 1, is_negotiable: 1, tags: 'سولار,طاقة شمسية,ألواح,بطاريات,إنفرتر' },
    { store_id: 4, category_id: 9, name: 'لوح شمسي 550W مونو', slug: 'solar-panel-550w', description: 'لوح سولار JA Solar مونو كريستال 550 واط. كفاءة عالية 21.3%.', price: 2800000, brand: 'JA Solar', origin_country: 'الصين', solar_compatible: 1, dimensions: '2278x1134x30 مم', weight: '28.6 كغ', warranty: '25 سنة', in_stock: 1, tags: 'لوح,سولار,مونو' },

    // Store 5 - مفروشات دمشق
    { store_id: 5, category_id: 4, name: 'طقم بطانيات تركي 6 قطع', slug: 'turkish-blanket-set', description: 'طقم بطانيات تركية فاخرة - 6 قطع بألوان متناسقة. خامة مخمل ناعمة.', price: 450000, brand: 'TAC', origin_country: 'تركيا', material: 'مخمل', color: 'بورجندي', in_stock: 1, tags: 'بطانيات,مفروشات,تركي' },
    { store_id: 5, category_id: 8, name: 'سجادة يدوية إيرانية 3x4', slug: 'iranian-carpet', description: 'سجادة يدوية إيرانية أصلية - تصميم فلورال كلاسيكي. 1 مليون عقدة/م².', price: 9500000, origin_country: 'إيران', material: 'حرير + صوف', dimensions: '3x4 متر', in_stock: 1, is_featured: 1, tags: 'سجاد,يدوي,إيراني' },

    // Store 6 - ديكورات الشام
    { store_id: 6, category_id: 7, name: 'ثريا كريستال كلاسيك 12 شعلة', slug: 'crystal-chandelier', description: 'ثريا كريستال بوهيمي أصلي - 12 شعلة. قطر 80 سم.', price: 3200000, origin_country: 'تشيكيا', material: 'كريستال بوهيمي', color: 'ذهبي', dimensions: 'قطر 80 سم', in_stock: 1, is_featured: 1, tags: 'ثريا,كريستال,إضاءة,ديكور' },
    { store_id: 6, category_id: 5, name: 'طقم إضاءة LED سولار', slug: 'solar-led-kit', description: 'طقم إضاءة LED يعمل بالطاقة الشمسية - 6 لمبات + لوح سولار + بطارية. مثالي لانقطاع الكهرباء.', price: 380000, old_price: 480000, brand: 'Solar King', solar_compatible: 1, warranty: '1 سنة', in_stock: 1, tags: 'إضاءة,LED,سولار,بطارية' },
  ];

  products.forEach((p, i) => {
    const cols = Object.keys(p);
    const vals = Object.values(p).map(v => v === undefined ? null : v);
    try {
      run(`INSERT INTO products (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
    } catch(e) { console.error(`Product ${i} (${p.name}) error:`, e, 'cols:', cols, 'vals:', vals); }
  });

  // === Reviews ===
  const reviews = [
    { store_id: 1, reviewer_name: 'أم أحمد', rating: 5, comment: 'أثاث ممتاز وأسعار معقولة. التوصيل كان سريع والتركيب مجاني.', is_verified: 1 },
    { store_id: 1, reviewer_name: 'خالد م.', rating: 4, comment: 'نوعية جيدة لكن الأسعار مرتفعة قليلاً مقارنة بالسوق.', is_verified: 1 },
    { store_id: 3, reviewer_name: 'سامي العلي', rating: 5, comment: 'أفضل محل كهربائيات في الرقة. الضمان حقيقي ومضمون.', is_verified: 1 },
    { store_id: 3, reviewer_name: 'فاطمة ح.', rating: 5, comment: 'اشتريت غسالة سامسونغ وبرّاد LG. خدمة ممتازة وأسعار منافسة.', is_verified: 1 },
    { store_id: 4, reviewer_name: 'عمر الخالد', rating: 4, comment: 'ركّبوا لي نظام سولار كامل. شغل نظيف والنظام شغّال من 6 أشهر بدون أي مشكلة.', is_verified: 1 },
    { store_id: 2, reviewer_name: 'هند الأحمد', rating: 4, comment: 'تنوع جيد في المنتجات. أحتاج التوصيل لأنني بعيدة عن المتجر.', is_verified: 0 },
  ];
  reviews.forEach((r, i) => {
    try {
      run('INSERT INTO reviews (store_id, reviewer_name, rating, comment, is_verified) VALUES (?, ?, ?, ?, ?)',
        [r.store_id, r.reviewer_name, r.rating, r.comment, r.is_verified]);
    } catch(e) { console.error(`Review ${i} error:`, e); }
  });

  // === Category Filters ===
  const filters = [
    { category_id: 1, filter_name: 'نوع الخشب', filter_name_en: 'wood_type', filter_type: 'select', filter_options: JSON.stringify(['زان', 'MDF', 'لاتيه', 'سنديان']), sort_order: 1 },
    { category_id: 1, filter_name: 'اللون', filter_name_en: 'color', filter_type: 'select', filter_options: JSON.stringify(['أبيض', 'بني', 'رمادي', 'أسود']), sort_order: 2 },
    { category_id: 2, filter_name: 'موفر للطاقة', filter_name_en: 'energy_saver', filter_type: 'boolean', sort_order: 1 },
    { category_id: 2, filter_name: 'متوافق مع السولار', filter_name_en: 'solar', filter_type: 'boolean', sort_order: 2 },
    { category_id: 9, filter_name: 'نوع اللوح', filter_name_en: 'panel_type', filter_type: 'select', filter_options: JSON.stringify(['مونو', 'بولي', 'PERC']), sort_order: 1 },
  ];
  filters.forEach((f, i) => {
    try {
      run('INSERT INTO category_filters (category_id, filter_name, filter_name_en, filter_type, filter_options, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [f.category_id, f.filter_name, f.filter_name_en, f.filter_type, f.filter_options || null, f.sort_order]);
    } catch(e) { console.error(`Filter ${i} error:`, e); }
  });

  saveDb();
  console.log('✅ تم إدراج البيانات التجريبية بنجاح!');
  console.log(`   - ${categories.length} تصنيف + ${subcats.length} تصنيف فرعي`);
  console.log(`   - ${stores.length} متجر`);
  console.log(`   - ${products.length} منتج`);
  console.log(`   - ${reviews.length} تقييم`);
  console.log(`   - ${filters.length} فلتر`);
}

// Run if called directly
if (require.main === module) {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = seed;
