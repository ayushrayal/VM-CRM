export const CRO_STATUSES = Object.freeze({
  IDEA: 'IDEA',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  SUCCESSFUL: 'SUCCESSFUL',
  NO_IMPACT: 'NO_IMPACT',
  FAILED: 'FAILED'
});

export const CRO_STATUS_CONFIG = Object.freeze({
  [CRO_STATUSES.IDEA]: { label: 'Idea', variant: 'pending', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  [CRO_STATUSES.RUNNING]: { label: 'Running', variant: 'team', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  [CRO_STATUSES.COMPLETED]: { label: 'Completed', variant: 'active', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
  [CRO_STATUSES.SUCCESSFUL]: { label: 'Successful', variant: 'active', color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' },
  [CRO_STATUSES.NO_IMPACT]: { label: 'No Impact', variant: 'pending', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  [CRO_STATUSES.FAILED]: { label: 'Failed', variant: 'rejected', color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' }
});

export const CRO_BADGES = Object.freeze({
  FIRST_EXPERIMENT: { id: 'FIRST_EXPERIMENT', name: 'First Experiment', icon: '', desc: 'Created 1st CRO experiment' },
  FIRST_SUCCESS: { id: 'FIRST_SUCCESS', name: 'First Success', icon: '', desc: '1st successful experiment' },
  CRO_STARTER: { id: 'CRO_STARTER', name: 'CRO Starter', icon: '', desc: 'Earned 100+ points' },
  CRO_EXPLORER: { id: 'CRO_EXPLORER', name: 'CRO Explorer', icon: '', desc: 'Documented 5+ experiments' },
  CRO_PERFORMER: { id: 'CRO_PERFORMER', name: 'CRO Performer', icon: '', desc: '500+ points / 3+ successes' },
  CRO_CHAMPION: { id: 'CRO_CHAMPION', name: 'CRO Champion', icon: '', desc: '1,000+ total points' }
});

export const PERIOD_FILTERS = Object.freeze([
  { id: 'all_time', label: 'All Time' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_quarter', label: 'This Quarter' }
]);
