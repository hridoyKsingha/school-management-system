import { Router } from 'express';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import uploadImage from '../middleware/uploadImage.js';

const uploadRouter = Router();

uploadRouter.post('/profile-image', requireAdmin, uploadImage.single('image'), async (request, response) => {
  if (!isCloudinaryConfigured) {
    return response.status(503).json({ message: 'Cloudinary is not configured. Add its credentials to server environment variables.' });
  }
  if (!request.file) return response.status(400).json({ message: 'Choose an image file up to 5 MB.' });

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'school-management-system/profiles', resource_type: 'image' },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult)),
      );
      stream.end(request.file.buffer);
    });
    return response.status(201).json({ message: 'Image uploaded.', imageUrl: result.secure_url });
  } catch {
    return response.status(500).json({ message: 'Unable to upload image.' });
  }
});

export default uploadRouter;
