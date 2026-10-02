import { CreativePerformance } from '../models/CreativePerformance.js';
import { Client } from '../models/Client.js';
import { User } from '../models/User.js';
import { calculateCreativeScore } from '../services/creativeScoring.service.js';
import { CREATIVE_STATUS, LEADERBOARD_PERIOD } from '../constants/creative.constants.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * 1. Create a new Creative Performance entry
 * Any authenticated user can create.
 */
export const createCreative = async (req, res, next) => {
  try {
    const { clientId, clientName, adName, roas, status, purchases, baselineROAS, previousROAS } = req.body;

    let resolvedClientId = clientId;
    let resolvedClientName = clientName ? clientName.trim() : '';
    let resolvedBaselineROAS = baselineROAS !== undefined && baselineROAS !== null
      ? Number(baselineROAS)
      : previousROAS !== undefined && previousROAS !== null
      ? Number(previousROAS)
      : undefined;

    // Resolve client from MongoDB
    let clientDoc = null;
    if (resolvedClientId) {
      clientDoc = await Client.findById(resolvedClientId);
    } else if (resolvedClientName) {
      clientDoc = await Client.findOne({ normalizedName: resolvedClientName.toLowerCase() });
    }

    if (clientDoc) {
      resolvedClientId = clientDoc._id;
      resolvedClientName = clientDoc.clientName || clientDoc.name;
      resolvedBaselineROAS = clientDoc.baselineROAS ?? 0;
    } else if (resolvedBaselineROAS === undefined) {
      resolvedBaselineROAS = 0;
    }

    // Calculate score: +1 point if roas > baselineROAS, 0 otherwise
    const score = calculateCreativeScore({
      roas: Number(roas),
      baselineROAS: resolvedBaselineROAS
    });

    const creative = await CreativePerformance.create({
      creatorId: req.user._id,
      creatorName: req.user.name,
      clientId: resolvedClientId || null,
      clientName: resolvedClientName,
      adName: adName.trim(),
      baselineROAS: resolvedBaselineROAS,
      previousROAS: resolvedBaselineROAS,
      roas: Number(roas),
      purchases: purchases !== undefined ? Number(purchases) : 0,
      status,
      score
    });

    // Current ROAS must reflect the latest recorded creative performance for that client
    if (clientDoc) {
      clientDoc.currentROAS = Number(roas);
      await clientDoc.save().catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Creative performance created successfully',
      data: creative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get Creative entries with optional filters & search
 */
export const getCreatives = async (req, res, next) => {
  try {
    const { status, creatorId, clientId, clientName, search } = req.query;
    const filter = {};

    if (status && Object.values(CREATIVE_STATUS).includes(status)) {
      filter.status = status;
    }

    if (creatorId) {
      filter.creatorId = creatorId;
    }

    if (clientId) {
      filter.clientId = clientId;
    }

    if (clientName) {
      filter.clientName = { $regex: clientName.trim(), $options: 'i' };
    }

    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { clientName: searchRegex },
        { adName: searchRegex },
        { creatorName: searchRegex }
      ];
    }

    const creatives = await CreativePerformance.find(filter)
      .sort({ createdAt: -1 })
      .populate('creatorId', 'name email role teamRole')
      .populate('clientId', 'name clientName baselineROAS currentROAS');

    res.status(200).json({
      success: true,
      count: creatives.length,
      data: creatives
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get single creative by ID
 */
export const getCreativeById = async (req, res, next) => {
  try {
    const creative = await CreativePerformance.findById(req.params.id)
      .populate('creatorId', 'name email role teamRole')
      .populate('clientId', 'name clientName baselineROAS currentROAS');

    if (!creative) {
      throw new ApiError(404, 'Creative entry not found');
    }

    res.status(200).json({
      success: true,
      data: creative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update a creative entry
 * Creator can edit own entry; Admin can edit any entry.
 */
export const updateCreative = async (req, res, next) => {
  try {
    const creative = await CreativePerformance.findById(req.params.id);

    if (!creative) {
      throw new ApiError(404, 'Creative entry not found');
    }

    const isOwner = creative.creatorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, 'Access denied. You can only edit your own creatives.');
    }

    const { clientId, clientName, adName, roas, status, purchases, baselineROAS, previousROAS } = req.body;

    if (clientName !== undefined) creative.clientName = clientName.trim();
    if (clientId !== undefined) creative.clientId = clientId;
    if (adName !== undefined) creative.adName = adName.trim();
    if (purchases !== undefined) creative.purchases = Number(purchases);

    // Resolve client baselineROAS reference
    const targetClientId = clientId !== undefined ? clientId : creative.clientId;
    let clientDoc = null;
    if (targetClientId) {
      clientDoc = await Client.findById(targetClientId);
    }

    const resolvedBaselineROAS = clientDoc
      ? (clientDoc.baselineROAS ?? 0)
      : baselineROAS !== undefined
      ? Number(baselineROAS)
      : previousROAS !== undefined
      ? Number(previousROAS)
      : (creative.baselineROAS ?? creative.previousROAS ?? 0);

    creative.baselineROAS = resolvedBaselineROAS;
    creative.previousROAS = resolvedBaselineROAS;

    const nextRoas = roas !== undefined ? Number(roas) : creative.roas;
    creative.roas = nextRoas;
    creative.score = calculateCreativeScore({ roas: nextRoas, baselineROAS: resolvedBaselineROAS });

    if (status !== undefined) {
      creative.status = status;
    }

    await creative.save();

    // Current ROAS must reflect the latest recorded creative performance for that client
    if (clientDoc && nextRoas > 0) {
      clientDoc.currentROAS = nextRoas;
      await clientDoc.save().catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Creative performance updated successfully',
      data: creative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete creative entry
 * Admin ONLY
 */
export const deleteCreative = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Access denied. Only Administrators can delete creatives.');
    }

    const creative = await CreativePerformance.findById(req.params.id);

    if (!creative) {
      throw new ApiError(404, 'Creative entry not found');
    }

    await creative.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Creative performance deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get Creative Leaderboard with Period Filtering
 * Columns: Rank, Name, Creatives, Winners, Avg Score, Total Points
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

    const aggregation = await CreativePerformance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$creatorId',
          creatorName: { $first: '$creatorName' },
          creatives: { $sum: 1 },
          winners: {
            $sum: {
              $cond: [{ $eq: ['$status', CREATIVE_STATUS.WINNER] }, 1, 0]
            }
          },
          avgScore: { $avg: '$score.totalPoints' },
          totalPoints: { $sum: '$score.totalPoints' }
        }
      },
      {
        $sort: {
          totalPoints: -1,
          winners: -1,
          creatives: -1
        }
      }
    ]);

    const userIds = aggregation.map((item) => item._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email role teamRole')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const leaderboard = aggregation.map((item, index) => {
      const user = userMap.get(item._id.toString());
      return {
        rank: index + 1,
        creatorId: item._id,
        name: user?.name || item.creatorName,
        creatives: item.creatives,
        winners: item.winners,
        avgScore: Math.round((item.avgScore || 0) * 100) / 100,
        totalPoints: Math.round((item.totalPoints || 0) * 100) / 100
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
 * 7. Get Creative Stats (User Stats + Global Stats)
 */
export const getCreativeStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Global counts
    const [totalCreatives, totalWinners, totalPointsResult] = await Promise.all([
      CreativePerformance.countDocuments(),
      CreativePerformance.countDocuments({ status: CREATIVE_STATUS.WINNER }),
      CreativePerformance.aggregate([
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$score.totalPoints' }
          }
        }
      ])
    ]);

    const globalTotalPoints = totalPointsResult[0]?.totalPoints || 0;

    // User metrics
    const userCreativesDocs = await CreativePerformance.find({ creatorId: userId });
    const userCreatives = userCreativesDocs.length;
    const userWinners = userCreativesDocs.filter(
      (c) => c.status === CREATIVE_STATUS.WINNER
    ).length;
    const userTotalPoints = userCreativesDocs.reduce(
      (acc, c) => acc + (c.score?.totalPoints || 0),
      0
    );
    const userAvgScore =
      userCreatives > 0
        ? Math.round((userTotalPoints / userCreatives) * 100) / 100
        : 0;

    // User rank calculation
    const higherScoreAgg = await CreativePerformance.aggregate([
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
          totalCreatives,
          totalWinners,
          totalPointsAwarded: Math.round(globalTotalPoints * 100) / 100
        },
        user: {
          creatives: userCreatives,
          winners: userWinners,
          averageScore: userAvgScore,
          totalPoints: Math.round(userTotalPoints * 100) / 100,
          rank: userRank
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
