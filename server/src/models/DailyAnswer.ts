import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

// Өдрийн асуултын хариулт — хэрэглэгч тус бүр өдөрт нэг.
const dailyAnswerSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    questionIndex: { type: Number, required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

dailyAnswerSchema.index({ couple: 1, user: 1, date: 1 }, { unique: true });

export type DailyAnswerDoc = InferSchemaType<typeof dailyAnswerSchema> & { _id: Types.ObjectId };

export const DailyAnswer = model('DailyAnswer', dailyAnswerSchema);
