import ImageKit from 'imagekit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackUploadDir = path.resolve(__dirname, '../../public/uploads/cro');

let imagekitClient = null;

export const getImageKitClient = () => {
  if (imagekitClient) return imagekitClient;

  let publicKey = process.env.IMAGEKIT_PUBLIC_KEY || env.IMAGEKIT_PUBLIC_KEY || '';
  let privateKey = process.env.IMAGEKIT_PRIVATE_KEY || env.IMAGEKIT_PRIVATE_KEY || '';
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || env.IMAGEKIT_URL_ENDPOINT || '';

  // Defensive self-healing: Auto-detect if public and private keys were accidentally inverted
  if (publicKey.startsWith('private_') && privateKey.startsWith('public_')) {
    console.warn('[ImageKit] Detected inverted PUBLIC and PRIVATE keys in environment variables. Auto-correcting assignment.');
    const temp = publicKey;
    publicKey = privateKey;
    privateKey = temp;
  }

  const isConfigured =
    publicKey &&
    privateKey &&
    urlEndpoint &&
    !publicKey.includes('YOUR_') &&
    !privateKey.includes('YOUR_') &&
    !urlEndpoint.includes('YOUR_');

  if (isConfigured) {
    try {
      imagekitClient = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint
      });
      return imagekitClient;
    } catch (err) {
      console.error('[ImageKit] Failed to initialize client:', err.message);
      return null;
    }
  }

  return null;
};

export const isImageKitConfigured = () => {
  return getImageKitClient() !== null;
};

/**
 * Determine exact CRO Gamiply folder path based on screenshot type
 *
 * @param {string} type - 'before' | 'after'
 * @returns {string} ImageKit folder path
 */
export const getCroFolder = (type) => {
  const normalizedType = String(type || '').toLowerCase();
  if (normalizedType === 'before') {
    return '/VM-CRM/CRO-Gamiply/Before/';
  }
  if (normalizedType === 'after') {
    return '/VM-CRM/CRO-Gamiply/After/';
  }
  return '/VM-CRM/CRO-Gamiply/';
};

/**
 * Uploads an image to ImageKit in the appropriate CRO-Gamiply directory.
 * Falls back to local public upload only if ImageKit environment keys are not configured.
 *
 * @param {Object} params
 * @param {string} params.base64Data - Data URL or base64 string
 * @param {string} params.fileName - Original file name
 * @param {string} [params.type] - 'before' | 'after'
 * @param {string} [params.mimeType] - MIME type (e.g. 'image/png')
 * @param {number} [params.size] - File size in bytes
 * @returns {Promise<{ url: string, fileId: string|null, name: string }>}
 */
export const uploadImage = async ({
  base64Data,
  fileName = 'screenshot.png',
  type = 'before',
  mimeType = 'image/png',
  size = 0
}) => {
  const client = getImageKitClient();
  const folder = getCroFolder(type);

  // Safe debugging: Log UPLOAD START
  console.log(`[ImageKit] UPLOAD START`);
  console.log(`  folder: ${folder}`);
  console.log(`  filename: ${fileName}`);
  console.log(`  size: ${size || 'N/A'} bytes`);
  console.log(`  mime: ${mimeType}`);

  if (client) {
    try {
      // Strip data URI prefix if present for clean base64 payload
      const base64Clean = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

      const response = await client.upload({
        file: base64Clean,
        fileName,
        folder,
        useUniqueFileName: true
      });

      console.log(`[ImageKit] UPLOAD SUCCESS`);
      console.log(`  url: ${response.url}`);
      console.log(`  fileId: ${response.fileId}`);

      return {
        url: response.url,
        fileId: response.fileId,
        name: fileName
      };
    } catch (err) {
      console.error(`[ImageKit] UPLOAD FAILED`);
      console.error(`  status: ${err.status || err.statusCode || 500}`);
      console.error(`  message: ${err.message || 'Unknown error'}`);
      console.error(`  code: ${err.code || 'IMAGEKIT_ERROR'}`);

      throw new ApiError(
        err.status || err.statusCode || 500,
        `Image upload failed: ${err.message || 'ImageKit error'}`,
        [],
        '',
        err.code || 'IMAGEKIT_UPLOAD_FAILED'
      );
    }
  }

  // Graceful fallback for local dev/testing if ImageKit keys are not configured at all
  console.warn('[ImageKit] Credentials not configured. Falling back to local filesystem storage.');

  if (!fs.existsSync(fallbackUploadDir)) {
    fs.mkdirSync(fallbackUploadDir, { recursive: true });
  }

  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/i);
  let ext = 'png';
  let buffer;

  if (matches) {
    ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64Data, 'base64');
  }

  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const filename = `cro-${uniqueSuffix}.${ext}`;
  const filePath = path.join(fallbackUploadDir, filename);

  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/cro/${filename}`,
    fileId: null,
    name: fileName
  };
};

/**
 * Deletes an image from ImageKit or local filesystem.
 *
 * @param {Object} imageObj
 * @param {string} [imageObj.url]
 * @param {string} [imageObj.fileId]
 * @returns {Promise<boolean>}
 */
export const deleteImage = async ({ url, fileId }) => {
  const client = getImageKitClient();

  if (fileId && client) {
    try {
      await client.deleteFile(fileId);
      console.log(`[ImageKit] DELETE SUCCESS: fileId=${fileId}`);
      return true;
    } catch (err) {
      const status = err.status || err.statusCode || err.$ResponseMetadata?.statusCode;
      const isNotFound =
        status === 404 ||
        /not found/i.test(err.message || '') ||
        /NOT_FOUND/i.test(err.code || '');

      if (isNotFound) {
        console.warn(`[ImageKit] File ${fileId} not found in ImageKit (already deleted). Safely treated as success.`);
        return true;
      }

      console.error(`[ImageKit] DELETE FAILED: fileId=${fileId}, status=${status || 500}, message=${err.message || 'Unknown error'}`);
      throw new ApiError(
        status || 500,
        `ImageKit deletion failed: ${err.message || 'ImageKit service error'}`,
        [],
        '',
        err.code || 'IMAGEKIT_DELETE_FAILED'
      );
    }
  }

  // If local fallback file
  if (url && url.startsWith('/uploads/cro/')) {
    const localPath = path.resolve(__dirname, '../../public', url.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        console.log(`[Local Upload] Deleted local fallback file: ${url}`);
        return true;
      } catch (err) {
        console.warn(`[Local Upload] Failed to unlink ${localPath}:`, err.message);
      }
    }
    return true;
  }

  // If no client was configured (e.g., local mock or offline test without fileId on remote)
  if (!client && !url) {
    return true;
  }

  return true;
};
