import React, { useState } from 'react';
import { Box, Typography, Paper, Button, Grid, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import GroupIcon from '@mui/icons-material/Group';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ShieldIcon from '@mui/icons-material/Shield';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import { useGetDashboardSummaryQuery } from '../store/apiSlice';
import { useNavigate } from 'react-router-dom';

const DashboardCard = ({ icon: Icon, title, value, colorHint = 'primary.main', bgHint = 'secondary.main' }: any) => (
  <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
    <Box sx={{ display: 'flex', mb: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: bgHint, color: colorHint, display: 'flex' }}>
        <Icon fontSize="medium" />
      </Box>
    </Box>
    <Typography variant="overline" color="textSecondary" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 1 }}>
      {title}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 'auto' }}>
      {value}
    </Typography>
  </Paper>
);

const Dashboard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11
  const currentFY = currentMonth >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

  const [selectedFY, setSelectedFY] = useState<string>(currentFY);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(''); 

  const { data: summary, isLoading } = useGetDashboardSummaryQuery({ fy: selectedFY, month: selectedMonth });
  const navigate = useNavigate();

  const handleOpenLiveFeed = () => {
    navigate('/live-feed');
  };

  const handleExport = async (type: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dashboard/export/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  if (isLoading) return <Typography>Loading Dashboard...</Typography>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Dashboard</Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>Overview of business performance.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: '#FFF' }}>
            <InputLabel>Financial Year</InputLabel>
            <Select
              value={selectedFY}
              label="Financial Year"
              onChange={(e) => setSelectedFY(e.target.value)}
            >
              <MenuItem value="2024-2025">2024-2025</MenuItem>
              <MenuItem value="2025-2026">2025-2026</MenuItem>
              <MenuItem value="2026-2027">2026-2027</MenuItem>
              <MenuItem value="2027-2028">2027-2028</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: '#FFF' }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(e.target.value as number | '')}
            >
              <MenuItem value="">All Year</MenuItem>
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
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={GroupIcon} title="TOTAL ENQUIRIES" value={summary?.totalLeads || 0} />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={DashboardIcon} title="ACTIVE WORK ORDERS" value={summary?.activeProjects || 0} />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={ReceiptIcon} title="PENDING QUOTATIONS" value={0} />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={MonetizationOnIcon} title="ADVANCE PAYMENTS" value={`₹${summary?.pendingInvoicesTotal || 0}`} colorHint="success.main" bgHint="success.light" />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={AssuredWorkloadIcon} title="DISPATCH READY" value={summary?.readyForDispatch || 0} colorHint="info.main" bgHint="info.light" />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={MonetizationOnIcon} title="NET PROFIT" value={`₹${summary?.profitability?.netProfit?.toLocaleString() || 0}`} colorHint="success.main" bgHint="success.light" />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={PrecisionManufacturingIcon} title="FACTORY EXPENSES" value={`₹${summary?.profitability?.factoryExpenses?.toLocaleString() || 0}`} colorHint="error.main" bgHint="error.light" />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <DashboardCard icon={GroupIcon} title="LABOR COST" value={`₹${summary?.profitability?.laborCost?.toLocaleString() || 0}`} colorHint="warning.main" bgHint="warning.light" />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
