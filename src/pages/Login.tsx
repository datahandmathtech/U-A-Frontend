import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress, FormControlLabel, Checkbox } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../store/apiSlice';
import { setCredentials } from '../store/authSlice';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login({ email, password }).unwrap();
      dispatch(setCredentials({ user: response.user, token: response.token, rememberMe }));
      
      // Redirect based on role
      if (response.user.role === 'manager') {
        navigate('/manager');
      } else if (response.user.role === 'employee' || response.user.role === 'worker') {
        navigate('/worker');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper elevation={4} sx={{ p: 4, width: '100%', maxWidth: 420, borderRadius: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'center' }}>
          <img src="/logo.png" alt="Unnati Arts" style={{ height: 55, maxWidth: '85%', objectFit: 'contain' }} />
        </Box>
        <Typography variant="body1" align="center" color="text.secondary" mb={4} fontWeight={500}>
          Enterprise ERP System
        </Typography>
        
        <Box component="form" onSubmit={handleLogin}>
          <TextField 
            fullWidth 
            label="Email or Staff ID" 
            variant="outlined" 
            margin="normal"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <TextField 
            fullWidth 
            label="Password" 
            type="password" 
            variant="outlined" 
            margin="normal"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', mt: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  color="primary" 
                  size="small" 
                />
              }
              label={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  Remember me (Keep me signed in)
                </Typography>
              }
            />
          </Box>
          
          {error && <Typography color="error" variant="body2" align="center" sx={{ mt: 1 }}>Invalid credentials</Typography>}
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            size="large" 
            disabled={isLoading}
            sx={{ mt: 2.5, py: 1.2, fontWeight: 600 }}
            fullWidth
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
