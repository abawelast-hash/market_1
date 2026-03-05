const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression()); // Compress all responses (critical for slow Syrian internet)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files with aggressive caching for PWA
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    // Service Worker should never be cached by the browser
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // WebP images get longer cache
    if (filePath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    }
  }
}));

// API Routes
app.use('/api/stores', require('./routes/stores'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/search', require('./routes/search'));
app.use('/api/stats', require('./routes/stats'));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('خطأ في الخادم:', err.stack);
  res.status(500).json({ 
    error: 'حدث خطأ في الخادم',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`\n🏪 دليل المستودعات والأسواق المنزلية - الرقة`);
  console.log(`📡 الخادم يعمل على: http://localhost:${PORT}`);
  console.log(`📱 افتح الرابط على هاتفك لتثبيت التطبيق كـ PWA\n`);
});

module.exports = app;
