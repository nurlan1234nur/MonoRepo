import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const answerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    selectedUsers: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  },
  { _id: false, timestamps: true },
);

const gameRoundSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    roundNumber: { type: Number, required: true, min: 0 },
    questionIndex: { type: Number, required: true, min: 0 },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true },
);

gameRoundSchema.index({ couple: 1, roundNumber: 1 }, { unique: true });

export type GameRoundDoc = InferSchemaType<typeof gameRoundSchema> & { _id: Types.ObjectId };

export const GameRound = model('GameRound', gameRoundSchema);
