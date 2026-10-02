import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      minlength: [2, 'Client name must be at least 2 characters'],
      maxlength: [100, 'Client name cannot exceed 100 characters']
    },
    clientName: {
      type: String,
      trim: true
    },
    normalizedName: {
      type: String,
      trim: true,
      lowercase: true
    },
    baselineROAS: {
      type: Number,
      default: 0,
      min: [0, 'Baseline ROAS cannot be negative']
    },
    currentROAS: {
      type: Number,
      default: 0,
      min: [0, 'Current ROAS cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Client code cannot exceed 20 characters']
    },
    description: {
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Keep name, clientName, and normalizedName synchronized
clientSchema.pre('validate', function () {
  const chosenName = this.clientName || this.name;
  if (chosenName) {
    const trimmed = chosenName.trim();
    this.name = trimmed;
    this.clientName = trimmed;
    this.normalizedName = trimmed.toLowerCase();
  }

  if (this.currentROAS === undefined || this.currentROAS === null) {
    this.currentROAS = this.baselineROAS || 0;
  }

  if (!this.status) {
    this.status = 'active';
  }
});

// Normalized unique index to safely prevent duplicate client records
clientSchema.index({ normalizedName: 1 }, { unique: true });

export const Client = mongoose.model('Client', clientSchema);
