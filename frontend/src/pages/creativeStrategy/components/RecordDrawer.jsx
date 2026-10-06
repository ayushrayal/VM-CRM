import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  getTimeline,
  launchCreative,
  submitReport,
  submitPerformanceAnalysis,
  submitLearnings,
  createBrief,
  reviewBrief,
  submitProduction,
  reviewInternalCreative,
  finalApproval,
  completeAndCreateNextCycle,
  pauseCreative,
  resumeCreative
} from '../../../api/creativeStrategy.api';
import { StatusBadge } from './StatusBadge';
import { EditAssignmentModal } from './EditAssignmentModal';
import { formatDate, formatDateTime, formatDurationMs } from '../../../utils/dateUtils';
import { Button } from '../../../components/common/Button';
import './RecordDrawer.scss';

const STAGES = [
  { id: 1, label: 'Launch' },
  { id: 2, label: '72H Report' },
  { id: 3, label: 'Performance' },
  { id: 4, label: 'Creative Analysis' },
  { id: 5, label: 'Learnings' },
  { id: 6, label: 'Brief' },
  { id: 7, label: 'Brief Review' },
  { id: 8, label: 'Production' },
  { id: 9, label: 'Internal Review' },
  { id: 10, label: 'Final Approval' },
  { id: 11, label: 'Ready to Launch' },
  { id: 12, label: 'Next Cycle' }
];

