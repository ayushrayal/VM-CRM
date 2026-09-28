import React from 'react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import './RequestCard.scss';

export const RequestCard = ({ request, onApprove, onRejectClick, isApproving }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="request-card">
      <div className="card-header">
        <div className="card-user-info">
          <h3 className="user-name">{request.name}</h3>
          <span className="user-email">{request.email}</span>
        </div>
        <Badge variant={request.status}>{request.status}</Badge>
      </div>

      <div className="card-meta">
        <span className="meta-label">Requested:</span>
        <span className="meta-value">{formatDate(request.createdAt)}</span>
      </div>

      <div className="card-actions">
        <Button
          variant="primary"
          size="sm"
          loading={isApproving}
          onClick={() => onApprove(request._id)}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => onRejectClick(request)}
          disabled={isApproving}
        >
          Reject
        </Button>
      </div>
    </div>
  );
};
