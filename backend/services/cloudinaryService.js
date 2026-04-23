const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a video file (buffer or path) to Cloudinary.
 * @param {Buffer|string} fileData - File buffer or local path
 * @param {string} originalName - Original filename for tagging
 * @returns {Promise<{url: string, publicId: string, duration: number, size: number}>}
 */
const uploadVideo = (fileData, originalName) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'video',
      folder: 'video-intelligence',
      public_id: `video_${Date.now()}`,
      overwrite: false,
      tags: ['video-intelligence'],
    };

    // Support both buffer uploads and path uploads
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration || 0,
          size: result.bytes || 0,
        });
      }
    );

    if (Buffer.isBuffer(fileData)) {
      uploadStream.end(fileData);
    } else {
      reject(new Error('fileData must be a Buffer'));
    }
  });
};

/**
 * Delete a video from Cloudinary by public ID.
 * @param {string} publicId
 */
const deleteVideo = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    return result;
  } catch (err) {
    throw new Error(`Cloudinary delete failed: ${err.message}`);
  }
};

/**
 * Generate a signed URL for secure access (optional).
 */
const getSignedUrl = (publicId, expiresIn = 3600) => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    type: 'authenticated',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  });
};

module.exports = { uploadVideo, deleteVideo, getSignedUrl };
