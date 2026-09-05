import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import fs from 'fs';
import sharp from 'sharp';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
): Promise<{ secure_url: string; public_id: string }> => {
  let uploadBuffer = file.buffer;

  // Auto compress images to try and keep under 250KB
  if (file.mimetype.startsWith('image/')) {
    uploadBuffer = await sharp(file.buffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    if (uploadBuffer.length > 250 * 1024) {
      uploadBuffer = await sharp(file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .toBuffer();
    }
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `cityfix/${folder}` },
      (error, result) => {
        if (error || !result) {
          reject(new Error('Image upload failed'));
        } else {
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      },
    );

    // Pipe the buffer into the stream
    uploadStream.end(uploadBuffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error('Image deletion failed');
  }
};

export { cloudinary };
