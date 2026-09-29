import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/status.js';
import { TEAM_ROLES } from '../constants/teamRoles.js';
import { hashPassword, comparePassword } from '../utils/password.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.TEAM,
      index: true
    },
    teamRole: {
      type: String,
      enum: Object.values(TEAM_ROLES),
      default: TEAM_ROLES.NONE,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
      index: true
    },
    pendingExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// TTL Index: Automatically purges pending user documents after 48 hours
userSchema.index({ pendingExpiresAt: 1 }, { expireAfterSeconds: 0 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await hashPassword(this.password);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await comparePassword(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
