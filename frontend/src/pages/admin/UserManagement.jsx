import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsersApi,
  getTeamRequestsApi,
  approveTeamRequestApi,
  rejectTeamRequestApi,
  deleteUserApi
} from '../../api/admin.api';
import { UserCard } from './UserCard';
import { RequestCard } from './RequestCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import './UserManagement.scss';

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending'

  // Data states
  const [allUsers, setAllUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message: '' }

  // Action states
  const [approvingId, setApprovingId] = useState(null);
  const [rejectModalData, setRejectModalData] = useState(null); // user object to reject
  const [isRejecting, setIsRejecting] = useState(false);

  const [deleteModalData, setDeleteModalData] = useState(null); // user object to delete
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allRes, pendingRes] = await Promise.all([
        getAllUsersApi(),
        getTeamRequestsApi()
      ]);

      if (allRes.success && allRes.data) {
        setAllUsers(allRes.data);
      }
      if (pendingRes.success && pendingRes.data) {
        setPendingRequests(pendingRes.data);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load user management data.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Approve Flow: pending -> active
  const handleApprove = async (id) => {
    try {
      setApprovingId(id);
      setFeedback(null);
      const res = await approveTeamRequestApi(id);
      if (res.success && res.data) {
        // 1. Remove from pending requests
        setPendingRequests((prev) => prev.filter((r) => r._id !== id));
        // 2. Add approved user to All Users list
        setAllUsers((prev) => [res.data, ...prev.filter((u) => u._id !== id)]);
        setFeedback({
          type: 'success',
          message: res.message || 'Team member request approved successfully.'
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to approve team request.'
      });
    } finally {
      setApprovingId(null);
    }
  };

  // Reject Flow: permanent deletion of pending request
  const handleConfirmReject = async () => {
    if (!rejectModalData) return;
    try {
      setIsRejecting(true);
      setFeedback(null);
      const res = await rejectTeamRequestApi(rejectModalData._id);
      if (res.success) {
        setPendingRequests((prev) => prev.filter((r) => r._id !== rejectModalData._id));
        setFeedback({
          type: 'success',
          message: res.message || 'Team request rejected successfully.'
        });
        setRejectModalData(null);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to reject team request.'
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // Delete Flow: permanent deletion of active team member
  const handleConfirmDelete = async () => {
    if (!deleteModalData) return;
    try {
      setIsDeleting(true);
      setFeedback(null);
      const res = await deleteUserApi(deleteModalData._id);
      if (res.success) {
        setAllUsers((prev) => prev.filter((u) => u._id !== deleteModalData._id));
        setFeedback({
          type: 'success',
          message: res.message || 'User account deleted successfully.'
        });
        setDeleteModalData(null);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete user account.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Separate allUsers into Admin Users and Team Members
  const adminUsers = allUsers.filter((u) => u.role === 'admin');
  const teamUsers = allUsers.filter((u) => u.role === 'team' && u.status === 'active');

  return (
    <div className="user-management-page">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="tab-switcher-bar">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Users
          <span className="tab-count-pill">{allUsers.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Requests
          <span className={`tab-count-pill ${pendingRequests.length > 0 ? 'highlight' : ''}`}>
            {pendingRequests.length}
          </span>
        </button>
      </div>

      {feedback && (
        <AlertBanner
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {loading ? (
        <LoadingSpinner label="Loading users..." />
      ) : activeTab === 'all' ? (
        /* TAB 1: ALL USERS (Separated into Administrators and Team Members) */
        <div className="all-users-tab-container">
          {/* ADMINISTRATORS SECTION */}
          <section className="users-section">
            <div className="section-header">
              <h2 className="section-title">Administrators</h2>
              <span className="section-badge">{adminUsers.length}</span>
            </div>

            {adminUsers.length === 0 ? (
              <EmptyState
                title="No administrators found"
                description="There are currently no active admin accounts."
              />
            ) : (
              <div className="user-cards-grid">
                {adminUsers.map((adminObj) => (
                  <UserCard
                    key={adminObj._id}
                    user={adminObj}
                    onDeleteClick={(u) => setDeleteModalData(u)}
                    isCurrentAdmin={adminObj._id === currentUser?._id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* TEAM MEMBERS SECTION */}
          <section className="users-section">
            <div className="section-header">
              <h2 className="section-title">Team Members</h2>
              <span className="section-badge">{teamUsers.length}</span>
            </div>

            {teamUsers.length === 0 ? (
              <EmptyState
                title="No active team members"
                description="There are currently no active team member accounts."
              />
            ) : (
              <div className="user-cards-grid">
                {teamUsers.map((teamObj) => (
                  <UserCard
                    key={teamObj._id}
                    user={teamObj}
                    onDeleteClick={(u) => setDeleteModalData(u)}
                    isCurrentAdmin={teamObj._id === currentUser?._id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* TAB 2: PENDING REQUESTS */
        pendingRequests.length === 0 ? (
          <EmptyState
            title="No pending requests"
            description="There are currently no pending team signup requests requiring approval."
          />
        ) : (
          <div className="user-cards-grid">
            {pendingRequests.map((req) => (
              <RequestCard
                key={req._id}
                request={req}
                onApprove={handleApprove}
                onRejectClick={(userObj) => setRejectModalData(userObj)}
                isApproving={approvingId === req._id}
              />
            ))}
          </div>
        )
      )}

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={!!rejectModalData}
        onClose={() => !isRejecting && setRejectModalData(null)}
        title="Reject Team Request?"
      >
        <div className="modal-dialog-body">
          <p className="modal-warning-text">
            Are you sure you want to reject <strong>{rejectModalData?.name}</strong>'s request?
            This will permanently delete the signup request.
          </p>
          <div className="modal-actions-row">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setRejectModalData(null)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={isRejecting}
              onClick={handleConfirmReject}
            >
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalData}
        onClose={() => !isDeleting && setDeleteModalData(null)}
        title="Delete User?"
      >
        <div className="modal-dialog-body">
          <p className="modal-warning-text">
            Are you sure you want to delete <strong>{deleteModalData?.name}</strong> ({deleteModalData?.email})?
            This action cannot be undone.
          </p>
          <div className="modal-actions-row">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setDeleteModalData(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={isDeleting}
              onClick={handleConfirmDelete}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
