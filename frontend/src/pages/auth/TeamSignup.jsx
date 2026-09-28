import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertBanner } from '../../components/common/AlertBanner';
import './AuthForm.scss';

export const TeamSignup = () => {
  const { teamSignup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await teamSignup(formData.name, formData.email, formData.password);
      if (res.success) {
        setSubmittedSuccess(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Team signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="auth-page-container">
        <div className="auth-card">
          <div className="auth-success-card">
            <div className="success-icon">⏳</div>
            <h2 className="success-title">Request Submitted</h2>
            <p className="success-body">
              Your registration request has been submitted successfully. Your account is currently pending administrator approval.
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/login')}>
              Return to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand-header">
          <h1 className="auth-brand-title">VYTALIS MEDIA CRM</h1>
          <p className="auth-subtitle">Request Team Access</p>
        </div>

        <AlertBanner type="error" message={errorMsg} onClose={() => setErrorMsg('')} />

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Rahul Sharma"
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@vytalis.com"
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

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Submit Request
          </Button>
        </form>

        <div className="auth-footer-links">
          <p>
            Already have an active account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
