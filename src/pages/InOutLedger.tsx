import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Card, CardContent, Chip, CircularProgress, 
  Grid, Dialog, Button, DialogTitle, DialogContent, DialogActions, 
  TextField, MenuItem, FormControl, InputLabel, Select, OutlinedInput, 
  Checkbox, ListItemText, Snackbar, Alert, IconButton, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, Autocomplete, 
  Avatar, Tooltip 
} from '@mui/material';
import VendorsList from './VendorsList';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import OutputIcon from '@mui/icons-material/Output';
import InputIcon from '@mui/icons-material/Input';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import CloseIcon from '@mui/icons-material/Close';
import { 
  useGetActiveOutLogsQuery, useGetPendingApprovalsQuery, useGetApprovedLogsQuery, 
  useApproveMaterialLogMutation, useGetProjectsQuery, useGetSlabsQuery, 
  useDeleteProductionLogMutation, useCreateMaterialLogMutation, useGetVendorsQuery, 
  useGetStaffListQuery, useEditProductionLogMutation 
} from '../store/apiSlice';
import ManagerStyleEntryDialog from '../components/ManagerStyleEntryDialog';
import { getOptimizedUrl, getFullQualityUrl } from '../utils/cloudinary';

const InOutLedger: React.FC = () => {
  const { data: activeOutLogsData, isLoading: outLogsLoading, refetch } = useGetActiveOutLogsQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true
  });
  const { data: pendingLogs, isLoading: pendingLoading } = useGetPendingApprovalsQuery(undefined, {
    pollingInterval: 20000,
    skipPollingIfUnfocused: true
  });
  const { data: approvedLogsData, isLoading: approvedLoading } = useGetApprovedLogsQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true
  });
  const { data: projects } = useGetProjectsQuery();
  const [approveLog, { isLoading: isApproving }] = useApproveMaterialLogMutation();
  const [deleteProductionLog] = useDeleteProductionLogMutation();

  const { data: vendorsData } = useGetVendorsQuery({});
  const { data: staffData } = useGetStaffListQuery();
  const [createMaterialLog] = useCreateMaterialLogMutation();
  const [editProductionLog] = useEditProductionLogMutation();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [editLogOpen, setEditLogOpen] = useState(false);
  const [selectedEditLog, setSelectedEditLog] = useState<any>(null);
  
  const handleManualEntrySubmit = async (data: any) => {
    try {
      if (editLogOpen && selectedEditLog) {
        await editProductionLog({ id: selectedEditLog.id, data }).unwrap();
        setToast({ open: true, message: 'Log updated successfully!', severity: 'success' });
      } else {
        await createMaterialLog({
          ...data,
          source: 'admin_manual',
          startPhotos: { unit: data.photoUrl, machine: data.photoUrl, software: data.photoUrl },
          vendors: data.transactionType === 'OUT' && data.assigneeType === 'vendor' ? [{ vendorId: data.vendorId, vendorName: data.vendorName, qty: data.quantityProduced }] : undefined,
        }).unwrap();
        setToast({ open: true, message: 'Log created successfully', severity: 'success' });
      }
      setManualEntryOpen(false);
      setEditLogOpen(false);
      setSelectedEditLog(null);
      refetch();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Failed to save log', severity: 'error' });
    }
  };

  const activeOutLogs = (activeOutLogsData || []).filter((log: any) => !!log.transactionType);
  const pendingMaterialLogs = (pendingLogs || []).filter((log: any) => !!log.transactionType);
  const completedMaterialLogs = (approvedLogsData || []).filter((log: any) => !!log.transactionType);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [projectSplits, setProjectSplits] = useState<{projectId: string, qty: number, productId?: string, productName?: string, slabId?: string, pieceIds?: string[], stage?: string, directEntry?: boolean}>([{projectId: '', qty: 0, directEntry: false}]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success'|'error' });
  const [currentTab, setCurrentTab] = useState(0);
  
  const today = new Date();
  const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const currentFY = `FY ${currentYear}-${currentYear + 1}`;
  const currentMonthStr = `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedFY, setSelectedFY] = useState<string>(currentFY);

  const activeProjectId = projectSplits.find(s => !!s.projectId)?.projectId || selectedLog?.projectId;
  const { data: slabs } = useGetSlabsQuery(activeProjectId, { skip: !activeProjectId });

  const handleApproveClick = async (log: any) => {
    if (log.transactionType === 'IN') {
      setSelectedLog(log);
      setProjectSplits([{ projectId: log.projectId || '', qty: log.quantityProduced || 0, productId: log.productId || '', productName: log.productName || '', slabId: log.slabId || '', pieceIds: log.pieceIds || [] }]);
      setApprovalDialogOpen(true);
    } else {
      if (window.confirm("Are you sure you want to approve this OUT log?")) {
        try {
          await approveLog({ 
            id: log.id, 
            data: { 
              approvalStatus: 'approved',
              splits: [{ projectId: log.projectId || '', qty: log.quantityProduced || 0, productId: log.productId || '', productName: log.productName || '', slabId: log.slabId || '', pieceIds: log.pieceIds || [] }]
            } 
          }).unwrap();
          setToast({ open: true, message: 'Log Approved successfully', severity: 'success' });
          refetch();
        } catch (err: any) {
          setToast({ open: true, message: err?.data?.message || 'Approval failed', severity: 'error' });
        }
      }
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      try {
        await deleteProductionLog(logId).unwrap();
        setToast({ open: true, message: 'Log deleted successfully', severity: 'success' });
      } catch (err: any) {
        setToast({ open: true, message: err?.data?.message || 'Failed to delete log', severity: 'error' });
      }
    }
  };

  const submitApproval = async () => {
    try {
      const validSplits = projectSplits.filter(s => s.projectId && s.qty > 0);
      const totalSplitQty = validSplits.reduce((acc, split) => acc + (Number(split.qty) || 0), 0);
      const expectedQty = Number(selectedLog.quantityProduced) || 0;
      
      if (expectedQty > 0 && totalSplitQty !== expectedQty) {
        setToast({ open: true, message: `Total assigned item count (${totalSplitQty}) must exactly match the reported item count (${expectedQty}).`, severity: 'error' });
        return;
      }
      if (validSplits.length === 0) {
        setToast({ open: true, message: 'Please select at least one project and enter item count.', severity: 'error' });
        return;
      }

      await approveLog({ 
        id: selectedLog.id, 
        data: { 
          approvalStatus: 'approved', 
          splits: validSplits
        } 
      }).unwrap();
      
      setApprovalDialogOpen(false);
      setProjectSplits([{projectId: '', qty: 0}]);
      setToast({ open: true, message: 'Approval saved successfully', severity: 'success' });
      refetch();
    } catch (err: any) {
      console.error("Approval submit error:", err);
      setToast({ open: true, message: err?.data?.message || err?.message || 'Approval failed', severity: 'error' });
    }
  };

  if (outLogsLoading || pendingLoading || approvedLoading) {
    return (
      <Box sx={{ display: 'flex', height: '60vh', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#C89F5A' }} />
      </Box>
    );
  }

  // Consolidate logs
  const allLogsMap = new Map();
  [...pendingMaterialLogs, ...completedMaterialLogs].forEach((log: any) => {
    allLogsMap.set(log.id, log);
  });
  const allLogs = Array.from(allLogsMap.values())
    .filter((log: any) => log.assigneeType === 'vendor' || !!log.vendorId) // Only vendor IN/OUT
    .filter((log: any) => {
      const d = new Date(log.createdAt);
      const logFYStart = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      return `FY ${logFYStart}-${logFYStart + 1}` === selectedFY;
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selectedFYStartYear = parseInt(selectedFY.split(' ')[1]?.split('-')[0] || String(currentYear));
  const fyMonths = [
    { label: 'April', year: selectedFYStartYear },
    { label: 'May', year: selectedFYStartYear },
    { label: 'June', year: selectedFYStartYear },
    { label: 'July', year: selectedFYStartYear },
    { label: 'August', year: selectedFYStartYear },
    { label: 'September', year: selectedFYStartYear },
    { label: 'October', year: selectedFYStartYear },
    { label: 'November', year: selectedFYStartYear },
    { label: 'December', year: selectedFYStartYear },
    { label: 'January', year: selectedFYStartYear + 1 },
    { label: 'February', year: selectedFYStartYear + 1 },
    { label: 'March', year: selectedFYStartYear + 1 }
  ];

  const fyOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `FY ${y}-${y + 1}`;
  });

  const renderUnifiedLogGrid = (logsToRender: any[]) => (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden', bgcolor: '#FFFFFF', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={{ bgcolor: '#F8FAFC' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>DATE</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>QTY</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>STAGE</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>VEHICLE</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>VENDOR / ASSIGNEE</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>TYPE</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>PROOF</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 2 }}>ACTIONS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logsToRender.map((log: any, idx: number) => {
            const isOut = log.transactionType === 'OUT';
            const photoUrl = log.photoUrl || log.startPhotos?.machine || log.startPhotos?.unit;
            return (
              <TableRow 
                key={log.id} 
                hover 
                sx={{ 
                  bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                  '&:hover': { bgcolor: '#F1F5F9' },
                  transition: 'background-color 0.15s ease'
                }}
              >
                <TableCell sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                    <Typography sx={{ color: '#334155', fontWeight: 600, fontSize: '0.85rem' }}>
                      {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell sx={{ py: 2 }}>
                  <Chip 
                    label={`${log.quantityProduced} pcs`} 
                    size="small" 
                    sx={{ 
                      fontWeight: 800, 
                      fontSize: '0.75rem', 
                      bgcolor: isOut ? '#FFF7ED' : '#EFF6FF',
                      color: isOut ? '#C2410C' : '#1D4ED8',
                      border: '1px solid',
                      borderColor: isOut ? '#FFEDD5' : '#DBEAFE',
                      borderRadius: 1.5 
                    }} 
                  />
                </TableCell>
                
                <TableCell sx={{ py: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                    {log.stage}
                  </Typography>
                </TableCell>
                
                <TableCell sx={{ py: 2 }}>
                  <Typography sx={{ fontWeight: 600, color: log.vehicleNumber ? '#0F172A' : '#94A3B8', fontSize: '0.82rem' }}>
                    {log.vehicleNumber || '—'}
                  </Typography>
                </TableCell>
                
                <TableCell sx={{ py: 2 }}>
                  <Typography sx={{ color: '#0F172A', fontWeight: 700, fontSize: '0.85rem' }}>
                    {log.vendorName || log.worker?.name || 'External Vendor'}
                  </Typography>
                </TableCell>
                
                <TableCell sx={{ py: 2 }}>
                  <Chip 
                    icon={isOut ? <OutputIcon sx={{ fontSize: '13px !important', color: '#EA580C !important' }} /> : <InputIcon sx={{ fontSize: '13px !important', color: '#0284C7 !important' }} />}
                    label={isOut ? 'OUT' : 'IN'}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      borderRadius: 1.5,
                      bgcolor: isOut ? '#FFF7ED' : '#F0F9FF',
                      color: isOut ? '#C2410C' : '#0369A1',
                      border: '1px solid',
                      borderColor: isOut ? '#FDBA74' : '#BAE6FD'
                    }}
                  />
                </TableCell>

                <TableCell sx={{ py: 2 }}>
                  {photoUrl ? (
                    <Box 
                      onClick={() => setPreviewPhoto(photoUrl)}
                      sx={{ 
                        width: 36, height: 36, borderRadius: 2, overflow: 'hidden', 
                        cursor: 'pointer', border: '1px solid #E2E8F0',
                        '&:hover': { transform: 'scale(1.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <img src={getOptimizedUrl(photoUrl)} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ color: '#CBD5E1' }}>No photo</Typography>
                  )}
                </TableCell>

                <TableCell align="center" sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                    {log.approvalStatus === 'pending' && (
                      <Tooltip title="Approve Log">
                        <IconButton size="small" onClick={() => handleApproveClick(log)} sx={{ bgcolor: '#ECFDF5', color: '#059669', '&:hover': { bgcolor: '#D1FAE5' } }}>
                          <CheckCircleIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Edit Log">
                      <IconButton onClick={() => { setSelectedEditLog(log); setEditLogOpen(true); }} size="small" sx={{ bgcolor: '#F8FAFC', color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Log">
                      <IconButton onClick={() => handleDeleteLog(log.id)} size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', '&:hover': { bgcolor: '#FEE2E2' } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ width: '100%', px: { xs: 0, sm: 0.5, md: 1 } }}>
      {/* 1. EXECUTIVE HEADER & CONTROLS */}
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              In/Out Material Ledger
            </Typography>
            <Chip 
              label="Gate Pass Tracking" 
              size="small" 
              sx={{ 
                bgcolor: '#FFFDF5', 
                color: '#B38B36', 
                border: '1px solid #C89F5A', 
                fontWeight: 800, 
                fontSize: '0.72rem',
                borderRadius: 1.5 
              }} 
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
            Audit gate-passes sent to job-work vendors and verify returned materials.
          </Typography>
        </Box>

        {/* Action Button & Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setManualEntryOpen(true)}
            sx={{ 
              fontWeight: 800, 
              py: 1, 
              px: 2.5,
              borderRadius: 2.5,
              textTransform: 'none',
              fontSize: '0.88rem',
              bgcolor: '#0F172A',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
              '&:hover': { bgcolor: '#1E293B' }
            }}
          >
            + New Gate Pass
          </Button>

          <FormControl size="small" sx={{ minWidth: 140, bgcolor: '#FFF' }}>
            <InputLabel sx={{ fontSize: '0.82rem', fontWeight: 600 }}>Financial Year</InputLabel>
            <Select 
              value={selectedFY} 
              label="Financial Year"
              onChange={(e) => setSelectedFY(e.target.value)}
              sx={{ borderRadius: 2, fontSize: '0.85rem' }}
            >
              {fyOptions.map(fy => (
                <MenuItem key={fy} value={fy}>{fy}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130, bgcolor: '#FFF' }}>
            <InputLabel sx={{ fontSize: '0.82rem', fontWeight: 600 }}>Month</InputLabel>
            <Select 
              value={selectedMonth} 
              label="Month"
              onChange={(e) => setSelectedMonth(e.target.value)} 
              sx={{ borderRadius: 2, fontSize: '0.85rem' }}
            >
              <MenuItem value="All">All Months</MenuItem>
              {fyMonths.map(m => (
                <MenuItem key={`${m.label} ${m.year}`} value={`${m.label} ${m.year}`}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* 2. KPI SUMMARY METRIC CARDS */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#FFF7ED', color: '#EA580C', width: 44, height: 44 }}>
              <OutputIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Active Outward Gate Passes
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#C2410C', mt: 0.2 }}>
                {activeOutLogs.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#F0F9FF', color: '#0284C7', width: 44, height: 44 }}>
              <InputIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Inward Returns
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0369A1', mt: 0.2 }}>
                {completedMaterialLogs.filter((l: any) => l.transactionType === 'IN').length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#FFFDF5', color: '#B38B36', width: 44, height: 44 }}>
              <BusinessRoundedIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Vendor Directory
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.2 }}>
                {vendorsData?.length || 0} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Partners</span>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. LUXURY TABS NAVIGATION */}
      <Paper elevation={0} sx={{ p: 0.75, borderRadius: 3, bgcolor: '#F1F5F9', mb: 3, display: 'inline-flex', border: '1px solid #E2E8F0' }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, val) => setCurrentTab(val)} 
          textColor="inherit"
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{ minHeight: 'unset' }}
        >
          <Tab 
            label="Material Outward (Factory OUT)" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '0.85rem', 
              py: 1, 
              px: 2.5,
              minHeight: 'unset',
              textTransform: 'none',
              borderRadius: 2.5,
              transition: 'all 0.15s ease',
              color: currentTab === 0 ? '#FFFFFF !important' : '#64748B',
              bgcolor: currentTab === 0 ? '#0F172A' : 'transparent',
              boxShadow: currentTab === 0 ? '0 2px 8px rgba(15, 23, 42, 0.15)' : 'none'
            }} 
          />
          <Tab 
            label="Material Inward (Factory IN)" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '0.85rem', 
              py: 1, 
              px: 2.5,
              minHeight: 'unset',
              textTransform: 'none',
              borderRadius: 2.5,
              transition: 'all 0.15s ease',
              color: currentTab === 1 ? '#FFFFFF !important' : '#64748B',
              bgcolor: currentTab === 1 ? '#0F172A' : 'transparent',
              boxShadow: currentTab === 1 ? '0 2px 8px rgba(15, 23, 42, 0.15)' : 'none'
            }} 
          />
          <Tab 
            label="Vendors & Job-Workers" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '0.85rem', 
              py: 1, 
              px: 2.5,
              minHeight: 'unset',
              textTransform: 'none',
              borderRadius: 2.5,
              transition: 'all 0.15s ease',
              color: currentTab === 2 ? '#FFFFFF !important' : '#64748B',
              bgcolor: currentTab === 2 ? '#0F172A' : 'transparent',
              boxShadow: currentTab === 2 ? '0 2px 8px rgba(15, 23, 42, 0.15)' : 'none'
            }} 
          />
        </Tabs>
      </Paper>

      {/* 4. TAB CONTENTS */}
      {currentTab === 2 && (
        <VendorsList hideHeader={true} selectedMonth={selectedMonth} selectedFY={selectedFY} />
      )}

      {(currentTab === 0 || currentTab === 1) && (
        <Box>
          {(() => {
            const tabLogs = allLogs.filter(log => currentTab === 0 ? log.transactionType === 'OUT' : log.transactionType === 'IN');
            if (tabLogs.length === 0) return (
              <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3.5, bgcolor: '#FFFFFF', border: '1px dashed #CBD5E1' }}>
                <FolderSpecialIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
                  No gate passes found
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                  No {currentTab === 0 ? 'Outward' : 'Inward'} logs recorded for the selected period.
                </Typography>
              </Paper>
            );
            
            const grouped = tabLogs.reduce((acc: any, log: any) => {
              const d = new Date(log.createdAt);
              const monthStr = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
              if (!acc[monthStr]) acc[monthStr] = [];
              acc[monthStr].push(log);
              return acc;
            }, {});

            return (
              <Box>
                {(selectedMonth === 'All' ? fyMonths : fyMonths.filter(m => `${m.label} ${m.year}` === selectedMonth))
                  .map(m => {
                    const monthKey = `${m.label} ${m.year}`;
                    const logs = grouped[monthKey];
                    if (!logs || logs.length === 0) return null;
                    return (
                      <Box key={monthKey} sx={{ mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonthRoundedIcon sx={{ fontSize: 18, color: '#B38B36' }} />
                          {monthKey}
                        </Typography>
                        {renderUnifiedLogGrid(logs)}
                      </Box>
                    );
                  })}
              </Box>
            );
          })()}
        </Box>
      )}

      {/* 5. APPROVAL DIALOG */}
      <Dialog 
        open={approvalDialogOpen} 
        onClose={() => setApprovalDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #E2E8F0', pb: 2 }}>
          Approve Material Log
          {selectedLog && (
            <Typography variant="caption" display="block" sx={{ color: '#64748B', mt: 0.5, fontWeight: 600 }}>
              Stage: {selectedLog.stage} • Quantity: {selectedLog.quantityProduced}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {projectSplits.map((split, idx) => {
            const projectSlabs = split.projectId ? (slabs?.filter((s: any) => s.projectId === split.projectId) || []) : [];
            return (
              <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3, p: 2.5, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#F8FAFC' }}>
                <TextField 
                  select 
                  label="Assign Project" 
                  fullWidth 
                  size="small" 
                  value={split.projectId} 
                  onChange={(e) => {
                    const newSplits = [...projectSplits];
                    newSplits[idx].projectId = e.target.value;
                    newSplits[idx].productId = '';
                    newSplits[idx].productName = '';
                    newSplits[idx].slabId = '';
                    newSplits[idx].pieceIds = [];
                    
                    const matched = slabs?.filter((s: any) => s.projectId === e.target.value);
                    if (matched && matched.length === 1) {
                      newSplits[idx].slabId = matched[0].id;
                      newSplits[idx].productName = matched[0].name;
                    }

                    setProjectSplits(newSplits);
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="" disabled>Select Project</MenuItem>
                  {projects?.map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>{p.projectId} – {p.name || ''} ({p.clientName})</MenuItem>
                  ))}
                </TextField>

                {/* Slabs Autocomplete */}
                {(() => {
                  const stages = ['Production', 'Polishing', 'Packing', 'Dispatch'];
                  const cleanLogStage = (selectedLog?.stage || '').replace(' Work', '').trim();
                  const logStageIdx = stages.indexOf(cleanLogStage);

                  const isPieceEligible = (p: any) => {
                    if (logStageIdx === -1) return p.status !== 'completed';
                    const pStage = (p.stage || 'Production').replace(' Work', '').trim();
                    const pStageIdx = stages.indexOf(pStage);
                    if (pStageIdx > logStageIdx) return false;
                    if (pStageIdx === logStageIdx) return p.status !== 'completed';
                    if (pStageIdx < logStageIdx) return p.status === 'completed';
                    return false;
                  };

                  const filteredSlabs = slabs ? slabs.filter((s: any) => {
                    if (s.projectId !== split.projectId) return false;
                    if (s.pieces && s.pieces.length > 0) {
                      const eligible = s.pieces.filter(isPieceEligible);
                      return eligible.length > 0;
                    }
                    return true;
                  }) : [];

                  if (filteredSlabs.length === 0 && split.projectId) {
                    return (
                      <Box sx={{ p: 1.5, bgcolor: '#FFFDF5', borderRadius: 2, border: '1px dashed #FDE68A' }}>
                        <Typography variant="body2" color="#B45309" fontWeight={600}>
                          Notice: No pending pieces found for stage <strong>{selectedLog?.stage || 'this stage'}</strong> under this project.
                        </Typography>
                      </Box>
                    );
                  }

                  const currentSlab = filteredSlabs.find((s: any) => s.id === split.slabId) || (filteredSlabs.length === 1 ? filteredSlabs[0] : null);
                  if (filteredSlabs.length === 1 && !split.slabId) {
                    split.slabId = filteredSlabs[0].id;
                    split.productName = filteredSlabs[0].name;
                  }

                  const eligiblePiecesForSlab = currentSlab?.pieces ? currentSlab.pieces.filter(isPieceEligible) : [];

                  return (
                    <>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={filteredSlabs}
                        getOptionLabel={(option: any) => {
                          const pendingCount = option.pieces ? option.pieces.filter(isPieceEligible).length : 0;
                          return `${option.name} (${pendingCount} Pending Pieces)`;
                        }}
                        value={filteredSlabs.find((s: any) => s.id === split.slabId) || null}
                        onChange={(e, newValue: any) => {
                          const newSplits = [...projectSplits];
                          if (newValue) {
                            newSplits[idx].slabId = newValue.id;
                            newSplits[idx].productName = newValue.name;
                          } else {
                            newSplits[idx].slabId = '';
                            newSplits[idx].productName = '';
                          }
                          newSplits[idx].pieceIds = [];
                          setProjectSplits(newSplits);
                        }}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            label="Search Product / Slab *" 
                            placeholder="Type name..."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        )}
                      />

                      {/* Pieces Selection */}
                      {split.slabId && eligiblePiecesForSlab.length > 0 && (() => {
                        const allEligibleIds = eligiblePiecesForSlab.map((p: any) => p.id);
                        const isAllSelected = allEligibleIds.length > 0 && allEligibleIds.every((id: string) => (split.pieceIds || []).includes(id));
                        const isIndeterminate = (split.pieceIds || []).length > 0 && !isAllSelected;

                        const updateSelectedPieces = (newPieceIds: string[]) => {
                          const newSplits = [...projectSplits];
                          newSplits[idx].pieceIds = newPieceIds;
                          newSplits[idx].qty = newPieceIds.length > 0 ? newPieceIds.length : newSplits[idx].qty;

                          const slab = filteredSlabs.find((s: any) => s.id === newSplits[idx].slabId);
                          if (newPieceIds.length > 0) {
                            const pieceNames = newPieceIds.map((id: string) => {
                              const piece = slab?.pieces?.find((p: any) => p.id === id);
                              return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id.substring(0, 4);
                            });
                            newSplits[idx].productName = slab ? `${slab.name} - ${pieceNames.join(', ')}` : pieceNames.join(', ');
                          } else {
                            newSplits[idx].productName = slab?.name || '';
                          }

                          setProjectSplits(newSplits);
                        };

                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>
                                Piece Selection ({(split.pieceIds || []).length} / {eligiblePiecesForSlab.length} selected)
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => updateSelectedPieces(isAllSelected ? [] : allEligibleIds)}
                                sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem', borderRadius: 1.5, fontWeight: 700, borderColor: '#EA580C', color: '#EA580C', '&:hover': { bgcolor: '#FFF7ED' } }}
                              >
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                              </Button>
                            </Box>
                            <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                              <InputLabel id={`select-piece-label-${idx}`}>Select Piece(s) (Optional)</InputLabel>
                              <Select
                                labelId={`select-piece-label-${idx}`}
                                multiple
                                value={split.pieceIds || []}
                                onChange={(e) => {
                                  const val = e.target.value as string[];
                                  if (val.includes('__SELECT_ALL__')) {
                                    updateSelectedPieces(isAllSelected ? [] : allEligibleIds);
                                  } else {
                                    updateSelectedPieces(val);
                                  }
                                }}
                                input={<OutlinedInput label="Select Piece(s) (Optional)" />}
                                renderValue={(selected: any) => {
                                  const filtered = (selected || []).filter((id: string) => id !== '__SELECT_ALL__');
                                  if (filtered.length === 0) return <em>Select Pieces</em>;
                                  const slab = filteredSlabs.find((s: any) => s.id === split.slabId);
                                  return filtered.map((id: string) => {
                                    const piece = slab?.pieces?.find((p: any) => p.id === id);
                                    return piece ? `${(piece.productName || `Piece ${piece.pieceNumber}`).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${piece.size ? `(${piece.size.replace(/ x (\d+MM)/i, ' | $1')})` : ''}` : id;
                                  }).join(', ');
                                }}
                              >
                                <MenuItem value="__SELECT_ALL__" sx={{ bgcolor: '#FFF7ED', borderBottom: '1px solid #FFEDD5', fontWeight: 800 }}>
                                  <Checkbox 
                                    checked={isAllSelected}
                                    indeterminate={isIndeterminate}
                                    sx={{ color: '#EA580C', '&.Mui-checked': { color: '#EA580C' } }}
                                  />
                                  <ListItemText 
                                    primary={
                                      <Typography sx={{ fontWeight: 800, color: '#C2410C', fontSize: '0.85rem' }}>
                                        {`Select All (${eligiblePiecesForSlab.length} Pieces)`}
                                      </Typography>
                                    }
                                  />
                                </MenuItem>
                                {eligiblePiecesForSlab.map((p: any) => (
                                  <MenuItem key={p.id} value={p.id}>
                                    <Checkbox checked={(split.pieceIds || []).indexOf(p.id) > -1} />
                                    <ListItemText 
                                      primary={`${(p.productName || 'Piece ' + p.pieceNumber).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${p.size ? `(${p.size.replace(/ x (\d+MM)/i, ' | $1')})` : ''}`} 
                                      secondary={`Stage: ${p.stage || 'Production'} • ${p.status === 'completed' ? 'Ready for next stage' : 'In Progress'}`}
                                      sx={{ color: '#C2410C', fontWeight: 600 }} 
                                    />
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                        );
                      })()}
                    </>
                  );
                })()}

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField 
                    label="Quantity to Apply" 
                    type="number" 
                    fullWidth 
                    size="small" 
                    value={split.qty || ''} 
                    onChange={(e) => {
                      const newSplits = [...projectSplits];
                      newSplits[idx].qty = Number(e.target.value);
                      setProjectSplits(newSplits);
                    }} 
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  {projectSplits.length > 1 && (
                    <IconButton color="error" onClick={() => setProjectSplits(projectSplits.filter((_, i) => i !== idx))}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            );
          })}
          
          <Button startIcon={<AddIcon />} onClick={() => setProjectSplits([...projectSplits, { projectId: '', qty: 0 }])} sx={{ textTransform: 'none', fontWeight: 700 }}>
            + Add Project Split
          </Button>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0', gap: 1 }}>
          <Button onClick={() => setApprovalDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={submitApproval} 
            disabled={!projectSplits.some(s => s.projectId && s.qty > 0) || isApproving}
            sx={{ 
              borderRadius: 2, 
              bgcolor: '#059669', 
              color: '#FFFFFF', 
              fontWeight: 800, 
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            {isApproving ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. PHOTO PREVIEW FULLSCREEN DIALOG */}
      <Dialog 
        open={Boolean(previewPhoto)} 
        onClose={() => setPreviewPhoto(null)} 
        maxWidth="lg" 
        fullWidth 
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none' } } }}
      >
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <IconButton 
            onClick={() => setPreviewPhoto(null)} 
            sx={{ position: 'absolute', top: -40, right: -40, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
          >
            <CloseIcon fontSize="large" />
          </IconButton>
          {previewPhoto && (
            <img 
              src={getFullQualityUrl(previewPhoto)} 
              alt="Preview" 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }} 
            />
          )}
        </Box>
      </Dialog>

      {/* 7. MANUAL ENTRY / EDIT LOG DIALOG */}
      <ManagerStyleEntryDialog
        open={manualEntryOpen || editLogOpen}
        isEditMode={editLogOpen}
        onClose={() => { setManualEntryOpen(false); setEditLogOpen(false); setSelectedEditLog(null); }}
        onSave={handleManualEntrySubmit}
        vendors={vendorsData}
        staff={staffData}
        projects={projects}
        initialData={selectedEditLog}
      />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InOutLedger;
