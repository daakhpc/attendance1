
import React, { useState } from 'react';
import { Button, Input, Card } from '../components/common';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock authentication
    if (username === 'admin' && password === 'password') {
      setError('');
      onLogin();
    } else {
      setError('Invalid username or password. Use admin/password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">
          Admin Login
        </h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <Button type="submit" className="w-full">
            Log In
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
