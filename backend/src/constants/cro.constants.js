export const CRO_EXPERIMENT_STATUS = Object.freeze({
  IDEA: 'IDEA',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  SUCCESSFUL: 'SUCCESSFUL',
  NO_IMPACT: 'NO_IMPACT',
  FAILED: 'FAILED'
});

export const CRO_BADGE_TYPES = Object.freeze({
  FIRST_EXPERIMENT: 'FIRST_EXPERIMENT',
  FIRST_SUCCESS: 'FIRST_SUCCESS',
  CRO_STARTER: 'CRO_STARTER',
  CRO_EXPLORER: 'CRO_EXPLORER',
  CRO_PERFORMER: 'CRO_PERFORMER',
  CRO_CHAMPION: 'CRO_CHAMPION'
});

export const CRO_BADGE_DEFINITIONS = Object.freeze({
  [CRO_BADGE_TYPES.FIRST_EXPERIMENT]: {
    id: CRO_BADGE_TYPES.FIRST_EXPERIMENT,
    name: 'First Experiment',
    icon: '🧪',
    description: 'Created your very first CRO experiment'
  },
  [CRO_BADGE_TYPES.FIRST_SUCCESS]: {
    id: CRO_BADGE_TYPES.FIRST_SUCCESS,
    name: 'First Success',
    icon: '🎯',
    description: 'Delivered your first successful CRO experiment'
  },
  [CRO_BADGE_TYPES.CRO_STARTER]: {
    id: CRO_BADGE_TYPES.CRO_STARTER,
    name: 'CRO Starter',
    icon: '⚡',
    description: 'Accumulated 100+ points across CRO experiments'
  },
  [CRO_BADGE_TYPES.CRO_EXPLORER]: {
    id: CRO_BADGE_TYPES.CRO_EXPLORER,
    name: 'CRO Explorer',
    icon: '🧭',
    description: 'Documented 5 or more CRO experiments'
  },
  [CRO_BADGE_TYPES.CRO_PERFORMER]: {
    id: CRO_BADGE_TYPES.CRO_PERFORMER,
    name: 'CRO Performer',
    icon: '🚀',
    description: 'Achieved 500+ total points or 3+ successful experiments'
  },
  [CRO_BADGE_TYPES.CRO_CHAMPION]: {
    id: CRO_BADGE_TYPES.CRO_CHAMPION,
    name: 'CRO Champion',
    icon: '🏆',
    description: 'Top-tier CRO specialist with 1,000+ accumulated points'
  }
});

export const LEADERBOARD_PERIOD = Object.freeze({
  ALL_TIME: 'all_time',
  THIS_MONTH: 'this_month',
  THIS_QUARTER: 'this_quarter'
});
