require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const flashcardRoutes = require('./routes/flashcards');
const aiRoutes = require('./routes/ai');
const uploadRoutes = require('./routes/upload');
const examRoutes = require('./routes/exam');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api/', limiter);

app.use('/api/flashcards', flashcardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/exam', examRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.json({ app: 'StudyAI', status: 'running' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`StudyAI running on port ${PORT}`));
