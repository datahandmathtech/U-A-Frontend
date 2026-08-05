import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/system';

// Fancy background with gradient & subtle animation
const GradientBackground = styled(Box)({
  position: 'fixed',
  inset: 0,
  background: 'linear-gradient(135deg, hsl(210, 40%, 15%), hsl(210, 40%, 25%))',
  zIndex: -1,
  overflow: 'hidden',
});

// Animated circles for a premium glass‑morphism feel
const AnimatedCircle = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.08)',
  animation: 'float 12s infinite ease-in-out',
  '@keyframes float': {
    '0%': { transform: 'translate(0, 0) scale(1)' },
    '50%': { transform: 'translate(30vw, -20vh) scale(1.5)' },
    '100%': { transform: 'translate(0, 0) scale(1)' },
  },
});

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  const goHome = () => navigate('/');

  return (
    <>
      <GradientBackground>
        {/* Three floating circles for visual depth */}
        <AnimatedCircle style={{ width: 200, height: 200, top: '10%', left: '15%' }} />
        <AnimatedCircle style={{ width: 300, height: 300, top: '60%', left: '70%' }} />
        <AnimatedCircle style={{ width: 150, height: 150, top: '40%', left: '40%' }} />
      </GradientBackground>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          px: 3,
          color: '#fff',
        }}
      >
        <Typography variant="h1" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '4rem', md: '6rem' } }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Oops! The page <code>{location.pathname}</code> could not be found.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={goHome}
          sx={{
            mt: 2,
            px: 4,
            py: 1.5,
            fontWeight: 600,
            background: 'linear-gradient(45deg, hsl(210, 70%, 60%), hsl(210, 70%, 40%))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            ':hover': {
              background: 'linear-gradient(45deg, hsl(210, 80%, 65%), hsl(210, 80%, 45%))',
            },
          }}
        >
          Go to Dashboard
        </Button>
      </Box>
    </>
  );
}
