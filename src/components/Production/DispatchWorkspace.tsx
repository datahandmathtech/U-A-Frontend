import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, IconButton, InputAdornment, Snackbar, Alert, Divider
} from '@mui/material';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';
import { useDispatchBoxesMutation } from '../../store/apiSlice';

interface DispatchWorkspaceProps {
  projectId: string;
  projectName: string;
  slab: any;
  slabs?: any[];
  productionLogs: any[];
  onRefresh: () => void;
}

const parsePieceArea = (sizeStr?: any): number => {
  if (!sizeStr || typeof sizeStr !== 'string') return 2.08;
  const sqftMatch = sizeStr.match(/([\d\.]+)\s*Sq\.?Ft/i);
  if (sqftMatch) return parseFloat(sqftMatch[1]);
  const lMatch = sizeStr.match(/([\d\.]+)\s*L/i);
  const wMatch = sizeStr.match(/([\d\.]+)\s*W/i);
  if (lMatch && wMatch) {
    const l = parseFloat(lMatch[1]);
    const w = parseFloat(wMatch[1]);
    const sLower = sizeStr.toLowerCase();
    const sWithoutThick = sLower.split('|')[0].replace(/\s*x\s*\d+\s*mm/gi, '');
    if (sWithoutThick.includes('mm')) return Number(((l * w) / 92903.04).toFixed(2));
    if (sWithoutThick.includes('feet') || sWithoutThick.includes('ft')) return Number((l * w).toFixed(2));
    return Number(((l * w) / 144).toFixed(2));
  }
  return 2.08;
};

