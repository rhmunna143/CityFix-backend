import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import fs from 'fs';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `cityfix/${folder}`,
    });
    // Remove file from local temp storage
    fs.unlinkSync(file.path);
    return result.secure_url;
  } catch (error) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new Error('Image upload failed');
  }
};

export { cloudinary };
