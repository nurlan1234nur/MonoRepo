import mongoose from 'mongoose';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Message } from './models/Message.js';
import { Moment } from './models/Moment.js';

async function cleanupLegacyImages(): Promise<void> {
  await mongoose.connect(env.mongoUri);

  const legacyPath = /^\/uploads\//;
  const [moments, emptyImageMessages, captionedImageMessages, avatars] = await Promise.all([
    Moment.deleteMany({ imageUrl: legacyPath }),
    Message.deleteMany({ imageUrl: legacyPath, text: '' }),
    Message.updateMany(
      { imageUrl: legacyPath, text: { $ne: '' } },
      { $set: { imageUrl: '', imagePublicId: '' } },
    ),
    User.updateMany(
      { avatar: legacyPath },
      { $set: { avatar: '💛', avatarPublicId: '' } },
    ),
  ]);

  console.log(`Deleted legacy moments: ${moments.deletedCount}`);
  console.log(`Deleted image-only messages: ${emptyImageMessages.deletedCount}`);
  console.log(`Cleared images from captioned messages: ${captionedImageMessages.modifiedCount}`);
  console.log(`Reset legacy avatars: ${avatars.modifiedCount}`);
}

cleanupLegacyImages()
  .catch((error) => {
    console.error('Legacy image cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
