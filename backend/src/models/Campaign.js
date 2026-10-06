import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [200, 'Campaign name cannot exceed 200 characters']
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
    campaignType: {
      type: String,
      enum: ['CBO', 'ABO'],
      default: 'CBO'
    },
    budget: {
      type: Number,
      default: null
    },
    objective: {
      type: String,
      enum: ['Lead Generation', 'Sales', 'Catalog Sales'],
      default: 'Sales'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT'],
      default: 'ACTIVE',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
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

campaignSchema.index({ client: 1, name: 1 });

export const Campaign = mongoose.model('Campaign', campaignSchema);
