import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const loveNoteSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 3000 },
    openedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type LoveNoteDoc = InferSchemaType<typeof loveNoteSchema> & { _id: Types.ObjectId };

export const LoveNote = model('LoveNote', loveNoteSchema);
