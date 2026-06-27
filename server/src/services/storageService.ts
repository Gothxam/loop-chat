import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory (relative to root of server)
const UPLOADS_ROOT = path.join(__dirname, '../../../uploads');

const directories = [
  path.join(UPLOADS_ROOT, 'profiles'),
  path.join(UPLOADS_ROOT, 'images'),
  path.join(UPLOADS_ROOT, 'videos'),
  path.join(UPLOADS_ROOT, 'documents'),
  path.join(UPLOADS_ROOT, 'voice'),
];

// Ensure all upload directories exist
export const initializeUploadDirs = () => {
  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Map mime types to categories
const getCategoryFromMimetype = (mimetype: string, fieldname?: string): string => {
  if (fieldname === 'profile') {
    return 'profiles';
  }
  if (mimetype.startsWith('image/')) {
    return 'images';
  }
  if (mimetype.startsWith('video/')) {
    return 'videos';
  }
  if (mimetype.startsWith('audio/')) {
    return 'voice';
  }
  return 'documents';
};

// Configure local disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = getCategoryFromMimetype(file.mimetype, file.fieldname);
    const dest = path.join(UPLOADS_ROOT, category);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Configure upload middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate extensions if needed, for now accept all standard types
    cb(null, true);
  },
});

// Interface for future S3/Supabase integration
export interface IStorageProvider {
  getPublicUrl(filePath: string): string;
  deleteFile(filePath: string): Promise<void>;
}

// Local storage helper
export const getFileUrl = (fileName: string, category: string, req: any): string => {
  const host = req.get('host');
  const protocol = req.protocol;
  // Return the static asset URL, e.g. http://localhost:5000/uploads/images/filename.jpg
  return `${protocol}://${host}/uploads/${category}/${fileName}`;
};
