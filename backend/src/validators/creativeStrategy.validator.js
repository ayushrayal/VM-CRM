import { z } from 'zod';
import { WORKFLOW_STATUS, ABHISHEK_DECISION, REVIEW_STATUS } from '../constants/creativeWorkflow.js';

export const createCreativeStrategySchema = z.object({
  body: z.object({
    clientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID'),
    campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid campaign ID').nullable().optional(),
    adSetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ad set ID').nullable().optional(),
    creativeName: z.string().optional(),
    campaignName: z.string().optional(),
    campaignLaunchDate: z.string().nullable().optional(),
    currentAdSetName: z.string().optional(),
    launchDate: z.string().nullable().optional(),
    observationDurationHours: z.number().min(0.1).max(8760).optional(),
    schedulingMode: z.enum(['DURATION', 'CUSTOM_DUE_DATE']).optional(),
    reportDueAt: z.string().nullable().optional(),
    cycleNumber: z.number().int().min(1).optional(),
    currentTestingCycle: z.string().optional(),

    // Planning dates
    nextAssetDueDate: z.string().nullable().optional(),
    creativePrepDue: z.string().nullable().optional(),
    jointPrepDue: z.string().nullable().optional(),
    atApprovalDue: z.string().nullable().optional(),
    plannedLaunchDate: z.string().nullable().optional(),

    // Team assignments
    assignedMediaBuyer: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').nullable().optional(),
    mediaBuyerRecommendation: z.string().optional(),

    assignedCreativeStrategist: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').nullable().optional(),
    creativeStrategistRecommendation: z.string().optional(),

    creativesProposed: z.string().optional(),
    hypothesis: z.string().optional(),
    abhishekDecision: z.nativeEnum(ABHISHEK_DECISION).optional(),
    finalAssetConfiguration: z.string().optional(),
    finalCreativesApproved: z.boolean().optional(),

    assignedGraphicDesigner: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').nullable().optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').nullable().optional(),
    creativesReady: z.boolean().optional(),
    configurationReady: z.boolean().optional(),

    approvedByAT: z.boolean().optional(),
    launchProof: z.string().optional(),
    delayReason: z.string().optional(),
    parentItems: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional()
  })
});

export const updateCreativeStrategySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    creativeName: z.string().optional(),
    campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    adSetId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    campaignName: z.string().optional(),
    campaignLaunchDate: z.string().nullable().optional(),
    currentAdSetName: z.string().optional(),
    launchDate: z.string().nullable().optional(),
    observationDurationHours: z.number().min(0.1).max(8760).optional(),
    schedulingMode: z.enum(['DURATION', 'CUSTOM_DUE_DATE']).optional(),
    reportDueAt: z.string().nullable().optional(),
    cycleNumber: z.number().int().min(1).optional(),
    currentTestingCycle: z.string().optional(),

    nextAssetDueDate: z.string().nullable().optional(),
    creativePrepDue: z.string().nullable().optional(),
    jointPrepDue: z.string().nullable().optional(),
    atApprovalDue: z.string().nullable().optional(),
    plannedLaunchDate: z.string().nullable().optional(),

    assignedMediaBuyer: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    mediaBuyerRecommendation: z.string().optional(),

    assignedCreativeStrategist: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    creativeStrategistRecommendation: z.string().optional(),

    creativesProposed: z.string().optional(),
    hypothesis: z.string().optional(),
    abhishekDecision: z.nativeEnum(ABHISHEK_DECISION).optional(),
    finalAssetConfiguration: z.string().optional(),
    finalCreativesApproved: z.boolean().optional(),

    assignedGraphicDesigner: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    creativesReady: z.boolean().optional(),
    configurationReady: z.boolean().optional(),

    status: z.nativeEnum(WORKFLOW_STATUS).optional(),
    approvedByAT: z.boolean().optional(),
    launchProof: z.string().optional(),
    delayReason: z.string().optional(),
    parentItems: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),

    // Metrics & Performance
    ctr: z.number().nullable().optional(),
    cpc: z.number().nullable().optional(),
    cpm: z.number().nullable().optional(),
    roas: z.number().nullable().optional(),
    performanceNotes: z.string().optional(),
    additionalObservations: z.string().optional(),
    reportNotes: z.string().optional(),

    // Performance analysis
    performanceAnalysis: z.string().optional(),
    recommendation: z.string().optional(),
    analysisNotes: z.string().optional(),

    // Creative analysis
    angle: z.string().optional(),
    concept: z.string().optional(),
    communication: z.string().optional(),
    psychology: z.string().optional(),
    hook: z.string().optional(),
    creativeStructure: z.string().optional(),
    creativeAnalysisNotes: z.string().optional(),
    creativeLearning: z.string().optional(),
    creativeLearningNotes: z.string().optional(),
    creativeLearningAttachment: z.string().optional(),
    learningsNotes: z.string().optional(),

    // Brief & reviews
    briefTitle: z.string().optional(),
    briefDescription: z.string().optional(),
    briefAttachment: z.string().optional(),
    briefContent: z.string().optional(),
    briefReviewFeedback: z.string().optional(),

    // Creative production & submission
    creativeLink: z.string().optional(),
    framerLink: z.string().optional(),
    creativeAttachment: z.string().optional(),
    creativeSubmissionNotes: z.string().optional(),
    productionAssetsUrl: z.string().optional(),
    reviewNotes: z.string().optional(),
    internalReviewFeedback: z.string().optional(),
    finalApprovalFeedback: z.string().optional(),
    revisionNotes: z.string().optional()
  })
});

