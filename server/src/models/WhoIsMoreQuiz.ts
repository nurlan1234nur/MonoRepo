import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const optionSchema = new Schema(
  { text: { type: String, required: true, trim: true, maxlength: 80 } },
  { _id: true },
);

const quizQuestionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 160 },
    options: { type: [optionSchema], required: true },
    correctOptionId: { type: Schema.Types.ObjectId },
    // Custom-option хувилбараас өмнөх тестийг нэг удаа хөрвүүлэхэд ашиглана.
    correctUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: true },
);

const quizAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedOptionId: { type: Schema.Types.ObjectId },
    selectedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false },
);

const whoIsMoreQuizSchema = new Schema(
  {
    couple: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    questions: { type: [quizQuestionSchema], required: true },
    player: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [quizAnswerSchema], default: [] },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type WhoIsMoreQuizDoc = InferSchemaType<typeof whoIsMoreQuizSchema> & { _id: Types.ObjectId };
export const WhoIsMoreQuiz = model('WhoIsMoreQuiz', whoIsMoreQuizSchema);
