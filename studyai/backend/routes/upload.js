const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF and TXT supported'));
  }
});

// Accept up to 20 files at once
router.post('/extract', upload.array('files', 20), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  let combinedText = '';
  let totalWords = 0;
  const results = [];

  for (const file of files) {
    try {
      let text = '';
      if (file.mimetype === 'application/pdf') {
        const data = await pdfParse(file.buffer);
        text = data.text.replace(/\n{3,}/g, '\n\n').replace(/[^\S\n]{2,}/g, ' ').trim();
      } else {
        text = file.buffer.toString('utf-8');
      }

      if (!text || text.length < 20) {
        results.push({ filename: file.originalname, success: false, error: 'No text found — may be scanned/image-based' });
        continue;
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      totalWords += wordCount;
      results.push({ filename: file.originalname, success: true, wordCount });

      if (combinedText) combinedText += `\n\n${'─'.repeat(50)}\nFILE: ${file.originalname}\n${'─'.repeat(50)}\n\n`;
      else combinedText += `FILE: ${file.originalname}\n${'─'.repeat(50)}\n\n`;
      combinedText += text;

    } catch (err) {
      results.push({ filename: file.originalname, success: false, error: 'Parse failed' });
    }
  }

  if (!combinedText) return res.status(400).json({ error: 'None of the files could be parsed.' });

  res.json({ text: combinedText, wordCount: totalWords, fileCount: files.length, results });
});

module.exports = router;
