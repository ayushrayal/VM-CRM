import * as notificationService from '../services/notification.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleGetNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user._id, req.query);
    res.status(200).json(new ApiResponse(200, result, 'Notifications retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleGetUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.status(200).json(new ApiResponse(200, { unreadCount: count }, 'Unread count retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleMarkAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
};

export const handleMarkAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.status(200).json(new ApiResponse(200, result, 'All notifications marked as read'));
  } catch (error) {
    next(error);
  }
};
