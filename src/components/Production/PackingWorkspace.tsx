import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, TextField,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Tooltip, Snackbar, Alert, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import { useNavigate } from 'react-router-dom';
import { usePackBoxesMutation, useDeleteProductionLogMutation } from '../../store/apiSlice';

interface PackingWorkspaceProps {
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

const PackingWorkspace: React.FC<PackingWorkspaceProps> = ({
  projectId,
  projectName,
  slab,
  slabs = [],
  productionLogs,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [packBoxes, { isLoading: isPacking }] = usePackBoxesMutation();
  const [deleteProductionLog, { isLoading: isDeleting }] = useDeleteProductionLogMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [viewBox, setViewBox] = useState<any>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Consolidate raw pieces from all slabs for unified project packing
  const rawPieces = useMemo(() => {
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

  // All pieces of all slabs in the project are available in unified packing workspace
  const allPieces = useMemo(() => {
    return rawPieces;
  }, [rawPieces]);

  const totalSlabPiecesCount = rawPieces.length;

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
        packedOn: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(l.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Packed'
      };
    });
  }, [productionLogs, slab, allPieces]);

  // Set of pieces already packed in a box
  const packedPieceIdMap = useMemo(() => {
    const map = new Map<string, string>(); // pieceId -> boxName
    packedBoxes.forEach((b: any) => {
      b.pieceIds.forEach((pid: string) => map.set(pid, b.boxName));
    });
    return map;
  }, [packedBoxes]);

  const totalPieces = allPieces.length;
  const packedPiecesCount = packedPieceIdMap.size;
  const pendingPiecesCount = Math.max(0, totalPieces - packedPiecesCount);
  const isPackagingCompleted = totalPieces > 0 && packedPiecesCount >= totalPieces;

  const totalPackedArea = useMemo(() => {
    return allPieces
      .filter((p: any) => packedPieceIdMap.has(p.id))
      .reduce((sum: number, p: any) => sum + parsePieceArea(p.size || slab?.size), 0)
      .toFixed(2);
  }, [allPieces, packedPieceIdMap, slab]);

  // Filtered pieces based on search
  const filteredPieces = useMemo(() => {
    if (!searchQuery.trim()) return allPieces;
    const q = searchQuery.toLowerCase().trim();
    return allPieces.filter((p: any) => {
      const numStr = `#${p.pieceNumber}`;
      const name = (p.productName || '').toLowerCase();
      return numStr.includes(q) || name.includes(q) || String(p.pieceNumber).includes(q);
    });
  }, [allPieces, searchQuery]);

  // Toggle selection for unpacked piece
  const handleTogglePiece = (pieceId: string) => {
    if (packedPieceIdMap.has(pieceId)) {
      setToast({ open: true, message: `This piece is already packed in ${packedPieceIdMap.get(pieceId)}`, severity: 'error' });
      return;
    }
    setSelectedPieceIds(prev => 
      prev.includes(pieceId) ? prev.filter(id => id !== pieceId) : [...prev, pieceId]
    );
  };

  // Open add box modal
  const handleOpenAddBox = () => {
    setNewBoxName(`Box ${packedBoxes.length + 1}`);
    setIsAddBoxOpen(true);
  };

