import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, Grid, Select, MenuItem
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetVendorLedgerQuery, useGetVendorsQuery, useGetStaffListQuery,
  useGetProjectsQuery, useCreateMaterialLogMutation, useEditProductionLogMutation,
  useDeleteProductionLogMutation
} from '../store/apiSlice';
import AddIcon from '@mui/icons-material/Add';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import ManagerStyleEntryDialog from '../components/ManagerStyleEntryDialog';

const DEFAULT_STAGE_TABS = ['Production', 'Spare Part', 'Polishing', 'Packing', 'Dispatch'];

const normalizeLedgerStage = (rawStage?: string): string => {
  if (!rawStage) return 'Production';
  const cleaned = rawStage.replace(/\s*Work$/i, '').trim();
  const lower = cleaned.toLowerCase();
  if (lower === 'production') return 'Production';
  if (lower === 'spare part' || lower === 'spare parts' || lower === 'spare') return 'Spare Part';
  if (lower.startsWith('polish')) return 'Polishing';
  if (lower.startsWith('pack')) return 'Packing';
  if (lower.startsWith('dispatch')) return 'Dispatch';
  return cleaned;
};

const formatDate = (dateStr: any) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const VendorLedger: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vendors, refetch: refetchVendors } = useGetVendorsQuery({});
  const { data: staff } = useGetStaffListQuery();
  const { data: projects } = useGetProjectsQuery();
  const { data: ledger, isLoading, refetch } = useGetVendorLedgerQuery(id || '', { skip: !id });

  const [createMaterialLog] = useCreateMaterialLogMutation();
  const [editProductionLog] = useEditProductionLogMutation();
  const [deleteProductionLog] = useDeleteProductionLogMutation();

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editLog, setEditLog] = useState<any>(null);
  const [activeStageTab, setActiveStageTab] = useState<string>('Production');
  const [trackBy, setTrackBy] = useState<string>('Work Stage');
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Chronological by default matching image

  const vendor = vendors?.find((v: any) => v.id === id);

  // Compute all available stage tabs (default 5 + any custom stage in this vendor's ledger)
  const stageTabs = useMemo(() => {
    const set = new Set<string>(DEFAULT_STAGE_TABS);
    (ledger || []).forEach((entry: any) => {
      const norm = normalizeLedgerStage(entry.stage);
      if (norm) set.add(norm);
    });
    return Array.from(set);
  }, [ledger]);

  // Group entries by normalized stage, compute independent running balance chronologically
  const { stageMap, stageSummaryMap, totalPendingAllStages } = useMemo(() => {
    const grouped = new Map<string, any[]>();
    stageTabs.forEach((stg) => grouped.set(stg, []));

    // Sort all raw entries chronologically (oldest -> newest) first for accurate running balance
    const sortedChronological = [...(ledger || [])].sort(
      (a: any, b: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
    );

    sortedChronological.forEach((entry: any) => {
      const stg = normalizeLedgerStage(entry.stage);
      if (!grouped.has(stg)) grouped.set(stg, []);
      grouped.get(stg)!.push(entry);
    });

    const processedMap = new Map<string, any[]>();
    const summaryMap = new Map<string, { out: number; in: number; pending: number }>();
    let grandPending = 0;

    grouped.forEach((entries, stg) => {
      let runningBal = 0;
      let sumOut = 0;
      let sumIn = 0;

      const withIndependentBalance = entries.map((e: any) => {
        const pOut = Number(e.piecesOut) || (e.transactionType === 'OUT' ? Number(e.quantityProduced || 0) : 0);
        const pIn = Number(e.piecesIn) || (e.transactionType === 'IN' ? Number(e.quantityProduced || 0) : 0);
        sumOut += pOut;
        sumIn += pIn;
        runningBal = runningBal + pOut - pIn;
        return {
          ...e,
          normalizedStage: stg,
          piecesOut: pOut,
          piecesIn: pIn,
          stageBalance: runningBal
        };
      });

      processedMap.set(stg, withIndependentBalance);
      summaryMap.set(stg, { out: sumOut, in: sumIn, pending: runningBal });
      grandPending += runningBal;
    });

    return {
      stageMap: processedMap,
      stageSummaryMap: summaryMap,
      totalPendingAllStages: grandPending
    };
  }, [ledger, stageTabs]);

  const activeRawEntries = stageMap.get(activeStageTab) || [];
  const activeEntries = useMemo(() => {
    return sortAsc ? [...activeRawEntries] : [...activeRawEntries].reverse();
  }, [activeRawEntries, sortAsc]);

  const prodStats = stageSummaryMap.get('Production') || { out: 0, in: 0, pending: 0 };
  const spareStats = stageSummaryMap.get('Spare Part') || { out: 0, in: 0, pending: 0 };
  const polishStats = stageSummaryMap.get('Polishing') || { out: 0, in: 0, pending: 0 };
  const currentActiveStats = stageSummaryMap.get(activeStageTab) || { out: 0, in: 0, pending: 0 };

  const handleSaveEntry = async (data: any) => {
    try {
      if (editLog) {
        await editProductionLog({ id: editLog.id, data }).unwrap();
      } else {
        await createMaterialLog({
          ...data,
          source: 'admin_manual',
          startPhotos: { unit: data.photoUrl, machine: data.photoUrl, software: data.photoUrl },
          vendors: (Array.isArray(data.vendors) && data.vendors.length > 0)
            ? data.vendors
            : (data.transactionType === 'OUT' && data.assigneeType === 'vendor'
              ? [{ vendorId: data.vendorId, vendorName: data.vendorName, stage: data.stage || activeStageTab, qty: data.quantityProduced }]
              : undefined)
        }).unwrap();
      }
      setEntryModalOpen(false);
      setEditLog(null);
      refetch();
      refetchVendors();
    } catch (error) {
      console.error('Failed to save entry', error);
      alert('Error saving entry');
    }
  };

  const handleDelete = async (logId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction from the ledger?')) {
      try {
        await deleteProductionLog(logId).unwrap();
        setEntryModalOpen(false);
        setEditLog(null);
        refetch();
        refetchVendors();
      } catch (err) {
        alert('Failed to delete entry');
      }
    }
  };

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading ledger...</Typography>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* 1. BREADCRUMBS & TOP HEADER (Exact Match to User UI) */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography
            component="span"
            onClick={() => navigate('/in-out?tab=3')}
            sx={{
              color: '#B45309',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            &larr; Back to Vendors
          </Typography>
          <Typography component="span" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.88rem' }}>
            /
          </Typography>
          <Typography component="span" sx={{ color: '#334155', fontWeight: 700, fontSize: '0.88rem' }}>
            {vendor?.name || 'rajendra ji cutting'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.3px' }}>
            {vendor?.name || 'rajendra ji cutting'} - Vendor Ledger Account
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditLog(null);
              setEntryModalOpen(true);
            }}
            sx={{
              bgcolor: '#C0842B',
              color: '#FFFFFF',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 2,
              px: 2.8,
              py: 1,
              boxShadow: '0 2px 8px rgba(192, 132, 43, 0.25)',
              '&:hover': { bgcolor: '#A36E20' }
            }}
          >
            + Add Manual Entry
          </Button>
        </Box>
      </Box>

      {/* 2. STAGE TABS BAR WITH DROPDOWN ARROWS (Exact Match to User UI) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        {stageTabs.map((tab) => {
          const isActive = activeStageTab === tab;
          return (
            <Button
              key={tab}
              onClick={() => setActiveStageTab(tab)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                px: 2.2,
                py: 0.75,
                borderRadius: 2,
                bgcolor: isActive ? '#1976D2' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                border: isActive ? '1px solid #1976D2' : '1px solid #E2E8F0',
                boxShadow: isActive ? '0 2px 6px rgba(25, 118, 210, 0.25)' : 'none',
                '&:hover': {
                  bgcolor: isActive ? '#1565C0' : '#F8FAFC'
                }
              }}
            >
              {tab}
            </Button>
          );
        })}
      </Box>

      {/* 3. INFO ALERT BANNER (Exact Match to User UI) */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2.5,
          borderRadius: 2,
          border: '1px solid #BFDBFE',
          bgcolor: '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          gap: 1.2
        }}
      >
        <InfoOutlinedIcon sx={{ color: '#1D4ED8', fontSize: 20, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ color: '#1E3A8A', fontSize: '0.84rem' }}>
          <strong style={{ fontWeight: 800 }}>Separate Ledger by Work Stage:</strong> Each tab (Production, Spare Part, Polishing, Packing, Dispatch) maintains its own independent ledger and running balance. Entries are <strong>not cumulatively mixed</strong> across tabs.
        </Typography>
      </Paper>

      {/* 4. 4 KPI CARDS IN A ROW WITH ICON SQUARES (Exact Match to User UI) */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* Production Pending */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            onClick={() => setActiveStageTab('Production')}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: activeStageTab === 'Production' ? '2px solid #1976D2' : '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8', flexShrink: 0 }}>
              <SettingsOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B' }}>Production Pending</Typography>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#1D4ED8', lineHeight: 1.15, my: 0.2 }}>
                {prodStats.pending} pcs
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B' }}>
                (Out: {prodStats.out} pcs | In: {prodStats.in} pcs)
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Spare Pending */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            onClick={() => setActiveStageTab('Spare Part')}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: activeStageTab === 'Spare Part' ? '2px solid #D97706' : '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', flexShrink: 0 }}>
              <LayersOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B' }}>Spare Pending</Typography>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#D97706', lineHeight: 1.15, my: 0.2 }}>
                {spareStats.pending} pcs
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B' }}>
                (Out: {spareStats.out} pcs | In: {spareStats.in} pcs)
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Polishing Pending */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            onClick={() => setActiveStageTab('Polishing')}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: activeStageTab === 'Polishing' ? '2px solid #9333EA' : '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA', flexShrink: 0 }}>
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B' }}>Polishing Pending</Typography>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#9333EA', lineHeight: 1.15, my: 0.2 }}>
                {polishStats.pending} pcs
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B' }}>
                (Out: {polishStats.out} pcs | In: {polishStats.in} pcs)
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Total Pending */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid #BBF7D0',
              bgcolor: '#F0FDF4',
              display: 'flex',
              alignItems: 'center',
              gap: 1.75
            }}
          >
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', flexShrink: 0 }}>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>&Sigma;</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803D' }}>Total Pending</Typography>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#16A34A', lineHeight: 1.15, my: 0.2 }}>
                {totalPendingAllStages} pcs
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#15803D' }}>
                (Production: {prodStats.pending} + Spare: {spareStats.pending})
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 5. FILTER CONTROLS BAR (Exact Match to User UI) */}
      <Paper
        elevation={0}
        sx={{
          p: 1.25,
          mb: 2.5,
          borderRadius: 2,
          border: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Track By */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Track By</Typography>
            <Select
              size="small"
              value={trackBy}
              onChange={(e) => setTrackBy(e.target.value)}
              sx={{
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: '#F8FAFC',
                '& .MuiSelect-select': { py: 0.7, px: 1.5 }
              }}
            >
              <MenuItem value="Work Stage">Work Stage</MenuItem>
              <MenuItem value="Material">Material</MenuItem>
            </Select>
          </Box>

          {/* Work Stage (Sheet) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Work Stage (Sheet)</Typography>
            <Select
              size="small"
              value={activeStageTab}
              onChange={(e) => setActiveStageTab(e.target.value)}
              sx={{
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: '#F8FAFC',
                '& .MuiSelect-select': { py: 0.7, px: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }
              }}
            >
              {stageTabs.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Date Range */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Date Range</Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid #CBD5E1',
                borderRadius: 1.5,
                px: 1.5,
                py: 0.6,
                bgcolor: '#F8FAFC',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#334155'
              }}
            >
              <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: '#64748B' }} />
              <span>01-09-2026  -  30-09-2026</span>
              <KeyboardArrowDownIcon sx={{ fontSize: 16, color: '#64748B' }} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderColor: '#CBD5E1',
              color: '#334155',
              py: 0.6,
              px: 1.5
            }}
          >
            More Filters
          </Button>
          <IconButton size="small" onClick={() => refetch()} sx={{ border: '1px solid #CBD5E1', borderRadius: 1.5, p: 0.7 }}>
            <RefreshIcon sx={{ fontSize: 18, color: '#475569' }} />
          </IconButton>
        </Box>
      </Paper>

      {/* 6. LEDGER TABLE CONTAINER (Exact Match to User UI) */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, overflow: 'hidden' }}>
        {/* Table Header Row: Production Ledger (Work Stage: Production) + Current Balance (Pending) */}
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsOutlinedIcon sx={{ color: '#1976D2', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1976D2' }}>
              {activeStageTab} Ledger (Work Stage: {activeStageTab})
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              borderRadius: 2,
              px: 1.5,
              py: 0.4,
              fontSize: '0.84rem',
              fontWeight: 800
            }}
          >
            Current Balance (Pending): {currentActiveStats.pending} pcs
          </Box>
        </Box>

        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem', width: 45 }}>#</TableCell>
              <TableCell
                onClick={() => setSortAsc(!sortAsc)}
                sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  DATE
                  <SwapVertIcon sx={{ fontSize: 16, color: '#64748B' }} />
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>MATERIAL TYPE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>VEHICLE / REF</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#DC2626', fontSize: '0.78rem' }}>OUTWARD (-)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#16A34A', fontSize: '0.78rem' }}>INWARD (+)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#1D4ED8', fontSize: '0.78rem' }}>RUNNING BALANCE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>REMARKS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeEntries.map((entry: any, idx: number) => {
              const isOut = entry.piecesOut > 0 || entry.transactionType === 'OUT';
              return (
                <TableRow
                  key={entry.id || idx}
                  hover
                  onClick={() => {
                    setEditLog(entry.rawLog || entry);
                    setEntryModalOpen(true);
                  }}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isOut ? 'rgba(254, 242, 242, 0.35)' : 'rgba(240, 253, 244, 0.35)',
                    '&:hover': {
                      bgcolor: isOut ? 'rgba(254, 226, 226, 0.55) !important' : 'rgba(220, 252, 231, 0.55) !important'
                    }
                  }}
                >
                  <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.8rem', py: 1.1 }}>
                    {idx + 1}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B', fontSize: '0.82rem', py: 1.1 }}>
                    {formatDate(entry.date || entry.createdAt)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.82rem', py: 1.1 }}>
                    {entry.stage || activeStageTab}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem', py: 1.1 }}>
                    {entry.vehicleNumber || '-'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#DC2626', fontSize: '0.84rem', py: 1.1 }}>
                    {entry.piecesOut > 0 ? `${entry.piecesOut} pcs` : '-'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#16A34A', fontSize: '0.84rem', py: 1.1 }}>
                    {entry.piecesIn > 0 ? `${entry.piecesIn} pcs` : '-'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#1D4ED8', fontSize: '0.84rem', py: 1.1 }}>
                    {entry.stageBalance} (Pending)
                  </TableCell>
                  <TableCell sx={{ py: 1.1 }}>
                    {isOut ? (
                      <Chip
                        label="OUT (-)"
                        size="small"
                        sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 800, fontSize: '0.72rem', height: 22, borderRadius: 1.5 }}
                      />
                    ) : (
                      <Chip
                        label="IN (+)"
                        size="small"
                        sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 800, fontSize: '0.72rem', height: 22, borderRadius: 1.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: '#475569', fontWeight: 500, fontSize: '0.82rem', py: 1.1 }}>
                    {entry.productName || entry.remarks || (isOut ? 'Material sent to vendor' : 'Received from vendor')}
                  </TableCell>
                </TableRow>
              );
            })}
            {activeEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 5, color: '#64748B', fontWeight: 600 }}>
                  No {activeStageTab} transactions recorded yet for this vendor.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* 7. BOTTOM SNAPSHOT OF OTHER WORK STAGES (Exact Match to User UI) */}
        <Box sx={{ px: 2, py: 1.3, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoOutlinedIcon sx={{ fontSize: 18, color: '#1D4ED8' }} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
              Other Work Stage Snapshot (for reference):
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {stageTabs
              .filter((t) => t !== activeStageTab)
              .map((t) => {
                const st = stageSummaryMap.get(t) || { out: 0, in: 0, pending: 0 };
                return (
                  <Box
                    key={t}
                    onClick={() => setActiveStageTab(t)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      bgcolor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 1.5,
                      px: 1.2,
                      py: 0.35,
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#334155',
                      '&:hover': { bgcolor: '#F1F5F9' }
                    }}
                  >
                    <span>📦</span>
                    <strong>{t}:</strong>
                    <span>Out: <strong style={{ color: '#DC2626' }}>{st.out} pcs</strong></span>
                    <span>|</span>
                    <span>In: <strong style={{ color: '#16A34A' }}>{st.in} pcs</strong></span>
                    <span>|</span>
                    <Chip
                      label={`Pending: ${st.pending} pcs`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800, bgcolor: '#DBEAFE', color: '#1D4ED8', borderRadius: 1 }}
                    />
                  </Box>
                );
              })}
          </Box>
        </Box>
      </TableContainer>

      {/* Manual Entry / Edit Dialog */}
      <ManagerStyleEntryDialog
        open={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false);
          setEditLog(null);
        }}
        onSave={handleSaveEntry}
        onDelete={editLog ? () => handleDelete(editLog.id) : undefined}
        initialData={editLog || { stage: activeStageTab, transactionType: 'OUT', vendorId: id, vendorName: vendor?.name }}
        vendors={vendors}
        staff={staff}
        projects={projects}
        defaultVendorId={id}
        isEditMode={!!editLog}
      />
    </Box>
  );
};

export default VendorLedger;
