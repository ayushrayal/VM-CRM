import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import {
  unifiedCreateCreativeStrategy,
  getTargetingLocations,
  uploadCreativeFile,
  deleteCreativeFile
} from '../../../api/creativeStrategy.api';
import './UnifiedAddCreativeWizard.scss';

const DEFAULT_PRESET_LOCATIONS = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Tier 1 Cities',
  'Tier 2 Cities'
];

export const UnifiedAddCreativeWizard = ({
  isOpen,
  onClose,
  clients = [],
  campaigns = [],
  adSets = [],
  mediaBuyers = [],
  creativeStrategists = [],
  graphicDesigners = [],
  allUsers = [],
  defaultClientId = '',
  onSuccess
}) => {
  // Stepper: 1 = Campaign, 2 = Ad Set, 3 = Creative, 4 = Final Review
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // ----------------------------------------------------
  // STEP 1: CAMPAIGN STATE
  // ----------------------------------------------------
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [isNewCampaign, setIsNewCampaign] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');

  // New Campaign Fields
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('CBO'); // 'CBO' | 'ABO'
  const [campaignBudget, setCampaignBudget] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('Sales');
  const [campaignLaunchDate, setCampaignLaunchDate] = useState('');
  const [campaignNotes, setCampaignNotes] = useState('');
  const [campaignConfirmed, setCampaignConfirmed] = useState(false);
  const [campaignErrors, setCampaignErrors] = useState({});

  // ----------------------------------------------------
  // STEP 2: AD SET STATE
  // ----------------------------------------------------
  const [isNewAdSet, setIsNewAdSet] = useState(false);
  const [selectedAdSetId, setSelectedAdSetId] = useState('');
  const [adSetSearch, setAdSetSearch] = useState('');

  // New Ad Set Fields
  const [adSetName, setAdSetName] = useState('');
  const [ageStart, setAgeStart] = useState(18);
  const [ageEnd, setAgeEnd] = useState(65);
  const [adSetBudget, setAdSetBudget] = useState('');
  const [gender, setGender] = useState('Both'); // 'Male' | 'Female' | 'Both'
  const [includedLocations, setIncludedLocations] = useState([]);
  const [excludedLocations, setExcludedLocations] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [excludedLocationInput, setExcludedLocationInput] = useState('');
  const [targeting, setTargeting] = useState('Broad'); // 'Broad' | 'Interest'
  const [interests, setInterests] = useState([]);
  const [interestInput, setInterestInput] = useState('');
  const [adSetLaunchDate, setAdSetLaunchDate] = useState('');
  const [partOfCurrentCycle, setPartOfCurrentCycle] = useState(true);
  const [adSetConfirmed, setAdSetConfirmed] = useState(false);
  const [adSetErrors, setAdSetErrors] = useState({});

  // Available targeting locations from API + defaults
  const [availableLocations, setAvailableLocations] = useState(DEFAULT_PRESET_LOCATIONS);

  // ----------------------------------------------------
  // STEP 3: CREATIVE / AD DETAILS STATE
  // ----------------------------------------------------
  const [adName, setAdName] = useState('');
  const [adType, setAdType] = useState('Static'); // 'Static' | 'Video' | 'Carousel' | 'Catalog'
  const [landingPageUrl, setLandingPageUrl] = useState('');
  const [testingStyle, setTestingStyle] = useState('New Angle');
  const [customTestingStyle, setCustomTestingStyle] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]); // array of { fileId, url, name, mimeType, size, status, progress }
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Scheduling & Assignments
  const [creativeLaunchDate, setCreativeLaunchDate] = useState('');
  const [observationDurationHours, setObservationDurationHours] = useState(72);
  const [schedulingMode, setSchedulingMode] = useState('DURATION'); // 'DURATION' | 'CUSTOM_DUE_DATE'
  const [customReportDueDate, setCustomReportDueDate] = useState('');

  const [assignedMediaBuyer, setAssignedMediaBuyer] = useState('');
  const [assignedCreativeStrategist, setAssignedCreativeStrategist] = useState('');
  const [assignedGraphicDesigner, setAssignedGraphicDesigner] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const [creativesProposed, setCreativesProposed] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [finalAssetConfiguration, setFinalAssetConfiguration] = useState('');

  const [creativeConfirmed, setCreativeConfirmed] = useState(false);
  const [creativeErrors, setCreativeErrors] = useState({});

  // ----------------------------------------------------
  // SYNC & INITIALIZATION
  // ----------------------------------------------------
  useEffect(() => {
    if (defaultClientId) {
      setClientId(defaultClientId);
    } else if (clients[0]?._id && !clientId) {
      setClientId(clients[0]._id);
    }
  }, [defaultClientId, clients]);

  // Load previously used locations
  useEffect(() => {
    getTargetingLocations()
      .then((locs) => {
        if (Array.isArray(locs) && locs.length > 0) {
          const merged = Array.from(new Set([...locs, ...DEFAULT_PRESET_LOCATIONS])).sort();
          setAvailableLocations(merged);
        }
      })
      .catch(() => {});
  }, []);

  // Filter campaigns for selected client
  const clientCampaigns = useMemo(() => {
    if (!clientId) return [];
    return campaigns.filter((c) => {
      const cClientId = c.client?._id || c.client;
      return cClientId === clientId;
    });
  }, [clientId, campaigns]);

  // Filter ad sets for selected campaign
  const campaignAdSets = useMemo(() => {
    const activeCampId = isNewCampaign ? null : selectedCampaignId;
    if (!activeCampId) return [];
    return adSets.filter((a) => {
      const aCampId = a.campaign?._id || a.campaign;
      return aCampId === activeCampId;
    });
  }, [isNewCampaign, selectedCampaignId, adSets]);

  // Active campaign object (if selecting existing)
  const activeExistingCampaign = useMemo(() => {
    if (isNewCampaign || !selectedCampaignId) return null;
    return clientCampaigns.find((c) => c._id === selectedCampaignId) || null;
  }, [isNewCampaign, selectedCampaignId, clientCampaigns]);

  // Effective campaign type: from existing campaign or new campaign field
  const effectiveCampaignType = useMemo(() => {
    if (isNewCampaign) return campaignType;
    return activeExistingCampaign?.campaignType || 'CBO';
  }, [isNewCampaign, campaignType, activeExistingCampaign]);

  // Rule: Changing Campaign clears selected Ad Set
  const handleCampaignChange = (newCampId) => {
    setSelectedCampaignId(newCampId);
    setSelectedAdSetId('');
    setIsNewAdSet(false);
    setAdSetErrors({});
  };

  const handleToggleNewCampaign = (isNew) => {
    setIsNewCampaign(isNew);
    setSelectedCampaignId('');
    setSelectedAdSetId('');
    setIsNewAdSet(isNew ? true : false); // if campaign is brand new, ad set must be new
    setCampaignErrors({});
    setAdSetErrors({});
  };

  // ----------------------------------------------------
  // STEP 1 VALIDATION & ADVANCE
  // ----------------------------------------------------
  const validateStep1 = () => {
    const errors = {};
    if (!clientId) {
      errors.client = 'Client is required';
    }

    if (isNewCampaign) {
      if (!campaignName.trim()) {
        errors.campaignName = 'Campaign Name is required';
      }
      if (campaignType === 'CBO') {
        if (
          campaignBudget === '' ||
          campaignBudget === null ||
          isNaN(Number(campaignBudget)) ||
          Number(campaignBudget) < 0
        ) {
          errors.campaignBudget = 'Campaign Budget is required for CBO';
        }
      }
      if (!campaignObjective) {
        errors.campaignObjective = 'Campaign Objective is required';
      }
    } else {
      if (!selectedCampaignId) {
        errors.selectedCampaignId = 'Please select an existing campaign or click "+ Add New Campaign"';
      }
    }

    if (!campaignConfirmed) {
      errors.campaignConfirmed = 'You must confirm the details before proceeding';
    }

    setCampaignErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextFromStep1 = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // ----------------------------------------------------
  // STEP 2 VALIDATION & ADVANCE
  // ----------------------------------------------------
  const validateStep2 = () => {
    const errors = {};

    if (isNewAdSet) {
      if (!adSetName.trim()) {
        errors.adSetName = 'Ad Set Name is required';
      }
      if (effectiveCampaignType === 'ABO') {
        if (
          adSetBudget === '' ||
          adSetBudget === null ||
          isNaN(Number(adSetBudget)) ||
          Number(adSetBudget) < 0
        ) {
          errors.adSetBudget = 'Ad Set Budget is required when Campaign is ABO';
        }
      }
      if (Number(ageStart) < 13 || Number(ageEnd) > 100 || Number(ageStart) > Number(ageEnd)) {
        errors.ageGroup = 'Please enter a valid age range (min 13, max 100, Start ≤ End)';
      }
      if (!gender) {
        errors.gender = 'Gender is required';
      }
      if (!targeting) {
        errors.targeting = 'Targeting is required';
      }
      if (targeting === 'Interest' && interests.length === 0) {
        errors.interests = 'Please add at least one interest when targeting is set to Interest';
      }
    } else {
      if (!selectedAdSetId) {
        errors.selectedAdSetId = 'Please select an existing Ad Set or click "+ Add New Ad Set"';
      }
    }

    if (!adSetConfirmed) {
      errors.adSetConfirmed = 'You must confirm the details before proceeding';
    }

    setAdSetErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextFromStep2 = (e) => {
    e.preventDefault();
    if (validateStep2()) {
      setCurrentStep(3);
    }
  };

  // Location / Interest helpers
  const handleAddIncludedLocation = (loc) => {
    const clean = (loc || locationInput).trim();
    if (clean && !includedLocations.includes(clean)) {
      setIncludedLocations([...includedLocations, clean]);
      if (!availableLocations.includes(clean)) {
        setAvailableLocations([...availableLocations, clean].sort());
      }
      setLocationInput('');
    }
  };

  const handleRemoveIncludedLocation = (loc) => {
    setIncludedLocations(includedLocations.filter((l) => l !== loc));
  };

  const handleAddExcludedLocation = (loc) => {
    const clean = (loc || excludedLocationInput).trim();
    if (clean && !excludedLocations.includes(clean)) {
      setExcludedLocations([...excludedLocations, clean]);
      if (!availableLocations.includes(clean)) {
        setAvailableLocations([...availableLocations, clean].sort());
      }
      setExcludedLocationInput('');
    }
  };

  const handleRemoveExcludedLocation = (loc) => {
    setExcludedLocations(excludedLocations.filter((l) => l !== loc));
  };

  const handleAddInterest = () => {
    const clean = interestInput.trim();
    if (clean && !interests.includes(clean)) {
      setInterests([...interests, clean]);
      setInterestInput('');
      setAdSetErrors((prev) => ({ ...prev, interests: null }));
    }
  };

  const handleRemoveInterest = (item) => {
    setInterests(interests.filter((i) => i !== item));
  };

  // ----------------------------------------------------
  // STEP 3: CREATIVE UPLOAD & VALIDATION
  // ----------------------------------------------------
  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    processFiles(files);
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;

    if (uploadedFiles.length + files.length > 20) {
      setCreativeErrors((prev) => ({
        ...prev,
        uploads: `Maximum 20 creative files allowed. You already have ${uploadedFiles.length} files.`
      }));
      return;
    }

    setCreativeErrors((prev) => ({ ...prev, uploads: null }));
    setIsUploading(true);

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        setCreativeErrors((prev) => ({
          ...prev,
          uploads: `File "${file.name}" exceeds the 15MB size limit.`
        }));
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newFileItem = {
        tempId,
        fileId: '',
        url: '',
        name: file.name,
        mimeType: file.type,
        size: file.size,
        status: 'uploading',
        progress: 30
      };

      setUploadedFiles((prev) => [...prev, newFileItem]);

      // Read as base64 and upload to API
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const res = await uploadCreativeFile({
            image: base64Data,
            name: file.name,
            mimeType: file.type
          });

          const data = res?.data || res;
          setUploadedFiles((prev) =>
            prev.map((item) =>
              item.tempId === tempId
                ? {
                    ...item,
                    fileId: data.fileId || '',
                    url: data.url || base64Data,
                    status: 'completed',
                    progress: 100
                  }
                : item
            )
          );
        } catch (err) {
          setUploadedFiles((prev) =>
            prev.map((item) =>
              item.tempId === tempId
                ? {
                    ...item,
                    status: 'error',
                    error: err.message || 'Upload failed',
                    progress: 0
                  }
                : item
            )
          );
        }
      };
      reader.readAsDataURL(file);
    }

    setIsUploading(false);
  };

  const handleRemoveUploadedFile = async (itemToRemove) => {
    if (itemToRemove.fileId) {
      try {
        await deleteCreativeFile(itemToRemove.fileId);
      } catch (err) {
        console.warn('Failed to delete file from storage', err);
      }
    }
    setUploadedFiles((prev) =>
      prev.filter((f) => (f.fileId ? f.fileId !== itemToRemove.fileId : f.tempId !== itemToRemove.tempId))
    );
  };

  const handleRetryUpload = (failedItem) => {
    // Retry can trigger file picker or remove item
    handleRemoveUploadedFile(failedItem);
  };

  const validateStep3 = () => {
    const errors = {};
    if (!adName.trim()) {
      errors.adName = 'Ad Name is required';
    }
    if (!adType) {
      errors.adType = 'Ad Type is required';
    }
    if (landingPageUrl.trim()) {
      try {
        new URL(landingPageUrl.trim());
      } catch {
        errors.landingPageUrl = 'Please enter a valid URL (e.g. https://brand.com/page)';
      }
    }

    const effectiveStyle = testingStyle === 'Other' ? customTestingStyle.trim() : testingStyle;
    if (!effectiveStyle) {
      errors.testingStyle = 'Testing Style is required';
    }

    if (uploadedFiles.length > 20) {
      errors.uploads = 'Maximum 20 creative files allowed';
    }

    const uploadingItems = uploadedFiles.filter((f) => f.status === 'uploading');
    if (uploadingItems.length > 0) {
      errors.uploads = 'Please wait for file uploads to complete before proceeding';
    }

    if (!creativeConfirmed) {
      errors.creativeConfirmed = 'You must confirm the details before reviewing';
    }

    setCreativeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextFromStep3 = (e) => {
    e.preventDefault();
    if (validateStep3()) {
      setCurrentStep(4);
    }
  };

  // ----------------------------------------------------
  // FINAL SUBMISSION (ATOMIC HIERARCHY CREATION)
  // ----------------------------------------------------
  const handleFinalCreate = async () => {
    setGlobalError('');
    setIsSubmitting(true);

    try {
      const effectiveTestingStyle =
        testingStyle === 'Other' ? customTestingStyle.trim() || 'Custom' : testingStyle;

      const payload = {
        clientId,
        isNewCampaign,
        campaignId: isNewCampaign ? null : selectedCampaignId,
        campaignData: isNewCampaign
          ? {
              name: campaignName.trim(),
              campaignType,
              budget: campaignType === 'CBO' ? Number(campaignBudget) : null,
              objective: campaignObjective,
              launchDate: campaignLaunchDate ? new Date(campaignLaunchDate).toISOString() : null,
              notes: campaignNotes.trim()
            }
          : undefined,

        isNewAdSet,
        adSetId: isNewAdSet ? null : selectedAdSetId,
        adSetData: isNewAdSet
          ? {
              name: adSetName.trim(),
              budget: effectiveCampaignType === 'ABO' ? Number(adSetBudget) : null,
              ageGroup: { start: Number(ageStart), end: Number(ageEnd) },
              gender,
              includedLocations,
              excludedLocations,
              targeting,
              interests,
              launchDate: adSetLaunchDate ? new Date(adSetLaunchDate).toISOString() : null,
              partOfCurrentCycle
            }
          : undefined,

        creativeData: {
          adName: adName.trim(),
          adType,
          landingPageUrl: landingPageUrl.trim(),
          testingStyle: effectiveTestingStyle,
          creatives: uploadedFiles
            .filter((f) => f.status === 'completed' && f.url)
            .map((f) => ({
              url: f.url,
              fileId: f.fileId,
              name: f.name,
              mimeType: f.mimeType,
              size: f.size
            })),
          launchDate: creativeLaunchDate ? new Date(creativeLaunchDate).toISOString() : null,
          observationDurationHours: Number(observationDurationHours) || 72,
          schedulingMode,
          reportDueAt:
            schedulingMode === 'CUSTOM_DUE_DATE' && customReportDueDate
              ? new Date(customReportDueDate).toISOString()
              : null,
          assignedMediaBuyer: assignedMediaBuyer || null,
          assignedCreativeStrategist: assignedCreativeStrategist || null,
          assignedGraphicDesigner: assignedGraphicDesigner || null,
          assignedTo: assignedTo || null,
          creativesProposed: creativesProposed.trim() || adName.trim(),
          hypothesis: hypothesis.trim(),
          finalAssetConfiguration: finalAssetConfiguration.trim()
        }
      };

      const created = await unifiedCreateCreativeStrategy(payload);
      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      setGlobalError(err.message || 'Failed to create hierarchy. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered dropdown for search
  const filteredCampaignOptions = clientCampaigns.filter((c) =>
    c.name.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  const filteredAdSetOptions = campaignAdSets.filter((a) =>
    a.name.toLowerCase().includes(adSetSearch.toLowerCase())
  );

  const selectedClientObj = clients.find((c) => c._id === clientId);
  const selectedAdSetObj = campaignAdSets.find((a) => a._id === selectedAdSetId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Creative Strategy Hierarchy"
      maxWidth="780px"
    >
      <div className="unified-wizard-container">
        {/* STEP INDICATOR */}
        <div className="wizard-step-indicator" role="navigation" aria-label="Creation steps">
          <div className={`step-item ${currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
            <div className="step-label">Campaign Details</div>
          </div>
          <div className="step-connector" />

          <div className={`step-item ${currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
            <div className="step-label">Ad Set Details</div>
          </div>
          <div className="step-connector" />

          <div className={`step-item ${currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
            <div className="step-label">Ad Details</div>
          </div>
          <div className="step-connector" />

          <div className={`step-item ${currentStep === 4 ? 'current' : ''}`}>
            <div className="step-circle">4</div>
            <div className="step-label">Final Review</div>
          </div>
        </div>

        {globalError && (
          <div className="wizard-error-banner" role="alert">
            ⚠️ {globalError}
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 1: CAMPAIGN DETAILS */}
        {/* ==================================================== */}
        {currentStep === 1 && (
          <form onSubmit={handleNextFromStep1} className="wizard-step-form">
            <h3 className="section-title">Step 1 — Campaign Details</h3>

            {/* Client Selector */}
            <div className="form-group">
              <label className="form-label">Client *</label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setSelectedCampaignId('');
                  setSelectedAdSetId('');
                }}
                className="form-select"
                required
              >
                <option value="">Select a Client...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
              {campaignErrors.client && <span className="field-error">{campaignErrors.client}</span>}
            </div>

            {/* Mode Switcher: Existing vs New */}
            <div className="selection-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${!isNewCampaign ? 'active' : ''}`}
                onClick={() => handleToggleNewCampaign(false)}
              >
                Select Existing Campaign
              </button>
              <button
                type="button"
                className={`mode-btn ${isNewCampaign ? 'active' : ''}`}
                onClick={() => handleToggleNewCampaign(true)}
              >
                + Add New Campaign
              </button>
            </div>

            {!isNewCampaign ? (
              /* Existing Campaign Dropdown / Search */
              <div className="form-group">
                <label className="form-label">Search / Select Campaign *</label>
                {clientCampaigns.length > 5 && (
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    className="form-input search-filter-input"
                  />
                )}
                <select
                  value={selectedCampaignId}
                  onChange={(e) => handleCampaignChange(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Choose an existing campaign...</option>
                  {filteredCampaignOptions.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} [{c.campaignType || 'CBO'}] — {c.objective || 'Sales'}
                    </option>
                  ))}
                </select>
                {clientCampaigns.length === 0 && (
                  <p className="hint-text">
                    No campaigns found for this client. Please click <strong>+ Add New Campaign</strong> above.
                  </p>
                )}
                {campaignErrors.selectedCampaignId && (
                  <span className="field-error">{campaignErrors.selectedCampaignId}</span>
                )}
              </div>
            ) : (
              /* New Campaign Fields */
              <div className="new-entity-fields-card">
                <div className="form-group">
                  <label className="form-label">Campaign Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. VM | CBO | Testing Winners"
                    value={campaignName}
                    onChange={(e) => {
                      setCampaignName(e.target.value);
                      setCampaignErrors((p) => ({ ...p, campaignName: null }));
                    }}
                    className="form-input"
                    required
                  />
                  {campaignErrors.campaignName && (
                    <span className="field-error">{campaignErrors.campaignName}</span>
                  )}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Campaign Type *</label>
                    <div className="radio-pill-group">
                      <label className={`radio-pill ${campaignType === 'CBO' ? 'checked' : ''}`}>
                        <input
                          type="radio"
                          name="campaignType"
                          value="CBO"
                          checked={campaignType === 'CBO'}
                          onChange={() => setCampaignType('CBO')}
                        />
                        CBO (Campaign Budget)
                      </label>
                      <label className={`radio-pill ${campaignType === 'ABO' ? 'checked' : ''}`}>
                        <input
                          type="radio"
                          name="campaignType"
                          value="ABO"
                          checked={campaignType === 'ABO'}
                          onChange={() => setCampaignType('ABO')}
                        />
                        ABO (Ad Set Budget)
                      </label>
                    </div>
                  </div>

                  {/* CBO: Show Campaign Budget. ABO: Hide */}
                  {campaignType === 'CBO' ? (
                    <div className="form-group">
                      <label className="form-label">Campaign Budget (₹/$) *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 5000"
                        value={campaignBudget}
                        onChange={(e) => {
                          setCampaignBudget(e.target.value);
                          setCampaignErrors((p) => ({ ...p, campaignBudget: null }));
                        }}
                        className="form-input"
                        required
                      />
                      {campaignErrors.campaignBudget && (
                        <span className="field-error">{campaignErrors.campaignBudget}</span>
                      )}
                    </div>
                  ) : (
                    <div className="form-group hint-box">
                      <span className="info-icon">ℹ️</span>
                      <span>Campaign Budget is hidden for ABO because budget is managed at Ad Set level.</span>
                    </div>
                  )}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Campaign Objective *</label>
                    <select
                      value={campaignObjective}
                      onChange={(e) => setCampaignObjective(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="Lead Generation">Lead Generation</option>
                      <option value="Sales">Sales</option>
                      <option value="Catalog Sales">Catalog Sales</option>
                    </select>
                    {campaignErrors.campaignObjective && (
                      <span className="field-error">{campaignErrors.campaignObjective}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Launch Date</label>
                    <input
                      type="date"
                      value={campaignLaunchDate}
                      onChange={(e) => setCampaignLaunchDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Campaign notes, targeting hypotheses, etc."
                    value={campaignNotes}
                    onChange={(e) => setCampaignNotes(e.target.value)}
                    className="form-textarea"
                  />
                </div>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="confirmation-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={campaignConfirmed}
                  onChange={(e) => {
                    setCampaignConfirmed(e.target.checked);
                    if (e.target.checked) setCampaignErrors((p) => ({ ...p, campaignConfirmed: null }));
                  }}
                  id="campaign-confirm-check"
                />
                <span>I've added the accurate details here</span>
              </label>
              {campaignErrors.campaignConfirmed && (
                <span className="field-error">{campaignErrors.campaignConfirmed}</span>
              )}
            </div>

            {/* Stepper Buttons */}
            <div className="wizard-footer-buttons">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!campaignConfirmed}>
                Next →
              </Button>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* STEP 2: AD SET DETAILS */}
        {/* ==================================================== */}
        {currentStep === 2 && (
          <form onSubmit={handleNextFromStep2} className="wizard-step-form">
            <h3 className="section-title">Step 2 — Ad Set Details</h3>

            <div className="selection-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${!isNewAdSet ? 'active' : ''}`}
                onClick={() => {
                  if (isNewCampaign) {
                    alert('When creating a brand new campaign, please add a new Ad Set under it.');
                    return;
                  }
                  setIsNewAdSet(false);
                }}
                disabled={isNewCampaign}
              >
                Select Existing Ad Set
              </button>
              <button
                type="button"
                className={`mode-btn ${isNewAdSet ? 'active' : ''}`}
                onClick={() => setIsNewAdSet(true)}
              >
                + Add New Ad Set
              </button>
            </div>

            {!isNewAdSet ? (
              /* Existing Ad Set Dropdown / Search */
              <div className="form-group">
                <label className="form-label">Search / Select Ad Set *</label>
                {campaignAdSets.length > 5 && (
                  <input
                    type="text"
                    placeholder="Search ad sets..."
                    value={adSetSearch}
                    onChange={(e) => setAdSetSearch(e.target.value)}
                    className="form-input search-filter-input"
                  />
                )}
                <select
                  value={selectedAdSetId}
                  onChange={(e) => {
                    setSelectedAdSetId(e.target.value);
                    setAdSetErrors((p) => ({ ...p, selectedAdSetId: null }));
                  }}
                  className="form-select"
                  required
                >
                  <option value="">Choose an existing Ad Set...</option>
                  {filteredAdSetOptions.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} {a.targeting ? `[${a.targeting}]` : ''}
                    </option>
                  ))}
                </select>
                {campaignAdSets.length === 0 && (
                  <p className="hint-text">
                    No Ad Sets found for the selected campaign. Click <strong>+ Add New Ad Set</strong> above.
                  </p>
                )}
                {adSetErrors.selectedAdSetId && (
                  <span className="field-error">{adSetErrors.selectedAdSetId}</span>
                )}
              </div>
            ) : (
              /* New Ad Set Fields */
              <div className="new-entity-fields-card">
                <div className="form-group">
                  <label className="form-label">Ad Set Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. VM | Broad | 18-65+ | Pan India"
                    value={adSetName}
                    onChange={(e) => {
                      setAdSetName(e.target.value);
                      setAdSetErrors((p) => ({ ...p, adSetName: null }));
                    }}
                    className="form-input"
                    required
                  />
                  {adSetErrors.adSetName && <span className="field-error">{adSetErrors.adSetName}</span>}
                </div>

                <div className="form-row-2">
                  {/* Age Group */}
                  <div className="form-group">
                    <label className="form-label">Age Group (Start — End) *</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="13"
                        max="100"
                        value={ageStart}
                        onChange={(e) => setAgeStart(e.target.value)}
                        className="form-input"
                        style={{ width: '80px' }}
                        required
                      />
                      <span>to</span>
                      <input
                        type="number"
                        min="13"
                        max="100"
                        value={ageEnd}
                        onChange={(e) => setAgeEnd(e.target.value)}
                        className="form-input"
                        style={{ width: '80px' }}
                        required
                      />
                    </div>
                    {adSetErrors.ageGroup && <span className="field-error">{adSetErrors.ageGroup}</span>}
                  </div>

                  {/* Gender */}
                  <div className="form-group">
                    <label className="form-label">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="Both">Both</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                {/* ABO: Show Ad Set Budget. CBO: Hide Ad Set Budget */}
                {effectiveCampaignType === 'ABO' ? (
                  <div className="form-group">
                    <label className="form-label">Ad Set Budget (₹/$) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 2000"
                      value={adSetBudget}
                      onChange={(e) => {
                        setAdSetBudget(e.target.value);
                        setAdSetErrors((p) => ({ ...p, adSetBudget: null }));
                      }}
                      className="form-input"
                      required
                    />
                    {adSetErrors.adSetBudget && (
                      <span className="field-error">{adSetErrors.adSetBudget}</span>
                    )}
                  </div>
                ) : (
                  <div className="form-group hint-box">
                    <span className="info-icon">ℹ️</span>
                    <span>Ad Set Budget is hidden because Campaign is configured as CBO.</span>
                  </div>
                )}

                {/* Included Locations */}
                <div className="form-group">
                  <label className="form-label">Included Locations</label>
                  <div className="multi-tag-container">
                    {includedLocations.map((loc) => (
                      <span key={loc} className="tag-chip">
                        {loc}
                        <button type="button" onClick={() => handleRemoveIncludedLocation(loc)}>
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="text"
                      list="locations-datalist"
                      placeholder="Type location and press Add..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIncludedLocation();
                        }
                      }}
                      className="form-input"
                    />
                    <datalist id="locations-datalist">
                      {availableLocations.map((l) => (
                        <option key={l} value={l} />
                      ))}
                    </datalist>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleAddIncludedLocation()}>
                      Add
                    </Button>
                  </div>
                </div>

                {/* Excluded Locations */}
                <div className="form-group">
                  <label className="form-label">Excluded Locations</label>
                  <div className="multi-tag-container">
                    {excludedLocations.map((loc) => (
                      <span key={loc} className="tag-chip tag-chip-danger">
                        {loc}
                        <button type="button" onClick={() => handleRemoveExcludedLocation(loc)}>
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="text"
                      list="locations-datalist"
                      placeholder="Type location to exclude and press Add..."
                      value={excludedLocationInput}
                      onChange={(e) => setExcludedLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExcludedLocation();
                        }
                      }}
                      className="form-input"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddExcludedLocation()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Targeting: Broad vs Interest */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Targeting *</label>
                    <select
                      value={targeting}
                      onChange={(e) => {
                        setTargeting(e.target.value);
                        setAdSetErrors((p) => ({ ...p, interests: null }));
                      }}
                      className="form-select"
                      required
                    >
                      <option value="Broad">Broad</option>
                      <option value="Interest">Interest</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ad Set Launch Date</label>
                    <input
                      type="date"
                      value={adSetLaunchDate}
                      onChange={(e) => setAdSetLaunchDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* If Interest: Mention Interests */}
                {targeting === 'Interest' && (
                  <div className="form-group">
                    <label className="form-label">Mention Interests *</label>
                    <div className="multi-tag-container">
                      {interests.map((item) => (
                        <span key={item} className="tag-chip tag-chip-brand">
                          {item}
                          <button type="button" onClick={() => handleRemoveInterest(item)}>
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input
                        type="text"
                        placeholder="Type interest and press Add (e.g. Fitness, E-commerce)..."
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInterest();
                          }
                        }}
                        className="form-input"
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={handleAddInterest}>
                        Add
                      </Button>
                    </div>
                    {adSetErrors.interests && <span className="field-error">{adSetErrors.interests}</span>}
                  </div>
                )}

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={partOfCurrentCycle}
                      onChange={(e) => setPartOfCurrentCycle(e.target.checked)}
                    />
                    <span>Part of current testing cycle</span>
                  </label>
                </div>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="confirmation-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={adSetConfirmed}
                  onChange={(e) => {
                    setAdSetConfirmed(e.target.checked);
                    if (e.target.checked) setAdSetErrors((p) => ({ ...p, adSetConfirmed: null }));
                  }}
                  id="adset-confirm-check"
                />
                <span>I've added the accurate details here</span>
              </label>
              {adSetErrors.adSetConfirmed && (
                <span className="field-error">{adSetErrors.adSetConfirmed}</span>
              )}
            </div>

            {/* Stepper Buttons */}
            <div className="wizard-footer-buttons">
              <Button variant="ghost" type="button" onClick={() => setCurrentStep(1)}>
                ← Back
              </Button>
              <Button variant="primary" type="submit" disabled={!adSetConfirmed}>
                Next →
              </Button>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* STEP 3: AD DETAILS / CREATIVE DETAILS */}
        {/* ==================================================== */}
        {currentStep === 3 && (
          <form onSubmit={handleNextFromStep3} className="wizard-step-form">
            <h3 className="section-title">Step 3 — Ad / Creative Details</h3>

            <div className="form-group">
              <label className="form-label">Ad Name *</label>
              <input
                type="text"
                placeholder="e.g. 001 | Catalog | Proven Winners | 60-90D"
                value={adName}
                onChange={(e) => {
                  setAdName(e.target.value);
                  setCreativeErrors((p) => ({ ...p, adName: null }));
                }}
                className="form-input"
                required
              />
              {creativeErrors.adName && <span className="field-error">{creativeErrors.adName}</span>}
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Ad Type *</label>
                <select
                  value={adType}
                  onChange={(e) => setAdType(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="Static">Static</option>
                  <option value="Video">Video</option>
                  <option value="Carousel">Carousel</option>
                  <option value="Catalog">Catalog</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Testing Style *</label>
                <select
                  value={testingStyle}
                  onChange={(e) => setTestingStyle(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="New Angle">New Angle</option>
                  <option value="Iteration #1">Iteration #1</option>
                  <option value="Iteration #2">Iteration #2</option>
                  <option value="Iteration #3">Iteration #3</option>
                  <option value="Variation #1">Variation #1</option>
                  <option value="Other">Other (Custom)</option>
                </select>
                {testingStyle === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom testing style..."
                    value={customTestingStyle}
                    onChange={(e) => setCustomTestingStyle(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '6px' }}
                    required
                  />
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Landing Page URL</label>
              <input
                type="url"
                placeholder="https://clientbrand.com/products/summer-sale"
                value={landingPageUrl}
                onChange={(e) => {
                  setLandingPageUrl(e.target.value);
                  setCreativeErrors((p) => ({ ...p, landingPageUrl: null }));
                }}
                className="form-input"
              />
              {creativeErrors.landingPageUrl && (
                <span className="field-error">{creativeErrors.landingPageUrl}</span>
              )}
            </div>

            {/* CREATIVE UPLOAD AREA (Max 20 files) */}
            <div className="form-group">
              <div className="upload-header-row">
                <label className="form-label">Upload Creatives (Maximum 20 files)</label>
                <span className="upload-count-tag">{uploadedFiles.length} / 20 uploaded</span>
              </div>

              <div
                className="upload-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                  accept="image/*,video/*"
                />
                <div className="dropzone-content">
                  <span className="dropzone-icon">📁</span>
                  <p className="dropzone-title">
                    Drag & Drop creative files here, or <span className="browse-link">Browse files</span>
                  </p>
                  <p className="dropzone-subtitle">Supported formats: Images (PNG, JPG, WEBP), Videos. Max 15MB each.</p>
                </div>
              </div>

              {creativeErrors.uploads && <span className="field-error">{creativeErrors.uploads}</span>}

              {/* Uploaded Files Previews / List */}
              {uploadedFiles.length > 0 && (
                <div className="uploaded-files-strip">
                  {uploadedFiles.map((file, idx) => (
                    <div key={file.tempId || file.fileId || idx} className="upload-thumbnail-card">
                      {file.url ? (
                        file.mimeType?.startsWith('video') ? (
                          <div className="video-thumb-placeholder">🎬 Video</div>
                        ) : (
                          <img src={file.url} alt={file.name} className="thumb-img" />
                        )
                      ) : (
                        <div className="thumb-spinner">⏳</div>
                      )}

                      <div className="thumb-details">
                        <span className="thumb-name" title={file.name}>
                          {file.name}
                        </span>
                        {file.status === 'uploading' && <span className="status-text uploading">Uploading...</span>}
                        {file.status === 'error' && (
                          <button
                            type="button"
                            className="retry-btn"
                            onClick={() => handleRetryUpload(file)}
                          >
                            Retry
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        className="thumb-remove-btn"
                        onClick={() => handleRemoveUploadedFile(file)}
                        title="Remove file"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Launch & Observation Duration */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Launch Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={creativeLaunchDate}
                  onChange={(e) => setCreativeLaunchDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observation Duration</label>
                <select
                  value={
                    schedulingMode === 'CUSTOM_DUE_DATE'
                      ? 'CUSTOM_DUE'
                      : [24, 48, 72].includes(Number(observationDurationHours))
                      ? String(observationDurationHours)
                      : 'CUSTOM_HOURS'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'CUSTOM_DUE') {
                      setSchedulingMode('CUSTOM_DUE_DATE');
                    } else if (val === 'CUSTOM_HOURS') {
                      setSchedulingMode('DURATION');
                      setObservationDurationHours(36);
                    } else {
                      setSchedulingMode('DURATION');
                      setObservationDurationHours(Number(val));
                    }
                  }}
                  className="form-select"
                >
                  <option value="72">72 Hours (Standard)</option>
                  <option value="48">48 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="CUSTOM_HOURS">Custom Duration (Hours)</option>
                  <option value="CUSTOM_DUE">Custom Due Date & Time</option>
                </select>
              </div>
            </div>

            {schedulingMode === 'CUSTOM_DUE_DATE' && (
              <div className="form-group">
                <label className="form-label">Custom Report Due Date & Time *</label>
                <input
                  type="datetime-local"
                  value={customReportDueDate}
                  onChange={(e) => setCustomReportDueDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            )}

            {/* Assignments (Optional initial assignments) */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Assign Media Buyer</label>
                <select
                  value={assignedMediaBuyer}
                  onChange={(e) => setAssignedMediaBuyer(e.target.value)}
                  className="form-select"
                >
                  <option value="">Unassigned</option>
                  {mediaBuyers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.role === 'admin' ? '(Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Creative Strategist</label>
                <select
                  value={assignedCreativeStrategist}
                  onChange={(e) => setAssignedCreativeStrategist(e.target.value)}
                  className="form-select"
                >
                  <option value="">Unassigned</option>
                  {creativeStrategists.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.role === 'admin' ? '(Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="confirmation-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={creativeConfirmed}
                  onChange={(e) => {
                    setCreativeConfirmed(e.target.checked);
                    if (e.target.checked) setCreativeErrors((p) => ({ ...p, creativeConfirmed: null }));
                  }}
                  id="creative-confirm-check"
                />
                <span>I've added the accurate details here</span>
              </label>
              {creativeErrors.creativeConfirmed && (
                <span className="field-error">{creativeErrors.creativeConfirmed}</span>
              )}
            </div>

            {/* Stepper Buttons */}
            <div className="wizard-footer-buttons">
              <Button variant="ghost" type="button" onClick={() => setCurrentStep(2)}>
                ← Back
              </Button>
              <Button variant="primary" type="submit" disabled={!creativeConfirmed || isUploading}>
                Review Details →
              </Button>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* STEP 4: FINAL REVIEW */}
        {/* ==================================================== */}
        {currentStep === 4 && (
          <div className="wizard-step-form">
            <h3 className="section-title">Final Review</h3>
            <p className="section-subtitle">
              Verify your setup before creating the complete Creative Strategy hierarchy.
            </p>

            <div className="review-cards-container">
              {/* CLIENT & CAMPAIGN */}
              <div className="review-card">
                <div className="review-card-header">
                  <span className="badge-tag">CAMPAIGN</span>
                  {isNewCampaign ? (
                    <span className="status-pill status-new">+ New Campaign</span>
                  ) : (
                    <span className="status-pill status-existing">Existing Campaign</span>
                  )}
                </div>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Client:</span>
                    <strong className="review-val">{selectedClientObj?.name || 'N/A'}</strong>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Campaign Name:</span>
                    <strong className="review-val">
                      {isNewCampaign ? campaignName : activeExistingCampaign?.name || 'N/A'}
                    </strong>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Campaign Type:</span>
                    <strong className="review-val">{effectiveCampaignType}</strong>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Objective:</span>
                    <strong className="review-val">
                      {isNewCampaign ? campaignObjective : activeExistingCampaign?.objective || 'Sales'}
                    </strong>
                  </div>
                  {effectiveCampaignType === 'CBO' && (
                    <div className="review-item">
                      <span className="review-label">Campaign Budget:</span>
                      <strong className="review-val">
                        {isNewCampaign
                          ? `₹${campaignBudget}`
                          : activeExistingCampaign?.budget
                          ? `₹${activeExistingCampaign.budget}`
                          : 'Managed at campaign level'}
                      </strong>
                    </div>
                  )}
                  <div className="review-item">
                    <span className="review-label">Launch Date:</span>
                    <strong className="review-val">
                      {isNewCampaign
                        ? campaignLaunchDate || 'None'
                        : activeExistingCampaign?.launchDate
                        ? new Date(activeExistingCampaign.launchDate).toLocaleDateString()
                        : 'None'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* AD SET */}
              <div className="review-card">
                <div className="review-card-header">
                  <span className="badge-tag">AD SET</span>
                  {isNewAdSet ? (
                    <span className="status-pill status-new">+ New Ad Set</span>
                  ) : (
                    <span className="status-pill status-existing">Existing Ad Set</span>
                  )}
                </div>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Ad Set Name:</span>
                    <strong className="review-val">
                      {isNewAdSet ? adSetName : selectedAdSetObj?.name || 'N/A'}
                    </strong>
                  </div>
                  {isNewAdSet && (
                    <>
                      <div className="review-item">
                        <span className="review-label">Age Range:</span>
                        <strong className="review-val">{ageStart} — {ageEnd}</strong>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Gender:</span>
                        <strong className="review-val">{gender}</strong>
                      </div>
                      {effectiveCampaignType === 'ABO' && (
                        <div className="review-item">
                          <span className="review-label">Ad Set Budget:</span>
                          <strong className="review-val">₹{adSetBudget}</strong>
                        </div>
                      )}
                      <div className="review-item">
                        <span className="review-label">Targeting:</span>
                        <strong className="review-val">{targeting}</strong>
                      </div>
                      {targeting === 'Interest' && (
                        <div className="review-item">
                          <span className="review-label">Interests:</span>
                          <strong className="review-val">{interests.join(', ') || 'None'}</strong>
                        </div>
                      )}
                      <div className="review-item">
                        <span className="review-label">Included Locations:</span>
                        <strong className="review-val">
                          {includedLocations.length > 0 ? includedLocations.join(', ') : 'All'}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* CREATIVE */}
              <div className="review-card">
                <div className="review-card-header">
                  <span className="badge-tag">AD / CREATIVE</span>
                  <span className="status-pill status-new">+ New Creative</span>
                </div>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Ad Name:</span>
                    <strong className="review-val">{adName}</strong>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Ad Type:</span>
                    <strong className="review-val">{adType}</strong>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Testing Style:</span>
                    <strong className="review-val">
                      {testingStyle === 'Other' ? customTestingStyle : testingStyle}
                    </strong>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Landing Page:</span>
                    <strong className="review-val">{landingPageUrl || 'None specified'}</strong>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Uploaded Files:</span>
                    <strong className="review-val">{uploadedFiles.length} file(s)</strong>
                  </div>
                </div>

                {/* Uploaded thumbnails preview in review */}
                {uploadedFiles.length > 0 && (
                  <div className="review-thumbs-row">
                    {uploadedFiles.map((f, i) => (
                      <div key={f.fileId || i} className="review-thumb-mini">
                        {f.url && !f.mimeType?.startsWith('video') ? (
                          <img src={f.url} alt={f.name} />
                        ) : (
                          <div className="thumb-placeholder-mini">🎬</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="wizard-footer-buttons">
              <Button variant="ghost" type="button" onClick={() => setCurrentStep(3)} disabled={isSubmitting}>
                ← Back
              </Button>
              <Button variant="primary" type="button" onClick={handleFinalCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating Hierarchy...' : 'Create Creative'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
