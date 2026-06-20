import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from './env.js';

// Зургийг server-ийн disk дээр /app/uploads (Docker volume)-д хадгална.
export const uploadsDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const cloudinaryEnabled = Boolean(
  env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret,
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage: cloudinaryEnabled ? multer.memoryStorage() : storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB (client талд жижигрүүлсэн ч хамгаалалт)
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Зөвхөн зураг оруулах боломжтой'));
  },
});

export interface StoredImage {
  url: string;
  publicId: string;
}

export async function storeUploadedImage(file: Express.Multer.File): Promise<StoredImage> {
  if (!cloudinaryEnabled) {
    return { url: `/uploads/${file.filename}`, publicId: '' };
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'nous',
        public_id: randomUUID(),
        resource_type: 'image',
      },
      (error, uploaded) => {
        if (error || !uploaded) reject(error ?? new Error('Cloudinary upload failed'));
        else resolve(uploaded);
      },
    );
    stream.end(file.buffer);
  });

  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteStoredImage(publicId: string | null | undefined, url?: string): Promise<void> {
  if (cloudinaryEnabled && publicId) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return;
  }
  if (url?.startsWith('/uploads/')) {
    const file = path.join(uploadsDir, path.basename(url));
    await fs.promises.unlink(file).catch(() => {});
  }
}
