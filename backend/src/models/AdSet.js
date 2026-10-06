import mongoose from 'mongoose';

const adSetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ad Set name is required'],
      trim: true,
      maxlength: [200, 'Ad Set name cannot exceed 200 characters']
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign reference is required'],
      index: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true
    },
    launchDate: {
      type: Date,
      default: null
    },
    budget: {
      type: Number,
      default: null
    },
    ageGroup: {
      start: {
        type: Number,
        default: 18
      },
      end: {
        type: Number,
        default: 65
      }
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Both'],
      default: 'Both'
    },
    includedLocations: {
      type: [String],
      default: []
    },
    excludedLocations: {
      type: [String],
      default: []
    },
    targeting: {
      type: String,
      enum: ['Broad', 'Interest'],
      default: 'Broad'
    },
    interests: {
      type: [String],
      default: []
    },
    partOfCurrentCycle: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT'],
      default: 'ACTIVE',
      index: true
    },
    currentTestingCycle: {
      type: Number,
      default: 1
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

adSetSchema.index({ campaign: 1, name: 1 });

export const AdSet = mongoose.model('AdSet', adSetSchema);
