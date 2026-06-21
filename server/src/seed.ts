import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Couple } from './models/Couple.js';
import { Message } from './models/Message.js';
import { Mood } from './models/Mood.js';
import { Capsule } from './models/Capsule.js';
import { Milestone } from './models/Milestone.js';
import { DailyAnswer } from './models/DailyAnswer.js';
import { Moment } from './models/Moment.js';
import { Wish } from './models/Wish.js';
import { WeeklySong } from './models/WeeklySong.js';
import { WebPushSubscription } from './models/WebPushSubscription.js';
import { LoveNote } from './models/LoveNote.js';
import { GameRound } from './models/GameRound.js';
import { BattleshipGame } from './models/BattleshipGame.js';
import { questionIndexForDate, todayStr } from './data/questions.js';

// 2 хос (4 хэрэглэгч) + жишээ мессеж/mood/капсул үүсгэдэг test seed.
// Ажиллуулах: docker compose exec server node dist/seed.js
//   эсвэл локалд: npm run seed
const PASSWORD = 'password123';

async function seed(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log('✓ MongoDB-тэй холбогдлоо');

  // Хуучин өгөгдлийг цэвэрлэнэ (test DB тул бүгдийг арилгана).
  await Promise.all([
    User.deleteMany({}),
    Couple.deleteMany({}),
    Message.deleteMany({}),
    Mood.deleteMany({}),
    Capsule.deleteMany({}),
    Milestone.deleteMany({}),
    DailyAnswer.deleteMany({}),
    Moment.deleteMany({}),
    Wish.deleteMany({}),
    WeeklySong.deleteMany({}),
    WebPushSubscription.deleteMany({}),
    LoveNote.deleteMany({}),
    GameRound.deleteMany({}),
    BattleshipGame.deleteMany({}),
  ]);
  console.log('✓ Хуучин өгөгдлийг цэвэрлэлээ');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const couples = [
    {
      inviteCode: 'LOVE01',
      anniversary: new Date('2023-02-14'),
      a: { email: 'nurlan@nous.mn', name: 'Nurlan', avatar: '💙' },
      b: { email: 'aysu@nous.mn', name: 'Aysu', avatar: '💖' },
      messages: [
        { from: 'a', text: 'Өглөөний мэнд хайрт минь ☀️' },
        { from: 'b', text: 'Мэнд! Өнөөдөр сайхан өдөр болог 🥰' },
        { from: 'a', text: 'Оройн хоолоо хамт идье 🍜', special: true },
      ],
      moods: [
        { from: 'a', emoji: '😊', text: 'Сайхан өдөр байна' },
        { from: 'b', emoji: '🥰', text: 'Чамайг санаж байна' },
      ],
      milestones: [] as { title: string; date: Date; icon: string }[],
      dailyAnswer: { from: 'a', text: 'Хамтдаа кофе уух тайван өглөөнүүд...' },
      capsule: { from: 'a', text: 'Бид анх уулзсан газартаа дахин очно гэдгээ мартуузай 💍', unlockInDays: 30 },
    },
  ];

  const date = todayStr();
  const qIndex = questionIndexForDate(date);

  for (const c of couples) {
    const userA = await User.create({ ...c.a, passwordHash });
    const userB = await User.create({ ...c.b, passwordHash });

    const couple = await Couple.create({
      inviteCode: c.inviteCode,
      members: [userA._id, userB._id],
      anniversary: c.anniversary,
    });
    userA.couple = couple._id;
    userB.couple = couple._id;
    await userA.save();
    await userB.save();

    const pick = (key: string) => (key === 'a' ? userA : userB);

    for (const m of c.messages) {
      await Message.create({
        couple: couple._id,
        sender: pick(m.from)._id,
        text: m.text,
        special: 'special' in m ? m.special : false,
      });
    }

    for (const mood of c.moods) {
      await Mood.create({ couple: couple._id, user: pick(mood.from)._id, emoji: mood.emoji, text: mood.text });
    }

    for (const ms of c.milestones) {
      await Milestone.create({ couple: couple._id, title: ms.title, date: ms.date, icon: ms.icon });
    }

    await DailyAnswer.create({
      couple: couple._id,
      user: pick(c.dailyAnswer.from)._id,
      date,
      questionIndex: qIndex,
      text: c.dailyAnswer.text,
    });

    await Capsule.create({
      couple: couple._id,
      author: pick(c.capsule.from)._id,
      text: c.capsule.text,
      unlockAt: new Date(now + c.capsule.unlockInDays * day),
    });

    console.log(`✓ Хос үүсгэв: ${c.a.name} + ${c.b.name}  (код: ${c.inviteCode})`);
  }

  console.log('\n=== Нэвтрэх мэдээлэл (нууц үг: ' + PASSWORD + ') ===');
  console.log('  Нэр: nurlan  эсвэл  aysu');

  await mongoose.disconnect();
  console.log('\n✓ Seed амжилттай дууслаа');
}

seed().catch((err) => {
  console.error('Seed алдаа:', err);
  process.exit(1);
});
