import React from 'react';
import './Button.scss';

export const Button = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost'
  size = 'md', // 'sm', 'md', 'lg'
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  fullWidth = false,
  className = '',
  ...props
}) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-block' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner-container">
          <span className="btn-spinner" />
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
