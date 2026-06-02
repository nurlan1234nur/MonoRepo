import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const messageSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    special: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type MessageDoc = InferSchemaType<typeof messageSchema> & { _id: Types.ObjectId };

export const Message = model('Message', messageSchema);
