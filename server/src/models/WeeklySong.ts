import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const weeklySongSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    weekStart: { type: Date, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    artist: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    selectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

weeklySongSchema.index({ couple: 1, weekStart: 1 }, { unique: true });

export type WeeklySongDoc = InferSchemaType<typeof weeklySongSchema> & { _id: Types.ObjectId };

export const WeeklySong = model('WeeklySong', weeklySongSchema);
