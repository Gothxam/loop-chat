import { Router, Response } from 'express';
import { upload, getFileUrl } from '../services/storageService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Upload endpoint
router.post('/', upload.single('file'), (req: AuthRequest, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  // Determine fileType category for frontend / db model
  let fileType: 'image' | 'video' | 'voice' | 'document' = 'document';
  if (req.file.mimetype.startsWith('image/')) {
    fileType = 'image';
  } else if (req.file.mimetype.startsWith('video/')) {
    fileType = 'video';
  } else if (req.file.mimetype.startsWith('audio/')) {
    fileType = 'voice';
  }

  // Determine category directory
  let category = 'documents';
  if (req.file.fieldname === 'profile') {
    category = 'profiles';
  } else if (fileType === 'image') {
    category = 'images';
  } else if (fileType === 'video') {
    category = 'videos';
  } else if (fileType === 'voice') {
    category = 'voice';
  }

  const fileUrl = getFileUrl(req.file.filename, category, req);

  res.status(200).json({
    message: 'File uploaded successfully',
    fileUrl,
    fileType,
    originalName: req.file.originalname,
    size: req.file.size,
  });
});

export default router;
