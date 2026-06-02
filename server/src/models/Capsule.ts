import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

// Цаг капсул — unlockAt огноо хүртэл нээгдэхгүй (шалгалт server талд).
const capsuleSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 8000 },
    unlockAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export type CapsuleDoc = InferSchemaType<typeof capsuleSchema> & { _id: Types.ObjectId };

export const Capsule = model('Capsule', capsuleSchema);
