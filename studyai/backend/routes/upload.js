const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and TXT files are supported'));
  }
});

// Extract text from PDF or TXT
router.post('/extract', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let text = '';

    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
      // Clean up PDF text artifacts
      text = text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[^\S\n]{2,}/g, ' ')
        .trim();
    } else if (req.file.mimetype === 'text/plain') {
      text = req.file.buffer.toString('utf-8');
    }

    if (!text || text.length < 50) {
      return res.status(400).json({ error: 'Could not extract enough text from this file. Try copying the text manually.' });
    }

    res.json({
      text,
      charCount: text.length,
      wordCount: text.split(/\s+/).length,
      filename: req.file.originalname
    });
  } catch (err) {
    console.error('PDF parse error:', err);
    res.status(500).json({ error: 'Failed to extract text from file. The PDF may be scanned/image-based.' });
  }
});

module.exports = router;
