import React from 'react';
import './LoadingSpinner.scss';

export const LoadingSpinner = ({ label = 'Loading...' }) => {
  return (
    <div className="spinner-container">
      <div className="spinner-ring" />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );
};
