/**
 * 🕵️ نظام الجاسوس - مراقب الملفات وتحديث التوثيق تلقائياً
 * 
 * هذا السكريبت يراقب جميع ملفات المشروع ويقوم بـ:
 * 1. تسجيل كل عملية إنشاء/تعديل/حذف في سجل التغييرات
 * 2. تحديث ملفات التوثيق عند تغيير أي ملف كود
 * 3. عرض إشعارات ملونة في الـ Terminal
 * 
 * التشغيل: node docs-watcher.js
 * أو: npm run docs:watch
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// الإعدادات
// ============================================================

const PROJECT_ROOT = __dirname;
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const CHANGELOG_FILE = path.join(DOCS_DIR, 'سجل_التغييرات.md');

// المجلدات والملفات التي يجب تجاهلها
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dalil.db',
  'dalil_backup.db',
  '.DS_Store',
  'Thumbs.db',
  'package-lock.json',
];

// المجلدات المُراقبة
const WATCH_DIRS = [
  PROJECT_ROOT,
  path.join(PROJECT_ROOT, 'database'),
  path.join(PROJECT_ROOT, 'routes'),
  path.join(PROJECT_ROOT, 'public'),
  path.join(PROJECT_ROOT, 'public', 'js'),
  path.join(PROJECT_ROOT, 'public', 'css'),
  path.join(PROJECT_ROOT, 'public', 'icons'),
];

// ============================================================
// ألوان الـ Terminal
// ============================================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
  bold: '\x1b[1m',
};

// ============================================================
// وظائف مساعدة
// ============================================================

/**
 * الحصول على الوقت والتاريخ الحالي بصيغة عربية
 */
function getArabicDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return { date, time, iso: now.toISOString(), timestamp: now.getTime() };
}

/**
 * الحصول على الوقت بصيغة HH:MM:SS
 */
function getTimeStamp() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * الحصول على التاريخ بصيغة YYYY-MM-DD
 */
function getDateStamp() {
  return new Date().toISOString().split('T')[0];
}

/**
 * هل يجب تجاهل هذا الملف؟
 */
function shouldIgnore(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  return IGNORE_PATTERNS.some(pattern => relativePath.includes(pattern));
}

/**
 * الحصول على المسار النسبي
 */
function getRelativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

/**
 * تحديد نوع الملف ووصفه بالعربي
 */
function getFileDescription(filePath) {
  const rel = getRelativePath(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  // أوصاف محددة لملفات معروفة
  const knownFiles = {
    'server.js': 'الخادم الرئيسي - Express + middleware + مسارات',
    'package.json': 'إعدادات المشروع والمكتبات',
    'database/schema.js': 'هيكل قاعدة البيانات + وظائف مساعدة',
    'database/seed.js': 'بيانات تجريبية (متاجر، منتجات، تصنيفات)',
    'routes/stores.js': 'مسارات API المتاجر',
    'routes/products.js': 'مسارات API المنتجات',
    'routes/categories.js': 'مسارات API التصنيفات',
    'routes/search.js': 'مسار البحث الشامل',
    'routes/qr.js': 'مسارات QR Code',
    'routes/stats.js': 'مسارات الإحصائيات',
    'public/index.html': 'هيكل PWA - الصفحة الرئيسية',
    'public/sw.js': 'Service Worker - العمل أوفلاين',
    'public/manifest.json': 'إعدادات PWA manifest',
    'public/css/style.css': 'التنسيقات والألوان RTL',
    'public/js/app.js': 'البرنامج الرئيسي - تهيئة التطبيق',
    'public/js/db.js': 'IndexedDB - تخزين أوفلاين',
    'public/js/api.js': 'عميل API - تواصل مع الخادم',
    'public/js/router.js': 'موجّه SPA - تنقل بين الصفحات',
    'public/js/ui.js': 'أدوات الواجهة - بطاقات وتنسيق',
    'public/js/pages.js': 'محتوى الصفحات (11 صفحة)',
    'public/js/wishlist.js': 'مدير قائمة الأمنيات',
    'public/js/share.js': 'مدير المشاركة (واتساب)',
    'public/js/qr.js': 'مدير رموز QR',
    'docs-watcher.js': 'نظام الجاسوس - مراقبة الملفات',
    '.gitignore': 'ملف تجاهل Git',
    'README.md': 'الملف التعريفي للمشروع',
  };

  if (knownFiles[rel]) return knownFiles[rel];

  // أوصاف عامة حسب الامتداد
  const extDescriptions = {
    '.js': 'ملف JavaScript',
    '.html': 'ملف HTML',
    '.css': 'ملف تنسيقات CSS',
    '.json': 'ملف إعدادات JSON',
    '.md': 'ملف توثيق Markdown',
    '.svg': 'صورة SVG',
    '.png': 'صورة PNG',
    '.jpg': 'صورة JPEG',
    '.webp': 'صورة WebP',
  };

  return extDescriptions[ext] || `ملف ${ext || 'غير معروف'}`;
}

/**
 * تحديد نوع العملية بالعربي
 */
function getOperationType(eventType) {
  switch (eventType) {
    case 'create': return { ar: 'إنشاء', icon: '🟢', color: colors.green, bg: colors.bgGreen };
    case 'modify': return { ar: 'تعديل', icon: '🟡', color: colors.yellow, bg: colors.bgYellow };
    case 'delete': return { ar: 'حذف', icon: '🔴', color: colors.red, bg: colors.bgRed };
    default: return { ar: 'تغيير', icon: '🔵', color: colors.blue, bg: colors.bgBlue };
  }
}

// ============================================================
// نظام التسجيل
// ============================================================

// تخزين التغييرات الحالية
let pendingChanges = [];
let saveTimeout = null;

/**
 * تسجيل تغيير في سجل التغييرات
 */
function logChange(eventType, filePath) {
  const time = getTimeStamp();
  const date = getDateStamp();
  const relativePath = getRelativePath(filePath);
  const description = getFileDescription(filePath);
  const operation = getOperationType(eventType);

  // طباعة في Terminal
  console.log(
    `${operation.color}${colors.bold}  ${operation.icon} [${time}] ${operation.ar}: ${colors.reset}` +
    `${colors.cyan}${relativePath}${colors.reset}` +
    ` ${colors.white}← ${description}${colors.reset}`
  );

  // إضافة للتغييرات المعلقة
  pendingChanges.push({
    time,
    date,
    type: eventType,
    typeAr: operation.ar,
    icon: operation.icon,
    file: relativePath,
    description,
  });

  // حفظ بأسلوب debounce (كل 3 ثوانٍ)
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    savePendingChanges();
  }, 3000);
}

