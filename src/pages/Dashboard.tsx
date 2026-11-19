import React, { useState } from 'react';
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
  Skeleton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Icons
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LiveTvRoundedIcon from '@mui/icons-material/LiveTvRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { useGetDashboardSummaryQuery, useGetProjectsQuery } from '../store/apiSlice';
import ProductChatAlerts from '../components/Dashboard/ProductChatAlerts';
import { ProductChatDrawer } from '../components/Production/ProductChatDrawer';

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
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentFY = currentMonth >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

  const [selectedFY, setSelectedFY] = useState<string>(currentFY);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');

  const { data: summary, isLoading, isFetching } = useGetDashboardSummaryQuery(
    { fy: selectedFY, month: selectedMonth },
    { refetchOnFocus: false }
  );
  const { data: projects = [], isLoading: isProjectsLoading } = useGetProjectsQuery();
  const [selectedChatProject, setSelectedChatProject] = useState<any>(null);
  const navigate = useNavigate();

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
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>
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
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Select
            size="small"
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            IconComponent={KeyboardArrowDownIcon}
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: 2.5,
              fontWeight: 600,
              minWidth: 150,
              '& fieldset': { borderColor: '#E2E8F0' },
              '& .MuiSelect-select': { py: 1, px: 1.5 }
            }}
          >
            <MenuItem value="2024-2025">FY 2024-2025</MenuItem>
            <MenuItem value="2025-2026">FY 2025-2026</MenuItem>
            <MenuItem value="2026-2027">FY 2026-2027</MenuItem>
            <MenuItem value="2027-2028">FY 2027-2028</MenuItem>
          </Select>

          <Select
            size="small"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value as number | '')}
            displayEmpty
            IconComponent={KeyboardArrowDownIcon}
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: 2.5,
              minWidth: 140,
              '& fieldset': { borderColor: '#E2E8F0' },
              '& .MuiSelect-select': { py: 1, px: 1.5 }
            }}
          >
            <MenuItem value="">Full Year</MenuItem>
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

          <Button
            variant="contained"
            startIcon={<LiveTvRoundedIcon />}
            onClick={() => navigate('/live-feed')}
            sx={{
              bgcolor: '#1E293B',
              color: '#FFFFFF',
              fontWeight: 700,
              borderRadius: 2.5,
              px: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              '&:hover': { bgcolor: '#0F172A' }
            }}
          >
            Factory Cam
          </Button>
        </Box>
      </Box>

      {/* Product Chat Alerts for Admin */}
      <ProductChatAlerts />

      {/* 2. Primary KPI Metric Cards - Static Analytical Display without navigation */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={FilterAltRoundedIcon}
            title="Total Enquiries"
            value={summary?.totalLeads || 0}
            subtitle="Active pipeline leads"
            colorHint="#6366F1"
            bgHint="#EEF2FF"
            borderHint="#C7D2FE"
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={DashboardRoundedIcon}
            title="Active Work Orders"
            value={summary?.activeProjects || 0}
            subtitle="Live production orders"
            colorHint="#C89F5A"
            bgHint="#FFF4E5"
            borderHint="#FFE0B2"
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={LocalShippingRoundedIcon}
            title="Dispatch Ready"
            value={summary?.readyForDispatch || 0}
            subtitle="Completed pieces for loading"
            colorHint="#0284C7"
            bgHint="#F0F9FF"
            borderHint="#BAE6FD"
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={MonetizationOnRoundedIcon}
            title="Net Profit"
            value={`₹${summary?.profitability?.netProfit?.toLocaleString() || 0}`}
            subtitle="Revenue minus total costs"
            colorHint="#059669"
            bgHint="#ECFDF5"
            borderHint="#A7F3D0"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* 3. Financial & Cost Summary Strip */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={AccountBalanceWalletRoundedIcon}
            title="Advance Payments"
            value={`₹${summary?.pendingInvoicesTotal?.toLocaleString() || 0}`}
            subtitle="Received from clients"
            colorHint="#059669"
            bgHint="#ECFDF5"
            borderHint="#A7F3D0"
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={ReceiptLongRoundedIcon}
            title="Pending Quotations"
            value={summary?.pendingQuotations || 0}
            subtitle="Awaiting client confirmation"
            colorHint="#D97706"
            bgHint="#FFFBEB"
            borderHint="#FDE68A"
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={PrecisionManufacturingRoundedIcon}
            title="Factory Expenses"
            value={`₹${summary?.profitability?.factoryExpenses?.toLocaleString() || 0}`}
            subtitle="Operational maintenance"
            colorHint="#DC2626"
            bgHint="#FEF2F2"
            borderHint="#FCA5A5"
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={PeopleAltRoundedIcon}
            title="Labor / Staff Cost"
            value={`₹${summary?.profitability?.laborCost?.toLocaleString() || 0}`}
            subtitle="Factory wages & OT"
            colorHint="#D97706"
            bgHint="#FFFBEB"
            borderHint="#FDE68A"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* 4. Chat Rooms Section (Replaced Factory Modules Overview as per user requirement) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          bgcolor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                bgcolor: '#FFF4E5',
                color: '#C89F5A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #FFE0B2'
              }}
            >
              <ForumRoundedIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
                Chat Rooms
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Client-wise live discussion channels for project orders & enquiries
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: 10, color: '#10B981 !important' }} />}
            label={`${projects.filter((p: any) => p.hasChatRoom !== false).length} Active Client Rooms`}
            size="small"
            sx={{
              bgcolor: '#ECFDF5',
              color: '#065F46',
              fontWeight: 700,
              fontSize: '0.75rem',
              border: '1px solid #A7F3D0'
            }}
          />
        </Box>

        {isProjectsLoading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={k}>
                <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : projects.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: '#64748B' }}>
            <Typography variant="body2">No client projects found yet. Create an enquiry to start a chat room.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {projects
              .filter((p: any) => p.hasChatRoom !== false)
              .map((project: any) => {
                const displayName = project.clientName || project.name || 'Unnamed Client';
                const initial = displayName.charAt(0).toUpperCase();
                const isWorkOrder = project.status === 'work_order' || project.isDirectWorkOrder;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={project.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#FFFFFF',
                          borderColor: '#C89F5A',
                          boxShadow: '0 4px 14px rgba(200, 159, 90, 0.15)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Box>
                        {/* Top row: Avatar + Client Name */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              bgcolor: isWorkOrder ? '#C89F5A' : '#3B82F6',
                              color: '#FFFFFF'
                            }}
                          >
                            {initial}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {displayName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#64748B',
                                fontSize: '0.72rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block'
                              }}
                            >
                              {project.projectId ? `[${project.projectId}] ` : ''}{project.name}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Status chip */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                          <Chip
                            label={project.status || 'Active'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              bgcolor: isWorkOrder ? '#FEF3C7' : '#EFF6FF',
                              color: isWorkOrder ? '#92400E' : '#1D4ED8',
                              borderRadius: 1
                            }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FiberManualRecordIcon sx={{ fontSize: 8, color: '#10B981' }} />
                            <Typography sx={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>
                              Ready
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Open Chat Action */}
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ForumRoundedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setSelectedChatProject(project)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          borderRadius: 2,
                          py: 0.6,
                          bgcolor: '#C89F5A',
                          color: '#FFFFFF',
                          boxShadow: 'none',
                          '&:hover': {
                            bgcolor: '#B38B36',
                            boxShadow: '0 2px 8px rgba(179, 139, 54, 0.3)'
                          }
                        }}
                      >
                        Open Chat
                      </Button>
                    </Paper>
                  </Grid>
                );
              })}
          </Grid>
        )}
      </Paper>

      {/* Live Product / Client Chat Drawer */}
      {selectedChatProject && (
        <ProductChatDrawer
          open={Boolean(selectedChatProject)}
          onClose={() => setSelectedChatProject(null)}
          slab={{
            id: selectedChatProject.id,
            projectId: selectedChatProject.id,
            name: selectedChatProject.name,
            clientName: selectedChatProject.clientName
          }}
          projectId={selectedChatProject.id}
          projectName={selectedChatProject.name}
        />
      )}
    </Box>
  );
};

export default Dashboard;
