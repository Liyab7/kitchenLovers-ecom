import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { env } from './env.js';

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

export { cloudinary };

export const cloudinaryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'kitchenlovers/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

export const cloudinaryAudioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'kitchenlovers/audio',
    resource_type: 'video', // Cloudinary uses "video" type for audio files
    allowed_formats: ['mp3', 'wav', 'ogg', 'm4a', 'webm'],
  },
});
