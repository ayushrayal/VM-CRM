import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertBanner } from '../../components/common/AlertBanner';
import './AuthForm.scss';

export const AdminSignup = () => {
  const { adminSignup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    accessKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.accessKey) {
      setErrorMsg('Please fill in all required fields including the access key.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await adminSignup(
        formData.name,
        formData.email,
        formData.password,
        formData.accessKey
      );
      if (res.success) {
        navigate('/login', {
          state: {
            message: 'Admin account created successfully. Please sign in.'
          }
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Admin signup failed. Invalid access key or maximum limit reached.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand-header">
          <h1 className="auth-brand-title">VYTALIS MEDIA CRM</h1>
          <p className="auth-subtitle">Admin Registration</p>
        </div>

        <div className="auth-notice-banner">
          🔒 Admin registration requires an authorized secret access key provided by system administrators.
        </div>

        <AlertBanner type="error" message={errorMsg} onClose={() => setErrorMsg('')} />

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Admin Name"
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="admin@vytalis.com"
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            required
          />

          <Input
            label="Admin Access Key"
            type="password"
            name="accessKey"
            value={formData.accessKey}
            onChange={handleChange}
            placeholder="Enter secret access key"
            required
          />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Register Admin Account
          </Button>
        </form>

        <div className="auth-footer-links">
          <p>
            Already registered?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