export const RecordDrawer = ({
  isOpen,
  onClose,
  record,
  allCycles = [],
  onSelectRecord,
  onUpdateRecord,
  mediaBuyers = [],
  creativeStrategists = [],
  graphicDesigners = [],
  allUsers = []
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isMediaBuyer = user?.teamRole === 'media_buyer';
  const isCreativeStrategist = user?.teamRole === 'creative_strategist';
  const isGraphicDesigner = user?.teamRole === 'graphic_designer';

  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' | 'overview' | 'timeline'
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states
  const [launchProofInput, setLaunchProofInput] = useState('');

  // 72H Report Form
  const [ctrInput, setCtrInput] = useState('');
  const [cpcInput, setCpcInput] = useState('');
  const [cpmInput, setCpmInput] = useState('');
  const [roasInput, setRoasInput] = useState('');
  const [performanceNotesInput, setPerformanceNotesInput] = useState('');
  const [additionalObservationsInput, setAdditionalObservationsInput] = useState('');

  // Performance Report — Selected Creatives & Individual Metrics
  const [selectedWorkedCreatives, setSelectedWorkedCreatives] = useState([]);
  const [creativeMetricsMap, setCreativeMetricsMap] = useState({});

  // Performance Analysis Form
  const [performanceAnalysisInput, setPerformanceAnalysisInput] = useState('');
  const [recommendationInput, setRecommendationInput] = useState('');
  const [analysisNotesInput, setAnalysisNotesInput] = useState('');

  // Creative Analysis Form
  const [angleInput, setAngleInput] = useState('');
  const [conceptInput, setConceptInput] = useState('');
  const [communicationInput, setCommunicationInput] = useState('');
  const [psychologyInput, setPsychologyInput] = useState('');
  const [hookInput, setHookInput] = useState('');
  const [creativeStructureInput, setCreativeStructureInput] = useState('');
  const [creativeAnalysisNotesInput, setCreativeAnalysisNotesInput] = useState('');

  // Learnings & Direction Form
  const [creativeLearningInput, setCreativeLearningInput] = useState('');
  const [creativeLearningNotesInput, setCreativeLearningNotesInput] = useState('');
  const [creativeLearningAttachmentInput, setCreativeLearningAttachmentInput] = useState('');
  const [assignedDesignerInput, setAssignedDesignerInput] = useState('');

  // Brief Form
  const [briefTitleInput, setBriefTitleInput] = useState('');
  const [briefDescriptionInput, setBriefDescriptionInput] = useState('');
  const [briefAttachmentInput, setBriefAttachmentInput] = useState('');

  // Brief Review Form
  const [briefReviewFeedbackInput, setBriefReviewFeedbackInput] = useState('');

  // Production Form
  const [creativeLinkInput, setCreativeLinkInput] = useState('');
  const [framerLinkInput, setFramerLinkInput] = useState('');
  const [creativeAttachmentInput, setCreativeAttachmentInput] = useState('');
  const [creativeSubmissionNotesInput, setCreativeSubmissionNotesInput] = useState('');

  // Internal Review Form
  const [internalReviewFeedbackInput, setInternalReviewFeedbackInput] = useState('');

  // Final Approval Form
  const [finalApprovalFeedbackInput, setFinalApprovalFeedbackInput] = useState('');

  // Live timer interval
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state with record when drawer opens or record changes
  useEffect(() => {
    if (isOpen && record?._id) {
      loadTimeline();
      setActionError('');

      // Populate form state from record
      setLaunchProofInput(record.launchProof || '');

      setCtrInput(record.ctr !== null && record.ctr !== undefined ? record.ctr : '');
      setCpcInput(record.cpc !== null && record.cpc !== undefined ? record.cpc : '');
      setCpmInput(record.cpm !== null && record.cpm !== undefined ? record.cpm : '');
      setRoasInput(record.roas !== null && record.roas !== undefined ? record.roas : '');
      setPerformanceNotesInput(record.performanceNotes || record.reportNotes || '');
      setAdditionalObservationsInput(record.additionalObservations || '');

      // Load selected creatives and individual performances
      if (Array.isArray(record.selectedCreatives) && record.selectedCreatives.length > 0) {
        setSelectedWorkedCreatives(record.selectedCreatives);
      } else if (Array.isArray(record.creativePerformances) && record.creativePerformances.length > 0) {
        setSelectedWorkedCreatives(record.creativePerformances.map((cp) => cp.creativeId).filter(Boolean));
      } else {
        setSelectedWorkedCreatives([]);
      }

      if (Array.isArray(record.creativePerformances) && record.creativePerformances.length > 0) {
        const map = {};
        record.creativePerformances.forEach((cp) => {
          const key = cp.creativeId || cp.creativeName;
          map[key] = {
            spend: cp.spend !== undefined && cp.spend !== null ? String(cp.spend) : '',
            costPerResult: cp.costPerResult !== undefined && cp.costPerResult !== null ? String(cp.costPerResult) : '',
            purchases: cp.purchases !== undefined && cp.purchases !== null ? String(cp.purchases) : '',
            purchaseConversionValue:
              cp.purchaseConversionValue !== undefined && cp.purchaseConversionValue !== null
                ? String(cp.purchaseConversionValue)
                : '',
            roas: cp.roas !== undefined && cp.roas !== null ? String(cp.roas) : '',
            performanceStatus: cp.performanceStatus || 'WINNER'
          };
        });
        setCreativeMetricsMap(map);
      } else {
        setCreativeMetricsMap({});
      }

      setPerformanceAnalysisInput(record.performanceAnalysis || '');
      setRecommendationInput(record.recommendation || '');
      setAnalysisNotesInput(record.analysisNotes || '');

      setAngleInput(record.angle || '');
      setConceptInput(record.concept || '');
      setCommunicationInput(record.communication || '');
      setPsychologyInput(record.psychology || '');
      setHookInput(record.hook || '');
      setCreativeStructureInput(record.creativeStructure || '');
      setCreativeAnalysisNotesInput(record.creativeAnalysisNotes || '');

      setCreativeLearningInput(record.creativeLearning || record.learningsNotes || '');
      setCreativeLearningNotesInput(record.creativeLearningNotes || '');
      setCreativeLearningAttachmentInput(record.creativeLearningAttachment || '');
      setAssignedDesignerInput(record.assignedGraphicDesigner?._id || record.assignedGraphicDesigner || '');

      setBriefTitleInput(record.briefTitle || '');
      setBriefDescriptionInput(record.briefDescription || record.briefContent || '');
      setBriefAttachmentInput(record.briefAttachment || '');
      setBriefReviewFeedbackInput(record.briefReviewFeedback || '');

      setCreativeLinkInput(record.creativeLink || record.productionAssetsUrl || '');
      setFramerLinkInput(record.framerLink || '');
      setCreativeAttachmentInput(record.creativeAttachment || '');
      setCreativeSubmissionNotesInput(record.creativeSubmissionNotes || '');

      setInternalReviewFeedbackInput(record.internalReviewFeedback || record.reviewNotes || '');
      setFinalApprovalFeedbackInput(record.finalApprovalFeedback || '');
    }
  }, [isOpen, record?._id, record?.status]);

  const cycleCreatives = useMemo(() => {
    if (!record) return [];
    if (record.creatives && record.creatives.length > 0) {
      return record.creatives.map((c, idx) => ({
        id: c.fileId || `creative-${idx}`,
        name: c.name || `Creative #${idx + 1}`,
        url: c.url,
        mimeType: c.mimeType
      }));
    }
    return [
      {
        id: 'primary-creative',
        name: record?.adName || record?.creativeName || 'Primary Creative',
        url: record?.creativeAttachment || '',
        mimeType: 'image/png'
      }
    ];
  }, [record]);

  const loadTimeline = async () => {
    try {
      if (!record?._id) return;
      setLoadingTimeline(true);
      const data = await getTimeline(record._id);
      setTimeline(data || []);
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  if (!isOpen || !record) return null;

  // Observation duration & lock calculations
  const durationHours = record.observationDurationHours != null ? Number(record.observationDurationHours) : 72;
  const launchedTime = record.launchedAt ? new Date(record.launchedAt).getTime() : null;
  const unlockReportTime = record.reportDueAt
    ? new Date(record.reportDueAt).getTime()
    : launchedTime
    ? launchedTime + durationHours * 3600 * 1000
    : null;
  const isReportLocked = unlockReportTime ? now < unlockReportTime : true;
  const remainingReportMs = unlockReportTime ? Math.max(0, unlockReportTime - now) : 0;

  // Calculate current stage index (1-12)
  let currentStageStep = 1;
  if (record.status === 'PENDING_LAUNCH') currentStageStep = 1;
  else if (record.status === 'LAUNCHED' || record.status === 'PENDING_REPORT') currentStageStep = 2;
  else if (record.status === 'REPORT_SUBMITTED') {
    if (!record.performanceAnalysis) currentStageStep = 3;
    else if (!record.creativeLearning) currentStageStep = 4;
    else currentStageStep = 5;
  } else if (record.status === 'LEARNINGS_SUBMITTED') currentStageStep = 6;
  else if (record.status === 'BRIEF_SUBMITTED') currentStageStep = 7;
  else if (record.status === 'PRODUCTION') currentStageStep = 8;
  else if (record.status === 'INTERNAL_REVIEW') currentStageStep = 9;
  else if (record.status === 'CLIENT_REVIEW') currentStageStep = 10;
  else if (record.status === 'CLIENT_APPROVED' || record.status === 'READY_TO_LAUNCH' || record.status === 'HANDOFF') currentStageStep = 11;
  else if (record.status === 'COMPLETED') currentStageStep = 12;
  else if (record.status === 'REVISION_REQUESTED') {
    if (record.briefStatus === 'REVISE' || record.briefStatus === 'REJECTED') {
      currentStageStep = 6;
    } else {
      currentStageStep = 8;
    }
  }

  // Role permissions
  const assignedMBId = record.assignedMediaBuyer?._id || record.assignedMediaBuyer;
  const assignedCSId = record.assignedCreativeStrategist?._id || record.assignedCreativeStrategist;
  const assignedGDId = record.assignedGraphicDesigner?._id || record.assignedGraphicDesigner;

  const isAssignedMB = isMediaBuyer && assignedMBId && assignedMBId.toString() === user?._id?.toString();
  const isAssignedCS = isCreativeStrategist && assignedCSId && assignedCSId.toString() === user?._id?.toString();
  const isAssignedGD = isGraphicDesigner && assignedGDId && assignedGDId.toString() === user?._id?.toString();

  // Workflow Handlers
  const handleLaunchInitial = async () => {
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await launchCreative(record._id, { launchProof: launchProofInput });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Launch failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleWorkedCreative = (creativeId) => {
    if (selectedWorkedCreatives.includes(creativeId)) {
      setSelectedWorkedCreatives(selectedWorkedCreatives.filter((id) => id !== creativeId));
    } else {
      setSelectedWorkedCreatives([...selectedWorkedCreatives, creativeId]);
      if (!creativeMetricsMap[creativeId]) {
        setCreativeMetricsMap((prev) => ({
          ...prev,
          [creativeId]: {
            spend: '',
            costPerResult: '',
            purchases: '',
            purchaseConversionValue: '',
            roas: '',
            performanceStatus: 'WINNER'
          }
        }));
      }
    }
  };

  const handleUpdateCreativeMetric = (creativeId, field, value) => {
    setCreativeMetricsMap((prev) => ({
      ...prev,
      [creativeId]: {
        ...(prev[creativeId] || { performanceStatus: 'WINNER' }),
        [field]: value
      }
    }));
  };

  const handleSubmitPerformanceReport = async () => {
    try {
      setIsProcessing(true);
      setActionError('');

      if (selectedWorkedCreatives.length === 0) {
        setActionError('Please select at least one creative that worked for this testing cycle.');
        setIsProcessing(false);
        return;
      }

      const perfArray = [];
      for (const cId of selectedWorkedCreatives) {
        const metrics = creativeMetricsMap[cId] || {};
        const cObj = cycleCreatives.find((c) => c.id === cId);
        const spendNum = Number(metrics.spend);
        const cprNum = Number(metrics.costPerResult);
        const purchasesNum = Number(metrics.purchases);
        const pValNum = Number(metrics.purchaseConversionValue);
        const roasNum = Number(metrics.roas);

        if (isNaN(spendNum) || spendNum < 0) {
          setActionError(`Spend for "${cObj?.name || 'creative'}" must be a non-negative number.`);
          setIsProcessing(false);
          return;
        }
        if (isNaN(purchasesNum) || purchasesNum < 0) {
          setActionError(`Purchases for "${cObj?.name || 'creative'}" must be a non-negative number.`);
          setIsProcessing(false);
          return;
        }
        if (isNaN(pValNum) || pValNum < 0) {
          setActionError(`Purchase Conversion Value for "${cObj?.name || 'creative'}" must be a non-negative number.`);
          setIsProcessing(false);
          return;
        }
        if (isNaN(roasNum) || roasNum < 0) {
          setActionError(`ROAS for "${cObj?.name || 'creative'}" must be a non-negative number.`);
          setIsProcessing(false);
          return;
        }

        perfArray.push({
          creativeId: cId,
          creativeName: cObj?.name || 'Creative',
          previewUrl: cObj?.url || '',
          spend: spendNum,
          costPerResult: isNaN(cprNum) ? 0 : cprNum,
          purchases: purchasesNum,
          purchaseConversionValue: pValNum,
          roas: roasNum,
          performanceStatus: metrics.performanceStatus === 'LOSER' ? 'LOSER' : 'WINNER'
        });
      }

      const totalSpend = perfArray.reduce((acc, c) => acc + c.spend, 0);
      const totalPurchases = perfArray.reduce((acc, c) => acc + c.purchases, 0);
      const totalVal = perfArray.reduce((acc, c) => acc + c.purchaseConversionValue, 0);
      const calcRoas = totalSpend > 0 ? Number((totalVal / totalSpend).toFixed(2)) : perfArray[0]?.roas || 0;

      const updated = await submitReport(record._id, {
        ctr: ctrInput ? Number(ctrInput) : null,
        cpc: cpcInput ? Number(cpcInput) : null,
        cpm: cpmInput ? Number(cpmInput) : null,
        roas: roasInput ? Number(roasInput) : calcRoas,
        spend: totalSpend,
        purchases: totalPurchases,
        purchaseConversionValue: totalVal,
        selectedCreatives: selectedWorkedCreatives,
        creativePerformances: perfArray,
        performanceNotes: performanceNotesInput,
        additionalObservations: additionalObservationsInput
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to submit report');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSavePerformanceAnalysis = async () => {
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await submitPerformanceAnalysis(record._id, {
        performanceAnalysis: performanceAnalysisInput,
        recommendation: recommendationInput,
        analysisNotes: analysisNotesInput
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to save performance analysis');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCreativeAnalysisAndLearnings = async () => {
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await submitLearnings(record._id, {
        performanceAnalysis: performanceAnalysisInput,
        recommendation: recommendationInput,
        analysisNotes: analysisNotesInput,
        angle: angleInput,
        concept: conceptInput,
        communication: communicationInput,
        psychology: psychologyInput,
        hook: hookInput,
        creativeStructure: creativeStructureInput,
        creativeAnalysisNotes: creativeAnalysisNotesInput,
        creativeLearning: creativeLearningInput,
        creativeLearningNotes: creativeLearningNotesInput,
        creativeLearningAttachment: creativeLearningAttachmentInput,
        assignedGraphicDesigner: assignedDesignerInput || null
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to save creative analysis and direction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitBrief = async () => {
    if (!briefTitleInput.trim() || !briefDescriptionInput.trim()) {
      setActionError('Brief Title and Description are required.');
      return;
    }
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await createBrief(record._id, {
        briefTitle: briefTitleInput,
        briefDescription: briefDescriptionInput,
        briefAttachment: briefAttachmentInput
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to submit brief');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewBriefDecision = async (status) => {
    if ((status === 'REVISE' || status === 'REJECTED') && !briefReviewFeedbackInput.trim()) {
      setActionError(`Feedback notes are required when choosing "${status}".`);
      return;
    }
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await reviewBrief(record._id, {
        status,
        feedback: briefReviewFeedbackInput
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to submit brief review');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitCreativeAssets = async () => {
    if (!creativeLinkInput.trim() && !framerLinkInput.trim()) {
      setActionError('Please provide at least a Creative link or Framer link.');
      return;
    }
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await submitProduction(record._id, {
        creativeLink: creativeLinkInput,
        framerLink: framerLinkInput,
        creativeAttachment: creativeAttachmentInput,
        creativeSubmissionNotes: creativeSubmissionNotesInput
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to submit creative assets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewCreativeDecision = async (status) => {
    if ((status === 'REVISE' || status === 'REJECTED') && !internalReviewFeedbackInput.trim()) {
      setActionError(`Feedback notes are required when choosing "${status}".`);
      return;
    }
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await reviewInternalCreative(record._id, {
        status,
        feedback: internalReviewFeedbackInput
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to submit internal review');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalApprovalDecision = async (status) => {
    try {
      setIsProcessing(true);
      setActionError('');
      const updated = await finalApproval(record._id, {
        status,
        feedback: finalApprovalFeedbackInput
      });
      onUpdateRecord(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to submit final approval');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordNextCycleLaunch = async () => {
    try {
      setIsProcessing(true);
      setActionError('');
      const result = await completeAndCreateNextCycle(record._id, { autoLaunch: true });
      if (result?.nextRecord) {
        onUpdateRecord(result.nextRecord);
        if (onSelectRecord) onSelectRecord(result.nextRecord);
      } else {
        onUpdateRecord(result.completedRecord || result);
      }
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to launch next cycle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      setIsProcessing(true);
      setActionError('');
      if (record.status === 'PAUSED') {
        const updated = await resumeCreative(record._id);
        onUpdateRecord(updated);
      } else {
        const updated = await pauseCreative(record._id);
        onUpdateRecord(updated);
      }
      await loadTimeline();
    } catch (err) {
      setActionError(err.message || 'Failed to toggle pause status');
    } finally {
      setIsProcessing(false);
    }
  };

  // Find related cycles for the cycle switcher
  const relatedCycleRecords = allCycles.filter((c) => {
    const sameAdSet = (c.adSet?._id || c.adSet) === (record.adSet?._id || record.adSet);
    const sameClient = (c.client?._id || c.client) === (record.client?._id || record.client);
    return sameAdSet && sameClient;
  });

  return (
    <div className="record-drawer-overlay" onClick={onClose}>
      <div className="record-drawer-container" onClick={(e) => e.stopPropagation()}>
        {/* 1. TOP HEADER */}
        <header className="drawer-top-header">
          <div className="header-left">
            <div className="hierarchy-breadcrumb">
              <span className="crumb-client">{record.client?.name || record.client?.code}</span>
              <span className="crumb-sep">/</span>
              <span>{record.campaignName || 'Campaign'}</span>
              <span className="crumb-sep">/</span>
              <span>{record.currentAdSetName || 'Ad Set'}</span>
            </div>
            <div className="record-title-row">
              <h2 className="record-title">
                {record.creativeName || record.creativesProposed || 'Creative'}
              </h2>
              <span className="cycle-badge">
                {record.currentTestingCycle || `Cycle ${record.cycleNumber || 1}`}
              </span>
            </div>
            <div className="record-sub-meta">
              <StatusBadge status={record.status} record={record} />
              {record.finalApprovalStatus === 'APPROVED' && (
                <span className="status-badge status-success">FINAL APPROVED</span>
              )}
              {record.launchedAt && (
                <span className="meta-pill">
                  Launched {formatDate(record.launchedAt)}
                </span>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className="btn-edit-header"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit Assignment & Schedule
                </button>
              )}
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close workspace">
            &times;
          </button>
        </header>

        {/* CYCLE SWITCHER (If multiple cycles exist) */}
        {relatedCycleRecords.length > 1 && (
          <div className="drawer-cycle-history-bar">
            <span className="cycle-history-label">Cycle History:</span>
            <div className="cycle-history-chips">
              {relatedCycleRecords.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className={`cycle-chip ${c._id === record._id ? 'active' : ''}`}
                  onClick={() => onSelectRecord && onSelectRecord(c)}
                >
                  {c.currentTestingCycle || `Cycle ${c.cycleNumber}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. WORKFLOW STEPPER */}
        <div className="workspace-stepper-wrap">
          <div className="stepper-track">
            {STAGES.map((step, idx) => {
              const isPast = step.id < currentStageStep;
              const isCurrent = step.id === currentStageStep;
              return (
                <div
                  key={step.id}
                  className={`step-node ${isCurrent ? 'active' : ''} ${isPast ? 'completed' : ''}`}
                >
                  <div className="step-circle">{isPast ? '✓' : isCurrent ? '●' : step.id}</div>
                  <span className="step-text">{step.label}</span>
                  {idx < STAGES.length - 1 && <span className="step-line" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. ASSIGNMENT SECTION */}
        <div className="drawer-assignment-section">
          <div className="assignment-header-row">
            <span className="section-title-label">ASSIGNMENT</span>
            {isAdmin && (
              <button
                type="button"
                className="btn-edit-assignment"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Assignment
              </button>
            )}
          </div>
          <div className="assignment-grid">
            <div className="assignment-row">
              <span className="role-label">Media Buyer</span>
              <span className={`user-pill ${!record.assignedMediaBuyer?.name ? 'unassigned' : ''}`}>
                {record.assignedMediaBuyer?.name || 'Unassigned'}
              </span>
            </div>
            <div className="assignment-row">
              <span className="role-label">Creative Strategist</span>
              <span className={`user-pill ${!record.assignedCreativeStrategist?.name ? 'unassigned' : ''}`}>
                {record.assignedCreativeStrategist?.name || 'Unassigned'}
              </span>
            </div>
            <div className="assignment-row">
              <span className="role-label">Graphic Designer</span>
              <span className={`user-pill ${!record.assignedGraphicDesigner?.name ? 'unassigned' : ''}`}>
                {record.assignedGraphicDesigner?.name || 'Unassigned'}
              </span>
            </div>
            <div className="assignment-row">
              <span className="role-label">Final Approver</span>
              <span className="user-pill approver">
                Abhishek Sir / Admin
              </span>
            </div>
          </div>
        </div>

        {/* 4. 72-HOUR OBSERVATION BAR */}
        {record.status === 'LAUNCHED' && (
          <div className="drawer-observation-bar">
            <div className="observation-title-row">
              <span className="status-dot">●</span>
              <span className="title-text">
                {durationHours === 72 ? '72-HOUR OBSERVATION ACTIVE' : `${durationHours}-HOUR OBSERVATION ACTIVE`}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-edit-schedule"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit Schedule
                </button>
              )}
            </div>
            <div className="observation-columns">
              <div className="obs-col">
                <span className="col-label">STATUS</span>
                <span className="col-val">{durationHours}H Observation</span>
              </div>
              <div className="obs-col">
                <span className="col-label">REPORT DUE</span>
                <span className="col-val">{formatDateTime(unlockReportTime)}</span>
              </div>
              <div className="obs-col">
                <span className="col-label">TIME REMAINING</span>
                <span className="col-val highlight">
                  {isReportLocked ? formatDurationMs(remainingReportMs) : 'Unlocked'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. WORKSPACE NAVIGATION TABS */}
        <nav className="drawer-nav-tabs">
          <button
            className={`drawer-tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            Operational
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Creative Overview
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Audit Timeline ({timeline.length})
          </button>
        </nav>

        {/* WORKSPACE BODY */}
        <div className="drawer-body">
          {actionError && (
            <div className="warning-alert-box" style={{ marginBottom: '16px' }}>
              <strong>Error:</strong> {actionError}
            </div>
          )}

          {/* TAB 1: OPERATIONAL WORKSPACE */}
          {activeTab === 'workflow' && (
            <div>
              {/* ADMIN ROLE NOTICE */}
              {isAdmin && (
                <div className="admin-info-strip">
                  <span className="admin-info-text">
                    Admin controls assignments, schedules and cycle management. Operational actions belong to assigned team members.
                  </span>
                  <button
                    type="button"
                    className="btn-pause-creative"
                    onClick={handleTogglePause}
                  >
                    {record.status === 'PAUSED' ? 'Resume Creative' : 'Pause Creative'}
                  </button>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 1: MEDIA BUYER INITIAL LAUNCH */}
              {/* ---------------------------------------------------- */}
              {record.status === 'PENDING_LAUNCH' && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 1: Launch Creative</h3>
                    <span className="card-role-tag">Media Buyer</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#5A5B52', margin: '0 0 14px' }}>
                    Launching this creative starts the workflow clock and initiates the mandatory 72-hour observation window.
                  </p>
                  <div className="field-group">
                    <label>Launch Proof / URL (optional)</label>
                    <input
                      type="text"
                      value={launchProofInput}
                      onChange={(e) => setLaunchProofInput(e.target.value)}
                      placeholder="e.g. https://adsmanager.facebook.com/..."
                      disabled={!isAssignedMB}
                    />
                  </div>
                  {isAssignedMB ? (
                    <Button variant="primary" onClick={handleLaunchInitial} disabled={isProcessing}>
                      {isProcessing ? 'Launching...' : '🚀 Launch Creative & Start 72h Clock'}
                    </Button>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                      Waiting for assigned Media Buyer ({record.assignedMediaBuyer?.name || 'Unassigned'}) to record launch.
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 2: 72-HOUR MEDIA BUYER REPORT */}
              {/* ---------------------------------------------------- */}
              {record.status === 'LAUNCHED' && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <div>
                      <div className="stage-meta-label">STAGE 2</div>
                      <h3 className="card-title">72-HOUR PERFORMANCE REPORT</h3>
                    </div>
                    <span className="card-role-tag">Media Buyer</span>
                  </div>

                  {isReportLocked ? (
                    <div className="report-locked-clean-block">
                      <div className="locked-status-pill">Report locked</div>
                      <p className="locked-desc-text">
                        The performance report unlocks automatically after the configured observation period ({durationHours} hours).
                      </p>
                      <div className="locked-countdown-row">
                        <span className="locked-label">Time remaining:</span>
                        <span className="locked-time-val">{formatDurationMs(remainingReportMs)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="success-alert-box" style={{ marginBottom: '16px' }}>
                        🔓 <strong>Observation Period Completed!</strong> Performance report is ready for submission.
                      </div>

                      {/* 1. SELECT CREATIVE THAT WORKED */}
                      <div style={{ marginBottom: '18px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A1A1A', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Select Creative(s) That Worked *
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#5A5B52', margin: '0 0 10px 0' }}>
                          Choose one or more creatives from this testing cycle that showed traction, and enter individual performance metrics.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                          {cycleCreatives.map((c) => {
                            const isSelected = selectedWorkedCreatives.includes(c.id);
                            return (
                              <div
                                key={c.id}
                                onClick={() => isAssignedMB && handleToggleWorkedCreative(c.id)}
                                style={{
                                  border: isSelected ? '2px solid #000000' : '1px solid #CBD5E1',
                                  background: isSelected ? '#FFFDE6' : '#FFFFFF',
                                  borderRadius: '8px',
                                  padding: '10px',
                                  cursor: isAssignedMB ? 'pointer' : 'default',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by parent onClick
                                  disabled={!isAssignedMB}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />

                                <div style={{ width: '42px', height: '42px', borderRadius: '4px', overflow: 'hidden', background: '#F1F5F9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {c.url ? (
                                    <img src={c.url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <span>🎨</span>
                                  )}
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.name}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: isSelected ? '#854D0E' : '#64748B' }}>
                                    {isSelected ? '✓ Selected' : 'Click to select'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. PERFORMANCE METRICS FOR EACH SELECTED CREATIVE */}
                      {selectedWorkedCreatives.length > 0 && (
                        <div style={{ marginBottom: '18px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A1A1A', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Individual Creative Performance Metrics
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {selectedWorkedCreatives.map((cId) => {
                              const cObj = cycleCreatives.find((c) => c.id === cId);
                              const metrics = creativeMetricsMap[cId] || {};
                              return (
                                <div
                                  key={cId}
                                  style={{
                                    border: '1px solid #E5E5DC',
                                    borderRadius: '8px',
                                    padding: '12px 14px',
                                    background: '#FAFAF7'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <strong style={{ fontSize: '0.85rem', color: '#1A1A1A' }}>
                                      {cObj?.name || 'Creative'}
                                    </strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5A5B52' }}>Status:</label>
                                      <select
                                        value={metrics.performanceStatus || 'WINNER'}
                                        onChange={(e) => handleUpdateCreativeMetric(cId, 'performanceStatus', e.target.value)}
                                        disabled={!isAssignedMB}
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          border: '1px solid #CBD5E1',
                                          fontWeight: 700,
                                          fontSize: '0.78rem',
                                          background: metrics.performanceStatus === 'LOSER' ? '#FEE2E2' : '#DCFCE7',
                                          color: metrics.performanceStatus === 'LOSER' ? '#991B1B' : '#15803D'
                                        }}
                                      >
                                        <option value="WINNER">Winner</option>
                                        <option value="LOSER">Loser</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#5A5B52', marginBottom: '2px' }}>Amount Spend (₹/$) *</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g. 5000"
                                        value={metrics.spend || ''}
                                        onChange={(e) => handleUpdateCreativeMetric(cId, 'spend', e.target.value)}
                                        disabled={!isAssignedMB}
                                        style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.8rem', background: '#FFFFFF' }}
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#5A5B52', marginBottom: '2px' }}>Cost Per Result (CPR)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g. 250"
                                        value={metrics.costPerResult || ''}
                                        onChange={(e) => handleUpdateCreativeMetric(cId, 'costPerResult', e.target.value)}
                                        disabled={!isAssignedMB}
                                        style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.8rem', background: '#FFFFFF' }}
                                      />
                                    </div>

                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#5A5B52', marginBottom: '2px' }}>Purchases *</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="e.g. 20"
                                        value={metrics.purchases || ''}
                                        onChange={(e) => handleUpdateCreativeMetric(cId, 'purchases', e.target.value)}
                                        disabled={!isAssignedMB}
                                        style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.8rem', background: '#FFFFFF' }}
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#5A5B52', marginBottom: '2px' }}>Purchase Value (₹/$) *</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g. 50000"
                                        value={metrics.purchaseConversionValue || ''}
                                        onChange={(e) => handleUpdateCreativeMetric(cId, 'purchaseConversionValue', e.target.value)}
                                        disabled={!isAssignedMB}
                                        style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.8rem', background: '#FFFFFF' }}
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#5A5B52', marginBottom: '2px' }}>ROAS (x) *</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g. 10.0"
                                        value={metrics.roas || ''}
                                        onChange={(e) => handleUpdateCreativeMetric(cId, 'roas', e.target.value)}
                                        disabled={!isAssignedMB}
                                        style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.8rem', background: '#FFFFFF' }}
                                        required
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. OPTIONAL OVERALL BENCHMARKS & NOTES */}
                      <div className="fields-grid-2">
                        <div className="field-group">
                          <label>CTR (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={ctrInput}
                            onChange={(e) => setCtrInput(e.target.value)}
                            placeholder="e.g. 2.45"
                            disabled={!isAssignedMB}
                          />
                        </div>
                        <div className="field-group">
                          <label>CPC ($/₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={cpcInput}
                            onChange={(e) => setCpcInput(e.target.value)}
                            placeholder="e.g. 0.42"
                            disabled={!isAssignedMB}
                          />
                        </div>
                        <div className="field-group">
                          <label>CPM ($/₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={cpmInput}
                            onChange={(e) => setCpmInput(e.target.value)}
                            placeholder="e.g. 14.50"
                            disabled={!isAssignedMB}
                          />
                        </div>
                        <div className="field-group">
                          <label>Overall Campaign ROAS (x)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={roasInput}
                            onChange={(e) => setRoasInput(e.target.value)}
                            placeholder="Auto-calculated if blank"
                            disabled={!isAssignedMB}
                          />
                        </div>
                      </div>

                      <div className="field-group">
                        <label>Performance Notes</label>
                        <textarea
                          rows={3}
                          value={performanceNotesInput}
                          onChange={(e) => setPerformanceNotesInput(e.target.value)}
                          placeholder="Summary of observation results, hook retention, CPA trends..."
                          disabled={!isAssignedMB}
                        />
                      </div>

                      <div className="field-group">
                        <label>Additional Observations</label>
                        <textarea
                          rows={2}
                          value={additionalObservationsInput}
                          onChange={(e) => setAdditionalObservationsInput(e.target.value)}
                          placeholder="Audience feedback, drop-off points, placement insights..."
                          disabled={!isAssignedMB}
                        />
                      </div>

                      {isAssignedMB ? (
                        <Button variant="primary" onClick={handleSubmitPerformanceReport} disabled={isProcessing}>
                          {isProcessing ? 'Submitting Report...' : 'Submit Performance Report'}
                        </Button>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                          Only the assigned Media Buyer ({record.assignedMediaBuyer?.name || 'Unassigned'}) can submit the performance report.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGES 3, 4, 5: CREATIVE STRATEGIST ANALYSIS & LEARNINGS */}
              {/* ---------------------------------------------------- */}
              {(record.status === 'REPORT_SUBMITTED' || record.reportSubmittedAt) && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 3 & 4: Creative Strategy Analysis</h3>
                    <span className="card-role-tag">Creative Strategist</span>
                  </div>

                  {/* Read-Only Media Buyer Metrics for CS */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8C8D82', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Media Buyer Performance Report Summary
                    </div>

                    {/* Individual Creative Performance Cards */}
                    {record.creativePerformances && record.creativePerformances.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                        {record.creativePerformances.map((cp, idx) => (
                          <div
                            key={cp.creativeId || idx}
                            style={{
                              border: '1px solid #E5E5DC',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.82rem', color: '#1A1A1A' }}>
                                {cp.creativeName || `Creative #${idx + 1}`}
                              </strong>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: cp.performanceStatus === 'LOSER' ? '#FEE2E2' : '#DCFCE7',
                                  color: cp.performanceStatus === 'LOSER' ? '#991B1B' : '#15803D'
                                }}
                              >
                                {cp.performanceStatus === 'LOSER' ? 'Loser' : 'Winner'}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '0.75rem' }}>
                              <div><span style={{ color: '#6B7280' }}>Spend:</span> <strong>₹{cp.spend ?? 0}</strong></div>
                              <div><span style={{ color: '#6B7280' }}>CPR:</span> <strong>₹{cp.costPerResult ?? 0}</strong></div>
                              <div><span style={{ color: '#6B7280' }}>Purchases:</span> <strong>{cp.purchases ?? 0}</strong></div>
                              <div><span style={{ color: '#6B7280' }}>ROAS:</span> <strong>{cp.roas ?? 0}x</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="kpi-metrics-grid">
                      <div className="kpi-card">
                        <div className="kpi-title">TOTAL SPEND</div>
                        <div className="kpi-value">{record.spend != null ? `₹${record.spend}` : '—'}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-title">TOTAL PURCHASES</div>
                        <div className="kpi-value">{record.purchases != null ? record.purchases : '—'}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-title">ROAS</div>
                        <div className="kpi-value">{record.roas != null ? `${record.roas}x` : '—'}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-title">OVERALL STATUS</div>
                        <div className="kpi-value" style={{ fontSize: '0.9rem', color: record.performanceStatus === 'LOSER' ? '#DC2626' : '#16A34A' }}>
                          {record.performanceStatus || '—'}
                        </div>
                      </div>
                    </div>
                    {record.performanceNotes && (
                      <div style={{ background: '#FAFAF7', border: '1px solid #E5E5DC', borderRadius: '6px', padding: '8px 12px', fontSize: '0.82rem', color: '#1A1A1A', marginTop: '10px' }}>
                        <strong>MB Notes:</strong> {record.performanceNotes}
                      </div>
                    )}
                  </div>

                  {/* Performance Analysis Section */}
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#000000', margin: '16px 0 10px', textTransform: 'uppercase' }}>
                    Performance Analysis & Decision
                  </h4>
                  <div className="fields-grid-2">
                    <div className="field-group">
                      <label>Recommendation / Decision *</label>
                      <select
                        value={recommendationInput}
                        onChange={(e) => setRecommendationInput(e.target.value)}
                        disabled={!isAssignedCS}
                      >
                        <option value="">Select Direction...</option>
                        <option value="Scale">Scale</option>
                        <option value="Pause">Pause</option>
                        <option value="Continue Testing">Continue Testing</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Analysis Notes</label>
                      <input
                        type="text"
                        value={analysisNotesInput}
                        onChange={(e) => setAnalysisNotesInput(e.target.value)}
                        placeholder="Key metrics takeaway..."
                        disabled={!isAssignedCS}
                      />
                    </div>
                  </div>
                  <div className="field-group">
                    <label>Performance Analysis *</label>
                    <textarea
                      rows={3}
                      value={performanceAnalysisInput}
                      onChange={(e) => setPerformanceAnalysisInput(e.target.value)}
                      placeholder="Detailed evaluation of metrics against benchmarks..."
                      disabled={!isAssignedCS}
                    />
                  </div>
                  {isAssignedCS && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSavePerformanceAnalysis}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Saving...' : '💾 Save Performance Analysis'}
                      </Button>
                    </div>
                  )}

                  {/* Creative Analysis (Separate Fields!) */}
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#000000', margin: '20px 0 10px', textTransform: 'uppercase' }}>
                    Creative Breakdown Analysis
                  </h4>
                  <div className="fields-grid-2">
                    <div className="field-group">
                      <label>Angle</label>
                      <input
                        type="text"
                        value={angleInput}
                        onChange={(e) => setAngleInput(e.target.value)}
                        placeholder="e.g. Problem-Agitate-Solve"
                        disabled={!isAssignedCS}
                      />
                    </div>
                    <div className="field-group">
                      <label>Concept</label>
                      <input
                        type="text"
                        value={conceptInput}
                        onChange={(e) => setConceptInput(e.target.value)}
                        placeholder="e.g. UGC Unboxing / Founder Story"
                        disabled={!isAssignedCS}
                      />
                    </div>
                    <div className="field-group">
                      <label>Communication</label>
                      <input
                        type="text"
                        value={communicationInput}
                        onChange={(e) => setCommunicationInput(e.target.value)}
                        placeholder="e.g. Conversational, direct, authentic"
                        disabled={!isAssignedCS}
                      />
                    </div>
                    <div className="field-group">
                      <label>Psychology</label>
                      <input
                        type="text"
                        value={psychologyInput}
                        onChange={(e) => setPsychologyInput(e.target.value)}
                        placeholder="e.g. FOMO, social proof, fear of aging"
                        disabled={!isAssignedCS}
                      />
                    </div>
                    <div className="field-group">
                      <label>Hook</label>
                      <input
                        type="text"
                        value={hookInput}
                        onChange={(e) => setHookInput(e.target.value)}
                        placeholder="e.g. 3-second visual shock hook"
                        disabled={!isAssignedCS}
                      />
                    </div>
                    <div className="field-group">
                      <label>Creative Structure</label>
                      <input
                        type="text"
                        value={creativeStructureInput}
                        onChange={(e) => setCreativeStructureInput(e.target.value)}
                        placeholder="e.g. Hook (0-3s) -> Demo (3-12s) -> CTA (12-15s)"
                        disabled={!isAssignedCS}
                      />
                    </div>
                  </div>
                  <div className="field-group">
                    <label>Creative Analysis Notes</label>
                    <textarea
                      rows={2}
                      value={creativeAnalysisNotesInput}
                      onChange={(e) => setCreativeAnalysisNotesInput(e.target.value)}
                      placeholder="Additional visual or narrative observations..."
                      disabled={!isAssignedCS}
                    />
                  </div>

                  {/* Creative Learning & Direction */}
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#000000', margin: '20px 0 10px', textTransform: 'uppercase' }}>
                    Stage 5: Creative Learning & Direction (For Designer)
                  </h4>
                  <div className="field-group">
                    <label>Creative Learning / Direction *</label>
                    <textarea
                      rows={4}
                      value={creativeLearningInput}
                      onChange={(e) => setCreativeLearningInput(e.target.value)}
                      placeholder="The actual learning and guidance for Graphic Designer..."
                      disabled={!isAssignedCS}
                    />
                  </div>
                  <div className="fields-grid-2">
                    <div className="field-group">
                      <label>Reference / Attachment URL</label>
                      <input
                        type="text"
                        value={creativeLearningAttachmentInput}
                        onChange={(e) => setCreativeLearningAttachmentInput(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        disabled={!isAssignedCS}
                      />
                    </div>
                    <div className="field-group">
                      <label>Assign to Graphic Designer (Strictly teamRole: graphic_designer) *</label>
                      <select
                        value={assignedDesignerInput}
                        onChange={(e) => setAssignedDesignerInput(e.target.value)}
                        disabled={!isAssignedCS}
                      >
                        <option value="">Select Graphic Designer...</option>
                        {graphicDesigners.map((gd) => (
                          <option key={gd._id} value={gd._id}>
                            {gd.name} ({gd.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isAssignedCS ? (
                    <Button variant="primary" onClick={handleSaveCreativeAnalysisAndLearnings} disabled={isProcessing}>
                      {isProcessing ? 'Saving Direction...' : 'Save Direction & Assign to Graphic Designer'}
                    </Button>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                      Only the assigned Creative Strategist ({record.assignedCreativeStrategist?.name || 'Unassigned'}) can edit analysis and direction.
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 6: GRAPHIC DESIGNER BRIEF */}
              {/* ---------------------------------------------------- */}
              {(record.status === 'LEARNINGS_SUBMITTED' || record.briefSubmittedAt) && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 6: Graphic Designer Brief</h3>
                    <span className="card-role-tag">Graphic Designer</span>
                  </div>

                  {record.creativeLearning && (
                    <div style={{ background: '#FFFDF0', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Creative Direction from Strategist
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#1A1A1A', lineHeight: '1.4' }}>
                        {record.creativeLearning}
                      </div>
                      {record.creativeLearningAttachment && (
                        <div style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                          Reference: <a href={record.creativeLearningAttachment} target="_blank" rel="noreferrer">{record.creativeLearningAttachment}</a>
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    const isBriefRevisionRequested = record.status === 'REVISION_REQUESTED' && (record.briefStatus === 'REVISE' || record.briefStatus === 'REJECTED');
                    const isBriefEditable = record.status === 'LEARNINGS_SUBMITTED' || isBriefRevisionRequested || !record.briefSubmittedAt;

                    if (isBriefEditable) {
                      return (
                        <div>
                          {isBriefRevisionRequested && (
                            <div className="warning-alert-box" style={{ marginBottom: '14px' }}>
                              <strong>Brief Revision Requested by Strategist:</strong>
                              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                                {record.briefReviewFeedback || record.revisionNotes || 'Please revise the brief based on the feedback above.'}
                              </p>
                            </div>
                          )}

                          <div className="field-group">
                            <label>Brief Title *</label>
                            <input
                              type="text"
                              value={briefTitleInput}
                              onChange={(e) => setBriefTitleInput(e.target.value)}
                              placeholder="e.g. Iteration 2: Focus on Problem Hook with UGC split screen"
                              disabled={!isAssignedGD}
                            />
                          </div>
                          <div className="field-group">
                            <label>Brief Description *</label>
                            <textarea
                              rows={4}
                              value={briefDescriptionInput}
                              onChange={(e) => setBriefDescriptionInput(e.target.value)}
                              placeholder="Asset specifications, dimensions, framing, typography..."
                              disabled={!isAssignedGD}
                            />
                          </div>
                          <div className="field-group">
                            <label>Attachment / Reference Link (optional)</label>
                            <input
                              type="text"
                              value={briefAttachmentInput}
                              onChange={(e) => setBriefAttachmentInput(e.target.value)}
                              placeholder="https://..."
                              disabled={!isAssignedGD}
                            />
                          </div>

                          {isAssignedGD ? (
                            <Button variant="primary" onClick={handleSubmitBrief} disabled={isProcessing}>
                              {isProcessing
                                ? 'Submitting Brief...'
                                : isBriefRevisionRequested
                                ? '↺ Re-Submit Revised Brief'
                                : 'Submit Brief for Review'}
                            </Button>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                              Waiting for assigned Graphic Designer ({record.assignedGraphicDesigner?.name || 'Unassigned'}) to create the brief.
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div style={{ background: '#FAFAF7', border: '1px solid #E5E5DC', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{record.briefTitle || 'Submitted Brief'}</strong>
                          <span className="status-badge status-purple">Submitted {formatDate(record.briefSubmittedAt)}</span>
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#393A31', whiteSpace: 'pre-line' }}>
                          {record.briefDescription || record.briefContent}
                        </p>
                        {record.briefAttachment && (
                          <div style={{ fontSize: '0.8rem' }}>
                            Attachment: <a href={record.briefAttachment} target="_blank" rel="noreferrer">{record.briefAttachment}</a>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 7: BRIEF REVIEW BY CREATIVE STRATEGIST */}
              {/* ---------------------------------------------------- */}
              {(record.status === 'BRIEF_SUBMITTED' || record.briefStatus !== 'PENDING') && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 7: Brief Review</h3>
                    <span className="card-role-tag">Creative Strategist</span>
                  </div>

                  {record.status === 'BRIEF_SUBMITTED' ? (
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#5A5B52', margin: '0 0 12px' }}>
                        Review the brief submitted by Graphic Designer. If approved, production will commence immediately.
                      </p>
                      <div className="field-group">
                        <label>Review Feedback (Required if requesting revision or rejecting)</label>
                        <textarea
                          rows={3}
                          value={briefReviewFeedbackInput}
                          onChange={(e) => setBriefReviewFeedbackInput(e.target.value)}
                          placeholder="Provide specific constructive feedback or notes..."
                          disabled={!isAssignedCS}
                        />
                      </div>

                      {isAssignedCS ? (
                        <div className="decision-btn-group">
                          <Button variant="primary" onClick={() => handleReviewBriefDecision('APPROVED')} disabled={isProcessing}>
                            ✓ Approve Brief & Start Production
                          </Button>
                          <Button variant="ghost" onClick={() => handleReviewBriefDecision('REVISE')} disabled={isProcessing}>
                            ↺ Request Revision
                          </Button>
                          <Button variant="danger" onClick={() => handleReviewBriefDecision('REJECTED')} disabled={isProcessing}>
                            ✕ Reject Brief
                          </Button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                          Waiting for assigned Creative Strategist ({record.assignedCreativeStrategist?.name || 'Unassigned'}) to review the brief.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#FAFAF7', border: '1px solid #E5E5DC', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Brief Review Status:</span>
                        <StatusBadge status={record.briefStatus} type="decision" />
                      </div>
                      {record.briefReviewFeedback && (
                        <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#393A31' }}>
                          <strong>Feedback:</strong> {record.briefReviewFeedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 8: CREATIVE PRODUCTION SUBMISSION */}
              {/* ---------------------------------------------------- */}
              {(record.status === 'PRODUCTION' || record.creativeSubmittedAt || (record.status === 'REVISION_REQUESTED' && record.briefStatus === 'APPROVED')) && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 8: Creative Submission</h3>
                    <span className="card-role-tag">Graphic Designer</span>
                  </div>

                  {(() => {
                    const isCreativeRevisionRequested = record.status === 'REVISION_REQUESTED' && (
                      record.internalReviewStatus === 'REVISE' ||
                      record.internalReviewStatus === 'REJECTED' ||
                      record.finalApprovalStatus === 'REVISE' ||
                      record.finalApprovalStatus === 'REJECTED'
                    );
                    const isCreativeEditable = record.status === 'PRODUCTION' || isCreativeRevisionRequested;

                    if (isCreativeEditable) {
                      return (
                        <div>
                          {isCreativeRevisionRequested && (
                            <div className="warning-alert-box" style={{ marginBottom: '14px' }}>
                              <strong>Creative Revision Requested:</strong>
                              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                                {record.internalReviewFeedback || record.finalApprovalFeedback || record.revisionNotes || 'Please revise creative assets according to the feedback.'}
                              </p>
                            </div>
                          )}

                          <div className="fields-grid-2">
                            <div className="field-group">
                              <label>Creative Asset Link (Drive / Dropbox / CDN) *</label>
                              <input
                                type="text"
                                value={creativeLinkInput}
                                onChange={(e) => setCreativeLinkInput(e.target.value)}
                                placeholder="https://drive.google.com/..."
                                disabled={!isAssignedGD}
                              />
                            </div>
                            <div className="field-group">
                              <label>Framer Link (Optional)</label>
                              <input
                                type="text"
                                value={framerLinkInput}
                                onChange={(e) => setFramerLinkInput(e.target.value)}
                                placeholder="https://framer.com/..."
                                disabled={!isAssignedGD}
                              />
                            </div>
                          </div>
                          <div className="field-group">
                            <label>Attachment URL / Additional Links</label>
                            <input
                              type="text"
                              value={creativeAttachmentInput}
                              onChange={(e) => setCreativeAttachmentInput(e.target.value)}
                              placeholder="https://..."
                              disabled={!isAssignedGD}
                            />
                          </div>
                          <div className="field-group">
                            <label>Designer Notes</label>
                            <textarea
                              rows={2}
                              value={creativeSubmissionNotesInput}
                              onChange={(e) => setCreativeSubmissionNotesInput(e.target.value)}
                              placeholder="Notes on variations, resolution, audio track..."
                              disabled={!isAssignedGD}
                            />
                          </div>

                          {isAssignedGD ? (
                            <Button variant="primary" onClick={handleSubmitCreativeAssets} disabled={isProcessing}>
                              {isProcessing
                                ? 'Submitting Creative...'
                                : isCreativeRevisionRequested
                                ? '↺ Re-Submit Revised Creative Assets'
                                : 'Submit Creative for Internal Review'}
                            </Button>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                              Waiting for assigned Graphic Designer ({record.assignedGraphicDesigner?.name || 'Unassigned'}) to submit creative assets.
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div style={{ background: '#FAFAF7', border: '1px solid #E5E5DC', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                          <strong>Creative Asset:</strong>{' '}
                          {record.creativeLink || record.productionAssetsUrl ? (
                            <a href={record.creativeLink || record.productionAssetsUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                              Open Creative Asset ↗
                            </a>
                          ) : 'N/A'}
                        </div>
                        {record.framerLink && (
                          <div style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                            <strong>Framer Preview:</strong>{' '}
                            <a href={record.framerLink} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                              Open Framer Preview ↗
                            </a>
                          </div>
                        )}
                        {record.creativeSubmissionNotes && (
                          <div style={{ fontSize: '0.8rem', color: '#5A5B52' }}>
                            Notes: {record.creativeSubmissionNotes}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 9: INTERNAL CREATIVE REVIEW */}
              {/* ---------------------------------------------------- */}
              {(record.status === 'INTERNAL_REVIEW' || record.internalReviewAt) && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 9: Internal Creative Review</h3>
                    <span className="card-role-tag">Creative Strategist</span>
                  </div>

                  {record.status === 'INTERNAL_REVIEW' ? (
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#5A5B52', margin: '0 0 12px' }}>
                        Perform internal quality inspection against the creative direction and brief before sending for final senior approval.
                      </p>
                      <div className="field-group">
                        <label>Review Feedback</label>
                        <textarea
                          rows={3}
                          value={internalReviewFeedbackInput}
                          onChange={(e) => setInternalReviewFeedbackInput(e.target.value)}
                          placeholder="Feedback or praise for the designer..."
                          disabled={!isAssignedCS}
                        />
                      </div>

                      {isAssignedCS ? (
                        <div className="decision-btn-group">
                          <Button variant="primary" onClick={() => handleReviewCreativeDecision('APPROVED')} disabled={isProcessing}>
                            ✓ Approve for Final Review
                          </Button>
                          <Button variant="ghost" onClick={() => handleReviewCreativeDecision('REVISE')} disabled={isProcessing}>
                            ↺ Request Revision
                          </Button>
                          <Button variant="danger" onClick={() => handleReviewCreativeDecision('REJECTED')} disabled={isProcessing}>
                            ✕ Reject
                          </Button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                          Waiting for assigned Creative Strategist ({record.assignedCreativeStrategist?.name || 'Unassigned'}) to review.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#FAFAF7', border: '1px solid #E5E5DC', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Internal Review Status:</span>
                        <StatusBadge status={record.internalReviewStatus} type="decision" />
                      </div>
                      {record.internalReviewFeedback && (
                        <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#393A31' }}>
                          <strong>Notes:</strong> {record.internalReviewFeedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 10: FINAL APPROVAL (ABHISHEK SIR / FINAL APPROVER) */}
              {/* ---------------------------------------------------- */}
              {(record.status === 'CLIENT_REVIEW' || record.finalApprovedAt) && (
                <div className="operational-action-card">
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 10: Final Senior Approval</h3>
                    <span className="card-role-tag">Abhishek Sir / Admin</span>
                  </div>

                  {record.status === 'CLIENT_REVIEW' ? (
                    <div>
                      <div className="info-alert-box">
                        ⭐ <strong>Ready for Final Sign-Off:</strong> Creative has passed internal strategist review.
                      </div>
                      <div className="field-group">
                        <label>Final Approval Comments / Instructions</label>
                        <textarea
                          rows={3}
                          value={finalApprovalFeedbackInput}
                          onChange={(e) => setFinalApprovalFeedbackInput(e.target.value)}
                          placeholder="Launch instructions, budget notes, or revisions..."
                          disabled={!isAdmin}
                        />
                      </div>

                      {isAdmin ? (
                        <div className="decision-btn-group">
                          <Button variant="primary" onClick={() => handleFinalApprovalDecision('APPROVED')} disabled={isProcessing}>
                            ✓ Approve Creative for Launch
                          </Button>
                          <Button variant="ghost" onClick={() => handleFinalApprovalDecision('REVISE')} disabled={isProcessing}>
                            ↺ Request Revision
                          </Button>
                          <Button variant="danger" onClick={() => handleFinalApprovalDecision('REJECTED')} disabled={isProcessing}>
                            ✕ Reject
                          </Button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                          Awaiting Abhishek Sir / Admin sign-off.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#FAFAF7', border: '1px solid #E5E5DC', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Final Approval Status:</span>
                        <StatusBadge status={record.finalApprovalStatus} type="decision" />
                      </div>
                      {record.finalApprovalFeedback && (
                        <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#393A31' }}>
                          <strong>Notes:</strong> {record.finalApprovalFeedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STAGE 11 & 12: READY TO LAUNCH & AUTOMATIC NEXT CYCLE */}
              {/* ---------------------------------------------------- */}
              {(record.status === 'CLIENT_APPROVED' ||
                record.status === 'READY_TO_LAUNCH' ||
                record.status === 'HANDOFF') && (
                <div className="operational-action-card" style={{ borderColor: '#FDE047', background: '#FFFDF0' }}>
                  <div className="action-card-header">
                    <h3 className="card-title">Stage 11 & 12: Launch & Automatic Next Cycle</h3>
                    <span className="card-role-tag" style={{ background: '#F2EA1A', color: '#000' }}>Media Buyer</span>
                  </div>

                  <div className="success-alert-box" style={{ background: '#FFFFFF', borderColor: '#FDE047' }}>
                    🎉 <strong>Creative Approved and Ready to Launch!</strong>
                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
                      When you launch this approved creative in Ads Manager, click <strong>[Record Launch & Start Next Cycle]</strong>.
                      This will permanently archive {record.currentTestingCycle} as completed, spawn Cycle {(record.cycleNumber || 1) + 1},
                      and start the next 72-hour observation clock automatically.
                    </p>
                  </div>

                  <div style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                    <strong>Approved Asset Link:</strong>{' '}
                    <a href={record.creativeLink || record.productionAssetsUrl} target="_blank" rel="noreferrer">
                      {record.creativeLink || record.productionAssetsUrl || 'N/A'}
                    </a>
                  </div>

                  {isAssignedMB ? (
                    <Button variant="primary" onClick={handleRecordNextCycleLaunch} disabled={isProcessing}>
                      {isProcessing ? 'Launching Next Cycle...' : `🚀 Record Launch & Start Cycle ${(record.cycleNumber || 1) + 1}`}
                    </Button>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#8C8D82' }}>
                      Assigned Media Buyer ({record.assignedMediaBuyer?.name || 'Unassigned'}) can record launch to start next cycle.
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 12: COMPLETED CYCLE */}
              {record.status === 'COMPLETED' && (
                <div className="operational-action-card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <h3 className="card-title" style={{ color: '#166534', marginBottom: '8px' }}>
                    ✓ {record.currentTestingCycle} Successfully Completed
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#166534', margin: 0 }}>
                    This cycle completed permanently on {formatDateTime(record.completedAt)}.
                    {record.nextCycle && (
                      <span> Next cycle: <strong>{record.nextCycle.currentTestingCycle || 'Cycle 2'}</strong>.</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FULL CREATIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="operational-action-card">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' }}>
                  A. Performance Report (Media Buyer)
                </h4>
                <div className="kpi-metrics-grid">
                  <div className="kpi-card"><div className="kpi-title">CTR</div><div className="kpi-value">{record.ctr != null ? `${record.ctr}%` : '—'}</div></div>
                  <div className="kpi-card"><div className="kpi-title">CPC</div><div className="kpi-value">{record.cpc != null ? record.cpc : '—'}</div></div>
                  <div className="kpi-card"><div className="kpi-title">CPM</div><div className="kpi-value">{record.cpm != null ? record.cpm : '—'}</div></div>
                  <div className="kpi-card"><div className="kpi-title">ROAS</div><div className="kpi-value">{record.roas != null ? `${record.roas}x` : '—'}</div></div>
                </div>
                <p style={{ margin: '8px 0 4px', fontSize: '0.85rem' }}><strong>Notes:</strong> {record.performanceNotes || 'None'}</p>
                {record.additionalObservations && <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>Observations:</strong> {record.additionalObservations}</p>}
              </div>

              <div className="operational-action-card">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' }}>
                  B. Performance Analysis (Creative Strategist)
                </h4>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem' }}><strong>Recommendation:</strong> {record.recommendation || '—'}</p>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem' }}><strong>Analysis:</strong> {record.performanceAnalysis || '—'}</p>
                {record.analysisNotes && <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>Notes:</strong> {record.analysisNotes}</p>}
              </div>

              <div className="operational-action-card">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' }}>
                  C. Creative Analysis Breakdown
                </h4>
                <div className="fields-grid-2" style={{ fontSize: '0.85rem', color: '#1A1A1A' }}>
                  <div><strong>Angle:</strong> {record.angle || '—'}</div>
                  <div><strong>Concept:</strong> {record.concept || '—'}</div>
                  <div><strong>Communication:</strong> {record.communication || '—'}</div>
                  <div><strong>Psychology:</strong> {record.psychology || '—'}</div>
                  <div><strong>Hook:</strong> {record.hook || '—'}</div>
                  <div><strong>Structure:</strong> {record.creativeStructure || '—'}</div>
                </div>
              </div>

              <div className="operational-action-card">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' }}>
                  D. Creative Direction & Learnings
                </h4>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-line', margin: 0 }}>
                  {record.creativeLearning || 'No creative direction submitted yet.'}
                </p>
                {record.creativeLearningAttachment && (
                  <div style={{ marginTop: '8px', fontSize: '0.82rem' }}>
                    Reference: <a href={record.creativeLearningAttachment} target="_blank" rel="noreferrer">{record.creativeLearningAttachment}</a>
                  </div>
                )}
              </div>

              <div className="operational-action-card">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' }}>
                  E. Brief & Assets
                </h4>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem' }}><strong>Title:</strong> {record.briefTitle || '—'}</p>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem' }}><strong>Description:</strong> {record.briefDescription || record.briefContent || '—'}</p>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem' }}>
                  <strong>Creative Asset:</strong>{' '}
                  {record.creativeLink || record.productionAssetsUrl ? (
                    <a href={record.creativeLink || record.productionAssetsUrl} target="_blank" rel="noreferrer">Open Asset ↗</a>
                  ) : '—'}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  <strong>Framer Link:</strong>{' '}
                  {record.framerLink ? (
                    <a href={record.framerLink} target="_blank" rel="noreferrer">Open Framer ↗</a>
                  ) : '—'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: COMPLETE AUDIT TIMELINE */}
          {activeTab === 'timeline' && (
            <div>
              {loadingTimeline ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#8C8D82' }}>Loading timeline...</div>
              ) : timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#8C8D82' }}>No timeline events recorded yet.</div>
              ) : (
                <div className="timeline-list">
                  {timeline.map((evt) => (
                    <div key={evt._id} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-card">
                        <div className="timeline-card-header">
                          <span className="timeline-action">{evt.action?.replace(/_/g, ' ')}</span>
                          <span className="timeline-time">{formatDateTime(evt.timestamp)}</span>
                        </div>
                        <div className="timeline-actor-row">
                          By <strong>{evt.actorName}</strong> ({evt.actorRole})
                          {evt.stage && <span> • Stage: {evt.stage}</span>}
                        </div>
                        {evt.notes && <div className="timeline-notes">{evt.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EDIT ASSIGNMENT & SCHEDULE MODAL */}
      {isEditModalOpen && record && (
        <EditAssignmentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          record={record}
          allUsers={allUsers}
          onSubmit={async (recId, updateData) => {
            await onUpdateRecord(recId, updateData);
            await loadTimeline();
          }}
        />
      )}
    </div>
  );
};
