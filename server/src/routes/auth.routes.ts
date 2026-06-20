import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { OtpCode } from '../models/OtpCode.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../config/uploads.js';
import { sendOtpEmail } from '../utils/mailer.js';
import { todayStr } from '../data/questions.js';

export const authRouter = Router();

const DOMAIN = 'nous.mn';
const OTP_TTL_MIN = 10;

// ---- туслах функцүүд ----

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 оронтой
}

// username-ийг латин жижиг үсэг + тоо болгож цэвэрлэнэ.
function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// "aysu" → aysu@nous.mn; аль хэдийн байвал aysu1, aysu2 ... өвөрмөц болгоно.
async function uniqueEmailFromUsername(desired: string): Promise<{ email: string; username: string }> {
  const base = sanitizeUsername(desired);
  let candidate = base;
  let n = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await User.exists({ email: `${candidate}@${DOMAIN}` })) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return { email: `${candidate}@${DOMAIN}`, username: candidate };
}

// username эсвэл бүтэн имэйлийг нэвтрэх имэйл болгоно.
function toLoginEmail(input: string): string {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${sanitizeUsername(v)}@${DOMAIN}`;
}

function userPayload(user: {
  _id: unknown;
  email: string;
  name: string;
  avatar: string;
  status?: string;
  theme?: string;
  couple?: unknown;
  recoveryEmail?: string | null;
  streak?: number;
  birthday?: string;
}) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    status: user.status ?? '',
    theme: user.theme ?? 'rose',
    couple: user.couple ?? null,
    recoveryEmail: user.recoveryEmail ?? null,
    streak: user.streak ?? 0,
    birthday: user.birthday ?? '',
  };
}

// Өдөр алгасалгүй идэвхтэй байсан streak-ийг шинэчилнэ. Өөрчлөгдсөн бол true.
// Аппд орох/нэвтрэх бүрд дуудна — өдөрт нэг л удаа нэмэгдэнэ.
function touchStreak(user: { streak?: number; lastActiveAt?: string }): boolean {
  const today = todayStr();
  if (user.lastActiveAt === today) return false; // өнөөдөр аль хэдийн тоологдсон
  const yesterday = todayStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
  user.streak = user.lastActiveAt === yesterday ? (user.streak ?? 0) + 1 : 1;
  user.lastActiveAt = today;
  return true;
}

// Имэйл хаягийг бүдэгрүүлнэ: jaz995973@gmail.com → ja****73@gmail.com
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 2);
  const tail = local.length > 4 ? local.slice(-2) : '';
  return `${head}****${tail}@${domain}`;
}

// Жинхэнэ имэйл явсангүй бол (dev эсвэл алдаа) кодыг хариунд буцааж дэлгэцэнд харуулна.
function devCodePayload(code: string, delivered: boolean): { devCode?: string } {
  return delivered ? {} : { devCode: code };
}

async function issueOtp(email: string, purpose: 'register' | 'reset' | 'change-email', user?: unknown) {
  await OtpCode.deleteMany({ email, purpose });
  const code = genCode();
  await OtpCode.create({
    email,
    code,
    purpose,
    user: user ?? null,
    expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
  });
  const delivered = await sendOtpEmail(email, code, purpose);
  return { code, delivered };
}

// ================= БҮРТГЭЛ =================

// 1-р алхам: жинхэнэ Gmail рүү код илгээнэ
authRouter.post(
  '/register/request-otp',
  asyncHandler(async (req, res) => {
    const { recoveryEmail } = z.object({ recoveryEmail: z.string().email() }).parse(req.body);
    const email = recoveryEmail.toLowerCase().trim();

    if (await User.exists({ recoveryEmail: email })) {
      res.status(409).json({ error: 'Энэ Gmail аль хэдийн бүртгэлтэй байна' });
      return;
    }

    const { code, delivered } = await issueOtp(email, 'register');
    res.json({ ok: true, ...devCodePayload(code, delivered) });
  }),
);

// 2-р алхам: код + username + нууц үг → бүртгэл үүсгэнэ (нэвтрүүлэхгүй, login руу буцаана)
authRouter.post(
  '/register/verify',
  asyncHandler(async (req, res) => {
    const { recoveryEmail, code, username, password } = z
      .object({
        recoveryEmail: z.string().email(),
        code: z.string().length(6),
        username: z.string().min(1, 'Нэр оруулна уу'),
        password: z.string().min(6, 'Нууц үг хамгийн багадаа 6 тэмдэгт'),
      })
      .parse(req.body);

    const email = recoveryEmail.toLowerCase().trim();
    if (!sanitizeUsername(username)) {
      res.status(400).json({ error: 'Нэр латин үсэг эсвэл тоо агуулсан байх ёстой' });
      return;
    }

    const otp = await OtpCode.findOne({ email, purpose: 'register', code });
    if (!otp) {
      res.status(400).json({ error: 'Код буруу эсвэл хугацаа дууссан байна' });
      return;
    }

    if (await User.exists({ recoveryEmail: email })) {
      await OtpCode.deleteMany({ email, purpose: 'register' });
      res.status(409).json({ error: 'Энэ Gmail аль хэдийн бүртгэлтэй байна' });
      return;
    }

    const { email: loginEmail, username: finalUsername } = await uniqueEmailFromUsername(username);
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email: loginEmail,
      recoveryEmail: email,
      name: username.trim(),
      passwordHash,
    });
    await OtpCode.deleteMany({ email, purpose: 'register' });

    // Нэвтрэх нэр (давхцсан бол aysu1 г.м.) болон давхцсан эсэхийг буцаана.
    res.status(201).json({ ok: true, username: finalUsername, changed: finalUsername !== sanitizeUsername(username) });
  }),
);

// ================= НЭВТРЭХ =================

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = z
      .object({ username: z.string().min(1), password: z.string().min(1) })
      .parse(req.body);

    const email = toLoginEmail(username);
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Нэр эсвэл нууц үг буруу' });
      return;
    }
    if (touchStreak(user)) await user.save();
    const token = signToken({ userId: user._id.toString() });
    res.json({ token, user: userPayload(user) });
  }),
);

// ================= НУУЦ ҮГ СЭРГЭЭХ =================

// 1-р алхам: username → бүртгэлд холбоотой жинхэнэ Gmail руу код илгээнэ
authRouter.post(
  '/forgot/request-otp',
  asyncHandler(async (req, res) => {
    const { username } = z.object({ username: z.string().min(1) }).parse(req.body);
    const email = toLoginEmail(username);
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ error: 'Ийм нэртэй бүртгэл олдсонгүй' });
      return;
    }
    if (!user.recoveryEmail) {
      res.status(400).json({ error: 'Энэ бүртгэлд сэргээх Gmail холбоогүй байна' });
      return;
    }
    const { code, delivered } = await issueOtp(user.recoveryEmail, 'reset', user._id);
    res.json({ ok: true, sentTo: maskEmail(user.recoveryEmail), ...devCodePayload(code, delivered) });
  }),
);

// 2-р алхам: код + шинэ нууц үг
authRouter.post(
  '/forgot/verify',
  asyncHandler(async (req, res) => {
    const { username, code, password } = z
      .object({
        username: z.string().min(1),
        code: z.string().length(6),
        password: z.string().min(6, 'Нууц үг хамгийн багадаа 6 тэмдэгт'),
      })
      .parse(req.body);

    const email = toLoginEmail(username);
    const user = await User.findOne({ email });
    if (!user || !user.recoveryEmail) {
      res.status(404).json({ error: 'Бүртгэл олдсонгүй' });
      return;
    }
    const otp = await OtpCode.findOne({ email: user.recoveryEmail, purpose: 'reset', code });
    if (!otp) {
      res.status(400).json({ error: 'Код буруу эсвэл хугацаа дууссан байна' });
      return;
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    await OtpCode.deleteMany({ email: user.recoveryEmail, purpose: 'reset' });
    res.json({ ok: true });
  }),
);

// ================= СЭРГЭЭХ GMAIL СОЛИХ (нэвтэрсэн хэрэглэгч) =================

// 1-р алхам: шинэ Gmail рүү код илгээнэ
authRouter.post(
  '/recovery-email/request-otp',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { newEmail } = z.object({ newEmail: z.string().email() }).parse(req.body);
    const email = newEmail.toLowerCase().trim();

    const existing = await User.findOne({ recoveryEmail: email });
    if (existing && existing._id.toString() !== req.userId) {
      res.status(409).json({ error: 'Энэ Gmail өөр бүртгэлд холбогдсон байна' });
      return;
    }
    const { code, delivered } = await issueOtp(email, 'change-email', req.userId);
    res.json({ ok: true, ...devCodePayload(code, delivered) });
  }),
);

// 2-р алхам: код баталгаажуулж шинэ Gmail-ийг хадгална
authRouter.post(
  '/recovery-email/verify',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
    const otp = await OtpCode.findOne({ user: req.userId, purpose: 'change-email', code });
    if (!otp) {
      res.status(400).json({ error: 'Код буруу эсвэл хугацаа дууссан байна' });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
      return;
    }
    user.recoveryEmail = otp.email;
    await user.save();
    await OtpCode.deleteMany({ user: req.userId, purpose: 'change-email' });
    res.json({ ok: true, recoveryEmail: user.recoveryEmail });
  }),
);

// ================= ОДООГИЙН ХЭРЭГЛЭГЧ =================

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
      return;
    }
    if (touchStreak(user)) await user.save();
    res.json({ user: userPayload(user) });
  }),
);

// Профайл засах: нэр, avatar (emoji), статус, theme, төрсөн өдөр. Илгээсэн талбарыг л шинэчилнэ.
const THEMES = ['rose', 'sunset', 'ocean', 'violet', 'forest'] as const;
authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(1, 'Нэр оруулна уу').max(40).optional(),
        avatar: z.string().trim().min(1).max(300).optional(),
        status: z.string().trim().max(120).optional(),
        theme: z.enum(THEMES).optional(),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
      })
      .parse(req.body);

    const update: Record<string, unknown> = {};
    for (const key of ['name', 'avatar', 'status', 'theme', 'birthday'] as const) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) {
      res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
      return;
    }
    res.json({ user: userPayload(user) });
  }),
);

// Профайл зураг байршуулах (multipart, талбар: image) → avatar-д зам хадгална.
authRouter.patch(
  '/me/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6, 'Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байна'),
      })
      .parse(req.body);

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) {
      res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
      return;
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(400).json({ error: 'Одоогийн нууц үг буруу байна' });
      return;
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      res.status(400).json({ error: 'Шинэ нууц үг одоогийнхоос өөр байх ёстой' });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/me/avatar',
  requireAuth,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Зураг шаардлагатай' });
      return;
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: `/uploads/${req.file.filename}` },
      { new: true },
    );
    if (!user) {
      res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
      return;
    }
    res.json({ user: userPayload(user) });
  }),
);
