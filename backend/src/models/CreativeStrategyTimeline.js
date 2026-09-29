import mongoose from 'mongoose';

const creativeStrategyTimelineSchema = new mongoose.Schema(
  {
    creativeStrategy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreativeStrategy',
      required: true,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorName: {
      type: String,
      required: true,
      trim: true
    },
    actorRole: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    stage: {
      type: String,
      trim: true,
      default: ''
    },
    timeTakenDisplay: {
      type: String,
      trim: true,
      default: ''
    },
    durationMs: {
      type: Number,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

creativeStrategyTimelineSchema.index({ creativeStrategy: 1, timestamp: 1 });

export const CreativeStrategyTimeline = mongoose.model(
  'CreativeStrategyTimeline',
  creativeStrategyTimelineSchema
);
