import mongoose from 'mongoose';
import { CREATIVE_STATUS } from '../constants/creative.constants.js';

const creativePerformanceSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true
    },
    creatorName: {
      type: String,
      required: [true, 'Creator name snapshot is required'],
      trim: true
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      index: true
    },
    adName: {
      type: String,
      required: [true, 'Ad name is required'],
      trim: true
    },
    roas: {
      type: Number,
      required: [true, 'ROAS is required'],
      min: [0, 'ROAS cannot be negative']
    },
    purchases: {
      type: Number,
      required: [true, 'Purchases is required'],
      min: [0, 'Purchases cannot be negative']
    },
    status: {
      type: String,
      enum: Object.values(CREATIVE_STATUS),
      required: [true, 'Status is required'],
      index: true
    },
    score: {
      roasPoints: {
        type: Number,
        default: 0
      },
      purchasePoints: {
        type: Number,
        default: 0
      },
      totalPoints: {
        type: Number,
        default: 0,
        index: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for listing, filtering, and leaderboard aggregations
creativePerformanceSchema.index({ creatorId: 1, createdAt: -1 });
creativePerformanceSchema.index({ status: 1, createdAt: -1 });
creativePerformanceSchema.index({ createdAt: -1, 'score.totalPoints': -1 });

export const CreativePerformance = mongoose.model('CreativePerformance', creativePerformanceSchema);
