import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Alert,
  Fade,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../store/apiSlice';
import { setCredentials } from '../store/authSlice';

// Icons
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      const response = await login({ email: email.trim(), password }).unwrap();
      dispatch(setCredentials({ user: response.user, token: response.token, rememberMe }));
      
      // Redirect based on role and modulesAccess
      if (response.user.role === 'manager') {
        navigate('/manager');
      } else if (response.user.role === 'worker') {
        navigate('/worker');
      } else if (response.user.modulesAccess && Array.isArray(response.user.modulesAccess) && response.user.modulesAccess.length > 0) {
        if (response.user.modulesAccess.includes('/')) {
          navigate('/');
        } else {
          navigate(response.user.modulesAccess[0] || '/');
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const getErrorMessage = () => {
    if (!error) return null;
    const errObj = error as any;
    return errObj?.data?.message || errObj?.error || 'Invalid credentials. Please check your email and password.';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F8FAFC',
        background: 'radial-gradient(circle at 50% 0%, rgba(200, 159, 90, 0.08) 0%, transparent 50%), #F8FAFC',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3.5, sm: 4.5 },
          borderRadius: 4,
          bgcolor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #C89F5A',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04)',
          position: 'relative',
        }}
      >
        {/* Logo & Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              p: 1,
              borderRadius: 2.5,
              bgcolor: '#FAFAFA',
              border: '1px solid #F1F5F9',
            }}
          >
            <img
              src="/logo.png"
              alt="Unnati Arts"
              style={{
                height: 46,
                maxWidth: 180,
                objectFit: 'contain',
              }}
            />
          </Box>

          <Typography
            variant="h5"
            sx={{
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '1.35rem',
              letterSpacing: '-0.3px',
              mb: 0.5,
            }}
          >
            Sign In to Workstation
          </Typography>

          <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.85rem' }}>
            Enterprise Resource Planning &amp; Production Portal
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Fade in={Boolean(error)}>
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: 2.5,
                bgcolor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '0.82rem',
                py: 0.5,
                '& .MuiAlert-icon': {
                  color: '#DC2626',
                  fontSize: 20,
                },
              }}
            >
              {getErrorMessage()}
            </Alert>
          </Fade>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleLogin} noValidate>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: '#334155', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
              Email or Staff ID
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g. staff@unnatiarts.com or ST-101"
              variant="outlined"
              size="small"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineRoundedIcon sx={{ color: '#94A3B8', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#F8FAFC',
                  transition: 'all 0.2s',
                  '& fieldset': {
                    borderColor: '#E2E8F0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#CBD5E1',
                  },
                  '&.Mui-focused': {
                    bgcolor: '#FFFFFF',
                    '& fieldset': {
                      borderColor: '#C89F5A',
                      borderWidth: 1.5,
                    },
                  },
                },
                '& .MuiInputBase-input': {
                  py: 1.1,
                  fontSize: '0.9rem',
                  color: '#0F172A',
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 1.8 }}>
            <Typography sx={{ color: '#334155', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
              Password
            </Typography>
            <TextField
              fullWidth
              placeholder="••••••••••••"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              size="small"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: '#94A3B8', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#94A3B8', '&:hover': { color: '#64748B' } }}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#F8FAFC',
                  transition: 'all 0.2s',
                  '& fieldset': {
                    borderColor: '#E2E8F0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#CBD5E1',
                  },
                  '&.Mui-focused': {
                    bgcolor: '#FFFFFF',
                    '& fieldset': {
                      borderColor: '#C89F5A',
                      borderWidth: 1.5,
                    },
                  },
                },
                '& .MuiInputBase-input': {
                  py: 1.1,
                  fontSize: '0.9rem',
                  color: '#0F172A',
                },
              }}
            />
          </Box>

          {/* Remember Me */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  size="small"
                  sx={{
                    color: '#CBD5E1',
                    p: 0.5,
                    mr: 0.5,
                    '&.Mui-checked': {
                      color: '#C89F5A',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.82rem', fontWeight: 500 }}>
                  Keep me signed in
                </Typography>
              }
            />
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isLoading || !email.trim() || !password.trim()}
            endIcon={!isLoading && <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />}
            sx={{
              py: 1.2,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.92rem',
              textTransform: 'none',
              background: 'linear-gradient(135deg, #C89F5A 0%, #A87D38 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 16px -4px rgba(200, 159, 90, 0.35)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #B88F4A 0%, #986D28 100%)',
                boxShadow: '0 8px 20px -4px rgba(200, 159, 90, 0.45)',
              },
              '&.Mui-disabled': {
                background: '#E2E8F0',
                color: '#94A3B8',
              },
            }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <CircularProgress size={18} color="inherit" thickness={4} />
                <span>Signing in...</span>
              </Box>
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>

        {/* Security Footer */}
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.8,
          }}
        >
          <ShieldOutlinedIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
          <Typography sx={{ color: '#94A3B8', fontSize: '0.74rem', fontWeight: 500 }}>
            256-Bit Encrypted Secure Session
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;


