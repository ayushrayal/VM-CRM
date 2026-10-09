import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../../api/notification.api';
import { getStreamUrl } from '../../api/axios';
import './NotificationBell.scss';

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Poll or fetch notifications
  useEffect(() => {
    if (user?._id) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 15000); // 15s refresh
      return () => clearInterval(interval);
    }
  }, [user?._id]);

  // SSE Stream integration for live notification push
  useEffect(() => {
    if (!user?._id) return;

    let sse;
    try {
      sse = new EventSource(getStreamUrl('/creative-strategy/stream'), { withCredentials: true });
      sse.addEventListener('NOTIFICATION_CREATED', (e) => {
        try {
          const newNotif = JSON.parse(e.data);
          const recipientId = newNotif.recipient?._id || newNotif.recipient;
          if (recipientId === user._id) {
            setUnreadCount((c) => c + 1);
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n._id !== newNotif._id)]);
          }
        } catch {
          loadUnreadCount();
        }
      });
    } catch (err) {
      console.error('SSE Error in NotificationBell', err);
    }

    return () => {
      if (sse) sse.close();
    };
  }, [user?._id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent
    }
  };

  const handleToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setLoading(true);
      try {
        const data = await getNotifications({ limit: 20 });
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await markAsRead(notif._id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      }
      setIsOpen(false);

      const targetId = notif.creativeStrategy?._id || notif.creativeStrategy;
      if (targetId) {
        navigate(`/creative-strategy?recordId=${targetId}`);
        window.dispatchEvent(new CustomEvent('OPEN_CREATIVE_RECORD', { detail: { recordId: targetId } }));
      }
    } catch (err) {
      console.error('Failed to process notification click', err);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="notification-bell-btn"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="notification-count-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-popover">
          {/* Header */}
          <div className="popover-header">
            <div className="header-title-group">
              <span className="popover-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="new-count-pill">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="mark-all-btn"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="notifications-list-container">
            {loading ? (
              <div className="notifications-loading">
                Loading updates...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">
                <div className="empty-icon">
                  <Check size={18} strokeWidth={2} />
                </div>
                <div className="empty-title">All caught up</div>
                <div className="empty-desc">No new workflow notifications</div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`notification-item ${!notif.isRead ? 'is-unread' : ''}`}
                >
                  <div
                    className={`unread-indicator-dot ${notif.isRead ? 'read' : ''}`}
                  />
                  <div className="item-content">
                    <div className="item-header-row">
                      <div className="item-title">{notif.title}</div>
                      <div className="item-timestamp">
                        {formatRelativeTime(notif.createdAt)}
                      </div>
                    </div>
                    <div className="item-message">{notif.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
