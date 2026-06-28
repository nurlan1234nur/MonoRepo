import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const numberGuessPlayerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    secret: { type: String, default: '' },
    ready: { type: Boolean, default: false },
  },
  { _id: false },
);

const numberGuessAttemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    guess: { type: String, required: true },
    alpha: { type: Number, required: true },
    betta: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const numberGuessGameSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, unique: true, index: true },
    players: { type: [numberGuessPlayerSchema], default: [] },
    attempts: { type: [numberGuessAttemptSchema], default: [] },
    status: { type: String, enum: ['setup', 'playing', 'finished'], default: 'setup' },
    turn: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type NumberGuessGameDoc = InferSchemaType<typeof numberGuessGameSchema> & { _id: Types.ObjectId };
export const NumberGuessGame = model('NumberGuessGame', numberGuessGameSchema);

