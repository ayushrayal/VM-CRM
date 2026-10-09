import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../../api/notification.api';
import { getStreamUrl } from '../../api/axios';

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
        // Dispatch custom event for page to auto-open drawer
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
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        style={{
          background: 'transparent',
          border: '1px solid #E5E5DC',
          borderRadius: '8px',
          width: '38px',
          height: '38px',
          minWidth: '38px',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          color: '#1A1A1A',
          transition: 'all 0.15s ease',
          flexShrink: 0
        }}
      >
        {/* Bell SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#F2EA1A',
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.7rem',
              height: '18px',
              minWidth: '18px',
              padding: '0 4px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E5DC',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #E5E5DC',
              background: '#FAFAF7'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A1A' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#F2EA1A',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5A5B52',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8C8D82', fontSize: '0.85rem' }}>
                Loading updates...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✓</div>
                <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: '0.88rem' }}>All caught up!</div>
                <div style={{ color: '#8C8D82', fontSize: '0.8rem', marginTop: '4px' }}>
                  No new workflow notifications
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F0F0EB',
                    background: notif.isRead ? '#FFFFFF' : '#FFFDF0',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F7F2')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = notif.isRead ? '#FFFFFF' : '#FFFDF0')
                  }
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: notif.isRead ? 'transparent' : '#F2EA1A',
                      marginTop: '6px',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <div
                        style={{
                          fontWeight: notif.isRead ? 600 : 700,
                          fontSize: '0.85rem',
                          color: '#1A1A1A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#8C8D82', flexShrink: 0 }}>
                        {formatRelativeTime(notif.createdAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#5A5B52',
                        marginTop: '3px',
                        lineHeight: '1.4'
                      }}
                    >
                      {notif.message}
                    </div>
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
