import { Router } from 'express';
import { searchUsers, updateProfile, listAllUsers } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware); // All user routes require authentication

router.get('/', listAllUsers);
router.get('/search', searchUsers);
router.patch('/profile', updateProfile);

export default router;
