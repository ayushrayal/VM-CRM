import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertBanner } from '../../components/common/AlertBanner';
import './AuthForm.scss';

export const Login = () => {
  const { signin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
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
    if (!formData.email || !formData.password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await signin(formData.email, formData.password);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand-header">
          <h1 className="auth-brand-title">VYTALIS MEDIA CRM</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        <AlertBanner type="error" message={errorMsg} onClose={() => setErrorMsg('')} />

        <form onSubmit={handleSubmit} className="auth-form">
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
            placeholder="••••••••"
            required
          />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <div className="auth-footer-links">
          <p>
            Need team access?{' '}
            <Link to="/signup" className="auth-link">
              Submit Team Request
            </Link>
          </p>
          <p>
            Admin setup?{' '}
            <Link to="/admin/signup" className="auth-link">
              Register Admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
