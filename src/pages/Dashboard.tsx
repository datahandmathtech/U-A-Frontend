import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  Select,
  MenuItem,
  Card,
  Avatar,
  CircularProgress,
  Skeleton,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Icons
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import BuildCircleRoundedIcon from '@mui/icons-material/BuildCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import MarkChatUnreadRoundedIcon from '@mui/icons-material/MarkChatUnreadRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import {
  useGetChatRoomsSummaryQuery,
  useGetDashboardSummaryQuery,
  useGetProjectsQuery
} from '../store/apiSlice';
import ChatRoomThread from '../components/Chat/ChatRoomThread';
import { calculateOrderProgress } from '../utils/progressCalculator';

const MONTH_NAME_MAP: Record<number, string> = {
  0: 'January',
  1: 'February',
  2: 'March',
  3: 'April',
  4: 'May',
  5: 'June',
  6: 'July',
  7: 'August',
  8: 'September',
  9: 'October',
  10: 'November',
  11: 'December'
};

const formatRoomTimestamp = (dt?: string | null) => {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

interface DashboardCardProps {
  icon: any;
  title: string;
  value: string | number;
  subtitle?: string;
  colorHint?: string;
  bgHint?: string;
  borderHint?: string;
  loading?: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  colorHint = '#C89F5A',
  bgHint = '#FFF4E5',
  borderHint = '#FFE0B2',
  loading = false
}) => (
  <Card
    sx={{
      p: 2.5,
      borderRadius: 3.5,
      bgcolor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      cursor: 'default',
      userSelect: 'none',
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
        borderColor: '#CBD5E1'
      }
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontSize: '0.72rem'
        }}
      >
        {title}
      </Typography>
      <Avatar sx={{ bgcolor: bgHint, color: colorHint, width: 36, height: 36, border: `1px solid ${borderHint}` }}>
        <Icon sx={{ fontSize: 20 }} />
      </Avatar>
    </Box>
    {loading ? (
      <Skeleton variant="text" width="60%" height={40} />
    ) : (
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1, mb: 0.5 }}>
        {value}
      </Typography>
    )}
    {subtitle && (
      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
        {subtitle}
      </Typography>
    )}
  </Card>
);

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobileDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const currentUser = useSelector((state: any) => state.auth.user);
  const currentUserId = currentUser?.id ? String(currentUser.id) : '';
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentFyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const currentFY = `${currentFyStartYear}-${currentFyStartYear + 1}`;
  const fyOptions = [
    `${currentFyStartYear - 2}-${currentFyStartYear - 1}`,
    `${currentFyStartYear - 1}-${currentFyStartYear}`,
    currentFY,
    `${currentFyStartYear + 1}-${currentFyStartYear + 2}`
  ];

  const [selectedFY, setSelectedFY] = useState<string>(currentFY);
  // Default automatically to the current calendar month (updates dynamically across months & financial years)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [chatSearch, setChatSearch] = useState('');
  const [chatFilter, setChatFilter] = useState<'active' | 'unread' | 'completed'>('active');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [isUnnatiChatOpen, setIsUnnatiChatOpen] = useState(false);

  const { data: summary, isLoading, isFetching } = useGetDashboardSummaryQuery(
    { fy: selectedFY, month: selectedMonth },
    { refetchOnFocus: false }
  );
  const { data: projects = [], isLoading: isProjectsLoading } = useGetProjectsQuery();
  const { data: chatRoomsData, isLoading: isChatRoomsLoading } = useGetChatRoomsSummaryQuery(undefined, {
    pollingInterval: 10000
  });
  const navigate = useNavigate();

  const selectedMonthLabel = MONTH_NAME_MAP[Number(selectedMonth)] || 'Current Month';

  // Restrict Unnati Chat strictly to Work Orders (exclude CRM enquiries) and separate completed orders cleanly
  const completedProjectIds = useMemo(() => {
    const activeStatuses = new Set([
      'shop_drawing',
      'material_planning',
      'production',
      'work_order'
    ]);
    const completedSet = new Set<string>();
    for (const p of projects as any[]) {
      const { overallProgressPercent, totalProductRows } = calculateOrderProgress(p);
      const st = String(p.status || '').trim().toLowerCase();
      const isDone =
        !activeStatuses.has(st) ||
        p.hasChatRoom === false ||
        p.isClosed === true ||
        Boolean(p.projectClosure) ||
        Number(p.progressPercentage) >= 100 ||
        (totalProductRows > 0 && overallProgressPercent >= 100);
      if (isDone) completedSet.add(String(p.id));
    }
    return completedSet;
  }, [projects]);

  const activeChatRooms = useMemo(() => {
    const rooms = chatRoomsData?.rooms || [];
    return rooms.filter((r: any) => !completedProjectIds.has(String(r.projectId)));
  }, [chatRoomsData, completedProjectIds]);

  const completedChatRooms = useMemo(() => {
    return chatRoomsData?.completedRooms || [];
  }, [chatRoomsData]);

  const matchesRoomSearch = (room: any, q: string) => {
    if (!q) return true;
    return (
      (room.clientName || '').toLowerCase().includes(q) ||
      (room.projectName || '').toLowerCase().includes(q) ||
      (room.workOrderId || '').toLowerCase().includes(q) ||
      (room.lastMessage || '').toLowerCase().includes(q)
    );
  };

  const filteredChatRooms = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    const sourceRooms = chatFilter === 'completed' ? completedChatRooms : activeChatRooms;
    return sourceRooms.filter((room: any) => {
      if (chatFilter === 'unread' && !(room.unreadCount > 0)) return false;
      return matchesRoomSearch(room, q);
    });
  }, [activeChatRooms, completedChatRooms, chatSearch, chatFilter]);

  const completedSearchMatches = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return completedChatRooms.length;
    return completedChatRooms.filter((room: any) => matchesRoomSearch(room, q)).length;
  }, [completedChatRooms, chatSearch]);

  const unreadRoomsCount = useMemo(
    () => activeChatRooms.filter((r: any) => r.unreadCount > 0).length,
    [activeChatRooms]
  );

  const totalUnreadMessages = useMemo(
    () => activeChatRooms.reduce((sum: number, r: any) => sum + (Number(r.unreadCount) || 0), 0),
    [activeChatRooms]
  );

  // Keep selectedRoom metadata synchronized with live room updates without auto-selecting on initial load
  const currentSelectedRoom = useMemo(() => {
    if (!selectedRoom) return null;
    return (
      activeChatRooms.find((r: any) => String(r.projectId) === String(selectedRoom.projectId)) ||
      completedChatRooms.find((r: any) => String(r.projectId) === String(selectedRoom.projectId)) ||
      selectedRoom
    );
  }, [selectedRoom, activeChatRooms, completedChatRooms]);

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Header Banner */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px', fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.125rem' } }}>
              Executive Dashboard
            </Typography>
            <Chip
              label={isFetching ? 'Updating...' : 'Live Overview'}
              size="small"
              icon={isFetching ? <CircularProgress size={12} sx={{ color: '#059669' }} /> : undefined}
              sx={{
                bgcolor: '#ECFDF5',
                color: '#059669',
                fontWeight: 700,
                border: '1px solid #A7F3D0',
                borderRadius: '8px'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
            Real-time analytics, revenue summary, factory operations, and piece tracking.
          </Typography>
        </Box>

        {/* Date Filter Selectors */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Select
            size="small"
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            IconComponent={KeyboardArrowDownIcon}
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: 2.5,
              fontWeight: 600,
              minWidth: { xs: 0, sm: 150 },
              flex: { xs: '1 1 130px', sm: 'none' },
              '& fieldset': { borderColor: '#E2E8F0' },
              '& .MuiSelect-select': { py: 1, px: 1.5 }
            }}
          >
            {fyOptions.map((fyOpt) => (
              <MenuItem key={fyOpt} value={fyOpt}>
                FY {fyOpt}
              </MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            IconComponent={KeyboardArrowDownIcon}
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: 2.5,
              fontWeight: 600,
              minWidth: { xs: 0, sm: 140 },
              flex: { xs: '1 1 120px', sm: 'none' },
              '& fieldset': { borderColor: '#E2E8F0' },
              '& .MuiSelect-select': { py: 1, px: 1.5 }
            }}
          >
            <MenuItem value={3}>April</MenuItem>
            <MenuItem value={4}>May</MenuItem>
            <MenuItem value={5}>June</MenuItem>
            <MenuItem value={6}>July</MenuItem>
            <MenuItem value={7}>August</MenuItem>
            <MenuItem value={8}>September</MenuItem>
            <MenuItem value={9}>October</MenuItem>
            <MenuItem value={10}>November</MenuItem>
            <MenuItem value={11}>December</MenuItem>
            <MenuItem value={0}>January</MenuItem>
            <MenuItem value={1}>February</MenuItem>
            <MenuItem value={2}>March</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* 2. Top 4 Cards: Yearly Order & Workflow Metrics (Selected Financial Year) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', letterSpacing: 0.7, textTransform: 'uppercase' }}>
          Yearly Order &amp; Workflow Metrics (FY {selectedFY})
        </Typography>
      </Box>
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card 1: Total Enquiries */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={FilterAltRoundedIcon}
            title="TOTAL ENQUIRIES"
            value={summary?.totalLeads ?? 0}
            subtitle={`Leads in FY ${selectedFY}`}
            colorHint="#6366F1"
            bgHint="#EEF2FF"
            borderHint="#C7D2FE"
            loading={isLoading}
          />
        </Grid>

        {/* Card 2: Active Work Orders */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={DashboardRoundedIcon}
            title="ACTIVE WORK ORDERS"
            value={summary?.activeProjects ?? 0}
            subtitle={`Live orders (FY ${selectedFY})`}
            colorHint="#C89F5A"
            bgHint="#FFF4E5"
            borderHint="#FFE0B2"
            loading={isLoading}
          />
        </Grid>

        {/* Card 3: Completed Orders */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={CheckCircleRoundedIcon}
            title="COMPLETED ORDERS"
            value={summary?.completedProjects ?? 0}
            subtitle={`Closed in FY ${selectedFY}`}
            colorHint="#0284C7"
            bgHint="#F0F9FF"
            borderHint="#BAE6FD"
            loading={isLoading}
          />
        </Grid>

        {/* Card 4: Total Orders */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={LayersRoundedIcon}
            title="TOTAL ORDERS"
            value={summary?.totalOrders ?? summary?.totalProjects ?? 0}
            subtitle={`All orders in FY ${selectedFY}`}
            colorHint="#059669"
            bgHint="#ECFDF5"
            borderHint="#A7F3D0"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* 3. Bottom 4 Cards: Monthly Operations & Cash Summary (Selected Month) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', letterSpacing: 0.7, textTransform: 'uppercase' }}>
          Monthly Operations &amp; Cash Summary ({selectedMonthLabel})
        </Typography>
      </Box>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Card 5: Petty Book Cash in Hand (Month) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={AccountBalanceWalletRoundedIcon}
            title="PETTY BOOK CASH IN HAND"
            value={`₹${(Number(summary?.pettyCashInHand) || 0).toLocaleString('en-IN')}`}
            subtitle={`Cash Book net (${selectedMonthLabel})`}
            colorHint="#10B981"
            bgHint="#ECFDF5"
            borderHint="#A7F3D0"
            loading={isLoading}
          />
        </Grid>

        {/* Card 6: Material Outward (Month) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={LocalShippingRoundedIcon}
            title="MATERIAL OUTWARD FOR MONTH"
            value={`${(Number(summary?.materialOutwardMonth) || 0).toLocaleString('en-IN')} Pcs`}
            subtitle={`From In/Out Ledger (${selectedMonthLabel})`}
            colorHint="#EA580C"
            bgHint="#FFF7ED"
            borderHint="#FFEDD5"
            loading={isLoading}
          />
        </Grid>

        {/* Card 7: Factory Expenses (Month) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={BuildCircleRoundedIcon}
            title="FACTORY EXPENSES"
            value={`₹${(Number(summary?.factoryExpenses) || 0).toLocaleString('en-IN')}`}
            subtitle={`Expenses & Maintenance (${selectedMonthLabel})`}
            colorHint="#EF4444"
            bgHint="#FEF2F2"
            borderHint="#FECACA"
            loading={isLoading}
          />
        </Grid>

        {/* Card 8: Material Inward (Month) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={Inventory2RoundedIcon}
            title="MATERIAL INWARD FOR MONTH"
            value={`${(Number(summary?.materialInwardMonth) || 0).toLocaleString('en-IN')} Pcs`}
            subtitle={`From In/Out Ledger (${selectedMonthLabel})`}
            colorHint="#D97706"
            bgHint="#FFFBEB"
            borderHint="#FDE68A"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* 4. Compact Unnati Chat Launcher Box (Opens WhatsApp-Style Chat Popup on Click) */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            onClick={() => setIsUnnatiChatOpen(true)}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: totalUnreadMessages > 0 ? '1.5px solid #25D366' : '1.5px solid #A7F3D0',
              boxShadow:
                totalUnreadMessages > 0
                  ? '0 6px 20px rgba(37, 211, 102, 0.16)'
                  : '0 4px 14px rgba(7, 94, 84, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                borderColor: '#075E54',
                boxShadow: '0 10px 24px rgba(7, 94, 84, 0.16)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: '#075E54',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    fontSize: '0.78rem'
                  }}
                >
                  Unnati Chat
                </Typography>
                {totalUnreadMessages > 0 && (
                  <Chip
                    label={`${totalUnreadMessages} New`}
                    size="small"
                    sx={{
                      height: 19,
                      fontSize: '0.67rem',
                      fontWeight: 800,
                      bgcolor: '#25D366',
                      color: '#FFFFFF'
                    }}
                  />
                )}
              </Box>
              <Badge
                badgeContent={totalUnreadMessages}
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    border: '2px solid #FFFFFF'
                  }
                }}
              >
                <Avatar sx={{ bgcolor: '#075E54', color: '#FFFFFF', width: 38, height: 38 }}>
                  <ForumRoundedIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Badge>
            </Box>

            <Box sx={{ mb: 1.25 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
                {isChatRoomsLoading ? '...' : activeChatRooms.length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                {totalUnreadMessages > 0
                  ? `${unreadRoomsCount} ${unreadRoomsCount === 1 ? 'room has' : 'rooms have'} unread messages`
                  : `Active work orders${completedChatRooms.length > 0 ? ` • ${completedChatRooms.length} completed saved` : ''}`}
              </Typography>
            </Box>

            <Box
              sx={{
                pt: 1.15,
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#075E54', fontSize: '0.76rem' }}>
                Open Chat Box
              </Typography>
              <ArrowForwardRoundedIcon sx={{ fontSize: 17, color: '#075E54' }} />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Unnati Chat Modal Dialog (Opens when user clicks the compact Unnati Chat box or alert) */}
      <Dialog
        open={isUnnatiChatOpen}
        onClose={() => setIsUnnatiChatOpen(false)}
        fullScreen={isMobileDialog}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 0, sm: 4 },
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
              height: { xs: '100dvh', sm: 'auto' },
              maxHeight: { xs: '100dvh', sm: '92dvh', md: '90vh' },
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)'
            }
          }
        }}
      >
        {/* Top Container Bar (Hidden on mobile when a conversation is open so thread gets full viewport height) */}
        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 1.1, sm: 1.5 },
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: { xs: currentSelectedRoom ? 'none' : 'flex', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 1.5 },
            flexShrink: 0
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25,
              flex: { xs: '1 1 100%', md: '1 1 auto' },
              minWidth: 0
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Avatar sx={{ bgcolor: '#075E54', color: '#FFFFFF', width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 }, flexShrink: 0 }}>
                <ForumRoundedIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2, fontSize: { xs: '0.96rem', sm: '1.05rem' } }}>
                  Unnati Chat
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
                  Live Work Orders &amp; saved Completed Order chats • Blue-tick read receipts
                </Typography>
              </Box>
            </Box>

            <IconButton
              size="small"
              aria-label="Close Unnati Chat"
              onClick={() => setIsUnnatiChatOpen(false)}
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                bgcolor: '#F1F5F9',
                color: '#475569',
                flexShrink: 0,
                '&:hover': { bgcolor: '#E2E8F0', color: '#0F172A' }
              }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1 },
              flexWrap: 'wrap',
              flex: { xs: '1 1 100%', md: '0 1 auto' },
              justifyContent: { xs: 'stretch', md: 'flex-end' }
            }}
          >
            <TextField
              size="small"
              placeholder="Search client, order code, or message..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B' }} />
                    </InputAdornment>
                  ),
                  endAdornment: chatSearch ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setChatSearch('')}>
                        <ClearRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined
                }
              }}
              sx={{
                width: { xs: '100%', md: 280 },
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: 2.5,
                  fontSize: '0.82rem',
                  height: 36,
                  '& fieldset': { borderColor: '#CBD5E1' },
                  '&:hover fieldset': { borderColor: '#94A3B8' },
                  '&.Mui-focused fieldset': { borderColor: '#075E54' }
                }
              }}
            />

            {totalUnreadMessages > 0 && (
              <Chip
                icon={<MarkChatUnreadRoundedIcon sx={{ fontSize: '15px !important', color: '#FFFFFF !important' }} />}
                label={`${totalUnreadMessages} Unread`}
                size="small"
                clickable
                onClick={() => setChatFilter('unread')}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  bgcolor: '#25D366',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  '&:hover, &.Mui-focusVisible': { bgcolor: '#1FB858' }
                }}
              />
            )}
            <Chip
              icon={<FiberManualRecordIcon sx={{ fontSize: 10, color: '#10B981 !important' }} />}
              label={`${activeChatRooms.length} Active`}
              size="small"
              clickable
              onClick={() => setChatFilter('active')}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                bgcolor: chatFilter === 'active' ? '#D1FAE5' : '#ECFDF5',
                color: '#065F46',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: chatFilter === 'active' ? '1.5px solid #059669' : '1px solid #A7F3D0',
                '&:hover, &.Mui-focusVisible': {
                  bgcolor: chatFilter === 'active' ? '#A7F3D0' : '#D1FAE5'
                }
              }}
            />
            <Chip
              label={`${completedChatRooms.length} Completed`}
              size="small"
              clickable
              onClick={() => setChatFilter('completed')}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                bgcolor: chatFilter === 'completed' ? '#334155' : '#F1F5F9',
                color: chatFilter === 'completed' ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: chatFilter === 'completed' ? '1.5px solid #1E293B' : '1px solid #CBD5E1',
                '&:hover, &.Mui-focusVisible': {
                  bgcolor: chatFilter === 'completed' ? '#1E293B' : '#E2E8F0'
                }
              }}
            />
            <Tooltip title="Close Unnati Chat">
              <IconButton
                size="small"
                onClick={() => setIsUnnatiChatOpen(false)}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  bgcolor: '#F1F5F9',
                  color: '#475569',
                  '&:hover': { bgcolor: '#E2E8F0', color: '#0F172A' }
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Contained Split-Pane WhatsApp Layout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            flex: 1,
            minHeight: 0,
            height: { xs: 'auto', md: 580 },
            maxHeight: { xs: 'none', md: '80vh' },
            width: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Left Pane: Searchable Client / Work Order List */}
          <Box
            sx={{
              width: { xs: '100%', md: 350, lg: 380 },
              flex: { xs: '1 1 0%', md: '0 0 auto' },
              minHeight: 0,
              height: { xs: 'auto', md: '100%' },
              overflow: 'hidden',
              borderRight: { md: '1px solid #E2E8F0' },
              borderBottom: { xs: 'none', md: 'none' },
              display: {
                xs: currentSelectedRoom ? 'none' : 'flex',
                md: 'flex'
              },
              flexDirection: 'column',
              bgcolor: '#FFFFFF'
            }}
          >
            {/* Filter Tabs: Active / Unread / Completed */}
            <Box sx={{ px: 1.35, py: 1, borderBottom: '1px solid #F1F5F9', bgcolor: '#FFFFFF', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                <Chip
                  label={`Active (${activeChatRooms.length})`}
                  size="small"
                  clickable
                  onClick={() => setChatFilter('active')}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    bgcolor: chatFilter === 'active' ? '#075E54' : '#F1F5F9',
                    color: chatFilter === 'active' ? '#FFFFFF' : '#475569',
                    '&:hover, &.Mui-focusVisible': {
                      bgcolor: chatFilter === 'active' ? '#064E46' : '#E2E8F0'
                    }
                  }}
                />
                <Chip
                  label={`Unread (${unreadRoomsCount})`}
                  size="small"
                  clickable
                  onClick={() => setChatFilter('unread')}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    bgcolor: chatFilter === 'unread' ? '#25D366' : '#F1F5F9',
                    color: chatFilter === 'unread' ? '#FFFFFF' : '#475569',
                    '&:hover, &.Mui-focusVisible': {
                      bgcolor: chatFilter === 'unread' ? '#1FB858' : '#E2E8F0'
                    }
                  }}
                />
                <Chip
                  label={`Completed (${completedChatRooms.length})`}
                  size="small"
                  clickable
                  onClick={() => setChatFilter('completed')}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    bgcolor: chatFilter === 'completed' ? '#334155' : '#F1F5F9',
                    color: chatFilter === 'completed' ? '#FFFFFF' : '#475569',
                    '&:hover, &.Mui-focusVisible': {
                      bgcolor: chatFilter === 'completed' ? '#1E293B' : '#E2E8F0'
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Scrollable Room Items */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {isProjectsLoading || isChatRoomsLoading ? (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[1, 2, 3, 4].map((k) => (
                    <Skeleton key={k} variant="rounded" height={64} sx={{ borderRadius: 2 }} />
                  ))}
                </Box>
              ) : filteredChatRooms.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: '#64748B' }}>
                  <ForumRoundedIcon sx={{ fontSize: 34, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>
                    {chatFilter === 'unread'
                      ? 'No unread client chats'
                      : chatFilter === 'completed'
                      ? 'No matching completed orders'
                      : 'No matching active rooms'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    {chatFilter === 'completed'
                      ? 'All completed order chats stay permanently saved here.'
                      : 'Completed orders can be viewed anytime from the Completed tab.'}
                  </Typography>
                  {chatFilter !== 'completed' && chatSearch.trim() && completedSearchMatches > 0 && (
                    <Chip
                      label={`View ${completedSearchMatches} in Completed`}
                      size="small"
                      clickable
                      onClick={() => setChatFilter('completed')}
                      sx={{
                        mt: 1.5,
                        fontWeight: 700,
                        bgcolor: '#334155',
                        color: '#FFFFFF'
                      }}
                    />
                  )}
                </Box>
              ) : (
                filteredChatRooms.map((room: any) => {
                  const isSelected = currentSelectedRoom && String(currentSelectedRoom.projectId) === String(room.projectId);
                  const displayName = room.clientName || room.projectName || 'Client Room';
                  const isMineLast =
                    Boolean(currentUserId && room.lastSenderId && String(room.lastSenderId) === currentUserId);
                  const sidebarReaders = Array.isArray(room.lastMessageReadBy)
                    ? room.lastMessageReadBy.filter((r: any) => !room.lastSenderId || String(r.userId) !== String(room.lastSenderId))
                    : [];
                  const isLastBlueTick =
                    sidebarReaders.length > 0 || (Boolean(room.lastMessageIsReadByAdmin) && room.lastSenderRole !== 'admin');
                  const sidebarSeenText =
                    sidebarReaders.length > 0
                      ? `Seen by ${sidebarReaders.map((r: any) => r.userName).join(', ')}`
                      : isLastBlueTick
                      ? 'Seen by Admin'
                      : 'Delivered • Not seen yet';

                  return (
                    <Box
                      key={room.projectId}
                      onClick={() => setSelectedRoom(room)}
                      sx={{
                        px: 1.75,
                        py: 1.35,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.35,
                        cursor: 'pointer',
                        borderBottom: '1px solid #F1F5F9',
                        bgcolor: isSelected
                          ? '#E6F4F1'
                          : room.unreadCount > 0
                          ? '#F0FDF4'
                          : '#FFFFFF',
                        borderLeft: isSelected ? '4px solid #075E54' : '4px solid transparent',
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: isSelected ? '#E6F4F1' : '#F8FAFC'
                        }
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          bgcolor: room.isCompleted ? '#64748B' : room.unreadCount > 0 ? '#075E54' : '#C89F5A',
                          color: '#FFFFFF',
                          flexShrink: 0
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              noWrap
                              sx={{
                                fontWeight: room.unreadCount > 0 ? 900 : 700,
                                color: '#111B21',
                                fontSize: '0.89rem'
                              }}
                            >
                              {displayName}
                            </Typography>
                            {room.isCompleted && (
                              <Chip
                                label="Completed"
                                size="small"
                                sx={{
                                  height: 17,
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  bgcolor: '#E2E8F0',
                                  color: '#475569',
                                  flexShrink: 0
                                }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.68rem',
                              fontWeight: room.unreadCount > 0 ? 800 : 500,
                              color: room.unreadCount > 0 ? '#128C7E' : '#667781',
                              flexShrink: 0
                            }}
                          >
                            {formatRoomTimestamp(room.lastMessageTime)}
                          </Typography>
                        </Box>

                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ display: 'block', color: '#64748B', fontSize: '0.72rem', fontWeight: 600 }}
                        >
                          {room.workOrderId ? `[${room.workOrderId}] ` : ''}
                          {room.projectName}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, minWidth: 0, flex: 1 }}>
                            {room.lastMessage && isMineLast && (
                              <Tooltip title={sidebarSeenText} arrow placement="top">
                                <Box sx={{ display: 'inline-flex', flexShrink: 0, cursor: 'pointer' }}>
                                  <DoneAllRoundedIcon
                                    sx={{
                                      fontSize: 15,
                                      color: isLastBlueTick ? '#0284C7' : '#8696A0'
                                    }}
                                  />
                                </Box>
                              </Tooltip>
                            )}
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                color: room.unreadCount > 0 ? '#111B21' : '#667781',
                                fontWeight: room.unreadCount > 0 ? 700 : 400,
                                fontSize: '0.75rem'
                              }}
                            >
                              {room.lastMessage
                                ? isMineLast
                                  ? room.lastMessage
                                  : `${room.lastSenderName ? `${room.lastSenderName}: ` : ''}${room.lastMessage}`
                                : 'No messages yet • Click to start chat'}
                            </Typography>
                          </Box>

                          {room.unreadCount > 0 && (
                            <Box
                              sx={{
                                minWidth: 20,
                                height: 20,
                                px: 0.65,
                                borderRadius: '999px',
                                bgcolor: '#25D366',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                flexShrink: 0
                              }}
                            >
                              {room.unreadCount}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>

          {/* Right Pane: Embedded WhatsApp Thread OR Idle Placeholder */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              height: '100%',
              display: {
                xs: currentSelectedRoom ? 'flex' : 'none',
                md: 'flex'
              },
              flexDirection: 'column',
              minWidth: 0,
              overflow: 'hidden',
              bgcolor: '#EFEAE2'
            }}
          >
            {currentSelectedRoom ? (
              <ChatRoomThread
                slabId={currentSelectedRoom.slabId || currentSelectedRoom.projectId}
                projectId={currentSelectedRoom.projectId}
                title={currentSelectedRoom.clientName || currentSelectedRoom.projectName}
                subtitle={`${currentSelectedRoom.workOrderId ? `[${currentSelectedRoom.workOrderId}] ` : ''}${currentSelectedRoom.projectName || ''}${currentSelectedRoom.isCompleted ? ' • Completed Order (Saved Chat)' : ''}`}
                avatarPhoto={currentSelectedRoom.customerPhoto}
                isActive={isUnnatiChatOpen && Boolean(currentSelectedRoom)}
                onClose={() => setSelectedRoom(null)}
                onOpenOrder={() => {
                  setIsUnnatiChatOpen(false);
                  navigate(`/projects/${currentSelectedRoom.projectId}`);
                }}
                height="100%"
              />
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  px: 4,
                  bgcolor: '#F0F2F5'
                }}
              >
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: '#DCFCE7',
                    color: '#075E54',
                    mb: 2,
                    border: '2px solid #A7F3D0'
                  }}
                >
                  <ForumRoundedIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.75 }}>
                  Unnati Chat
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 400, lineHeight: 1.55 }}>
                  Select any client or work order on the left to view permanent team discussions, share photos, and track read receipts with blue ticks.
                </Typography>
                <Chip
                  icon={<LockRoundedIcon sx={{ fontSize: '13px !important', color: '#075E54 !important' }} />}
                  label="Unread alerts stay active until opened by each user"
                  size="small"
                  sx={{
                    mt: 2.5,
                    bgcolor: '#FFFFFF',
                    color: '#075E54',
                    fontWeight: 700,
                    border: '1px solid #D1D7DB'
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
