import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

// Хосыг холбох урилгын код + 2 гишүүн.
const coupleSchema = new Schema(
  {
    inviteCode: { type: String, required: true, unique: true, index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    anniversary: { type: Date, default: null },
  },
  { timestamps: true },
);

export type CoupleDoc = InferSchemaType<typeof coupleSchema> & { _id: Types.ObjectId };

export const Couple = model('Couple', coupleSchema);