const getLocalDateString = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getLocalTimeString = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DispatchWorkspace: React.FC<DispatchWorkspaceProps> = ({
  projectId,
  projectName,
  slab,
  slabs = [],
  productionLogs,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [dispatchBoxes, { isLoading: isDispatching }] = useDispatchBoxesMutation();

  // Consolidate pieces from all slabs in the project
  const allPieces = useMemo(() => {
    const combined: any[] = [];
    (slabs || []).forEach((s: any) => {
      if (Array.isArray(s.pieces)) {
        s.pieces.forEach((p: any) => combined.push({ ...p, slabId: s.id, slabName: s.name }));
      }
    });
    if (combined.length > 0) return combined;
    if (slab?.pieces && Array.isArray(slab.pieces)) return slab.pieces;
    return [];
  }, [slab, slabs]);

  // Derive packed boxes from production logs with stage Packing
  const packedBoxes = useMemo(() => {
    const logs = (productionLogs || []).filter((l: any) =>
      (l.stage === 'Packing' || l.stage === 'Packing Work') &&
      (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
    );

    return logs.map((l: any, idx: number) => {
      const bName = (l.boxCode || `Box ${idx + 1}`).split('|')[0].trim();
      const pIds: string[] = Array.isArray(l.pieceIds) ? l.pieceIds : [];
      const boxPieces = allPieces.filter((p: any) => pIds.includes(p.id));
      const boxArea = boxPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || slab?.size), 0);
      const pieceCount = l.quantityProduced || pIds.length || boxPieces.length || 0;

      return {
        logId: l.id,
        boxNumber: idx + 1,
        boxName: bName,
        pieceIds: pIds,
        pieces: boxPieces,
        pieceCount,
        area: boxArea > 0 ? boxArea.toFixed(2) : (pieceCount * 2.08).toFixed(2),
        packedOn: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(l.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '01 Oct 2026, 10:20 AM'
      };
    });
  }, [productionLogs, slab, allPieces]);

  // Selected boxes to dispatch
  const [selectedBoxNames, setSelectedBoxNames] = useState<string[]>([]);

  // Initialize selected boxes to all packed boxes
  React.useEffect(() => {
    if (packedBoxes.length > 0 && selectedBoxNames.length === 0) {
      setSelectedBoxNames(packedBoxes.map((b: any) => b.boxName));
    }
  }, [packedBoxes]);

  // Form State (empty by default so user enters real details)
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [dispatchDate, setDispatchDate] = useState(getLocalDateString);
  const [dispatchTime, setDispatchTime] = useState(getLocalTimeString);
  const [lrNumber, setLrNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Check if project has already been dispatched
  const isAlreadyDispatched = useMemo(() => {
    return (productionLogs || []).some((l: any) => 
      (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') &&
      (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
    );
  }, [productionLogs]);

  // Calculations for selected boxes
  const selectedBoxes = useMemo(() => {
    return packedBoxes.filter((b: any) => selectedBoxNames.includes(b.boxName));
  }, [packedBoxes, selectedBoxNames]);

  const selectedPiecesCount = useMemo(() => {
    return selectedBoxes.reduce((acc: number, b: any) => acc + (b.pieceCount || 0), 0);
  }, [selectedBoxes]);

  const selectedArea = useMemo(() => {
    return selectedBoxes.reduce((acc: number, b: any) => acc + parseFloat(b.area || 0), 0).toFixed(2);
  }, [selectedBoxes]);

  const totalProjectArea = useMemo(() => {
    return allPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || slab?.size), 0).toFixed(2);
  }, [allPieces, slab]);

  const isAllSelected = packedBoxes.length > 0 && selectedBoxNames.length === packedBoxes.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBoxNames([]);
    } else {
      setSelectedBoxNames(packedBoxes.map((b: any) => b.boxName));
    }
  };

  const handleToggleBox = (boxName: string) => {
    setSelectedBoxNames(prev =>
      prev.includes(boxName) ? prev.filter(name => name !== boxName) : [...prev, boxName]
    );
  };

  // Submit Complete Dispatch
  const handleCompleteDispatch = async () => {
    if (!vehicleNumber.trim()) {
      setToast({ open: true, message: 'Please enter a valid Vehicle Number', severity: 'error' });
      return;
    }
    if (selectedBoxes.length === 0) {
      setToast({ open: true, message: 'Please select at least 1 box to dispatch', severity: 'error' });
      return;
    }

    const allPieceIds = selectedBoxes.flatMap((b: any) => b.pieceIds);

    try {
      await dispatchBoxes({
        projectId,
        slabId: slab?.id,
        boxCodes: selectedBoxNames,
        pieceIds: allPieceIds,
        vehicleNumber: vehicleNumber.trim(),
        driverName: driverName.trim(),
        dispatchDate: `${dispatchDate} ${dispatchTime}`,
        lrNumber: lrNumber.trim() || undefined,
        remarks: remarks.trim() || undefined
      }).unwrap();

      onRefresh();
      setToast({ open: true, message: `Dispatch completed for ${selectedBoxes.length} boxes!`, severity: 'success' });
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 1200);
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error submitting dispatch', severity: 'error' });
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', mx: 'auto', pb: 6, boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ fontWeight: 700 }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* HEADER & NAVIGATION BREADCRUMBS */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
        <IconButton 
          onClick={() => navigate(`/projects/${projectId}`)} 
          size="small"
          sx={{ 
            bgcolor: '#FFFFFF', 
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            '&:hover': { bgcolor: '#F8FAFC' }
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
          <Typography 
            component="span" 
            onClick={() => navigate('/projects')}
            sx={{ cursor: 'pointer', '&:hover': { color: '#0F172A', textDecoration: 'underline' } }}
          >
            Projects
          </Typography>
          <Typography component="span" sx={{ color: '#CBD5E1' }}>/</Typography>
          <Typography 
            component="span" 
            onClick={() => navigate(`/projects/${projectId}`)}
            sx={{ cursor: 'pointer', '&:hover': { color: '#0F172A', textDecoration: 'underline' } }}
          >
            {projectName || 'Project'}
          </Typography>
          <Typography component="span" sx={{ color: '#CBD5E1' }}>/</Typography>
          <Typography component="span" sx={{ color: '#0F172A', fontWeight: 700 }}>
            {slab?.name || 'Dispatch'}
          </Typography>
        </Box>
      </Box>

      {/* 1. TOP HEADER & METRICS (Screenshot 5) */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 4, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.3px', mb: 0.5 }}>
              Dispatch - {slab?.name || projectName}
            </Typography>
            {slab?.size && (
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                Spec: {slab.size}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#FFFDF5', border: '1px solid #FDE68A', px: 2, py: 1, borderRadius: 2.5 }}>
              <Inventory2RoundedIcon sx={{ color: '#D97706', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#B45309', lineHeight: 1 }}>{packedBoxes.length}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#D97706', textTransform: 'uppercase', fontSize: '0.65rem' }}>Total Boxes</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', px: 2, py: 1, borderRadius: 2.5 }}>
              <CheckCircleRoundedIcon sx={{ color: '#0284C7', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#0369A1', lineHeight: 1 }}>{allPieces.length}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', fontSize: '0.65rem' }}>Total Pieces</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', px: 2, py: 1, borderRadius: 2.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{totalProjectArea}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', fontSize: '0.65rem' }}>Total Area (Sq.Ft)</Typography>
              </Box>
            </Box>

            <Chip
              label={isAlreadyDispatched ? "Dispatched" : "Ready for Dispatch"}
              size="medium"
              sx={{
                bgcolor: '#ECFDF5',
                color: '#059669',
                border: '1.5px solid #A7F3D0',
                fontWeight: 800,
                fontSize: '0.8rem',
                height: 38,
                px: 1,
                borderRadius: 2.5
              }}
            />
          </Box>
        </Box>

        {/* Workflow Stepper / Process Bar (Screenshot 5) */}
        <Divider sx={{ mb: 2.5, borderColor: '#F1F5F9' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1, sm: 2.5 }, flexWrap: 'wrap' }}>
          {/* Step 1: Production */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleRoundedIcon sx={{ color: '#16A34A', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem' }}>Production</Typography>
          </Box>
          <Box sx={{ width: 40, height: 2, bgcolor: '#86EFAC' }} />

          {/* Step 2: Polishing */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleRoundedIcon sx={{ color: '#16A34A', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem' }}>Polishing</Typography>
          </Box>
          <Box sx={{ width: 40, height: 2, bgcolor: '#86EFAC' }} />

          {/* Step 3: Packing */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleRoundedIcon sx={{ color: '#16A34A', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem', lineHeight: 1 }}>Packing</Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.68rem' }}>
                ({packedBoxes.length} Boxes, {allPieces.length} Pieces)
              </Typography>
            </Box>
          </Box>
          <Box sx={{ width: 40, height: 2, bgcolor: '#86EFAC' }} />

          {/* Step 4: Dispatch (Active) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>
              4
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.85rem' }}>Dispatch</Typography>
          </Box>
        </Box>
      </Paper>

      {/* 2. MAIN 2-COLUMN VIEW (Robust CSS Grid) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 4, width: '100%', minWidth: 0 }}>
        {/* LEFT COLUMN: PACKED BOXES TABLE */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <Inventory2RoundedIcon sx={{ color: '#0284C7', fontSize: 22 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Packed Boxes ({packedBoxes.length})
              </Typography>
            </Box>

            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ pl: 2, py: 1.5 }}>
                      <Checkbox
                        size="small"
                        checked={isAllSelected}
                        indeterminate={selectedBoxNames.length > 0 && selectedBoxNames.length < packedBoxes.length}
                        onChange={handleToggleSelectAll}
                        sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#059669' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Box No.
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Pieces (Qty)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Area (Sq.Ft)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Packed On
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packedBoxes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                        No packed boxes found. Please pack pieces first in the Packing Workspace.
                      </TableCell>
                    </TableRow>
                  ) : (
                    packedBoxes.map((b: any) => {
                      const isChecked = selectedBoxNames.includes(b.boxName);
                      return (
                        <TableRow
                          key={b.logId}
                          hover
                          onClick={() => handleToggleBox(b.boxName)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isChecked ? '#F0FDF4' : '#FFFFFF',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <TableCell padding="checkbox" sx={{ pl: 2, py: 1.5 }}>
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#059669' } }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Inventory2RoundedIcon sx={{ color: '#0284C7', fontSize: 18 }} />
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>
                                {b.boxName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>
                              {b.pieceCount} Pieces
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem' }}>
                              {b.area}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                              {b.packedOn}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* RIGHT COLUMN: DISPATCH DETAILS FORM */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
              <LocalShippingRoundedIcon sx={{ color: '#059669', fontSize: 24 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Dispatch Details
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {/* Vehicle Number */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Vehicle Number *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. RJ-27-TA-9822"
                  autoComplete="off"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <DirectionsCarRoundedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#F8FAFC' }
                    }
                  }}
                />
              </Grid>

              {/* Driver Name */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Driver Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter driver name"
                  autoComplete="off"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonRoundedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#F8FAFC' }
                    }
                  }}
                />
              </Grid>

              {/* Dispatch Date & Time */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Dispatch Date *
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarMonthRoundedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#F8FAFC' }
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Dispatch Time
                </Typography>
                <TextField
                  fullWidth
                  type="time"
                  size="small"
                  autoComplete="off"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccessTimeRoundedIcon sx={{ color: '#059669', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#F8FAFC' }
                    }
                  }}
                />
              </Grid>

              {/* Transport / LR No. */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Transport / LR No. (Optional)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter LR / Transport No."
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <DescriptionRoundedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#F8FAFC' }
                    }
                  }}
                />
              </Grid>

              {/* Remarks */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Remarks (Optional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  placeholder="e.g. Dispatched to client site..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  sx={{ bgcolor: '#F8FAFC', borderRadius: 2 }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Box>

      {/* 3. DOCKED BOTTOM BAR (Screenshot 5) */}
      <Paper
        elevation={4}
        sx={{
          position: 'sticky',
          bottom: 16,
          width: '100%',
          mt: 4,
          p: 2,
          px: 3,
          borderRadius: 3.5,
          border: '1.5px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          zIndex: 1000,
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ p: 0.6, bgcolor: '#DCFCE7', color: '#166534', borderRadius: '50%', display: 'flex' }}>
            <CheckRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Ready to Dispatch
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#CBD5E1' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            {selectedBoxes.length} Boxes • {selectedPiecesCount} Pieces • {selectedArea} Sq.Ft
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/projects/${projectId}/slab/${slab?.id || 'all'}/stage/packing`)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              borderColor: '#CBD5E1',
              color: '#334155',
              '&:hover': { bgcolor: '#F8FAFC' }
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={isDispatching || selectedBoxes.length === 0}
            startIcon={<LocalShippingRoundedIcon />}
            onClick={handleCompleteDispatch}
            sx={{
              bgcolor: '#059669',
              color: '#FFFFFF',
              fontWeight: 800,
              borderRadius: 2.5,
              px: 3,
              py: 1,
              textTransform: 'none',
              boxShadow: '0 2px 10px rgba(5, 150, 105, 0.25)',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            Complete Dispatch
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default DispatchWorkspace;
