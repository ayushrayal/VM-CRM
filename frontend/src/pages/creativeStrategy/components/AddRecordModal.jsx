import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';

export const AddRecordModal = ({
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
  defaultCampaignId = '',
  defaultAdSetId = '',
  onSubmit
}) => {
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [campaignId, setCampaignId] = useState(defaultCampaignId || '');
  const [adSetId, setAdSetId] = useState(defaultAdSetId || '');
  const [creativeName, setCreativeName] = useState('');
  const [cycleNumber, setCycleNumber] = useState(1);
  const [currentTestingCycle, setCurrentTestingCycle] = useState('Cycle 1');

  // Launch timing & Observation duration
  const [launchDate, setLaunchDate] = useState('');
  const [observationDurationHours, setObservationDurationHours] = useState(72);

  // Planning Dates
  const [nextAssetDueDate, setNextAssetDueDate] = useState('');
  const [creativePrepDue, setCreativePrepDue] = useState('');
  const [jointPrepDue, setJointPrepDue] = useState('');
  const [atApprovalDue, setAtApprovalDue] = useState('');
  const [plannedLaunchDate, setPlannedLaunchDate] = useState('');

  // Assignments
  const [assignedMediaBuyer, setAssignedMediaBuyer] = useState('');
  const [assignedCreativeStrategist, setAssignedCreativeStrategist] = useState('');
  const [assignedGraphicDesigner, setAssignedGraphicDesigner] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Admins allowed in role assignments
  const availableMediaBuyers = useMemo(() => {
    const admins = allUsers.filter((u) => u.role === 'admin');
    const map = new Map();
    [...mediaBuyers, ...admins].forEach((u) => map.set(u._id, u));
    return Array.from(map.values());
  }, [mediaBuyers, allUsers]);

  const availableCreativeStrategists = useMemo(() => {
    const admins = allUsers.filter((u) => u.role === 'admin');
    const map = new Map();
    [...creativeStrategists, ...admins].forEach((u) => map.set(u._id, u));
    return Array.from(map.values());
  }, [creativeStrategists, allUsers]);

  const availableGraphicDesigners = useMemo(() => {
    const admins = allUsers.filter((u) => u.role === 'admin');
    const map = new Map();
    [...graphicDesigners, ...admins].forEach((u) => map.set(u._id, u));
    return Array.from(map.values());
  }, [graphicDesigners, allUsers]);

  // Recommendations & Strategy
  const [mediaBuyerRecommendation, setMediaBuyerRecommendation] = useState('');
  const [creativeStrategistRecommendation, setCreativeStrategistRecommendation] = useState('');
  const [creativesProposed, setCreativesProposed] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [abhishekDecision, setAbhishekDecision] = useState('PENDING');
  const [finalAssetConfiguration, setFinalAssetConfiguration] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync defaults
  useEffect(() => {
    if (defaultClientId) setClientId(defaultClientId);
    else if (clients[0]?._id && !clientId) setClientId(clients[0]._id);
  }, [defaultClientId, clients]);

  useEffect(() => {
    if (defaultCampaignId) setCampaignId(defaultCampaignId);
  }, [defaultCampaignId]);

  useEffect(() => {
    if (defaultAdSetId) setAdSetId(defaultAdSetId);
  }, [defaultAdSetId]);

  // Filtered campaigns for selected client
  const filteredCampaigns = clientId
    ? campaigns.filter((c) => (c.client?._id || c.client) === clientId)
    : campaigns;

  // Filtered adSets for selected campaign
  const filteredAdSets = campaignId
    ? adSets.filter((a) => (a.campaign?._id || a.campaign) === campaignId)
    : adSets;

  const handleCycleChange = (num) => {
    setCycleNumber(num);
    setCurrentTestingCycle(`Cycle ${num}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      setError('Client is required');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        clientId,
        campaignId: campaignId || null,
        adSetId: adSetId || null,
        creativeName: creativeName.trim() || creativesProposed.trim() || 'Creative #1',
        cycleNumber: Number(cycleNumber) || 1,
        currentTestingCycle,

        launchDate: launchDate ? new Date(launchDate).toISOString() : null,
        observationDurationHours: Number(observationDurationHours) || 72,

        nextAssetDueDate: nextAssetDueDate ? new Date(nextAssetDueDate).toISOString() : null,
        creativePrepDue: creativePrepDue ? new Date(creativePrepDue).toISOString() : null,
        jointPrepDue: jointPrepDue ? new Date(jointPrepDue).toISOString() : null,
        atApprovalDue: atApprovalDue ? new Date(atApprovalDue).toISOString() : null,
        plannedLaunchDate: plannedLaunchDate ? new Date(plannedLaunchDate).toISOString() : null,

        assignedMediaBuyer: assignedMediaBuyer || null,
        assignedCreativeStrategist: assignedCreativeStrategist || null,
        assignedGraphicDesigner: assignedGraphicDesigner || null,
        assignedTo: assignedTo || null,

        mediaBuyerRecommendation: mediaBuyerRecommendation.trim(),
        creativeStrategistRecommendation: creativeStrategistRecommendation.trim(),
        creativesProposed: creativesProposed.trim() || creativeName.trim() || 'Creative #1',
        hypothesis: hypothesis.trim(),
        abhishekDecision,
        finalAssetConfiguration: finalAssetConfiguration.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Creative / Testing Cycle Record">
      <form onSubmit={handleSubmit} className="modal-form" style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '8px' }}>
        {error && <div style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</div>}

        {/* Section A: Hierarchy */}
        <h4 style={{ color: '#000000', fontSize: '0.875rem', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
          A. Campaign / Launch Hierarchy
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Creative Name / Concept *</label>
            <input
              type="text"
              value={creativeName}
              onChange={(e) => setCreativeName(e.target.value)}
              placeholder="e.g. Creative #1 — UGC Testimonial Hook"
              required
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Client *</label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setCampaignId('');
                setAdSetId('');
              }}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
              required
            >
              <option value="">Select Client...</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Campaign</label>
            <select
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setAdSetId('');
              }}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            >
              <option value="">Select Campaign (optional)...</option>
              {filteredCampaigns.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Ad Set</label>
            <select
              value={adSetId}
              onChange={(e) => setAdSetId(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            >
              <option value="">Select Ad Set (optional)...</option>
              {filteredAdSets.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Cycle Number</label>
            <input
              type="number"
              min="1"
              value={cycleNumber}
              onChange={(e) => handleCycleChange(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
        </div>

        {/* Section B: Planning Dates */}
        <h4 style={{ color: '#000000', fontSize: '0.875rem', fontWeight: 700, margin: '16px 0 10px', textTransform: 'uppercase' }}>
          B. Creative Strategy Planning Dates
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Next Asset Due Date</label>
            <input
              type="date"
              value={nextAssetDueDate}
              onChange={(e) => setNextAssetDueDate(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Creative Prep Due</label>
            <input
              type="date"
              value={creativePrepDue}
              onChange={(e) => setCreativePrepDue(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Joint Prep Due</label>
            <input
              type="date"
              value={jointPrepDue}
              onChange={(e) => setJointPrepDue(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>AT Approval Due</label>
            <input
              type="date"
              value={atApprovalDue}
              onChange={(e) => setAtApprovalDue(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Planned Launch Date</label>
            <input
              type="date"
              value={plannedLaunchDate}
              onChange={(e) => setPlannedLaunchDate(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Launch Date & Time (Optional)</label>
            <input
              type="datetime-local"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Observation Duration (Hours)</label>
            <input
              type="number"
              min="1"
              value={observationDurationHours}
              onChange={(e) => setObservationDurationHours(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
        </div>

        {/* Section C & D: Assignments */}
        <h4 style={{ color: '#000000', fontSize: '0.875rem', fontWeight: 700, margin: '16px 0 10px', textTransform: 'uppercase' }}>
          C. Role Assignments
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>
              Media Buyer (teamRole: media_buyer)
            </label>
            <select
              value={assignedMediaBuyer}
              onChange={(e) => setAssignedMediaBuyer(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            >
              <option value="">Unassigned</option>
              {availableMediaBuyers.map((u) => (
                <option key={u._id} value={u._id}>{u.name} {u.role === 'admin' ? '(Admin)' : `(${u.email})`}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>
              Creative Strategist (teamRole: creative_strategist)
            </label>
            <select
              value={assignedCreativeStrategist}
              onChange={(e) => setAssignedCreativeStrategist(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            >
              <option value="">Unassigned</option>
              {availableCreativeStrategists.map((u) => (
                <option key={u._id} value={u._id}>{u.name} {u.role === 'admin' ? '(Admin)' : `(${u.email})`}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>
              Graphic Designer (teamRole: graphic_designer)
            </label>
            <select
              value={assignedGraphicDesigner}
              onChange={(e) => setAssignedGraphicDesigner(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            >
              <option value="">Unassigned</option>
              {availableGraphicDesigners.map((u) => (
                <option key={u._id} value={u._id}>{u.name} {u.role === 'admin' ? '(Admin)' : `(${u.email})`}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>
              Assigned To (Overall Owner)
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            >
              <option value="">Unassigned</option>
              {allUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.teamRole || u.role})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section E: Strategy & Notes */}
        <h4 style={{ color: '#000000', fontSize: '0.875rem', fontWeight: 700, margin: '16px 0 10px', textTransform: 'uppercase' }}>
          D. Strategy & Recommendations
        </h4>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Creatives Proposed</label>
          <input
            type="text"
            value={creativesProposed}
            onChange={(e) => setCreativesProposed(e.target.value)}
            placeholder="e.g. 3 UGC Videos, 2 Static Hooks"
            style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Hypothesis</label>
          <textarea
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            rows={2}
            placeholder="What are we testing and why?"
            style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Abhishek Decision</label>
            <select
              value={abhishekDecision}
              onChange={(e) => setAbhishekDecision(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="REVISION_REQUESTED">REVISION REQUESTED</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#5A5B52', fontWeight: 600 }}>Final Asset Configuration</label>
            <input
              type="text"
              value={finalAssetConfiguration}
              onChange={(e) => setFinalAssetConfiguration(e.target.value)}
              placeholder="e.g. 4:5 UGC + 9:16 Story"
              style={{ width: '100%', padding: '8px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
