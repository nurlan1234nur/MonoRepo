import { Router } from 'express';
import { z } from 'zod';
import { Couple } from '../models/Couple.js';
import { LoveNote } from '../models/LoveNote.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const loveNoteRouter = Router();

loveNoteRouter.use(requireAuth, requireCouple);

function notePayload(note: {
  toObject: () => Record<string, unknown>;
  recipient: { _id?: unknown; toString: () => string } | unknown;
  openedAt?: Date | null;
}, viewerId: string): Record<string, unknown> {
  const payload = note.toObject();
  const recipient = note.recipient as { _id?: unknown; toString: () => string };
  const recipientId = recipient._id?.toString() ?? recipient.toString();
  if (recipientId === viewerId && !note.openedAt) payload.text = null;
  return payload;
}

loveNoteRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const notes = await LoveNote.find({ couple: req.coupleId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'name avatar')
      .populate('recipient', 'name avatar');
    res.json({ notes: notes.map((note) => notePayload(note, req.userId!)) });
  }),
);

const createSchema = z.object({ text: z.string().trim().min(1).max(3000) });

loveNoteRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text } = createSchema.parse(req.body);
    const couple = await Couple.findById(req.coupleId).select('members');
    const recipientId = couple?.members.find((member) => member.toString() !== req.userId);
    if (!recipientId) {
      res.status(409).json({ error: 'Partner одоогоор холбогдоогүй байна' });
      return;
    }

    const note = await LoveNote.create({
      couple: req.coupleId,
      author: req.userId,
      recipient: recipientId,
      text,
    });
    const populated = await note.populate([
      { path: 'author', select: 'name avatar' },
      { path: 'recipient', select: 'name avatar' },
    ]);
    const hiddenPayload: Record<string, unknown> = populated.toObject();
    hiddenPayload.text = null;
    emitToCouple(req.coupleId!, 'love-note:new', hiddenPayload);
    res.status(201).json({ note: populated });
  }),
);

loveNoteRouter.patch(
  '/:id/open',
  asyncHandler(async (req, res) => {
    const note = await LoveNote.findOne({ _id: req.params.id, couple: req.coupleId });
    if (!note) {
      res.status(404).json({ error: 'Love Note олдсонгүй' });
      return;
    }
    if (note.recipient.toString() !== req.userId) {
      res.status(403).json({ error: 'Зөвхөн хүлээн авагч нээнэ' });
      return;
    }
    if (!note.openedAt) {
      note.openedAt = new Date();
      await note.save();
    }
    const populated = await note.populate([
      { path: 'author', select: 'name avatar' },
      { path: 'recipient', select: 'name avatar' },
    ]);
    emitToCouple(req.coupleId!, 'love-note:opened', populated);
    res.json({ note: populated });
  }),
);

loveNoteRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const note = await LoveNote.findOne({ _id: req.params.id, couple: req.coupleId });
    if (!note) {
      res.status(404).json({ error: 'Love Note олдсонгүй' });
      return;
    }
    if (note.author.toString() !== req.userId || note.openedAt) {
      res.status(403).json({ error: 'Зөвхөн нээгдээгүй өөрийн note-оо устгана' });
      return;
    }
    await note.deleteOne();
    emitToCouple(req.coupleId!, 'love-note:deleted', { id: req.params.id });
    res.json({ ok: true });
  }),
);
