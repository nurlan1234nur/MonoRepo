import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const wishSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type WishDoc = InferSchemaType<typeof wishSchema> & { _id: Types.ObjectId };

export const Wish = model('Wish', wishSchema);
