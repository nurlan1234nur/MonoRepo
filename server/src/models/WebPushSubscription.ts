import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const webPushSubscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { timestamps: true },
);

export type WebPushSubscriptionDoc = InferSchemaType<typeof webPushSubscriptionSchema> & {
  _id: Types.ObjectId;
};

export const WebPushSubscription = model('WebPushSubscription', webPushSubscriptionSchema);
