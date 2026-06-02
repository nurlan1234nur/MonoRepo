import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const moodSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type MoodDoc = InferSchemaType<typeof moodSchema> & { _id: Types.ObjectId };

export const Mood = model('Mood', moodSchema);
