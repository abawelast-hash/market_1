const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'dalil.db');

let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

setInterval(() => { if (db) saveDb(); }, 30000);
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

function initSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    icon TEXT,
    description TEXT,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stores (
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    alt_text TEXT,
    is_primary INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    product_id INTEGER,
    reviewer_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wishlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, product_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS qr_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    device_id TEXT,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    store_id INTEGER,
    platform TEXT DEFAULT 'whatsapp',
    device_id TEXT,
    shared_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS category_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    filter_name TEXT NOT NULL,
    filter_name_en TEXT,
    filter_type TEXT DEFAULT 'select',
    filter_options TEXT,
    sort_order INTEGER DEFAULT 0
  )`);

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)',
    'CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)',
    'CREATE INDEX IF NOT EXISTS idx_stores_neighborhood ON stores(neighborhood)',
    'CREATE INDEX IF NOT EXISTS idx_stores_featured ON stores(is_featured)',
    'CREATE INDEX IF NOT EXISTS idx_wishlists_device ON wishlists(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id)',
  ];
  indexes.forEach(idx => { try { db.run(idx); } catch(e) {} });
}

// Helper: run a SELECT and return all rows as array of objects
function allRows(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a SELECT and return first row
function getRow(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

// Helper: run INSERT/UPDATE/DELETE
function run(sql, params = []) {
  db.run(sql, params);
  // Return last insert id for inserts
  const lastId = db.exec("SELECT last_insert_rowid() as id");
  return lastId[0]?.values[0]?.[0] || 0;
}

module.exports = { getDb, saveDb, allRows, getRow, run, DB_PATH };
