import mongoose from 'mongoose';
import { CRO_EXPERIMENT_STATUS } from '../constants/cro.constants.js';

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    fileId: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const croExperimentSchema = new mongoose.Schema(
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
    hypothesisTitle: {
      type: String,
      required: [true, 'Hypothesis title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    hypothesis: {
      type: String,
      required: [true, 'Hypothesis description is required'],
      trim: true
    },

    // Screenshots
    beforeImages: {
      type: [imageSchema],
      default: []
    },
    afterImages: {
      type: [imageSchema],
      default: []
    },

    // Dates
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      default: null
    },

    // Status
    status: {
      type: String,
      enum: Object.values(CRO_EXPERIMENT_STATUS),
      default: CRO_EXPERIMENT_STATUS.IDEA,
      index: true
    },

    // Raw Metrics Results
    results: {
      salesBefore: {
        type: Number,
        default: null,
        min: [0, 'Sales before cannot be negative']
      },
      salesAfter: {
        type: Number,
        default: null,
        min: [0, 'Sales after cannot be negative']
      },
      prepaidBefore: {
        type: Number,
        default: null,
        min: [0, 'Prepaid % cannot be negative'],
        max: [100, 'Prepaid % cannot exceed 100%']
      },
      prepaidAfter: {
        type: Number,
        default: null,
        min: [0, 'Prepaid % cannot be negative'],
        max: [100, 'Prepaid % cannot exceed 100%']
      },
      cancellationBefore: {
        type: Number,
        default: null,
        min: [0, 'Cancellation % cannot be negative'],
        max: [100, 'Cancellation % cannot exceed 100%']
      },
      cancellationAfter: {
        type: Number,
        default: null,
        min: [0, 'Cancellation % cannot be negative'],
        max: [100, 'Cancellation % cannot exceed 100%']
      }
    },

    // Computed Score Breakdown (Calculated by backend scoring service only)
    score: {
      salesPoints: { type: Number, default: 0 },
      prepaidPoints: { type: Number, default: 0 },
      cancellationPoints: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0, index: true }
    },

    // Computed Percentage Improvements
    improvements: {
      salesPercent: { type: Number, default: 0 },
      prepaidPercentagePoints: { type: Number, default: 0 },
      cancellationPercentagePoints: { type: Number, default: 0 }
    },

    // Badges associated with this experiment
    badges: {
      type: [String],
      default: []
    },

    completedAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound Indexes for fast listing, status filtering, and leaderboard aggregation
croExperimentSchema.index({ creatorId: 1, createdAt: -1 });
croExperimentSchema.index({ status: 1, createdAt: -1 });
croExperimentSchema.index({ completedAt: -1, 'score.totalPoints': -1 });

export const CROExperiment = mongoose.model('CROExperiment', croExperimentSchema);