/**
 * حفظ التغييرات المعلقة في ملف سجل التغييرات
 */
function savePendingChanges() {
  if (pendingChanges.length === 0) return;

  try {
    // قراءة السجل الحالي
    let content = '';
    if (fs.existsSync(CHANGELOG_FILE)) {
      content = fs.readFileSync(CHANGELOG_FILE, 'utf-8');
    }

    const date = getDateStamp();
    const dateHeader = `\n## 📅 سجل آلي - ${date}\n`;

    // بناء جدول التغييرات الجديدة
    let newEntries = '\n### تغييرات مُسجَّلة آلياً بواسطة الجاسوس:\n\n';
    newEntries += '| الوقت | العملية | الملف | الوصف |\n';
    newEntries += '|-------|--------|-------|-------|\n';

    pendingChanges.forEach(change => {
      newEntries += `| ${change.time} | ${change.icon} ${change.typeAr} | \`${change.file}\` | ${change.description} |\n`;
    });

    newEntries += '\n---\n';

    // إضافة في نهاية الملف
    if (content.includes(`## 📅 سجل آلي - ${date}`)) {
      // نفس اليوم - أضف قبل الـ --- الأخير لهذا اليوم
      const marker = `## 📅 سجل آلي - ${date}`;
      const idx = content.lastIndexOf('---');
      if (idx > content.indexOf(marker)) {
        content = content.substring(0, idx) + newEntries;
      } else {
        content += newEntries;
      }
    } else {
      // يوم جديد
      content += dateHeader + newEntries;
    }

    fs.writeFileSync(CHANGELOG_FILE, content, 'utf-8');

    console.log(
      `\n${colors.green}${colors.bold}  ✅ تم حفظ ${pendingChanges.length} تغيير(ات) في سجل التغييرات${colors.reset}\n`
    );

    pendingChanges = [];
  } catch (err) {
    console.error(`${colors.red}  ❌ خطأ في حفظ السجل: ${err.message}${colors.reset}`);
  }
}

// ============================================================
// تحديث التوثيق التلقائي
// ============================================================

/**
 * تحديث ملف الإحصائيات في التوثيق الشامل
 */
function updateProjectStats() {
  try {
    let totalFiles = 0;
    let totalLines = 0;
    const fileTypes = {};

    function countFiles(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        if (shouldIgnore(fullPath)) return;
        if (item.startsWith('.') && item !== '.gitignore') return;

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (item !== 'docs') countFiles(fullPath);
        } else {
          totalFiles++;
          const ext = path.extname(item).toLowerCase() || 'other';
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            totalLines += content.split('\n').length;
          } catch (e) { /* binary file */ }
        }
      });
    }

    countFiles(PROJECT_ROOT);

    console.log(`${colors.magenta}  📊 إحصائيات: ${totalFiles} ملف، ~${totalLines} سطر${colors.reset}`);
  } catch (err) {
    // ignore
  }
}

// ============================================================
// نظام المراقبة الرئيسي
// ============================================================

// تتبع الملفات الموجودة (لكشف الإنشاء والحذف)
const knownFiles = new Map();

/**
 * مسح أولي لكل الملفات الموجودة
 */
function scanExistingFiles(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (shouldIgnore(fullPath)) return;

      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          knownFiles.set(fullPath, stat.mtimeMs);
        } else if (stat.isDirectory()) {
          scanExistingFiles(fullPath);
        }
      } catch (e) { /* skip */ }
    });
  } catch (e) { /* skip */ }
}

