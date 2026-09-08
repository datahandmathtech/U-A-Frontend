import React from 'react';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';

interface PageLoaderProps {
  message?: string;
  isFullPage?: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Loading...', isFullPage = false }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: isFullPage ? '100vh' : '60vh',
        width: '100%',
        gap: 2.5,
        p: 3,
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          size={52}
          thickness={4}
          sx={{
            color: '#D4AF37',
            animationDuration: '750ms',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
      </Box>
      <Box sx={{ width: '180px' }}>
        <LinearProgress
          sx={{
            height: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#D4AF37',
            },
          }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: '#8E8E93',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default PageLoader;
