export const CREATIVE_STATUSES = Object.freeze({
  IDEA: 'IDEA',
  IN_PRODUCTION: 'IN_PRODUCTION',
  READY: 'READY',
  LIVE: 'LIVE',
  TESTING: 'TESTING',
  WINNER: 'WINNER',
  AVERAGE: 'AVERAGE',
  LOSER: 'LOSER',
  PAUSED: 'PAUSED'
});

export const CREATIVE_STATUS_CONFIG = Object.freeze({
  [CREATIVE_STATUSES.IDEA]: { label: 'Idea', variant: 'pending', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  [CREATIVE_STATUSES.IN_PRODUCTION]: { label: 'In Production', variant: 'team', color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
  [CREATIVE_STATUSES.READY]: { label: 'Ready', variant: 'active', color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  [CREATIVE_STATUSES.LIVE]: { label: 'Live', variant: 'active', color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
  [CREATIVE_STATUSES.TESTING]: { label: 'Testing', variant: 'team', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  [CREATIVE_STATUSES.WINNER]: { label: 'Winner', variant: 'active', color: '#047857', bg: '#ECFDF5', border: '#6EE7B7' },
  [CREATIVE_STATUSES.AVERAGE]: { label: 'Average', variant: 'pending', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
  [CREATIVE_STATUSES.LOSER]: { label: 'Loser', variant: 'rejected', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  [CREATIVE_STATUSES.PAUSED]: { label: 'Paused', variant: 'pending', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' }
});

export const PERIOD_FILTERS = Object.freeze([
  { id: 'all_time', label: 'All Time' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_quarter', label: 'This Quarter' }
]);
