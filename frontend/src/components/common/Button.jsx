import React from 'react';
import './Button.scss';

export const Button = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'accent', 'danger', 'ghost'
  size = 'md', // 'sm', 'md', 'lg'
  loading = false,
  disabled = false,
  icon = null,
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
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
