import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, IconButton, InputAdornment, Snackbar, Alert, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import { useNavigate } from 'react-router-dom';
import { useDispatchBoxesMutation, useDeleteProductionLogMutation } from '../../store/apiSlice';

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
  const [deleteProductionLog] = useDeleteProductionLogMutation();

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

    // Deduplicate logs with exact same pieceIds or same boxCode
    const seenKey = new Set<string>();
    const dedupedLogs: any[] = [];
    for (const l of logs) {
      const pIds = (Array.isArray(l.pieceIds) ? l.pieceIds : []).slice().sort().join(',');
      const code = (l.boxCode || '').trim();
      const key = pIds ? `${code}_${pIds}` : (l.id || `${code}_${l.createdAt}`);
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      dedupedLogs.push(l);
    }

    return dedupedLogs.map((l: any, idx: number) => {
      const rawCode = l.boxCode || `Box ${idx + 1}`;
      const parts = rawCode.split('|').map((s: string) => s.trim());
      const bName = parts[0] || `Box ${idx + 1}`;
      const bSize = parts[1] || 'Standard';
      const pIds: string[] = Array.isArray(l.pieceIds) ? l.pieceIds : [];
      const boxPieces = allPieces.filter((p: any) => pIds.includes(p.id));
      const boxArea = boxPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || slab?.size), 0);
      const pieceCount = l.quantityProduced || pIds.length || boxPieces.length || 0;

      return {
        logId: l.id,
        boxNumber: idx + 1,
        boxName: bName,
        boxSize: bSize,
        pieceIds: pIds,
        pieces: boxPieces,
        pieceCount,
        area: boxArea > 0 ? boxArea.toFixed(2) : (pieceCount * 2.08).toFixed(2),
        packedOn: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(l.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Packed'
      };
    });
  }, [productionLogs, slab, allPieces]);

  // Derive all dispatch batches (each represents a vehicle dispatch)
  const dispatchBatches = useMemo(() => {
    const logs = (productionLogs || []).filter((l: any) =>
      (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') &&
      (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
    );

    return logs.map((l: any, idx: number) => {
      const pIds: string[] = Array.isArray(l.pieceIds) ? l.pieceIds : [];
      const batchPieces = allPieces.filter((p: any) => pIds.includes(p.id));
      const batchArea = batchPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || slab?.size), 0);
      const pieceCount = l.quantityProduced || pIds.length || batchPieces.length || 0;
      const boxCodes: string[] = (l.boxCode || '').split(',').map((s: string) => s.trim()).filter(Boolean);

      const driver = l.vendorName || l.driverName || l.worker?.name || l.remarks?.match(/Driver:\s*([^,\n|]+)/i)?.[1]?.trim() || '-';
      const lr = l.challanNumber || l.remarks?.match(/LR:\s*([^,\n|]+)/i)?.[1]?.trim() || '-';
      const vehicle = l.vehicleNumber || (l.remarks?.match(/Vehicle:\s*([^,\n|]+)/i)?.[1]?.trim()) || 'Manual';

      let dispatchTimeFormatted = '-';
      const dVal = l.startTime || l.createdAt;
      if (dVal) {
        const d = new Date(dVal);
        if (!isNaN(d.getTime())) {
          dispatchTimeFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        }
      }

      return {
        id: l.id,
        batchNumber: idx + 1,
        vehicleNumber: vehicle,
        driverName: driver,
        lrNumber: lr,
        boxCodes,
        pieceIds: pIds,
        pieces: batchPieces,
        pieceCount,
        area: batchArea > 0 ? batchArea.toFixed(2) : (pieceCount * 2.08).toFixed(2),
        dispatchTime: dispatchTimeFormatted,
        remarks: l.remarks || '',
        createdAt: l.createdAt
      };
    });
  }, [productionLogs, allPieces, slab]);

  // Set of box names that are already dispatched across any batch
  const dispatchedBoxNames = useMemo(() => {
    const set = new Set<string>();
    dispatchBatches.forEach((batch: any) => {
      batch.boxCodes.forEach((code: string) => set.add(code));
    });
    // Also include any boxes where all pieceIds are covered by dispatch batches
    const dispatchedPieceIdSet = new Set(dispatchBatches.flatMap((b: any) => b.pieceIds));
    packedBoxes.forEach((b: any) => {
      if (b.pieceIds.length > 0 && b.pieceIds.every((pid: string) => dispatchedPieceIdSet.has(pid))) {
        set.add(b.boxName);
      }
    });
    return set;
  }, [dispatchBatches, packedBoxes]);

  // Selected boxes to dispatch for current vehicle
  const [selectedBoxNames, setSelectedBoxNames] = useState<string[]>([]);

  // Auto-select first undispatched box if available
  React.useEffect(() => {
    const undispatched = packedBoxes.filter((b: any) => !dispatchedBoxNames.has(b.boxName));
    if (undispatched.length > 0 && selectedBoxNames.length === 0) {
      setSelectedBoxNames([undispatched[0].boxName]);
    }
  }, [packedBoxes, dispatchedBoxNames]);

  // Form State for Vehicle Details
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [dispatchDate, setDispatchDate] = useState(getLocalDateString);
  const [dispatchTime, setDispatchTime] = useState(getLocalTimeString);
  const [lrNumber, setLrNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [viewSlipBatch, setViewSlipBatch] = useState<any>(null);

  // If already dispatched and form is empty, pre-fill with latest dispatch details as reference
  React.useEffect(() => {
    if (dispatchBatches.length > 0 && !vehicleNumber) {
      const latest = dispatchBatches[dispatchBatches.length - 1];
      if (latest) {
        setVehicleNumber(latest.vehicleNumber !== '-' ? latest.vehicleNumber : '');
        setDriverName(latest.driverName !== '-' ? latest.driverName : '');
        if (latest.lrNumber && latest.lrNumber !== '-') setLrNumber(latest.lrNumber);
        if (latest.remarks && !latest.remarks.startsWith('Vehicle:')) setRemarks(latest.remarks);
      }
    }
  }, [dispatchBatches]);

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

  // Summary Metrics
  const totalBoxesCount = packedBoxes.length;
  const totalDispatchedBoxesCount = packedBoxes.filter((b: any) => dispatchedBoxNames.has(b.boxName)).length;
  const isFullyDispatched = totalBoxesCount > 0 && totalDispatchedBoxesCount >= totalBoxesCount;
  const isPartiallyDispatched = totalDispatchedBoxesCount > 0 && totalDispatchedBoxesCount < totalBoxesCount;

  const undispatchedBoxes = useMemo(() => {
    return packedBoxes.filter((b: any) => !dispatchedBoxNames.has(b.boxName));
  }, [packedBoxes, dispatchedBoxNames]);

  const isAllUndispatchedSelected = undispatchedBoxes.length > 0 && selectedBoxNames.length === undispatchedBoxes.length;

  const handleToggleSelectAll = () => {
    if (isAllUndispatchedSelected) {
      setSelectedBoxNames([]);
    } else {
      setSelectedBoxNames(undispatchedBoxes.map((b: any) => b.boxName));
    }
  };

  const handleToggleBox = (boxName: string) => {
    if (dispatchedBoxNames.has(boxName)) return; // Already dispatched, cannot toggle
    setSelectedBoxNames(prev =>
      prev.includes(boxName) ? prev.filter(name => name !== boxName) : [...prev, boxName]
    );
  };

  const handleAddAnotherVehicle = () => {
    setVehicleNumber('');
    setDriverName('');
    setLrNumber('');
    setRemarks('');
    setSelectedBoxNames(undispatchedBoxes.length > 0 ? [undispatchedBoxes[0].boxName] : []);
    setToast({ open: true, message: 'Ready to add next vehicle details. Select boxes to assign.', severity: 'success' });
  };

  // Submit Complete Vehicle Dispatch
  const handleCompleteDispatch = async () => {
    if (!vehicleNumber.trim()) {
      setToast({ open: true, message: 'Please enter a valid Vehicle Number', severity: 'error' });
      return;
    }
    if (selectedBoxes.length === 0) {
      setToast({ open: true, message: 'Please select at least 1 box to dispatch for this vehicle', severity: 'error' });
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
        driverName: driverName.trim() || undefined,
        dispatchDate: `${dispatchDate} ${dispatchTime}`,
        lrNumber: lrNumber.trim() || undefined,
        remarks: remarks.trim() || undefined
      }).unwrap();

      onRefresh();
      setSelectedBoxNames([]);
      setToast({ open: true, message: `Vehicle ${vehicleNumber} dispatched with ${selectedBoxes.length} box(es)!`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error submitting dispatch', severity: 'error' });
    }
  };

  // Delete / Revert a dispatch batch
  const handleDeleteBatch = async (batchId: string, vehicleNo: string) => {
    if (!window.confirm(`Are you sure you want to revert dispatch for vehicle ${vehicleNo}? Boxes will become unpacked/ready to dispatch again.`)) return;
    try {
      await deleteProductionLog(batchId).unwrap();
      onRefresh();
      setToast({ open: true, message: `Dispatch batch for ${vehicleNo} reverted successfully`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error reverting dispatch', severity: 'error' });
    }
  };

  const allDispatchedVehicles = Array.from(new Set(dispatchBatches.map((b: any) => b.vehicleNumber).filter(Boolean)));

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

      {/* 1. TOP HEADER & METRICS (Exact layout from user mockup Image 5) */}
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
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#B45309', lineHeight: 1 }}>{totalBoxesCount}</Typography>
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', px: 2, py: 1, borderRadius: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#166534', lineHeight: 1 }}>{totalProjectArea}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', fontSize: '0.65rem' }}>Total Area (Sq.Ft)</Typography>
            </Box>

            <Chip
              label={isFullyDispatched ? "Dispatched" : (isPartiallyDispatched ? "Partially Dispatched" : "Ready for Dispatch")}
              size="medium"
              sx={{
                bgcolor: isFullyDispatched ? '#ECFDF5' : (isPartiallyDispatched ? '#FEF3C7' : '#EFF6FF'),
                color: isFullyDispatched ? '#059669' : (isPartiallyDispatched ? '#D97706' : '#0284C7'),
                border: '1.5px solid',
                borderColor: isFullyDispatched ? '#A7F3D0' : (isPartiallyDispatched ? '#FDE68A' : '#BAE6FD'),
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

      {/* 2. MAIN 2-COLUMN VIEW (Packed Boxes Table + Dispatch Vehicle Details) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3, width: '100%', minWidth: 0 }}>
        {/* LEFT COLUMN: PACKED BOXES TABLE */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 460 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <Inventory2RoundedIcon sx={{ color: '#0284C7', fontSize: 22 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Packed Boxes ({packedBoxes.length})
              </Typography>
            </Box>

            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ pl: 2, py: 1.5 }}>
                      <Checkbox
                        size="small"
                        checked={isAllUndispatchedSelected}
                        indeterminate={selectedBoxNames.length > 0 && selectedBoxNames.length < undispatchedBoxes.length}
                        onChange={handleToggleSelectAll}
                        disabled={undispatchedBoxes.length === 0}
                        sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#059669' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Box No.
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Box Size (L × W)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Pieces (Qty)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Area (Sq.Ft)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packedBoxes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                        No packed boxes found. Please pack pieces first in the Packing Workspace.
                      </TableCell>
                    </TableRow>
                  ) : (
                    packedBoxes.map((b: any) => {
                      const isDispatched = dispatchedBoxNames.has(b.boxName);
                      const isChecked = selectedBoxNames.includes(b.boxName);
                      return (
                        <TableRow
                          key={b.logId}
                          hover={!isDispatched}
                          onClick={() => handleToggleBox(b.boxName)}
                          sx={{
                            cursor: isDispatched ? 'default' : 'pointer',
                            bgcolor: isChecked ? '#F0FDF4' : (isDispatched ? '#F8FAFC' : '#FFFFFF'),
                            opacity: isDispatched ? 0.85 : 1,
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <TableCell padding="checkbox" sx={{ pl: 2, py: 1.5 }}>
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              disabled={isDispatched}
                              sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#059669' } }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Inventory2RoundedIcon sx={{ color: isDispatched ? '#059669' : '#0284C7', fontSize: 18 }} />
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>
                                {b.boxName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Chip 
                              label={b.boxSize || 'Standard'} 
                              size="small" 
                              sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '0.72rem' }} 
                            />
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
                            {isDispatched ? (
                              <Chip label="Dispatched" size="small" sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800, fontSize: '0.7rem' }} />
                            ) : (
                              <Chip label="Packed" size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 800, fontSize: '0.7rem' }} />
                            )}
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

        {/* RIGHT COLUMN: DISPATCH VEHICLE DETAILS FORM */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 460 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <LocalShippingRoundedIcon sx={{ color: '#059669', fontSize: 24 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Dispatch Vehicle Details
                </Typography>
              </Box>
              {dispatchBatches.length > 0 && (
                <Chip label={`${dispatchBatches.length} Batch(es) Dispatched`} size="small" sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800 }} />
              )}
            </Box>

            <Grid container spacing={2}>
              {/* Vehicle Number */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Vehicle Number *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. RJ28TA9822"
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
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Driver Name *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Ramesh Sharma"
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
              <Grid item xs={12} sm={6}>
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

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Dispatch Time *
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
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Transport / LR No. (Optional)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. 456720"
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
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>
                  Remarks (Optional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  placeholder="e.g. Full load, dispatch to client site..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  sx={{ bgcolor: '#F8FAFC', borderRadius: 2 }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Box>

      {/* 3. DISPATCH BOXES ACTION BAR (Under 2 Columns, exact match to Image 5) */}
      <Box sx={{ mb: 3, p: 2, bgcolor: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocalShippingRoundedIcon sx={{ color: '#0284C7', fontSize: 24 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Dispatch Boxes <Typography component="span" variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>(Select packed boxes for this vehicle)</Typography>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0369A1' }}>
            Selected: <strong>{selectedBoxes.length} Box{selectedBoxes.length !== 1 ? 'es' : ''}</strong> | <strong>{selectedPiecesCount} Pieces</strong> | <strong>{selectedArea} Sq.Ft</strong>
          </Typography>

          <Button
            variant="contained"
            disabled={isDispatching || selectedBoxes.length === 0}
            onClick={handleCompleteDispatch}
            startIcon={<AddRoundedIcon />}
            sx={{
              bgcolor: '#0284C7',
              color: '#FFFFFF',
              fontWeight: 800,
              borderRadius: 2,
              px: 2.5,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#0369A1' }
            }}
          >
            + Add to Dispatch
          </Button>
        </Box>
      </Box>

      {/* 4. DISPATCH BATCHES (VEHICLES) TABLE (Image 5) */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 4, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <LayersRoundedIcon sx={{ color: '#059669', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Dispatch Batches (Vehicles)
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={handleAddAnotherVehicle}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              borderColor: '#0284C7',
              color: '#0284C7',
              '&:hover': { bgcolor: '#F0F9FF' }
            }}
          >
            + Add Another Vehicle
          </Button>
        </Box>

        <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Vehicle Number</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Driver Name</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Boxes Dispatched</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Pieces</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Area (Sq.Ft)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Dispatch Time</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5, textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dispatchBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                    No vehicle dispatches created yet. Select packed boxes above and click "+ Add to Dispatch".
                  </TableCell>
                </TableRow>
              ) : (
                dispatchBatches.map((batch: any, bIdx: number) => (
                  <TableRow key={batch.id} hover sx={{ bgcolor: '#FFFFFF' }}>
                    <TableCell sx={{ py: 1.5, fontWeight: 700, color: '#64748B' }}>{bIdx + 1}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DirectionsCarRoundedIcon sx={{ color: '#059669', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          {batch.vehicleNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonRoundedIcon sx={{ color: '#64748B', fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          {batch.driverName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {batch.boxCodes.map((code: string) => (
                          <Chip key={code} label={code} size="small" sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800, fontSize: '0.72rem' }} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, fontWeight: 700 }}>{batch.pieceCount}</TableCell>
                    <TableCell sx={{ py: 1.5, fontWeight: 800 }}>{batch.area}</TableCell>
                    <TableCell sx={{ py: 1.5, color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>{batch.dispatchTime}</TableCell>
                    <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                      <Tooltip title="View / Print Dispatch Slip">
                        <IconButton size="small" onClick={() => setViewSlipBatch(batch)} sx={{ color: '#0284C7', bgcolor: '#F0F9FF', mr: 1, '&:hover': { bgcolor: '#E0F2FE' } }}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Revert / Delete Dispatch Batch">
                        <IconButton size="small" onClick={() => handleDeleteBatch(batch.id, batch.vehicleNumber)} sx={{ color: '#DC2626', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 5. DOCKED BOTTOM BAR (Image 5) */}
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
          border: '1.5px solid',
          borderColor: dispatchBatches.length > 0 ? '#86EFAC' : '#E2E8F0',
          bgcolor: dispatchBatches.length > 0 ? '#F0FDF4' : '#FFFFFF',
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
            {dispatchBatches.length > 0 
              ? `Order Dispatched (${allDispatchedVehicles.join(', ') || 'Vehicle Assigned'})` 
              : 'Ready to Dispatch'}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#CBD5E1' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            {totalDispatchedBoxesCount > 0 ? totalDispatchedBoxesCount : totalBoxesCount} Boxes • {dispatchBatches.reduce((acc, b) => acc + b.pieceCount, 0) || allPieces.length} Pieces • {dispatchBatches.reduce((acc, b) => acc + parseFloat(b.area || 0), 0).toFixed(2) || totalProjectArea} Sq.Ft
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/projects/${projectId}`)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              borderColor: '#CBD5E1',
              color: '#334155',
              '&:hover': { bgcolor: '#F8FAFC' }
            }}
          >
            Back to Project
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
            Update Dispatch Info
          </Button>
        </Box>
      </Paper>

      {/* 6. VIEW DISPATCH SLIP MODAL */}
      <Dialog open={Boolean(viewSlipBatch)} onClose={() => setViewSlipBatch(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Dispatch Challan / Gate Pass
          <IconButton onClick={() => setViewSlipBatch(null)} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, border: '1.5px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#F8FAFC', mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>PROJECT</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{projectName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>VEHICLE NUMBER</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#059669' }}>{viewSlipBatch?.vehicleNumber}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>DRIVER NAME</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{viewSlipBatch?.driverName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>DISPATCH DATE & TIME</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{viewSlipBatch?.dispatchTime}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TRANSPORT / LR NO.</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{viewSlipBatch?.lrNumber || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TOTAL DISPATCHED</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{viewSlipBatch?.boxCodes?.length} Boxes • {viewSlipBatch?.pieceCount} Pieces ({viewSlipBatch?.area} Sq.Ft)</Typography>
              </Grid>
              {viewSlipBatch?.remarks && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>REMARKS</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{viewSlipBatch.remarks}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Boxes in this Vehicle:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(viewSlipBatch?.boxCodes || []).map((bCode: string) => (
              <Chip key={bCode} label={bCode} sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800 }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button startIcon={<PrintRoundedIcon />} onClick={() => window.print()} variant="outlined" sx={{ fontWeight: 700, textTransform: 'none' }}>
            Print Gate Pass
          </Button>
          <Button onClick={() => setViewSlipBatch(null)} variant="contained" sx={{ bgcolor: '#0284C7', fontWeight: 800, textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DispatchWorkspace;