export const recordIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  })
});

export const launchCreativeSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    launchProof: z.string().optional()
  })
});

export const submitReportSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    ctr: z.number().optional().nullable(),
    cpc: z.number().optional().nullable(),
    cpm: z.number().optional().nullable(),
    roas: z.number().optional().nullable(),
    performanceNotes: z.string().optional(),
    additionalObservations: z.string().optional(),
    reportNotes: z.string().optional()
  })
});

export const submitPerformanceAnalysisSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    performanceAnalysis: z.string().optional(),
    recommendation: z.string().optional(),
    analysisNotes: z.string().optional()
  })
});

export const submitLearningsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    performanceAnalysis: z.string().optional(),
    recommendation: z.string().optional(),
    analysisNotes: z.string().optional(),
    angle: z.string().optional(),
    concept: z.string().optional(),
    communication: z.string().optional(),
    psychology: z.string().optional(),
    hook: z.string().optional(),
    creativeStructure: z.string().optional(),
    creativeAnalysisNotes: z.string().optional(),
    creativeLearning: z.string().optional(),
    creativeLearningNotes: z.string().optional(),
    creativeLearningAttachment: z.string().optional(),
    assignedGraphicDesigner: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    learningsNotes: z.string().optional()
  })
});

export const createBriefSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    briefTitle: z.string().optional(),
    briefDescription: z.string().optional(),
    briefAttachment: z.string().optional(),
    briefContent: z.string().optional()
  })
});

export const reviewBriefSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    status: z.enum(['APPROVED', 'REVISE', 'REJECTED']),
    feedback: z.string().optional()
  })
});

export const submitProductionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    creativeLink: z.string().optional(),
    framerLink: z.string().optional(),
    creativeAttachment: z.string().optional(),
    creativeSubmissionNotes: z.string().optional(),
    productionAssetsUrl: z.string().optional()
  })
});

export const reviewInternalReviewSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    status: z.enum(['APPROVED', 'REVISE', 'REJECTED']),
    feedback: z.string().optional(),
    reviewNotes: z.string().optional()
  })
});

export const approveInternalReviewSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    reviewNotes: z.string().optional(),
    feedback: z.string().optional()
  })
});

export const clientReviewDecisionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    decision: z.enum(['APPROVED', 'REVISION_REQUESTED', 'REJECTED', 'REVISE']).optional(),
    status: z.enum(['APPROVED', 'REVISE', 'REJECTED']).optional(),
    revisionNotes: z.string().optional(),
    feedback: z.string().optional()
  })
});

export const finalApprovalSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    status: z.enum(['APPROVED', 'REVISE', 'REJECTED']),
    feedback: z.string().optional()
  })
});

export const launchNextCycleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID')
  }),
  body: z.object({
    launchProof: z.string().optional()
  }).optional()
});
