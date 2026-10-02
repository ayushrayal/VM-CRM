import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getClients } from '../../api/client.api';
import { getStreamUrl } from '../../api/axios';
import './ClientSelect.scss';

export const ClientSelect = ({
  value, // client id or client name
  onChange, // ({ clientId, clientName, baselineROAS, currentROAS }) => void
  error,
  label = 'Client Name',
  required = false,
  placeholder = 'Select or search a client...',
  disabled = false
}) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getClients();
      const clientList = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : (res?.data?.data || []);
      if (isMountedRef.current) {
        setClients(clientList);
      }
    } catch (err) {
      console.warn('Failed to load clients:', err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadClients();

    const handleUpdate = () => {
      loadClients();
    };

    window.addEventListener('CLIENTS_UPDATED', handleUpdate);

    let sse;
    try {
      sse = new EventSource(getStreamUrl('/creative-strategy/stream'), { withCredentials: true });
      sse.addEventListener('CLIENT_CREATED', handleUpdate);
      sse.addEventListener('CLIENT_UPDATED', handleUpdate);
      sse.addEventListener('CLIENT_DELETED', handleUpdate);
    } catch (e) {
      // SSE not available
    }

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('CLIENTS_UPDATED', handleUpdate);
      if (sse) sse.close();
    };
  }, [loadClients]);

  // Revalidate client list on dropdown open to ensure always fresh
  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen, loadClients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected client (by _id or normalized name)
  const selectedClient = clients.find((c) => {
    if (!value) return false;
    if (typeof value === 'object') {
      return (
        c._id === value._id ||
        c._id === value.clientId ||
        (c.normalizedName && value.clientName && c.normalizedName === value.clientName.toLowerCase())
      );
    }
    return (
      c._id === value ||
      c.name?.toLowerCase() === String(value).toLowerCase() ||
      c.clientName?.toLowerCase() === String(value).toLowerCase()
    );
  });

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (c.clientName || c.name || '').toLowerCase();
    const code = (c.code || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const handleSelect = (client) => {
    onChange({
      clientId: client._id,
      clientName: client.clientName || client.name,
      baselineROAS: client.baselineROAS ?? 0,
      currentROAS: client.currentROAS ?? client.baselineROAS ?? 0
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({
      clientId: null,
      clientName: '',
      baselineROAS: 0,
      currentROAS: 0
    });
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className={`client-select-group ${error ? 'has-error' : ''}`} ref={wrapperRef}>
      {label && (
        <label className="client-select-label">
          {label} {required && <span className="required-asterisk">*</span>}
        </label>
      )}

      <div
        className={`client-select-box ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
      >
        {selectedClient ? (
          <div className="client-selected-display">
            <span className="client-badge-icon">🏢</span>
            <span className="client-name-text">
              {selectedClient.clientName || selectedClient.name}
            </span>
            <span className="roas-pill">
              Baseline: {selectedClient.baselineROAS ?? 0}x
              {selectedClient.currentROAS > selectedClient.baselineROAS && (
                <> • Current: {selectedClient.currentROAS}x</>
              )}
            </span>
            {!disabled && (
              <button
                type="button"
                className="client-clear-btn"
                onClick={handleClear}
                title="Change client"
              >
                &times;
              </button>
            )}
          </div>
        ) : (
          <span className="client-placeholder">{placeholder}</span>
        )}

        <span className="select-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="client-dropdown-menu">
          <div className="dropdown-search-wrapper" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="dropdown-search-input"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="dropdown-options-list">
            {loading ? (
              <div className="dropdown-loading">Loading clients...</div>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const isSelected = selectedClient?._id === client._id;
                return (
                  <div
                    key={client._id}
                    className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(client)}
                  >
                    <div className="option-name-row">
                      <span className="option-name">{client.clientName || client.name}</span>
                      {client.code && <span className="option-code">[{client.code}]</span>}
                    </div>
                    <div className="option-meta-row">
                      <span className="option-roas-meta">
                        Baseline ROAS: <strong>{client.baselineROAS ?? 0}x</strong>
                      </span>
                      {client.currentROAS !== undefined && client.currentROAS !== null && (
                        <span className="option-roas-meta">
                          Current: <strong>{client.currentROAS}x</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="dropdown-empty">
                {searchQuery ? `No client matching "${searchQuery}"` : 'No clients found.'}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <span className="client-select-error">{error}</span>}
    </div>
  );
};
