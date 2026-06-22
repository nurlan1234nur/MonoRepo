import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const shipSchema = new Schema(
  {
    type: { type: String, required: true },
    x: { type: Number, required: true, min: 1, max: 10 },
    y: { type: Number, required: true, min: 1, max: 10 },
    direction: { type: String, enum: ['hor', 'vert'], required: true },
  },
  { _id: false },
);

const shotSchema = new Schema(
  {
    x: { type: Number, required: true, min: 1, max: 10 },
    y: { type: Number, required: true, min: 1, max: 10 },
    result: { type: String, enum: ['hit', 'miss', 'sunk', 'head'], required: true },
    sunkShip: { type: String, default: '' },
  },
  { _id: false, timestamps: true },
);

const playerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ready: { type: Boolean, default: false },
    plane: {
      x: { type: Number, min: 1, max: 10 },
      y: { type: Number, min: 1, max: 10 },
      rotation: { type: Number, enum: [0, 90, 180, 270] },
    },
    ships: { type: [shipSchema], default: [] },
    shots: { type: [shotSchema], default: [] },
  },
  { _id: false },
);

const battleshipGameSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, unique: true },
    status: { type: String, enum: ['placement', 'playing', 'finished'], default: 'placement' },
    players: { type: [playerSchema], default: [] },
    turn: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type BattleshipGameDoc = InferSchemaType<typeof battleshipGameSchema> & { _id: Types.ObjectId };

export const BattleshipGame = model('BattleshipGame', battleshipGameSchema);
