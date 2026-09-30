import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getClients,
  createClient,
  deleteClient
} from '../../api/client.api';
import {
  getCampaigns,
  createCampaign,
  deleteCampaign
} from '../../api/campaign.api';
import {
  getAdSets,
  createAdSet,
  deleteAdSet
} from '../../api/adSet.api';
import {
  getCreativeStrategies,
  createCreativeStrategy,
  updateCreativeStrategy,
  deleteCreativeStrategy
} from '../../api/creativeStrategy.api';
import { getTeamMembers } from '../../api/user.api';
import { getStreamUrl } from '../../api/axios';

import { StatusBadge } from './components/StatusBadge';
import { RecordDrawer } from './components/RecordDrawer';
import { AddClientModal } from './components/AddClientModal';
import { DeleteClientModal } from './components/DeleteClientModal';
import { AddCampaignModal } from './components/AddCampaignModal';
import { DeleteCampaignModal } from './components/DeleteCampaignModal';
import { AddAdSetModal } from './components/AddAdSetModal';
import { DeleteAdSetModal } from './components/DeleteAdSetModal';
import { AddRecordModal } from './components/AddRecordModal';
import { DeleteCreativeModal } from './components/DeleteCreativeModal';

import { formatDate, formatDateTime, formatDurationMs } from '../../utils/dateUtils';
import { Button } from '../../components/common/Button';
import './CreativeStrategyPage.scss';

