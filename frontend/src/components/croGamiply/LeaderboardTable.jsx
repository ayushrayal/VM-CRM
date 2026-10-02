import React from 'react';
import { PERIOD_FILTERS, CRO_BADGES } from '../../constants/cro.constants';
import './LeaderboardTable.scss';

export const LeaderboardTable = ({
  leaderboard = [],
  period = 'all_time',
  onPeriodChange,
  currentUserId
}) => {
  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="cro-leaderboard-container">
      {/* Header and Period Filter Tabs */}
      <div className="leaderboard-header-row">
        <div>
          <h3 className="leaderboard-title">CRO Experimentation Leaderboard</h3>
          <p className="leaderboard-subtitle">
            Ranked by metric improvements (+1 pt Product Sales, +1 pt Prepaid Orders % &bull; Max 2 pts)
          </p>
        </div>

        <div className="period-tabs">
          {PERIOD_FILTERS.map((p) => (
            <button
              key={p.id}
              className={`period-btn ${period === p.id ? 'active' : ''}`}
              onClick={() => onPeriodChange(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium Highlights (if >= 2 participants) */}
      {leaderboard.length >= 2 && (
        <div className="podium-showcase">
          {/* #2 Silver */}
          {leaderboard[1] && (
            <div
              className={`podium-card rank-2 ${
                leaderboard[1].creatorId === currentUserId ? 'is-me' : ''
              }`}
            >
              <div className="podium-medal">🥈</div>
              <div className="podium-rank">#2</div>
              <div className="podium-name" title={leaderboard[1].creatorName}>
                {leaderboard[1].creatorName}
              </div>
              <div className="podium-points">
                {leaderboard[1].totalPoints.toLocaleString()} pts
              </div>
              <div className="podium-stats">
                {leaderboard[1].successfulExperiments} / {leaderboard[1].totalExperiments} wins ({leaderboard[1].successRate}%)
              </div>
            </div>
          )}

          {/* #1 Gold */}
          {leaderboard[0] && (
            <div
              className={`podium-card rank-1 ${
                leaderboard[0].creatorId === currentUserId ? 'is-me' : ''
              }`}
            >
              <div className="podium-crown">👑</div>
              <div className="podium-medal">🥇</div>
              <div className="podium-rank">#1 Champion</div>
              <div className="podium-name" title={leaderboard[0].creatorName}>
                {leaderboard[0].creatorName}
              </div>
              <div className="podium-points">
                {leaderboard[0].totalPoints.toLocaleString()} pts
              </div>
              <div className="podium-stats">
                {leaderboard[0].successfulExperiments} / {leaderboard[0].totalExperiments} wins ({leaderboard[0].successRate}%)
              </div>
            </div>
          )}

          {/* #3 Bronze */}
          {leaderboard[2] && (
            <div
              className={`podium-card rank-3 ${
                leaderboard[2].creatorId === currentUserId ? 'is-me' : ''
              }`}
            >
              <div className="podium-medal">🥉</div>
              <div className="podium-rank">#3</div>
              <div className="podium-name" title={leaderboard[2].creatorName}>
                {leaderboard[2].creatorName}
              </div>
              <div className="podium-points">
                {leaderboard[2].totalPoints.toLocaleString()} pts
              </div>
              <div className="podium-stats">
                {leaderboard[2].successfulExperiments} / {leaderboard[2].totalExperiments} wins ({leaderboard[2].successRate}%)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table with Horizontal Scroll Support */}
      <div className="table-card">
        {leaderboard.length > 0 ? (
          <div className="table-scroll-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="col-rank">Rank</th>
                  <th className="col-participant">Participant</th>
                  <th className="col-points" style={{ textAlign: 'right' }}>Total Points</th>
                  <th className="col-experiments" style={{ textAlign: 'center' }}>Experiments</th>
                  <th className="col-successful" style={{ textAlign: 'center' }}>Successful</th>
                  <th className="col-winrate" style={{ textAlign: 'center' }}>Win Rate</th>
                  <th className="col-badges">Badges</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item) => {
                  const isMe = item.creatorId === currentUserId;
                  return (
                    <tr key={item.creatorId} className={`${isMe ? 'highlight-row' : ''}`}>
                      <td className="rank-cell">
                        <span className={`rank-badge ${getRankBadgeClass(item.rank)}`}>
                          {getRankIcon(item.rank)}
                        </span>
                      </td>

                      <td className="participant-cell">
                        <div className="participant-info">
                          <div className="avatar-circle">
                            {(item.creatorName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="name-box">
                            <span className="user-name">
                              {item.creatorName} {isMe && <span className="you-pill">You</span>}
                            </span>
                            <span className="user-meta">
                              {item.teamRole && item.teamRole !== 'none'
                                ? item.teamRole.replace('_', ' ')
                                : item.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="points-cell" style={{ textAlign: 'right' }}>
                        <span className="points-number">
                          {item.totalPoints.toLocaleString()}
                        </span>
                        <span className="points-unit"> pts</span>
                      </td>

                      <td style={{ textAlign: 'center' }} className="num-cell">
                        {item.totalExperiments}
                      </td>

                      <td style={{ textAlign: 'center' }} className="num-cell">
                        <span className="success-num">{item.successfulExperiments}</span>
                      </td>

                      <td style={{ textAlign: 'center' }} className="rate-cell">
                        <span className="rate-pill">{item.successRate}%</span>
                      </td>

                      <td className="badges-cell">
                        <div className="badges-row">
                          {item.badges?.length > 0 ? (
                            item.badges.map((bId) => {
                              const bDef = CRO_BADGES[bId] || { icon: '🏅', name: bId };
                              return (
                                <span
                                  key={bId}
                                  className="badge-bubble"
                                  title={`${bDef.name} (${bDef.desc || ''})`}
                                >
                                  {bDef.icon}
                                </span>
                              );
                            })
                          ) : (
                            <span className="no-badges">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="leaderboard-empty-state">
            <span className="empty-icon">🏆</span>
            <h4>No experiments recorded in this period</h4>
            <p>Complete experiments with positive results to appear on the leaderboard!</p>
          </div>
        )}
      </div>
    </div>
  );
};
