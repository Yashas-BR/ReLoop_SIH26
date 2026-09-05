import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { ApiError } from '../utils/ApiError.js';

dotenv.config();

const MAX_DATA_URL_BYTES = 6 * 1024 * 1024;

const isDataImage = (value) => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(value);

const cloudinaryReady = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET
);

/**
 * Upload a client-compressed image to Cloudinary and return its durable HTTPS
 * URL. The database deliberately receives this URL only, never the base64
 * image payload or Cloudinary credentials.
 */
export const uploadLotImage = async (image, { lotId, imageType }) => {
  // Seeded/test records and pre-existing Cloudinary URLs remain readable.
  // New images sent by the web app are data URLs and must be uploaded.
  if (!isDataImage(image)) return image;

  if (Buffer.byteLength(image, 'utf8') > MAX_DATA_URL_BYTES) {
    throw new ApiError(413, 'Image is too large. Please choose a photo under 6 MB.');
  }
  if (!cloudinaryReady()) {
    throw new ApiError(503, 'Image storage is not configured. Add the Cloudinary credentials to backend/.env.');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: `kabadiwala/lots/${lotId}`,
      public_id: `${imageType.toLowerCase()}-${Date.now()}`,
      resource_type: 'image',
      overwrite: false,
      unique_filename: true,
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
    });
    return result.secure_url;
  } catch (err) {
    // Log but don't crash — lot creation proceeds without the image
    console.error(`[cloudinary] Upload failed (${err.message}). Lot will be saved without image.`);
    return null;
  }
};
