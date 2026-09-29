import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'Client name must be at least 2 characters'],
      maxlength: [100, 'Client name cannot exceed 100 characters']
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
    timestamps: true
  }
);

export const Client = mongoose.model('Client', clientSchema);
