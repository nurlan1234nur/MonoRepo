import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

// Түүх дэлгэцийн custom үйл явдал (төрсөн өдөр гэх мэт).
const milestoneSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    date: { type: Date, required: true },
    icon: { type: String, default: '💫' },
  },
  { timestamps: true },
);

export type MilestoneDoc = InferSchemaType<typeof milestoneSchema> & { _id: Types.ObjectId };

export const Milestone = model('Milestone', milestoneSchema);
