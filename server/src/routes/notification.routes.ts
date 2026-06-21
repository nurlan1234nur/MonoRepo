import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { pushEnabled } from '../utils/push.js';
import { WebPushSubscription } from '../models/WebPushSubscription.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/config', (_req, res) => {
  res.json({ enabled: pushEnabled, publicKey: pushEnabled ? env.vapidPublicKey : '' });
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

notificationRouter.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    if (!pushEnabled) {
      res.status(503).json({ error: 'Push notification тохируулагдаагүй байна' });
      return;
    }
    const subscription = subscriptionSchema.parse(req.body);
    await WebPushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: req.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { upsert: true, new: true },
    );
    res.status(201).json({ ok: true });
  }),
);

notificationRouter.delete(
  '/subscribe',
  asyncHandler(async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
    await WebPushSubscription.deleteOne({ user: req.userId, endpoint });
    res.json({ ok: true });
  }),
);