  // Create single box
  const handleSaveBox = async () => {
    const targetPieces = selectedPieceIds.length > 0 
      ? selectedPieceIds 
      : allPieces.filter((p: any) => !packedPieceIdMap.has(p.id)).slice(0, 4).map((p: any) => p.id);

    if (targetPieces.length === 0) {
      setToast({ open: true, message: 'Please select at least 1 piece to pack into the box', severity: 'error' });
      return;
    }

    try {
      await packBoxes({
        projectId,
        slabId: slab?.id,
        boxes: [{
          boxName: newBoxName.trim() || `Box ${packedBoxes.length + 1}`,
          pieceIds: targetPieces
        }]
      }).unwrap();

      setSelectedPieceIds([]);
      setIsAddBoxOpen(false);
      onRefresh();
      setToast({ open: true, message: `${newBoxName} created with ${targetPieces.length} pieces!`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error packing box', severity: 'error' });
    }
  };

  // One-click Auto Pack (groups all unpacked pieces into boxes of 4)
  const handleAutoPack = async () => {
    const unpacked = allPieces.filter((p: any) => !packedPieceIdMap.has(p.id));
    if (unpacked.length === 0) {
      setToast({ open: true, message: 'All pieces are already packed!', severity: 'success' });
      return;
    }

    const BATCH_SIZE = 4;
    const boxesToCreate = [];
    let startIdx = packedBoxes.length + 1;

    for (let i = 0; i < unpacked.length; i += BATCH_SIZE) {
      const batch = unpacked.slice(i, i + BATCH_SIZE);
      boxesToCreate.push({
        boxName: `Box ${startIdx++}`,
        pieceIds: batch.map((p: any) => p.id)
      });
    }

    try {
      await packBoxes({
        projectId,
        slabId: slab?.id,
        boxes: boxesToCreate
      }).unwrap();

      setSelectedPieceIds([]);
      onRefresh();
      setToast({ open: true, message: `Auto-packed ${boxesToCreate.length} box(es) successfully!`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error during auto pack', severity: 'error' });
    }
  };

  // Delete box and unpack pieces
  const handleDeleteBox = async (logId: string, boxName: string) => {
    if (!window.confirm(`Are you sure you want to unpack and delete ${boxName}?`)) return;
    try {
      await deleteProductionLog(logId).unwrap();
      onRefresh();
      setToast({ open: true, message: `${boxName} unpacked and deleted`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error deleting box', severity: 'error' });
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
            {slab?.name || 'Packing'}
          </Typography>
        </Box>
      </Box>

      {/* 1. TOP HEADER & METRICS (Screenshot 4) */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 4, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.3px', mb: 0.5 }}>
              Packing - {slab?.name || projectName}
            </Typography>
            {slab?.size && (
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                Spec: {slab.size}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', px: 2, py: 1, borderRadius: 2.5 }}>
              <Inventory2RoundedIcon sx={{ color: '#0284C7', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#0369A1', lineHeight: 1 }}>
                  {totalPieces} {totalSlabPiecesCount > totalPieces ? `/${totalSlabPiecesCount}` : ''}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', fontSize: '0.65rem' }}>Ready to Pack</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', px: 2, py: 1, borderRadius: 2.5 }}>
              <CheckCircleRoundedIcon sx={{ color: '#16A34A', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#166534', lineHeight: 1 }}>{packedPiecesCount}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', fontSize: '0.65rem' }}>Packed</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#FFFDF5', border: '1px solid #FDE68A', px: 2, py: 1, borderRadius: 2.5 }}>
              <LayersRoundedIcon sx={{ color: '#D97706', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#B45309', lineHeight: 1 }}>{pendingPiecesCount}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#D97706', textTransform: 'uppercase', fontSize: '0.65rem' }}>Pending</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* 2. MAIN 2-COLUMN VIEW (Robust CSS Grid) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 4, width: '100%', minWidth: 0 }}>
        {/* LEFT COLUMN: PIECES GRID */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 480 }}>
            {/* Pieces Header with Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory2RoundedIcon sx={{ color: '#0284C7', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Pieces ({allPieces.length})
                </Typography>
                {selectedPieceIds.length > 0 && (
                  <Chip
                    label={`${selectedPieceIds.length} Selected`}
                    size="small"
                    sx={{ bgcolor: '#0284C7', color: '#FFFFFF', fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                  />
                )}
              </Box>

              <TextField
                size="small"
                placeholder="Search piece (e.g., #1, #5...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2, bgcolor: '#F8FAFC', fontSize: '0.82rem' }
                  }
                }}
                sx={{ width: { xs: '100%', sm: 240 } }}
              />
            </Box>

            {/* Pieces Grid */}
            {filteredPieces.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: '#94A3B8' }}>
                <Inventory2RoundedIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                  No completed pieces ready for packing
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                  Only pieces that are completed in Production will appear here to be packed.
                </Typography>
              </Box>
            ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1.5 }}>
              {filteredPieces.map((p: any) => {
                const isPacked = packedPieceIdMap.has(p.id);
                const isSelected = selectedPieceIds.includes(p.id);
                const areaSqFt = parsePieceArea(p.size || slab?.size);
                const boxAssigned = packedPieceIdMap.get(p.id);

                return (
                  <Box key={p.id} sx={{ minWidth: 0 }}>
                    <Box
                      onClick={() => handleTogglePiece(p.id)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        border: '1.5px solid',
                        borderColor: isPacked ? '#86EFAC' : (isSelected ? '#0284C7' : '#E2E8F0'),
                        bgcolor: isPacked ? '#F0FDF4' : (isSelected ? '#F0F9FF' : '#FFFFFF'),
                        cursor: isPacked ? 'default' : 'pointer',
                        textAlign: 'center',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 0 2px #0284C7' : '0 1px 3px rgba(0,0,0,0.03)',
                        '&:hover': {
                          borderColor: isPacked ? '#86EFAC' : '#0284C7',
                          transform: isPacked ? 'none' : 'translateY(-2px)'
                        }
                      }}
                    >
                      {/* Status / Checkbox at top */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isPacked ? (
                            <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                          ) : (
                            <Box sx={{
                              width: 16, height: 16, borderRadius: '4px',
                              border: isSelected ? '2px solid #0284C7' : '1.5px solid #CBD5E1',
                              bgcolor: isSelected ? '#0284C7' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isSelected && <CheckRoundedIcon sx={{ fontSize: 12, color: '#FFFFFF' }} />}
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.85rem' }}>
                            #{p.pieceNumber}
                          </Typography>
                        </Box>
                        {isPacked && (
                          <Chip label={boxAssigned} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#DCFCE7', color: '#166534' }} />
                        )}
                      </Box>

                      {/* 3D Slab Graphic Icon */}
                      <Box sx={{ my: 1, display: 'flex', justifyContent: 'center' }}>
                        <LayersRoundedIcon sx={{ fontSize: 44, color: isPacked ? '#10B981' : (isSelected ? '#0284C7' : '#CBD5E1') }} />
                      </Box>

                      {/* Dimensions & Area */}
                      <Typography variant="caption" sx={{ fontWeight: 800, color: isPacked ? '#166534' : '#64748B', fontSize: '0.75rem', display: 'block' }}>
                        {areaSqFt.toFixed(2)} Sq.Ft
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
            )}
          </Paper>
        </Box>

        {/* RIGHT COLUMN: PACKING BOXES */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 480 }}>
            {/* Packing Boxes Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory2RoundedIcon sx={{ color: '#059669', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Packing Boxes ({packedBoxes.length})
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddBox}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: '#0284C7',
                    color: '#0284C7',
                    fontSize: '0.78rem',
                    '&:hover': { bgcolor: '#F0F9FF' }
                  }}
                >
                  Add Box
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AutoAwesomeRoundedIcon />}
                  onClick={handleAutoPack}
                  disabled={isPacking || pendingPiecesCount === 0}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: 'none',
                    bgcolor: '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#047857' }
                  }}
                >
                  Auto Pack
                </Button>
              </Box>
            </Box>

            {/* List of Box Cards */}
            {packedBoxes.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: '#94A3B8' }}>
                <Inventory2RoundedIcon sx={{ fontSize: 48, color: '#E2E8F0', mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                  No packing boxes created yet
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                  Select pieces on the left and click "+ Add Box" or use "Auto Pack".
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {packedBoxes.map((b: any) => (
                  <Paper
                    key={b.logId}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1.5px solid #E2E8F0',
                      bgcolor: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: '#FFFFFF', borderColor: '#CBD5E1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, bgcolor: '#EFF6FF', color: '#0284C7', borderRadius: 2 }}>
                        <Inventory2RoundedIcon sx={{ fontSize: 26 }} />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                            {b.boxName}
                          </Typography>
                          <EditRoundedIcon sx={{ fontSize: 14, color: '#94A3B8', cursor: 'pointer' }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                          {b.pieceCount} Pieces • {b.area} Sq.Ft
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label="Packed"
                        size="small"
                        sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800, fontSize: '0.7rem', height: 24, borderRadius: 1.5 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => setViewBox(b)}
                        sx={{ color: '#0284C7', bgcolor: '#F0F9FF', '&:hover': { bgcolor: '#E0F2FE' } }}
                      >
                        <VisibilityRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteBox(b.logId, b.boxName)}
                        sx={{ color: '#DC2626', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* 3. DOCKED BOTTOM BAR (Screenshot 4) */}
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
          <Box sx={{ p: 0.6, bgcolor: isPackagingCompleted ? '#DCFCE7' : '#FEF3C7', color: isPackagingCompleted ? '#166534' : '#B45309', borderRadius: '50%', display: 'flex' }}>
            <CheckRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
            {isPackagingCompleted ? 'Packaging Completed' : 'Packing in Progress'}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#CBD5E1' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            Total Boxes: <strong style={{ color: '#0F172A' }}>{packedBoxes.length}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            Total Pieces: <strong style={{ color: '#0F172A' }}>{packedPiecesCount} / {totalPieces}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            Total Area: <strong style={{ color: '#0F172A' }}>{totalPackedArea} Sq.Ft</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setSummaryOpen(true)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              borderColor: '#CBD5E1',
              color: '#334155',
              '&:hover': { bgcolor: '#F8FAFC' }
            }}
          >
            View Summary
          </Button>

          <Button
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => navigate(`/projects/${projectId}/slab/${slab?.id || 'all'}/stage/dispatch`)}
            sx={{
              bgcolor: isPackagingCompleted ? '#16A34A' : '#0284C7',
              color: '#FFFFFF',
              fontWeight: 800,
              borderRadius: 2.5,
              px: 3,
              py: 1,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: isPackagingCompleted ? '#15803D' : '#0369A1' }
            }}
          >
            Done
          </Button>
        </Box>
      </Paper>

      {/* CREATE BOX MODAL */}
      <Dialog open={isAddBoxOpen} onClose={() => setIsAddBoxOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create Packing Box
          <IconButton onClick={() => setIsAddBoxOpen(false)} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Box Name / Code"
            value={newBoxName}
            onChange={(e) => setNewBoxName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
            {selectedPieceIds.length > 0
              ? `${selectedPieceIds.length} piece(s) selected from grid will be assigned to this box.`
              : 'Next 4 unpacked pieces will be automatically assigned to this box.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsAddBoxOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleSaveBox} variant="contained" sx={{ bgcolor: '#0284C7', fontWeight: 800, '&:hover': { bgcolor: '#0369A1' } }}>Pack Box</Button>
        </DialogActions>
      </Dialog>

      {/* VIEW BOX PIECES MODAL */}
      <Dialog open={Boolean(viewBox)} onClose={() => setViewBox(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {viewBox?.boxName} - Packed Pieces
          <IconButton onClick={() => setViewBox(null)} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: 2, display: 'block' }}>
            Total {viewBox?.pieceCount} Pieces • {viewBox?.area} Sq.Ft • {viewBox?.packedOn}
          </Typography>
          <Grid container spacing={1.5}>
            {(viewBox?.pieces || []).map((p: any) => (
              <Grid item xs={6} sm={4} key={p.id}>
                <Box sx={{ p: 1.5, border: '1px solid #BBF7D0', bgcolor: '#F0FDF4', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534' }}>#{p.pieceNumber}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>{p.productName || 'Piece'}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewBox(null)} variant="outlined" sx={{ fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* VIEW PACKING SUMMARY MODAL */}
      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Packing Summary
          <IconButton onClick={() => setSummaryOpen(false)} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1 }}>
            {packedBoxes.map((b: any) => (
              <Box key={b.logId} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{b.boxName}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>{b.pieceCount} Pieces • {b.area} Sq.Ft</Typography>
                </Box>
                <Chip label="Packed" size="small" sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800 }} />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSummaryOpen(false)} variant="contained" sx={{ bgcolor: '#0284C7', fontWeight: 800 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PackingWorkspace;
