import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const validate = () => {
    if (!email) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address';
    if (!password) return 'Password is required';
    if (password.length < 4) return 'Password must be at least 4 characters';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const emailError = touched.email && !email ? 'Email is required' :
    touched.email && !/\S+@\S+\.\S+/.test(email) && email ? 'Enter a valid email' : '';
  const passwordError = touched.password && !password ? 'Password is required' : '';

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-brand">Pryntis</h1>
          <p className="login-subtitle">Panel Administration</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleBlur('email')}
              placeholder="you@example.com"
              autoFocus
              autoComplete="email"
            />
            {emailError && <span className="form-group__error">{emailError}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handleBlur('password')}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            {passwordError && <span className="form-group__error">{passwordError}</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', padding: '12px' }}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
