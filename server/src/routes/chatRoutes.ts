import { Router } from 'express';
import { getUserChats, createChat, getChatMessages, markChatAsRead } from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware); // All chat routes require authentication

router.get('/', getUserChats);
router.post('/', createChat);
router.get('/:chatId/messages', getChatMessages);
router.post('/:chatId/read', markChatAsRead);

export default router;
