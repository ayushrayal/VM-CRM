import mongoose from 'mongoose';

const croUploadSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: [true, 'fileId is required'],
      unique: true,
      index: true,
      trim: true
    },
    url: {
      type: String,
      required: [true, 'url is required'],
      trim: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      enum: ['before', 'after'],
      default: 'before'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'uploadedBy user is required'],
      index: true
    },
    experimentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CROExperiment',
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying user's uploads
croUploadSchema.index({ uploadedBy: 1, createdAt: -1 });

export const CROUpload = mongoose.model('CROUpload', croUploadSchema);
