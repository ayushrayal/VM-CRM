import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { CROExperiment } from '../models/CROExperiment.js';
import { User } from '../models/User.js';
import { calculateCroScore } from '../services/croScoring.service.js';
import { evaluateUserBadges, evaluateExperimentBadges } from '../services/croBadge.service.js';
import { uploadImage, deleteImage } from '../services/imagekit.service.js';
import { CRO_EXPERIMENT_STATUS, LEADERBOARD_PERIOD } from '../constants/cro.constants.js';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../public/uploads/cro');

// Ensure upload directory exists on server initialization
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create CRO uploads directory:', err.message);
  }
}

/**
 * 1. Create a new CRO Experiment
 * Any authenticated user can create an experiment
 */
export const createExperiment = async (req, res, next) => {
  try {
    const {
      clientName,
      hypothesisTitle,
      hypothesis,
      startDate,
      endDate = null,
      status = CRO_EXPERIMENT_STATUS.IDEA,
      beforeImages = [],
      afterImages = [],
      results = {}
    } = req.body;

    // Calculate score server-side only
    const scoreResult = calculateCroScore(results);

    // If marked completed or successful, record completedAt
    const isCompleted = [
      CRO_EXPERIMENT_STATUS.COMPLETED,
      CRO_EXPERIMENT_STATUS.SUCCESSFUL,
      CRO_EXPERIMENT_STATUS.NO_IMPACT,
      CRO_EXPERIMENT_STATUS.FAILED
    ].includes(status);

    const completedAt = isCompleted ? new Date() : null;

    const experimentData = {
      creatorId: req.user._id,
      creatorName: req.user.name,
      clientName,
      hypothesisTitle,
      hypothesis,
      startDate,
      endDate,
      status,
      beforeImages,
      afterImages,
      results,
      score: {
        salesPoints: scoreResult.salesPoints,
        prepaidPoints: scoreResult.prepaidPoints,
        cancellationPoints: scoreResult.cancellationPoints,
        totalPoints: scoreResult.totalPoints
      },
      improvements: scoreResult.improvements,
      completedAt
    };

    experimentData.badges = evaluateExperimentBadges(experimentData);

    const experiment = await CROExperiment.create(experimentData);

    res.status(201).json({
      success: true,
      message: 'CRO experiment created successfully',
      data: experiment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get CRO Experiments with filters & search
 */
export const getExperiments = async (req, res, next) => {
  try {
    const { status, creatorId, mine, clientName, search } = req.query;
    const filter = {};

    if (status && Object.values(CRO_EXPERIMENT_STATUS).includes(status)) {
      filter.status = status;
    }

    if (mine === 'true') {
      filter.creatorId = req.user._id;
    } else if (creatorId) {
      filter.creatorId = creatorId;
    }

    if (clientName) {
      filter.clientName = { $regex: clientName.trim(), $options: 'i' };
    }

    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { hypothesisTitle: searchRegex },
        { hypothesis: searchRegex },
        { clientName: searchRegex },
        { creatorName: searchRegex }
      ];
    }

    const experiments = await CROExperiment.find(filter)
      .sort({ createdAt: -1 })
      .populate('creatorId', 'name email role teamRole');

    res.status(200).json({
      success: true,
      count: experiments.length,
      data: experiments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get single experiment by ID
 */
export const getExperimentById = async (req, res, next) => {
  try {
    const experiment = await CROExperiment.findById(req.params.id).populate(
      'creatorId',
      'name email role teamRole'
    );

    if (!experiment) {
      throw new ApiError(404, 'CRO experiment not found');
    }

    res.status(200).json({
      success: true,
      data: experiment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update an experiment
 * Owner or Admin only. Server strictly recalculates score.
 */
export const updateExperiment = async (req, res, next) => {
  try {
    const experiment = await CROExperiment.findById(req.params.id);

    if (!experiment) {
      throw new ApiError(404, 'CRO experiment not found');
    }

    // Role Security: Only Creator or Admin can edit
    const isOwner = experiment.creatorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, 'Access denied. You can only edit your own experiments.');
    }

    const {
      clientName,
      hypothesisTitle,
      hypothesis,
      startDate,
      endDate,
      status,
      beforeImages,
      afterImages,
      results
    } = req.body;

    if (clientName !== undefined) experiment.clientName = clientName;
    if (hypothesisTitle !== undefined) experiment.hypothesisTitle = hypothesisTitle;
    if (hypothesis !== undefined) experiment.hypothesis = hypothesis;
    if (startDate !== undefined) experiment.startDate = startDate;
    if (endDate !== undefined) experiment.endDate = endDate;
    if (beforeImages !== undefined) experiment.beforeImages = beforeImages;
    if (afterImages !== undefined) experiment.afterImages = afterImages;

    // Handle Results & Automatic Score Recalculation
    if (results !== undefined) {
      const mergedResults = {
        salesBefore: results.salesBefore !== undefined ? results.salesBefore : experiment.results?.salesBefore,
        salesAfter: results.salesAfter !== undefined ? results.salesAfter : experiment.results?.salesAfter,
        prepaidBefore: results.prepaidBefore !== undefined ? results.prepaidBefore : experiment.results?.prepaidBefore,
        prepaidAfter: results.prepaidAfter !== undefined ? results.prepaidAfter : experiment.results?.prepaidAfter,
        cancellationBefore:
          results.cancellationBefore !== undefined
            ? results.cancellationBefore
            : experiment.results?.cancellationBefore,
        cancellationAfter:
          results.cancellationAfter !== undefined ? results.cancellationAfter : experiment.results?.cancellationAfter
      };

      const scoreResult = calculateCroScore(mergedResults);
      experiment.results = mergedResults;
      experiment.score = {
        salesPoints: scoreResult.salesPoints,
        prepaidPoints: scoreResult.prepaidPoints,
        cancellationPoints: scoreResult.cancellationPoints,
        totalPoints: scoreResult.totalPoints
      };
      experiment.improvements = scoreResult.improvements;
    }

    // Handle Status and completedAt
    if (status !== undefined) {
      experiment.status = status;
      const isCompleted = [
        CRO_EXPERIMENT_STATUS.COMPLETED,
        CRO_EXPERIMENT_STATUS.SUCCESSFUL,
        CRO_EXPERIMENT_STATUS.NO_IMPACT,
        CRO_EXPERIMENT_STATUS.FAILED
      ].includes(status);

      if (isCompleted && !experiment.completedAt) {
        experiment.completedAt = new Date();
      } else if (!isCompleted) {
        experiment.completedAt = null;
      }
    }

    // Re-evaluate badges
    experiment.badges = evaluateExperimentBadges(experiment);

    await experiment.save();

    res.status(200).json({
      success: true,
      message: 'CRO experiment updated successfully',
      data: experiment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete experiment
 * Admin ONLY
 */
export const deleteExperiment = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Access denied. Only Administrators can delete experiments.');
    }

    const experiment = await CROExperiment.findById(req.params.id);

    if (!experiment) {
      throw new ApiError(404, 'CRO experiment not found');
    }

    // Clean up uploaded files (ImageKit or local)
    const allImages = [...(experiment.beforeImages || []), ...(experiment.afterImages || [])];
    for (const img of allImages) {
      try {
        await deleteImage({ url: img.url, fileId: img.fileId });
      } catch (e) {
        // Ignore file delete error
      }
    }

    await experiment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'CRO experiment and associated resources deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get CRO Leaderboard with Period Filtering
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const period = req.query.period || LEADERBOARD_PERIOD.ALL_TIME;
    const matchFilter = {};

    const now = new Date();
    if (period === LEADERBOARD_PERIOD.THIS_MONTH) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchFilter.createdAt = { $gte: startOfMonth };
    } else if (period === LEADERBOARD_PERIOD.THIS_QUARTER) {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      matchFilter.createdAt = { $gte: startOfQuarter };
    }

    // Aggregate points by creatorId
    const aggregation = await CROExperiment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$creatorId',
          creatorName: { $first: '$creatorName' },
          totalPoints: { $sum: '$score.totalPoints' },
          totalExperiments: { $sum: 1 },
          successfulExperiments: {
            $sum: {
              $cond: [{ $eq: ['$status', CRO_EXPERIMENT_STATUS.SUCCESSFUL] }, 1, 0]
            }
          },
          completedExperiments: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [
                      CRO_EXPERIMENT_STATUS.COMPLETED,
                      CRO_EXPERIMENT_STATUS.SUCCESSFUL,
                      CRO_EXPERIMENT_STATUS.NO_IMPACT,
                      CRO_EXPERIMENT_STATUS.FAILED
                    ]
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: {
          totalPoints: -1,
          successfulExperiments: -1,
          totalExperiments: -1
        }
      }
    ]);

    // Populate user profile info to get current teamRole & avatar data
    const userIds = aggregation.map((item) => item._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email role teamRole')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const leaderboard = aggregation.map((item, index) => {
      const user = userMap.get(item._id.toString());
      const badges = evaluateUserBadges({
        totalExperiments: item.totalExperiments,
        successfulExperiments: item.successfulExperiments,
        totalPoints: item.totalPoints
      });

      return {
        rank: index + 1,
        creatorId: item._id,
        creatorName: user?.name || item.creatorName,
        email: user?.email || '',
        role: user?.role || 'team',
        teamRole: user?.teamRole || 'none',
        totalPoints: item.totalPoints,
        totalExperiments: item.totalExperiments,
        successfulExperiments: item.successfulExperiments,
        completedExperiments: item.completedExperiments,
        successRate:
          item.totalExperiments > 0
            ? Math.round((item.successfulExperiments / item.totalExperiments) * 100)
            : 0,
        badges
      };
    });

    res.status(200).json({
      success: true,
      period,
      count: leaderboard.length,
      data: leaderboard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Get CRO Overall Stats and Current User Stats
 */
export const getCroStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Overall metrics across all experiments
    const [totalCount, successfulCount, totalScoreResult] = await Promise.all([
      CROExperiment.countDocuments(),
      CROExperiment.countDocuments({ status: CRO_EXPERIMENT_STATUS.SUCCESSFUL }),
      CROExperiment.aggregate([
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$score.totalPoints' }
          }
        }
      ])
    ]);

    const globalTotalPoints = totalScoreResult[0]?.totalPoints || 0;

    // User-specific metrics
    const userExperiments = await CROExperiment.find({ creatorId: userId });
    const userTotalExperiments = userExperiments.length;
    const userSuccessfulExperiments = userExperiments.filter(
      (e) => e.status === CRO_EXPERIMENT_STATUS.SUCCESSFUL
    ).length;
    const userTotalPoints = userExperiments.reduce(
      (acc, e) => acc + (e.score?.totalPoints || 0),
      0
    );

    const userBadges = evaluateUserBadges({
      totalExperiments: userTotalExperiments,
      successfulExperiments: userSuccessfulExperiments,
      totalPoints: userTotalPoints
    });

    // Compute user's rank
    const higherScoreAgg = await CROExperiment.aggregate([
      {
        $group: {
          _id: '$creatorId',
          totalPoints: { $sum: '$score.totalPoints' }
        }
      },
      {
        $match: {
          totalPoints: { $gt: userTotalPoints }
        }
      },
      {
        $count: 'higherCount'
      }
    ]);

    const userRank = (higherScoreAgg[0]?.higherCount || 0) + 1;

    res.status(200).json({
      success: true,
      data: {
        global: {
          totalExperiments: totalCount,
          successfulExperiments: successfulCount,
          totalPointsAwarded: globalTotalPoints
        },
        user: {
          rank: userRank,
          totalPoints: userTotalPoints,
          totalExperiments: userTotalExperiments,
          successfulExperiments: userSuccessfulExperiments,
          badges: userBadges
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Upload Screenshot (Base64 data URL)
 * Saves to backend/public/uploads/cro/<timestamp>-<rand>.<ext>
 */
export const uploadScreenshot = async (req, res, next) => {
  try {
    const { image, name = 'screenshot', type = 'before' } = req.body;

    if (!image || typeof image !== 'string') {
      throw new ApiError(400, 'Image data is required');
    }

    // Match data:image/(png|jpeg|jpg|webp|gif);base64,...
    const matches = image.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
    if (!matches) {
      throw new ApiError(400, 'Invalid image format. Allowed formats: PNG, JPEG, WEBP, GIF');
    }

    const mimeType = `image/${matches[1].toLowerCase()}`;
    const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');

    // Max 5MB per image
    if (buffer.length > 5 * 1024 * 1024) {
      throw new ApiError(400, 'Image size exceeds maximum limit of 5MB');
    }

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const filename = `cro-${uniqueSuffix}.${ext}`;

    const uploadResult = await uploadImage({
      base64Data: image,
      fileName: name || filename,
      type: type === 'after' ? 'after' : 'before',
      mimeType,
      size: buffer.length
    });

    res.status(201).json({
      success: true,
      data: {
        url: uploadResult.url,
        fileId: uploadResult.fileId || '',
        name: name || filename
      }
    });
  } catch (error) {
    next(error);
  }
};