export const CreativeStrategyPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();

  // Core Data States
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [adSets, setAdSets] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('all');

  // Team Member Lists
  const [mediaBuyers, setMediaBuyers] = useState([]);
  const [creativeStrategists, setCreativeStrategists] = useState([]);
  const [graphicDesigners, setGraphicDesigners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // UI / Controls
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'ARCHIVED'
  const [now, setNow] = useState(Date.now());

  // Selected Record & Drawer
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const [isAddCampaignOpen, setIsAddCampaignOpen] = useState(false);
  const [isDeleteCampaignOpen, setIsDeleteCampaignOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  const [isAddAdSetOpen, setIsAddAdSetOpen] = useState(false);
  const [isDeleteAdSetOpen, setIsDeleteAdSetOpen] = useState(false);
  const [adSetToDelete, setAdSetToDelete] = useState(null);

  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [isDeleteCreativeOpen, setIsDeleteCreativeOpen] = useState(false);
  const [creativeToDelete, setCreativeToDelete] = useState(null);

  // Timer interval for real-time 72h countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial Data Load
  useEffect(() => {
    loadAllData();
    loadTeamMembers();
  }, []);

  // Auto-open record from URL parameter (e.g. from notification link)
  useEffect(() => {
    const recordIdFromUrl = searchParams.get('recordId');
    if (recordIdFromUrl && records.length > 0) {
      const match = records.find((r) => r._id === recordIdFromUrl);
      if (match) {
        setSelectedRecord(match);
        setIsDrawerOpen(true);
      }
    }
  }, [searchParams, records]);

  // Listen to custom event from NotificationBell click
  useEffect(() => {
    const handleOpenRecordEvent = (e) => {
      const recId = e.detail?.recordId;
      if (recId) {
        const match = records.find((r) => r._id === recId);
        if (match) {
          setSelectedRecord(match);
          setIsDrawerOpen(true);
        }
      }
    };

    window.addEventListener('OPEN_CREATIVE_RECORD', handleOpenRecordEvent);
    return () => window.removeEventListener('OPEN_CREATIVE_RECORD', handleOpenRecordEvent);
  }, [records]);

  // SSE Subscription for live real-time sync
  useEffect(() => {
    let sse;
    try {
      sse = new EventSource(getStreamUrl('/creative-strategy/stream'), { withCredentials: true });

      sse.addEventListener('CLIENT_CREATED', () => loadClients());
      sse.addEventListener('CLIENT_UPDATED', () => loadClients());
      sse.addEventListener('CLIENT_DELETED', () => {
        loadClients();
        loadRecords();
      });

      sse.addEventListener('CAMPAIGN_CREATED', () => loadCampaigns());
      sse.addEventListener('CAMPAIGN_UPDATED', () => {
        loadCampaigns();
        loadRecords();
      });
      sse.addEventListener('CAMPAIGN_DELETED', () => {
        loadCampaigns();
        loadRecords();
      });

      sse.addEventListener('AD_SET_CREATED', () => loadAdSets());
      sse.addEventListener('AD_SET_UPDATED', () => {
        loadAdSets();
        loadRecords();
      });
      sse.addEventListener('AD_SET_DELETED', () => {
        loadAdSets();
        loadRecords();
      });

      sse.addEventListener('CREATIVE_STRATEGY_CREATED', (e) => {
        try {
          const newRecord = JSON.parse(e.data);
          setRecords((prev) => [newRecord, ...prev.filter((r) => r._id !== newRecord._id)]);
        } catch {
          loadRecords();
        }
      });

      sse.addEventListener('CREATIVE_STRATEGY_UPDATED', (e) => {
        try {
          const updated = JSON.parse(e.data);
          setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
          if (selectedRecord?._id === updated._id) {
            setSelectedRecord(updated);
          }
        } catch {
          loadRecords();
        }
      });

      sse.addEventListener('CREATIVE_STRATEGY_DELETED', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          setRecords((prev) => prev.filter((r) => r._id !== id));
          if (selectedRecord?._id === id) {
            setIsDrawerOpen(false);
            setSelectedRecord(null);
          }
        } catch {
          loadRecords();
        }
      });
    } catch (err) {
      console.error('SSE initialization error', err);
    }

    return () => {
      if (sse) sse.close();
    };
  }, [selectedRecord?._id]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadClients(), loadCampaigns(), loadAdSets(), loadRecords()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data || []);
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const data = await getCampaigns();
      setCampaigns(data || []);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    }
  };

  const loadAdSets = async () => {
    try {
      const data = await getAdSets();
      setAdSets(data || []);
    } catch (err) {
      console.error('Failed to load ad sets', err);
    }
  };

  const loadRecords = async () => {
    try {
      const res = await getCreativeStrategies({ limit: 500 });
      setRecords(res.records || []);
    } catch (err) {
      console.error('Failed to load creative strategies', err);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const [mb, cs, gd, all] = await Promise.all([
        getTeamMembers('media_buyer'),
        getTeamMembers('creative_strategist'),
        getTeamMembers('graphic_designer'),
        getTeamMembers('all')
      ]);
      setMediaBuyers(mb || []);
      setCreativeStrategists(cs || []);
      setGraphicDesigners(gd || []);
      setAllUsers(all || []);
    } catch (err) {
      console.error('Failed to load team members', err);
    }
  };

  // Handlers for Modals & Deletions
  const handleCreateClientSubmit = async (data) => {
    const created = await createClient(data);
    await loadClients();
    setSelectedClientId(created._id);
  };

  const handleDeleteClientConfirm = async (clientId) => {
    await deleteClient(clientId);
    await loadClients();
    await loadCampaigns();
    await loadAdSets();
    await loadRecords();
    if (selectedClientId === clientId) {
      setSelectedClientId('all');
    }
  };

  const handleCreateCampaignSubmit = async (data) => {
    await createCampaign(data);
    await loadCampaigns();
  };

  const handleDeleteCampaignConfirm = async (campaignId) => {
    await deleteCampaign(campaignId);
    await loadCampaigns();
    await loadAdSets();
    await loadRecords();
  };

  const handleCreateAdSetSubmit = async (data) => {
    await createAdSet(data);
    await loadAdSets();
  };

  const handleDeleteAdSetConfirm = async (adSetId) => {
    await deleteAdSet(adSetId);
    await loadAdSets();
    await loadRecords();
  };

  const handleCreateRecordSubmit = async (data) => {
    const created = await createCreativeStrategy(data);
    await loadRecords();
    setSelectedRecord(created);
    setIsDrawerOpen(true);
  };

  const handleDeleteCreativeConfirm = async (recordId) => {
    await deleteCreativeStrategy(recordId);
    await loadRecords();
    if (selectedRecord?._id === recordId) {
      setIsDrawerOpen(false);
      setSelectedRecord(null);
    }
  };

  const handleUpdateRecord = async (id, updateData) => {
    const updated = await updateCreativeStrategy(id, updateData);
    setRecords((prev) => prev.map((r) => (r._id === id ? updated : r)));
    if (selectedRecord?._id === id) {
      setSelectedRecord(updated);
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  // Dynamic next action description
  const getNextActionText = (r) => {
    if (r.status === 'PAUSED') return 'Creative Paused';
    if (r.status === 'PENDING_LAUNCH') return 'Launch Creative (MB)';
    if (r.status === 'LAUNCHED') {
      const elapsedHours = r.launchedAt
        ? (Date.now() - new Date(r.launchedAt).getTime()) / (1000 * 60 * 60)
        : 0;
      if (elapsedHours < 72) {
        return `72h Observation (${Math.ceil(72 - elapsedHours)}h left)`;
      }
      return 'Submit 72h Report (MB)';
    }
    if (r.status === 'PENDING_REPORT') return 'Submit 72h Report (MB)';
    if (r.status === 'REPORT_SUBMITTED') return 'Analyze Performance & Write Learnings (CS)';
    if (r.status === 'LEARNINGS_SUBMITTED') return 'Create Brief (GD)';
    if (r.status === 'BRIEF_SUBMITTED') return 'Review Brief (CS)';
    if (r.status === 'BRIEF_APPROVED' || r.status === 'PRODUCTION') return 'Submit Creative Asset (GD)';
    if (r.status === 'INTERNAL_REVIEW') return 'Internal Quality Review (CS)';
    if (r.status === 'CLIENT_REVIEW') return 'Final Sign-Off (Abhishek Sir)';
    if (r.status === 'CLIENT_APPROVED' || r.status === 'READY_TO_LAUNCH' || r.status === 'HANDOFF') {
      return 'Record Launch & Start Next Cycle (MB)';
    }
    if (r.status === 'REVISION_REQUESTED') {
      if (r.briefStatus === 'REVISE' || r.briefStatus === 'REJECTED') {
        return 'Revise & Re-Submit Brief (GD)';
      }
      return 'Revise & Re-Submit Creative Asset (GD)';
    }
    if (r.status === 'COMPLETED') return 'Cycle Archived (Completed)';
    return 'Review Progress';
  };

  // Determine current active workflow owner
  const getCurrentOwner = (r) => {
    if (r.status === 'COMPLETED') return { role: 'None', name: 'Archived', bg: '#F1F5F9', color: '#64748B' };
    if (r.status === 'PAUSED') return { role: 'Admin', name: 'Paused', bg: '#FEF2F2', color: '#991B1B' };
    if (r.status === 'PENDING_LAUNCH' || r.status === 'LAUNCHED' || r.status === 'PENDING_REPORT') {
      return { role: 'Media Buyer', name: r.assignedMediaBuyer?.name || 'Unassigned', bg: '#EFF6FF', color: '#1D4ED8' };
    }
    if (r.status === 'REPORT_SUBMITTED' || r.status === 'BRIEF_SUBMITTED' || r.status === 'INTERNAL_REVIEW') {
      return { role: 'Creative Strategist', name: r.assignedCreativeStrategist?.name || 'Unassigned', bg: '#FDF4FF', color: '#A21CAF' };
    }
    if (r.status === 'LEARNINGS_SUBMITTED' || r.status === 'PRODUCTION') {
      return { role: 'Graphic Designer', name: r.assignedGraphicDesigner?.name || 'Unassigned', bg: '#F0FDF4', color: '#15803D' };
    }
    if (r.status === 'CLIENT_REVIEW') {
      return { role: 'Final Approver', name: 'Admin (Abhishek)', bg: '#FFFBEB', color: '#B45309' };
    }
    if (r.status === 'CLIENT_APPROVED' || r.status === 'READY_TO_LAUNCH' || r.status === 'HANDOFF') {
      return { role: 'Media Buyer', name: r.assignedMediaBuyer?.name || 'Unassigned', bg: '#EFF6FF', color: '#1D4ED8' };
    }
    if (r.status === 'REVISION_REQUESTED') {
      return { role: 'Graphic Designer', name: r.assignedGraphicDesigner?.name || 'Unassigned', bg: '#FFF7ED', color: '#C2410C' };
    }
    return { role: 'Team', name: 'Unassigned', bg: '#F4F4EE', color: '#5A5B52' };
  };

  // Filtered Records based on Client tab, Search, Cycle and Status
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Client Filter
      if (selectedClientId !== 'all') {
        const cId = r.client?._id || r.client;
        if (cId !== selectedClientId) return false;
      }

      // Cycle Filter
      if (cycleFilter === 'ACTIVE' && r.status === 'COMPLETED') return false;
      if (cycleFilter === 'ARCHIVED' && r.status !== 'COMPLETED') return false;

      // Status Filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const clientName = r.client?.name?.toLowerCase() || '';
        const campaignName = r.campaignName?.toLowerCase() || '';
        const adSetName = r.currentAdSetName?.toLowerCase() || '';
        const creativeName = (r.creativeName || r.creativesProposed || '').toLowerCase();
        const cycle = (r.currentTestingCycle || '').toLowerCase();

        return (
          clientName.includes(term) ||
          campaignName.includes(term) ||
          adSetName.includes(term) ||
          creativeName.includes(term) ||
          cycle.includes(term)
        );
      }

      return true;
    });
  }, [records, selectedClientId, cycleFilter, statusFilter, searchTerm]);

  // Client counts
  const clientCounts = useMemo(() => {
    const counts = {};
    for (const r of records) {
      const cId = r.client?._id || r.client;
      counts[cId] = (counts[cId] || 0) + 1;
    }
    return counts;
  }, [records]);

  const activeClientObj = clients.find((c) => c._id === selectedClientId);

  return (
    <div className="creative-strategy-page">
      {/* 1. TOP HERO HEADER */}
      <section className="page-hero-header">
        <div className="header-titles">
          <h1 className="page-title">Creative Strategy</h1>
          <p className="page-subtitle">
            Review performance, analyze creatives, manage learnings and move approved creatives toward launch.
          </p>
        </div>
      </section>

      {/* 2. DYNAMIC CLIENT TABS BAR */}
      <section className="client-tabs-bar">
        <div className="tabs-scroll-container">
          <button
            type="button"
            className={`client-tab-chip ${selectedClientId === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedClientId('all')}
          >
            All Clients
            <span className="count-pill">{records.length}</span>
          </button>

          {clients.map((c) => (
            <button
              key={c._id}
              type="button"
              className={`client-tab-chip ${selectedClientId === c._id ? 'active' : ''}`}
              onClick={() => setSelectedClientId(c._id)}
            >
              {c.name}
              <span className="count-pill">{clientCounts[c._id] || 0}</span>
            </button>
          ))}

          {isAdmin && (
            <button
              type="button"
              className="client-tab-chip add-client-btn"
              onClick={() => setIsAddClientOpen(true)}
            >
              + Add Client
            </button>
          )}
        </div>

        {isAdmin && selectedClientId !== 'all' && activeClientObj && (
          <div className="client-admin-actions">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setClientToDelete(activeClientObj);
                setIsDeleteClientOpen(true);
              }}
            >
              Delete Client
            </Button>
          </div>
        )}
      </section>

      {/* 3. WORKSPACE ACTION TOOLBAR */}
      <section className="workspace-toolbar">
        <div className="toolbar-left">
          {isAdmin && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddRecordOpen(true)}
              >
                + Add Creative
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddCampaignOpen(true)}
              >
                + Add Campaign
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddAdSetOpen(true)}
              >
                + Add Ad Set
              </Button>
            </>
          )}
        </div>

        <div className="toolbar-right">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search hierarchy, creative..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
          >
            <option value="ALL">All Cycles</option>
            <option value="ACTIVE">⚡ Active Cycles Only</option>
            <option value="ARCHIVED">📁 Archived Cycles Only</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Stages</option>
            <option value="PENDING_LAUNCH">Pending Launch</option>
            <option value="LAUNCHED">Launched / 72H Active</option>
            <option value="REPORT_SUBMITTED">Report Ready</option>
            <option value="LEARNINGS_SUBMITTED">Brief Pending</option>
            <option value="BRIEF_SUBMITTED">Brief Submitted</option>
            <option value="PRODUCTION">In Production</option>
            <option value="INTERNAL_REVIEW">In Review</option>
            <option value="CLIENT_REVIEW">Final Approval</option>
            <option value="READY_TO_LAUNCH">Ready to Launch</option>
            <option value="REVISION_REQUESTED">Revision</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
      </section>

      {/* 4. WORKSPACE MAIN TABLE & HIERARCHY */}
      <main className="workspace-content-area">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8C8D82' }}>
            Loading creative strategy workspace...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="workspace-empty-container">
            <div className="empty-icon">📁</div>
            <h3 className="empty-title">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No matching creatives found'
                : selectedClientId !== 'all'
                ? 'No creatives yet for this client'
                : 'No creatives launched yet'}
            </h3>
            <p className="empty-desc">
              {isAdmin
                ? 'Start by creating a client, campaign, and ad set, then add a creative testing record.'
                : 'There are currently no active creative records in your filtered view.'}
            </p>
            {isAdmin && (
              <div className="empty-actions">
                <Button variant="primary" onClick={() => setIsAddRecordOpen(true)}>
                  + Add Creative
                </Button>
                <Button variant="secondary" onClick={() => setIsAddCampaignOpen(true)}>
                  + Add Campaign
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="workflow-table-container">
            <table className="workflow-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Campaign</th>
                  <th>Ad Set</th>
                  <th>Creative</th>
                  <th>Cycle</th>
                  <th>Current Stage</th>
                  <th>Current Owner</th>
                  <th>Launch Date</th>
                  <th>72-hour Report Due</th>
                  <th>Status</th>
                  <th>Next Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => {
                  const isLocked = r.status === 'LAUNCHED' && r.reportDueAt && now < new Date(r.reportDueAt).getTime();
                  const remainingMs = r.reportDueAt ? Math.max(0, new Date(r.reportDueAt).getTime() - now) : 0;

                  return (
                    <tr key={r._id} onClick={() => handleRowClick(r)}>
                      {/* Client */}
                      <td>
                        <span className="client-tag-badge">
                          {r.client?.code || r.client?.name || '—'}
                        </span>
                      </td>

                      {/* Campaign */}
                      <td>
                        <div className="campaign-cell-content">
                          <span className="campaign-name-text">
                            {r.campaignName || r.campaign?.name || '—'}
                          </span>
                          {r.campaignLaunchDate && (
                            <span className="campaign-date-sub">
                              Launched {formatDate(r.campaignLaunchDate)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ad Set */}
                      <td style={{ color: '#5A5B52', fontWeight: 500 }}>
                        {r.currentAdSetName || r.adSet?.name || '—'}
                      </td>

                      {/* Creative */}
                      <td>
                        <span className="creative-title-text">
                          {r.creativeName || r.creativesProposed || 'Creative'}
                        </span>
                      </td>

                      {/* Cycle - Clear ACTIVE vs ARCHIVED distinction */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            className="cycle-pill-badge"
                            style={{
                              background: r.status === 'COMPLETED' ? '#F1F5F9' : '#FEF9C3',
                              color: r.status === 'COMPLETED' ? '#64748B' : '#854D0E',
                              borderColor: r.status === 'COMPLETED' ? '#CBD5E1' : '#FDE047',
                              fontWeight: 700
                            }}
                          >
                            {r.currentTestingCycle || `Cycle ${r.cycleNumber || 1}`}
                          </span>
                          {r.status === 'COMPLETED' ? (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              📁 ARCHIVED
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              ● ACTIVE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Current Stage Badge */}
                      <td>
                        <StatusBadge status={r.status} record={r} />
                      </td>

                      {/* Current Owner */}
                      <td>
                        {(() => {
                          const owner = getCurrentOwner(r);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8C8D82', textTransform: 'uppercase' }}>
                                {owner.role}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  width: 'fit-content',
                                  background: owner.bg,
                                  color: owner.color
                                }}
                              >
                                {owner.name}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Launch Date */}
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDate(r.launchedAt || r.launchDate)}
                      </td>

                      {/* 72-hour Report Due */}
                      <td>
                        {r.status === 'LAUNCHED' && r.reportDueAt ? (
                          <div className="report-due-indicator">
                            <span className="due-time">{formatDateTime(r.reportDueAt)}</span>
                            {isLocked ? (
                              <span className="lock-countdown">🔒 {formatDurationMs(remainingMs)} left</span>
                            ) : (
                              <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.72rem' }}>🔓 UNLOCKED</span>
                            )}
                          </div>
                        ) : r.reportSubmittedAt ? (
                          <span style={{ color: '#166534', fontSize: '0.78rem', fontWeight: 600 }}>
                            Submitted {formatDate(r.reportSubmittedAt)}
                          </span>
                        ) : (
                          <span style={{ color: '#8C8D82' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Next Action */}
                      <td>
                        <span className="next-action-text">{getNextActionText(r)}</span>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRowClick(r)}
                          >
                            Workspace
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCreativeToDelete(r);
                                setIsDeleteCreativeOpen(true);
                              }}
                              style={{ color: '#991B1B' }}
                            >
                              🗑
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* DEDICATED CREATIVE STRATEGIST WORKSPACE DRAWER */}
      <RecordDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        record={selectedRecord}
        allCycles={records}
        onSelectRecord={(rec) => setSelectedRecord(rec)}
        onUpdateRecord={handleUpdateRecord}
        mediaBuyers={mediaBuyers}
        creativeStrategists={creativeStrategists}
        graphicDesigners={graphicDesigners}
        allUsers={allUsers}
      />

      {/* MODALS */}
      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSubmit={handleCreateClientSubmit}
      />

      <DeleteClientModal
        isOpen={isDeleteClientOpen}
        onClose={() => {
          setIsDeleteClientOpen(false);
          setClientToDelete(null);
        }}
        client={clientToDelete}
        onConfirm={handleDeleteClientConfirm}
      />

      <AddCampaignModal
        isOpen={isAddCampaignOpen}
        onClose={() => setIsAddCampaignOpen(false)}
        clients={clients}
        defaultClientId={selectedClientId !== 'all' ? selectedClientId : clients[0]?._id}
        onSubmit={handleCreateCampaignSubmit}
      />

      <DeleteCampaignModal
        isOpen={isDeleteCampaignOpen}
        onClose={() => {
          setIsDeleteCampaignOpen(false);
          setCampaignToDelete(null);
        }}
        campaign={campaignToDelete}
        onConfirm={handleDeleteCampaignConfirm}
      />

      <AddAdSetModal
        isOpen={isAddAdSetOpen}
        onClose={() => setIsAddAdSetOpen(false)}
        clients={clients}
        campaigns={campaigns}
        defaultClientId={selectedClientId !== 'all' ? selectedClientId : clients[0]?._id}
        onSubmit={handleCreateAdSetSubmit}
      />

      <DeleteAdSetModal
        isOpen={isDeleteAdSetOpen}
        onClose={() => {
          setIsDeleteAdSetOpen(false);
          setAdSetToDelete(null);
        }}
        adSet={adSetToDelete}
        onConfirm={handleDeleteAdSetConfirm}
      />

      <AddRecordModal
        isOpen={isAddRecordOpen}
        onClose={() => setIsAddRecordOpen(false)}
        clients={clients}
        campaigns={campaigns}
        adSets={adSets}
        mediaBuyers={mediaBuyers}
        creativeStrategists={creativeStrategists}
        graphicDesigners={graphicDesigners}
        allUsers={allUsers}
        defaultClientId={selectedClientId !== 'all' ? selectedClientId : clients[0]?._id}
        onSubmit={handleCreateRecordSubmit}
      />

      <DeleteCreativeModal
        isOpen={isDeleteCreativeOpen}
        onClose={() => {
          setIsDeleteCreativeOpen(false);
          setCreativeToDelete(null);
        }}
        record={creativeToDelete}
        onConfirm={handleDeleteCreativeConfirm}
      />
    </div>
  );
};
