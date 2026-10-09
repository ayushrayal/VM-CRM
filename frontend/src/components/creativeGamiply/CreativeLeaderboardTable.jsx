import React from 'react';
import { Trophy } from 'lucide-react';
import { PERIOD_FILTERS } from '../../constants/creative.constants';
import './CreativeLeaderboardTable.scss';

export const CreativeLeaderboardTable = ({
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

  const getRankLabel = (rank) => {
    return `#${rank}`;
  };

  return (
    <div className="creative-leaderboard-container">
      {/* Header and Period Filter Tabs */}
      <div className="leaderboard-header-row">
        <div>
          <h3 className="leaderboard-title">Creative Performance Leaderboard</h3>
          <p className="leaderboard-subtitle">
            Ranked by Baseline ROAS improvements (+1 point when ROAS exceeds baseline)
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
              <div className="podium-rank-tag">#2 Contender</div>
              <div className="podium-name" title={leaderboard[1].name}>
                {leaderboard[1].name}
              </div>
              <div className="podium-points">
                {leaderboard[1].totalPoints.toLocaleString()} pts
              </div>
              <div className="podium-stats">
                {leaderboard[1].winners} Winners / {leaderboard[1].creatives} Creatives
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
              <div className="podium-rank-tag">
                <Trophy size={13} style={{ marginRight: '4px' }} />
                #1 Champion
              </div>
              <div className="podium-name" title={leaderboard[0].name}>
                {leaderboard[0].name}
              </div>
              <div className="podium-points">
                {leaderboard[0].totalPoints.toLocaleString()} pts
              </div>
              <div className="podium-stats">
                {leaderboard[0].winners} Winners / {leaderboard[0].creatives} Creatives
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
              <div className="podium-rank-tag">#3 Finalist</div>
              <div className="podium-name" title={leaderboard[2].name}>
                {leaderboard[2].name}
              </div>
              <div className="podium-points">
                {leaderboard[2].totalPoints.toLocaleString()} pts
              </div>
              <div className="podium-stats">
                {leaderboard[2].winners} Winners / {leaderboard[2].creatives} Creatives
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table - Columns: Rank, Name, Creatives, Winners, Avg Score, Total Points */}
      <div className="table-card">
        {leaderboard.length > 0 ? (
          <div className="table-scroll-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="col-rank">Rank</th>
                  <th className="col-name">Name</th>
                  <th className="col-creatives" style={{ textAlign: 'center' }}>Creatives</th>
                  <th className="col-winners" style={{ textAlign: 'center' }}>Winners</th>
                  <th className="col-avg-score" style={{ textAlign: 'right' }}>Avg Score</th>
                  <th className="col-total-points" style={{ textAlign: 'right' }}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item) => {
                  const isMe = item.creatorId === currentUserId;
                  return (
                    <tr key={item.creatorId} className={`${isMe ? 'highlight-row' : ''}`}>
                      <td className="rank-cell">
                        <span className={`rank-badge ${getRankBadgeClass(item.rank)}`}>
                          {getRankLabel(item.rank)}
                        </span>
                      </td>

                      <td className="name-cell">
                        <div className="participant-info">
                          <div className="avatar-circle">
                            {(item.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="user-name">
                            {item.name} {isMe && <span className="you-pill">You</span>}
                          </span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }} className="num-cell">
                        {item.creatives}
                      </td>

                      <td style={{ textAlign: 'center' }} className="num-cell">
                        <span className="winner-pill">{item.winners}</span>
                      </td>

                      <td style={{ textAlign: 'right' }} className="num-cell avg-cell">
                        {item.avgScore}
                      </td>

                      <td className="points-cell" style={{ textAlign: 'right' }}>
                        <span className="points-number">
                          {item.totalPoints.toLocaleString()}
                        </span>
                        <span className="points-unit"> pts</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-leaderboard">
            <div className="empty-icon-wrap">
              <Trophy size={28} />
            </div>
            <h4>No Creative Records Yet</h4>
            <p>Be the first to submit a creative performance and claim the top rank.</p>
          </div>
        )}
      </div>
    </div>
  );
};
