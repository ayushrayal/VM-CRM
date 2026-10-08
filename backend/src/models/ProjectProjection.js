import mongoose from 'mongoose';

const dailyTrackingSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Tracking date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    actualSpend: {
      type: Number,
      required: [true, 'Actual spend is required'],
      min: [0, 'Actual spend cannot be negative'],
      default: 0
    },
    actualRevenue: {
      type: Number,
      required: [true, 'Actual revenue is required'],
      min: [0, 'Actual revenue cannot be negative'],
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const budgetHistorySchema = new mongoose.Schema(
  {
    budget: {
      type: Number,
      required: true,
      min: [0, 'Budget cannot be negative']
    },
    effectiveDate: {
      type: String,
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { _id: true }
);

const projectProjectionSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true
    },
    month: {
      type: Number,
      required: [true, 'Projection month is required (1-12)'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      required: [true, 'Projection year is required'],
      min: [2000, 'Year must be valid']
    },
    targetSpend: {
      type: Number,
      required: [true, 'Target ad spend is required'],
      min: [0, 'Target spend cannot be negative'],
      default: 0
    },
    targetRevenue: {
      type: Number,
      required: [true, 'Target revenue is required'],
      min: [0, 'Target revenue cannot be negative'],
      default: 0
    },
    targetROAS: {
      type: Number,
      required: [true, 'Target ROAS is required'],
      min: [0, 'Target ROAS cannot be negative'],
      default: 0
    },
    currentDailyBudget: {
      type: Number,
      required: [true, 'Current daily budget is required'],
      min: [0, 'Current daily budget cannot be negative'],
      default: 0
    },
    budgetHistory: {
      type: [budgetHistorySchema],
      default: []
    },
    dailyTracking: {
      type: [dailyTrackingSchema],
      default: []
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Enforce unique monthly projection per client, year, and month
projectProjectionSchema.index({ client: 1, year: 1, month: 1 }, { unique: true });

export const ProjectProjection = mongoose.model('ProjectProjection', projectProjectionSchema);
