import { Router } from 'express';
import {
  handleGetNotifications,
  handleGetUnreadCount,
  handleMarkAsRead,
  handleMarkAllAsRead
} from '../controllers/notification.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authGuard);

router.get('/', handleGetNotifications);
router.get('/unread-count', handleGetUnreadCount);
router.patch('/:id/read', handleMarkAsRead);
router.patch('/read-all', handleMarkAllAsRead);

export default router;