/**
 * Debounce للأحداث المتكررة
 */
const eventDebounce = new Map();
function debounceEvent(filePath, callback) {
  const key = filePath;
  if (eventDebounce.has(key)) {
    clearTimeout(eventDebounce.get(key));
  }
  eventDebounce.set(key, setTimeout(() => {
    eventDebounce.delete(key);
    callback();
  }, 500));
}

/**
 * معالجة حدث تغيير ملف
 */
function handleFileEvent(dir, eventType, filename) {
  if (!filename) return;

  const filePath = path.join(dir, filename);

  // تجاهل الملفات المستثناة
  if (shouldIgnore(filePath)) return;

  // تجاهل ملفات التوثيق (لتجنب حلقة لا نهائية)
  if (filePath.startsWith(DOCS_DIR)) return;

  // debounce
  debounceEvent(filePath, () => {
    try {
      const exists = fs.existsSync(filePath);

      if (exists) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) return;

        if (knownFiles.has(filePath)) {
          // الملف كان موجوداً → تعديل
          const oldMtime = knownFiles.get(filePath);
          if (stat.mtimeMs !== oldMtime) {
            knownFiles.set(filePath, stat.mtimeMs);
            logChange('modify', filePath);
          }
        } else {
          // ملف جديد → إنشاء
          knownFiles.set(filePath, stat.mtimeMs);
          logChange('create', filePath);
        }
      } else {
        // الملف لم يعد موجوداً → حذف
        if (knownFiles.has(filePath)) {
          knownFiles.delete(filePath);
          logChange('delete', filePath);
        }
      }
    } catch (e) {
      // ملف مؤقت أو محذوف أثناء المعالجة
    }
  });
}

/**
 * بدء مراقبة مجلد
 */
function watchDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    const watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
      handleFileEvent(dir, eventType, filename);
    });

    watcher.on('error', (err) => {
      console.error(`${colors.red}  ⚠️ خطأ في مراقبة ${dir}: ${err.message}${colors.reset}`);
    });

    return watcher;
  } catch (err) {
    console.error(`${colors.red}  ⚠️ تعذر مراقبة ${dir}: ${err.message}${colors.reset}`);
    return null;
  }
}

// ============================================================
// البدء
// ============================================================

function start() {
  console.log('\n');
  console.log(`${colors.bgBlue}${colors.white}${colors.bold}                                                          ${colors.reset}`);
  console.log(`${colors.bgBlue}${colors.white}${colors.bold}   🕵️  نظام الجاسوس - مراقب ملفات دليل الرقة             ${colors.reset}`);
  console.log(`${colors.bgBlue}${colors.white}${colors.bold}   📁 المشروع: دليل المستودعات والأسواق المنزلية          ${colors.reset}`);
  console.log(`${colors.bgBlue}${colors.white}${colors.bold}   🏙️  مدينة الرقة، سوريا                                 ${colors.reset}`);
  console.log(`${colors.bgBlue}${colors.white}${colors.bold}                                                          ${colors.reset}`);
  console.log('\n');

  // التأكد من وجود مجلد التوثيق
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  // مسح الملفات الموجودة
  console.log(`${colors.cyan}  📂 جارٍ مسح ملفات المشروع...${colors.reset}`);
  WATCH_DIRS.forEach(dir => scanExistingFiles(dir));
  console.log(`${colors.green}  ✅ تم رصد ${knownFiles.size} ملف${colors.reset}`);

  // عرض إحصائيات
  updateProjectStats();

  // بدء المراقبة
  console.log(`\n${colors.cyan}  👁️  بدء المراقبة على ${WATCH_DIRS.length} مجلد...${colors.reset}`);
  const watchers = [];
  WATCH_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const watcher = watchDirectory(dir);
      if (watcher) {
        watchers.push(watcher);
        const relDir = getRelativePath(dir) || '.';
        console.log(`${colors.green}  ✅ مراقبة: ${relDir}${colors.reset}`);
      }
    }
  });

  console.log(`\n${colors.yellow}${colors.bold}  🔍 الجاسوس نشط - أي تغيير سيُسجَّل تلقائياً${colors.reset}`);
  console.log(`${colors.white}  📋 السجل: docs/سجل_التغييرات.md${colors.reset}`);
  console.log(`${colors.white}  ⏹️  للإيقاف: Ctrl+C${colors.reset}\n`);
  console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}\n`);

  // إنهاء نظيف
  process.on('SIGINT', () => {
    console.log(`\n\n${colors.yellow}  ⏹️  إيقاف الجاسوس...${colors.reset}`);

    // حفظ أي تغييرات معلقة
    if (pendingChanges.length > 0) {
      savePendingChanges();
    }

    // إغلاق المراقبين
    watchers.forEach(w => { if (w) w.close(); });

    console.log(`${colors.green}  ✅ تم الإيقاف بنجاح${colors.reset}\n`);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (pendingChanges.length > 0) savePendingChanges();
    process.exit(0);
  });
}

// تشغيل
start();
