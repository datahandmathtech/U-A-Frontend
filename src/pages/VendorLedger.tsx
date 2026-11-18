import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, Grid
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetVendorLedgerQuery, useGetVendorsQuery, useGetStaffListQuery,
  useGetProjectsQuery, useCreateMaterialLogMutation, useEditProductionLogMutation,
  useDeleteProductionLogMutation
} from '../store/apiSlice';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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

  // Group entries by normalized stage, compute independent running balance chronologically,
  // and sort newest-first (Descending by Date - Change 6) for display!
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

      // Change 6: Display newest dates at the top (November at top, older months below)
      const newestFirst = [...withIndependentBalance].reverse();
      processedMap.set(stg, newestFirst);
      summaryMap.set(stg, { out: sumOut, in: sumIn, pending: runningBal });
      grandPending += runningBal;
    });

    return {
      stageMap: processedMap,
      stageSummaryMap: summaryMap,
      totalPendingAllStages: grandPending
    };
  }, [ledger, stageTabs]);

  const activeEntries = stageMap.get(activeStageTab) || [];
  const prodStats = stageSummaryMap.get('Production') || { out: 0, in: 0, pending: 0 };
  const spareStats = stageSummaryMap.get('Spare Part') || { out: 0, in: 0, pending: 0 };
  const polishStats = stageSummaryMap.get('Polishing') || { out: 0, in: 0, pending: 0 };

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
        refetch();
        refetchVendors();
      } catch (err) {
        alert('Failed to delete entry');
      }
    }
  };

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading ledger...</Typography>;

  return (
    <Box>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/in-out?tab=3')} sx={{ bgcolor: '#FFF', border: '1px solid #E2E8F0' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ color: '#0F172A', lineHeight: 1.15 }}>
              {vendor?.name || 'Vendor'} - Ledger Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Financial Year 2026-27 • Separate Ledgers by Work Stage
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditLog(null);
            setEntryModalOpen(true);
          }}
          sx={{
            bgcolor: '#1E293B',
            color: '#FFF',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            '&:hover': { bgcolor: '#0F172A' }
          }}
        >
          + New Entry
        </Button>
      </Box>

      {/* Work Stage Tabs Bar (Change 7) */}
      <Paper
        elevation={0}
        sx={{
          p: 0.75,
          mb: 2,
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: 0.75
        }}
      >
        {stageTabs.map((tab) => {
          const isActive = activeStageTab === tab;
          const tabStats = stageSummaryMap.get(tab) || { out: 0, in: 0, pending: 0 };
          return (
            <Button
              key={tab}
              onClick={() => setActiveStageTab(tab)}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                px: 2.5,
                py: 0.9,
                borderRadius: 2.2,
                bgcolor: isActive ? '#0F172A' : 'transparent',
                color: isActive ? '#FFFFFF' : '#475569',
                '&:hover': {
                  bgcolor: isActive ? '#0F172A' : '#F1F5F9'
                }
              }}
            >
              {tab}
              {(tabStats.out > 0 || tabStats.in > 0) && (
                <Chip
                  label={`${tabStats.pending} pcs`}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    bgcolor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                    color: isActive ? '#FFFFFF' : '#334155'
                  }}
                />
              )}
            </Button>
          );
        })}
      </Paper>

      {/* Info Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          mb: 2.5,
          borderRadius: 2.5,
          border: '1px solid #BFDBFE',
          bgcolor: '#EFF6FF'
        }}
      >
        <Typography variant="body2" sx={{ color: '#1E3A8A', fontWeight: 600 }}>
          <strong>Separate Ledger by Work Stage:</strong> Each tab ({stageTabs.join(', ')}) maintains its own independent ledger and running balance. Entries are not cumulatively mixed across tabs.
        </Typography>
      </Paper>

      {/* 4 Summary KPI Cards Row (Matching Screenshot 7) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            onClick={() => setActiveStageTab('Production')}
            sx={{
              p: 2,
              borderRadius: 3,
              border: activeStageTab === 'Production' ? '2px solid #0F172A' : '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
              Production Pending
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.15 }}>
              {prodStats.pending} pcs
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block', mt: 0.5 }}>
              Out: {prodStats.out} pcs | In: {prodStats.in} pcs
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            onClick={() => setActiveStageTab('Spare Part')}
            sx={{
              p: 2,
              borderRadius: 3,
              border: activeStageTab === 'Spare Part' ? '2px solid #0F172A' : '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
              Spare Pending
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.15 }}>
              {spareStats.pending} pcs
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block', mt: 0.5 }}>
              Out: {spareStats.out} pcs | In: {spareStats.in} pcs
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            onClick={() => setActiveStageTab('Polishing')}
            sx={{
              p: 2,
              borderRadius: 3,
              border: activeStageTab === 'Polishing' ? '2px solid #0F172A' : '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
              Polishing Pending
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.15 }}>
              {polishStats.pending} pcs
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block', mt: 0.5 }}>
              Out: {polishStats.out} pcs | In: {polishStats.in} pcs
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#F8FAFC'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
              Total Pending
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.15 }}>
              {totalPendingAllStages} pcs
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block', mt: 0.5 }}>
              Production: {prodStats.pending} + Spare: {spareStats.pending}
              {polishStats.pending ? ` + Polish: ${polishStats.pending}` : ''}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Active Stage Ledger Table (Sorted Newest Date First - Change 6) */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A' }}>
            {activeStageTab} Ledger
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            Showing only {activeStageTab} entries with independent running balance (Newest Date on Top)
          </Typography>
        </Box>

        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>WORK STAGE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>PROJECT / CLIENT</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>VEHICLE NO.</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#D97706' }}>OUT (+)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>IN (-)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#0F172A' }}>RUNNING BALANCE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>REMARKS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeEntries.map((entry: any) => (
              <TableRow key={entry.id} hover>
                <TableCell sx={{ fontWeight: 700, color: '#0F172A' }}>
                  {new Date(entry.date || entry.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell>
                  <Chip
                    label={entry.stage || activeStageTab}
                    size="small"
                    sx={{ fontWeight: 800, bgcolor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                  />
                </TableCell>
                <TableCell>
                  {entry.project?.name ? (
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {entry.project.name}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {entry.vehicleNumber || '-'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: entry.piecesOut > 0 ? '#D97706' : '#CBD5E1' }}>
                  {entry.piecesOut > 0 ? `+${entry.piecesOut}` : '-'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: entry.piecesIn > 0 ? '#059669' : '#CBD5E1' }}>
                  {entry.piecesIn > 0 ? `-${entry.piecesIn}` : '-'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1rem', bgcolor: '#F8FAFC', color: '#0F172A' }}>
                  {entry.stageBalance} pcs
                </TableCell>
                <TableCell sx={{ color: '#475569', fontWeight: 600, fontSize: '0.84rem' }}>
                  {entry.productName || entry.remarks || '-'}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setEditLog(entry.rawLog || entry);
                        setEntryModalOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {activeEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary', fontWeight: 600 }}>
                  No {activeStageTab} transactions recorded yet for this vendor.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Bottom Snapshot of Other Work Stages */}
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>
            Other Work Stage Snapshot (for reference)
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155' }}>
            {stageTabs
              .filter((t) => t !== activeStageTab)
              .map((t) => {
                const st = stageSummaryMap.get(t) || { out: 0, in: 0, pending: 0 };
                return `${t}: Out ${st.out} | In ${st.in} | Pending ${st.pending} pcs`;
              })
              .join('   •   ')}
          </Typography>
        </Box>
      </TableContainer>

      <ManagerStyleEntryDialog
        open={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false);
          setEditLog(null);
        }}
        onSave={handleSaveEntry}
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
