import mongoose from 'mongoose';
import { WORKFLOW_STATUS, ABHISHEK_DECISION, REVIEW_STATUS } from '../constants/creativeWorkflow.js';

const creativeStrategySchema = new mongoose.Schema(
  {
    // Relationships
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true,
      default: null
    },
    adSet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdSet',
      index: true,
      default: null
    },

    // SECTION A — CAMPAIGN / LAUNCH / CREATIVE
    creativeName: {
      type: String,
      trim: true,
      default: ''
    },
    adName: {
      type: String,
      trim: true,
      default: ''
    },
    adType: {
      type: String,
      enum: ['Static', 'Video', 'Carousel', 'Catalog'],
      default: 'Static'
    },
    landingPageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    testingStyle: {
      type: String,
      trim: true,
      default: 'New Angle'
    },
    creatives: [
      {
        url: { type: String, trim: true, default: '' },
        fileId: { type: String, trim: true, default: '' },
        name: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 }
      }
    ],
    // Hierarchy snapshots
    campaignType: {
      type: String,
      default: 'CBO'
    },
    campaignObjective: {
      type: String,
      default: 'Sales'
    },
    campaignBudget: {
      type: Number,
      default: null
    },
    adSetBudget: {
      type: Number,
      default: null
    },
    adSetAgeGroup: {
      start: { type: Number, default: 18 },
      end: { type: Number, default: 65 }
    },
    adSetGender: {
      type: String,
      default: 'Both'
    },
    adSetIncludedLocations: {
      type: [String],
      default: []
    },
    adSetExcludedLocations: {
      type: [String],
      default: []
    },
    adSetTargeting: {
      type: String,
      default: 'Broad'
    },
    adSetInterests: {
      type: [String],
      default: []
    },
    partOfCurrentCycle: {
      type: Boolean,
      default: true
    },
    campaignName: {
      type: String,
      trim: true,
      default: ''
    },
    campaignLaunchDate: {
      type: Date,
      default: null
    },
    currentAdSetName: {
      type: String,
      trim: true,
      default: ''
    },
    launchDate: {
      type: Date,
      default: null
    },
    currentTestingCycle: {
      type: String,
      trim: true,
      default: 'Cycle 1'
    },
    cycleNumber: {
      type: Number,
      default: 1,
      min: 1
    },

    // Observation Tracking & Scheduling
    launchedAt: {
      type: Date,
      default: null
    },
    reportDueAt: {
      type: Date,
      default: null
    },
    observationDurationHours: {
      type: Number,
      default: 72,
      min: 0.1
    },
    schedulingMode: {
      type: String,
      enum: ['DURATION', 'CUSTOM_DUE_DATE'],
      default: 'DURATION'
    },

    // SECTION B — CREATIVE STRATEGY PLANNING DATES
    nextAssetDueDate: {
      type: Date,
      default: null
    },
    creativePrepDue: {
      type: Date,
      default: null
    },
    jointPrepDue: {
      type: Date,
      default: null
    },
    atApprovalDue: {
      type: Date,
      default: null
    },
    plannedLaunchDate: {
      type: Date,
      default: null
    },

    // SECTION C — MEDIA BUYER ASSIGNMENT & 72H REPORT
    assignedMediaBuyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    mediaBuyerRecommendation: {
      type: String,
      trim: true,
      default: ''
    },
    // Media Buyer 72-Hour Report Metrics
    ctr: {
      type: Number,
      default: null
    },
    cpc: {
      type: Number,
      default: null
    },
    cpm: {
      type: Number,
      default: null
    },
    roas: {
      type: Number,
      default: null
    },
    spend: {
      type: Number,
      default: null
    },
    costPerResult: {
      type: Number,
      default: null
    },
    purchases: {
      type: Number,
      default: null
    },
    purchaseConversionValue: {
      type: Number,
      default: null
    },
    performanceStatus: {
      type: String,
      enum: ['WINNER', 'LOSER', 'PENDING'],
      default: 'PENDING'
    },
    selectedCreatives: {
      type: [String],
      default: []
    },
    creativePerformances: [
      {
        creativeId: { type: String, default: '' },
        creativeName: { type: String, default: '' },
        previewUrl: { type: String, default: '' },
        spend: { type: Number, default: 0, min: 0 },
        costPerResult: { type: Number, default: 0, min: 0 },
        purchases: { type: Number, default: 0, min: 0 },
        purchaseConversionValue: { type: Number, default: 0, min: 0 },
        roas: { type: Number, default: 0, min: 0 },
        performanceStatus: { type: String, enum: ['WINNER', 'LOSER'], default: 'WINNER' }
      }
    ],
    performanceNotes: {
      type: String,
      trim: true,
      default: ''
    },
    additionalObservations: {
      type: String,
      trim: true,
      default: ''
    },
    reportSubmittedAt: {
      type: Date,
      default: null
    },
    reportSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // SECTION D — CREATIVE STRATEGIST ASSIGNMENT & PERFORMANCE ANALYSIS
    assignedCreativeStrategist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    creativeStrategistRecommendation: {
      type: String,
      trim: true,
      default: ''
    },
    performanceAnalysis: {
      type: String,
      trim: true,
      default: ''
    },
    recommendation: {
      type: String,
      trim: true,
      default: ''
    },
    analysisNotes: {
      type: String,
      trim: true,
      default: ''
    },
    performanceAnalysisSubmittedAt: {
      type: Date,
      default: null
    },
    performanceAnalysisSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // SECTION E — CREATIVE ANALYSIS & CREATIVE LEARNING / DIRECTION
    angle: {
      type: String,
      trim: true,
      default: ''
    },
    concept: {
      type: String,
      trim: true,
      default: ''
    },
    communication: {
      type: String,
      trim: true,
      default: ''
    },
    psychology: {
      type: String,
      trim: true,
      default: ''
    },
    hook: {
      type: String,
      trim: true,
      default: ''
    },
    creativeStructure: {
      type: String,
      trim: true,
      default: ''
    },
    creativeAnalysisNotes: {
      type: String,
      trim: true,
      default: ''
    },
    creativeLearning: {
      type: String,
      trim: true,
      default: ''
    },
    creativeLearningNotes: {
      type: String,
      trim: true,
      default: ''
    },
    creativeLearningAttachment: {
      type: String,
      trim: true,
      default: ''
    },
    learningsSubmittedAt: {
      type: Date,
      default: null
    },
    learningsSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Legacy creative fields maintained for backward compatibility
    creativesProposed: {
      type: String,
      trim: true,
      default: ''
    },
    hypothesis: {
      type: String,
      trim: true,
      default: ''
    },
    finalAssetConfiguration: {
      type: String,
      trim: true,
      default: ''
    },

    // SECTION F — GRAPHIC DESIGNER ASSIGNMENT & BRIEF
    assignedGraphicDesigner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    designerAssignedAt: {
      type: Date,
      default: null
    },
    designerAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    briefTitle: {
      type: String,
      trim: true,
      default: ''
    },
    briefDescription: {
      type: String,
      trim: true,
      default: ''
    },
    briefAttachment: {
      type: String,
      trim: true,
      default: ''
    },
    briefCreatedAt: {
      type: Date,
      default: null
    },
    briefSubmittedAt: {
      type: Date,
      default: null
    },
    briefSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    briefStatus: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING
    },
    briefReviewFeedback: {
      type: String,
      trim: true,
      default: ''
    },
    briefApprovedAt: {
      type: Date,
      default: null
    },
    briefReviewedAt: {
      type: Date,
      default: null
    },
    briefReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // SECTION G — PRODUCTION & SUBMISSION (GRAPHIC DESIGNER)
    productionStartedAt: {
      type: Date,
      default: null
    },
    creativeLink: {
      type: String,
      trim: true,
      default: ''
    },
    framerLink: {
      type: String,
      trim: true,
      default: ''
    },
    creativeAttachment: {
      type: String,
      trim: true,
      default: ''
    },
    creativeSubmissionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    creativeSubmittedAt: {
      type: Date,
      default: null
    },
    creativeSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // SECTION H — INTERNAL CREATIVE REVIEW (CREATIVE STRATEGIST)
    internalReviewStatus: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING
    },
    internalReviewFeedback: {
      type: String,
      trim: true,
      default: ''
    },
    internalReviewAt: {
      type: Date,
      default: null
    },
    internalReviewBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // SECTION I — FINAL APPROVAL (ABHISHEK SIR / DESIGNATED APPROVER)
    finalApprovalStatus: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING
    },
    finalApprovalFeedback: {
      type: String,
      trim: true,
      default: ''
    },
    finalApprovedAt: {
      type: Date,
      default: null
    },
    finalApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    abhishekDecision: {
      type: String,
      enum: Object.values(ABHISHEK_DECISION),
      default: ABHISHEK_DECISION.PENDING,
      index: true
    },
    finalCreativesApproved: {
      type: Boolean,
      default: false
    },

    // SECTION J — WORKFLOW STATUS & HANDOFF
    status: {
      type: String,
      enum: Object.values(WORKFLOW_STATUS),
      default: WORKFLOW_STATUS.PENDING_LAUNCH,
      index: true
    },
    handoffAt: {
      type: Date,
      default: null
    },
    clientReviewAt: {
      type: Date,
      default: null
    },
    clientApprovedAt: {
      type: Date,
      default: null
    },
    revisionRequestedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    nextCycleCreatedAt: {
      type: Date,
      default: null
    },
    approvedByAT: {
      type: Boolean,
      default: false
    },
    creativesReady: {
      type: Boolean,
      default: false
    },
    configurationReady: {
      type: Boolean,
      default: false
    },
    launchProof: {
      type: String,
      trim: true,
      default: ''
    },
    delayReason: {
      type: String,
      trim: true,
      default: ''
    },

    // Backward-compatible notes fields
    reportNotes: {
      type: String,
      trim: true,
      default: ''
    },
    learningsNotes: {
      type: String,
      trim: true,
      default: ''
    },
    briefContent: {
      type: String,
      trim: true,
      default: ''
    },
    productionAssetsUrl: {
      type: String,
      trim: true,
      default: ''
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: ''
    },
    revisionNotes: {
      type: String,
      trim: true,
      default: ''
    },

    // Cycle Relationships & Audit
    parentItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CreativeStrategy'
      }
    ],
    nextCycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreativeStrategy',
      default: null
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

creativeStrategySchema.index({ client: 1, campaign: 1, adSet: 1 });
creativeStrategySchema.index({ client: 1, status: 1 });

export const CreativeStrategy = mongoose.model('CreativeStrategy', creativeStrategySchema);
