import { Notification } from '../models/Notification.js';
import { broadcastEvent } from './sse.service.js';

export const createNotification = async ({
  recipient,
  sender = null,
  senderName = 'System',
  title,
  message,
  creativeStrategy = null,
  cycleNumber = 1,
  type = 'GENERAL'
}) => {
  if (!recipient) return null;

  const notification = await Notification.create({
    recipient,
    sender,
    senderName,
    title,
    message,
    creativeStrategy,
    cycleNumber,
    type,
    isRead: false
  });

  const populated = await Notification.findById(notification._id)
    .populate('sender', 'name email role teamRole')
    .populate({
      path: 'creativeStrategy',
      select: 'creativeName campaignName currentTestingCycle cycleNumber client campaign adSet status',
      populate: { path: 'client', select: 'name code' }
    });

  broadcastEvent('NOTIFICATION_CREATED', populated);
  return populated;
};

export const getUserNotifications = async (userId, options = {}) => {
  const { isRead, limit = 50, page = 1 } = options;
  const query = { recipient: userId };

  if (isRead !== undefined) {
    query.isRead = isRead === 'true' || isRead === true;
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate('sender', 'name email role teamRole')
      .populate({
        path: 'creativeStrategy',
        select: 'creativeName campaignName currentTestingCycle cycleNumber client campaign adSet status',
        populate: { path: 'client', select: 'name code' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userId, isRead: false })
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  };
};

export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ recipient: userId, isRead: false });
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return notification;
};

export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return { updatedCount: result.modifiedCount };
};
