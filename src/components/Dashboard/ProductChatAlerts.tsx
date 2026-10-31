import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Avatar,
  Chip,
  Badge,
  CircularProgress
} from '@mui/material';
import MarkChatUnreadIcon from '@mui/icons-material/MarkChatUnread';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useNavigate } from 'react-router-dom';
import { useGetAdminChatAlertsQuery } from '../../store/apiSlice';

export const ProductChatAlerts: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetAdminChatAlertsQuery(undefined, {
    pollingInterval: 15000 // Poll every 15s for new staff messages
  });

  const alerts = data?.alerts || [];
  const totalUnread = data?.totalUnread || 0;

  if (isLoading || alerts.length === 0) {
    return null; // Don't show anything if no unread messages
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 3.5,
        bgcolor: '#FFFDF9',
        border: '1.5px solid #FDE68A',
        boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 40, height: 40 }}>
            <Badge badgeContent={totalUnread} color="error" max={99}>
              <MarkChatUnreadIcon sx={{ fontSize: 22 }} />
            </Badge>
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#92400E', lineHeight: 1.2 }}>
              Staff Product Messages & Alerts ({totalUnread} Unread)
            </Typography>
            <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600 }}>
              Staff members have sent questions or updates regarding these products
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {alerts.slice(0, 5).map((alert: any) => (
          <Paper
            key={alert.slabId}
            elevation={0}
            onClick={() => navigate(`/projects/${alert.projectId}?chatSlabId=${alert.slabId}`)}
            sx={{
              p: 1.75,
              px: 2,
              borderRadius: 2.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: '#FFFBEB',
                borderColor: '#D97706',
                transform: 'translateX(4px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <PrecisionManufacturingIcon sx={{ color: '#D97706', fontSize: 20 }} />
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B', textTransform: 'uppercase' }}>
                    {alert.slabName}
                  </Typography>
                  <Chip
                    label={alert.projectName || alert.workOrderId}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#EFF6FF', color: '#1D4ED8' }}
                  />
                  <Chip
                    label={`${alert.unreadCount} new`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800, bgcolor: '#FEF2F2', color: '#DC2626' }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748B',
                    fontWeight: 600,
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: 260, sm: 480 }
                  }}
                >
                  <strong style={{ color: '#334155' }}>{alert.lastSenderName}:</strong> "{alert.lastMessage}"
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                {new Date(alert.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <ArrowForwardIosRoundedIcon sx={{ fontSize: 13, color: '#D97706' }} />
            </Box>
          </Paper>
        ))}
      </Box>
    </Paper>
  );
};

export default ProductChatAlerts;
