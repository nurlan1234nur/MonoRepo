import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { authRouter } from './routes/auth.routes.js';
import { coupleRouter } from './routes/couple.routes.js';
import { messageRouter } from './routes/message.routes.js';
import { moodRouter } from './routes/mood.routes.js';
import { capsuleRouter } from './routes/capsule.routes.js';
import { momentRouter } from './routes/moment.routes.js';
import { milestoneRouter } from './routes/milestone.routes.js';
import { dailyRouter } from './routes/daily.routes.js';
import { wishRouter } from './routes/wish.routes.js';
import { songRouter } from './routes/song.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { loveNoteRouter } from './routes/loveNote.routes.js';
import { notFound, errorHandler } from './middleware/error.js';
import { initSocket } from './realtime/socket.js';
import { uploadsDir } from './config/uploads.js';

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Upload хийсэн зургуудыг статикаар үйлчилнэ (nginx /uploads-ийг энд proxy хийнэ).
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nous-server' });
});

app.use('/api/auth', authRouter);
app.use('/api/couples', coupleRouter);
app.use('/api/messages', messageRouter);
app.use('/api/moods', moodRouter);
app.use('/api/capsules', capsuleRouter);
app.use('/api/moments', momentRouter);
app.use('/api/milestones', milestoneRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/wishes', wishRouter);
app.use('/api/songs', songRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/love-notes', loveNoteRouter);

app.use(notFound);
app.use(errorHandler);

const server = createServer(app);
initSocket(server);

async function start(): Promise<void> {
  await connectDB();
  server.listen(env.port, () => {
    console.log(`✓ Server http://localhost:${env.port} дээр ажиллаж байна`);
  });
}

start().catch((err) => {
  console.error('Сервер эхлэхэд алдаа гарлаа:', err);
  process.exit(1);
});
