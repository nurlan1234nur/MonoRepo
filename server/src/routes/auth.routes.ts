import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Нууц үг хамгийн багадаа 6 тэмдэгт'),
  name: z.string().min(1),
  avatar: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name, avatar } = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name, avatar });
    const token = signToken({ userId: user._id.toString() });
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, couple: user.couple },
    });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'И-мэйл эсвэл нууц үг буруу' });
      return;
    }
    const token = signToken({ userId: user._id.toString() });
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, couple: user.couple },
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
      return;
    }
    res.json({
      user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, couple: user.couple },
    });
  }),
);
