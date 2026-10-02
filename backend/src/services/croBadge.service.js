import { CRO_BADGE_TYPES, CRO_EXPERIMENT_STATUS } from '../constants/cro.constants.js';

/**
 * Calculates badges for a user based on their simplified experiment statistics.
 *
 * @param {Object} stats
 * @param {number} stats.totalExperiments
 * @param {number} stats.successfulExperiments
 * @param {number} stats.totalPoints
 * @returns {string[]} Array of awarded badge IDs
 */
export const evaluateUserBadges = ({
  totalExperiments = 0,
  successfulExperiments = 0,
  totalPoints = 0
} = {}) => {
  const badges = [];

  if (totalExperiments >= 1) {
    badges.push(CRO_BADGE_TYPES.FIRST_EXPERIMENT);
  }

  if (successfulExperiments >= 1 || totalPoints >= 1) {
    badges.push(CRO_BADGE_TYPES.FIRST_SUCCESS);
  }

  if (totalPoints >= 2 || totalExperiments >= 3) {
    badges.push(CRO_BADGE_TYPES.CRO_STARTER);
  }

  if (totalExperiments >= 5) {
    badges.push(CRO_BADGE_TYPES.CRO_EXPLORER);
  }

  if (totalPoints >= 3 || successfulExperiments >= 3) {
    badges.push(CRO_BADGE_TYPES.CRO_PERFORMER);
  }

  if (totalPoints >= 5 || successfulExperiments >= 5) {
    badges.push(CRO_BADGE_TYPES.CRO_CHAMPION);
  }

  return badges;
};

/**
 * Evaluates experiment-specific badges for a single experiment.
 *
 * @param {Object} experiment
 * @returns {string[]} Array of badge IDs relevant to this single experiment
 */
export const evaluateExperimentBadges = (experiment) => {
  const badges = [];
  if (!experiment) return badges;

  const totalPoints = experiment.score?.totalPoints || 0;
  const status = experiment.status;

  if (status === CRO_EXPERIMENT_STATUS.SUCCESSFUL || totalPoints >= 1) {
    badges.push(CRO_BADGE_TYPES.FIRST_SUCCESS);
  }

  return badges;
};
