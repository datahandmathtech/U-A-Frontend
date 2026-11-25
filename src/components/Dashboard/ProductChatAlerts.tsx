import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Avatar,
  Stack,
  Button,
  Divider
} from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import MarkChatUnreadRoundedIcon from '@mui/icons-material/MarkChatUnreadRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import { useGetAdminChatAlertsQuery } from '../../store/apiSlice';

interface ProductChatAlertsProps {
  onSelectRoom?: (alert: any) => void;
  excludedProjectIds?: Set<string>;
}

const ProductChatAlerts: React.FC<ProductChatAlertsProps> = ({
  onSelectRoom,
  excludedProjectIds
}) => {
  const navigate = useNavigate();

  const { data: alertsData } = useGetAdminChatAlertsQuery(undefined, {
    pollingInterval: 10000
  });

  const rawAlerts = alertsData?.alerts || [];
  const alerts = excludedProjectIds
    ? rawAlerts.filter((a: any) => !excludedProjectIds.has(String(a.projectId)))
    : rawAlerts;

  const totalUnread = alerts.reduce((sum: number, a: any) => sum + (Number(a.unreadCount) || 0), 0);

  if (!alerts.length) {
    return null;
  }

  const handleAlertClick = (alert: any) => {
    if (onSelectRoom) {
      onSelectRoom(alert);
      return;
    }
    if (alert.projectId) {
      navigate(`/projects/${alert.projectId}?chatSlabId=${alert.slabId}`);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        mb: 3,
        borderRadius: 3.5,
        bgcolor: '#FFFBEB',
        border: '1.5px solid #FCD34D',
        boxShadow: '0 4px 18px rgba(245, 158, 11, 0.10)'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{ bgcolor: '#075E54', color: '#FFFFFF', width: 34, height: 34 }}>
            <MarkChatUnreadRoundedIcon sx={{ fontSize: 19 }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#92400E', lineHeight: 1.2 }}>
              Unread Team Messages
            </Typography>
            <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600 }}>
              {totalUnread} unread {totalUnread === 1 ? 'message' : 'messages'} across {alerts.length} active{' '}
              {alerts.length === 1 ? 'room' : 'rooms'} — click any card to view & clear
            </Typography>
          </Box>
        </Box>
        <Chip
          label={`${totalUnread} Unread`}
          size="small"
          sx={{ bgcolor: '#25D366', color: '#FFFFFF', fontWeight: 800, px: 0.75 }}
        />
      </Box>

      <Divider sx={{ borderColor: '#FDE68A', mb: 1.5 }} />

      <Stack spacing={1.1}>
        {alerts.map((alert: any) => (
          <Paper
            key={alert.projectId || alert.slabId}
            elevation={0}
            onClick={() => handleAlertClick(alert)}
            sx={{
              p: 1.35,
              borderRadius: 2.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #FDE68A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#128C7E',
                boxShadow: '0 4px 12px rgba(7, 94, 84, 0.12)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <Avatar
                sx={{
                  bgcolor: '#DCFCE7',
                  color: '#075E54',
                  width: 36,
                  height: 36,
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}
              >
                <ChatBubbleOutlineRoundedIcon fontSize="small" />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                    {alert.clientName || alert.projectName}
                  </Typography>
                  {alert.workOrderId && (
                    <Chip
                      label={alert.workOrderId}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.67rem',
                        fontWeight: 700,
                        bgcolor: '#F1F5F9',
                        color: '#475569'
                      }}
                    />
                  )}
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                    • {alert.projectName}
                  </Typography>
                  <Chip
                    label={`${alert.unreadCount} new`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      bgcolor: '#25D366',
                      color: '#FFFFFF'
                    }}
                  />
                </Box>

                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    color: '#475569',
                    fontSize: '0.81rem',
                    mt: 0.25,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <strong style={{ color: '#075E54' }}>{alert.lastSenderName}:</strong>{' '}
                  {alert.hasAttachments && <ImageRoundedIcon sx={{ fontSize: 15, color: '#0284C7' }} />}
                  <span>{alert.lastMessage}</span>
                </Typography>
              </Box>
            </Box>

            <Button
              size="small"
              variant="contained"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                bgcolor: '#075E54',
                color: '#FFFFFF',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 1.5,
                flexShrink: 0,
                '&:hover': { bgcolor: '#064E46' }
              }}
            >
              Open Chat
            </Button>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
};

export default ProductChatAlerts;
