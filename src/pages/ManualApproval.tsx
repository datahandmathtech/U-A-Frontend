import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, Typography, Paper, Grid, Button, Chip, TextField, 
  CircularProgress, Alert, Snackbar, Checkbox, 
  Autocomplete, Table, TableHead, TableRow, TableCell, TableBody, Divider, Tooltip, IconButton,
  Collapse, Fab
} from '@mui/material';
import { useGetProjectsQuery, useGetSlabsQuery, useManualApprovePiecesMutation } from '../store/apiSlice';
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import SearchIcon from '@mui/icons-material/Search';
import LayersIcon from '@mui/icons-material/Layers';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

const STAGES = [
  { name: 'Production', label: 'Production', icon: <PrecisionManufacturingIcon sx={{ fontSize: 16 }} />, color: '#059669', bg: '#ECFDF5' },
  { name: 'Polishing - Honed', label: 'Polishing (Honed)', icon: <AutoFixHighIcon sx={{ fontSize: 16 }} />, color: '#D97706', bg: '#FFFDF5' },
  { name: 'Polishing - Mirror', label: 'Polishing (Mirror)', icon: <AutoFixHighIcon sx={{ fontSize: 16 }} />, color: '#B45309', bg: '#FEF3C7' },
  { name: 'Packing', label: 'Packing', icon: <Inventory2Icon sx={{ fontSize: 16 }} />, color: '#9333EA', bg: '#FDF4FF' },
  { name: 'Dispatch', label: 'Dispatch', icon: <LocalShippingIcon sx={{ fontSize: 16 }} />, color: '#0284C7', bg: '#EFF6FF' }
];

// Helper to check if a piece has completed a stage
const checkPieceStageDone = (piece: any, stageName: string): boolean => {
  const norm = stageName.replace(' Work', '').trim();
  if (piece?.logs && Array.isArray(piece.logs)) {
    const hasDone = piece.logs.some((l: any) => {
      const lStage = (l.stage || '').replace(' Work', '').trim();
      return (lStage === norm || lStage.startsWith(norm) || (norm.startsWith('Polishing') && lStage.startsWith('Polishing'))) && 
             (l.status === 'completed' || l.status === 'approved');
    });
    if (hasDone) return true;
  }
  if (piece?.status === 'completed') {
    const pStage = (piece?.stage || '').replace(' Work', '').trim();
    if (pStage === norm || pStage.startsWith(norm) || (norm.startsWith('Polishing') && pStage.startsWith('Polishing'))) return true;
    const STAGE_ORDER = ['Production', 'Polishing - Honed', 'Polishing - Mirror', 'Packing', 'Dispatch'];
    const currentIdx = STAGE_ORDER.findIndex(s => s === pStage || pStage.startsWith(s));
    const targetIdx = STAGE_ORDER.findIndex(s => s === norm || norm.startsWith(s));
    if (currentIdx > -1 && targetIdx > -1 && currentIdx >= targetIdx) {
      return true;
    }
  }
  return false;
};

// Helper to get allowed stages for a slab
const getSlabAllowedStages = (slab: any): string[] => {
  if (slab?.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0) {
    const list: string[] = [];
    slab.requiredStages.forEach((s: string) => {
      if (s === 'Polishing') list.push('Polishing - Honed');
      else list.push(s);
    });
    return list;
  }
  return ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'];
};

const ManualApproval: React.FC = () => {
  const { data: projects, isLoading: isProjectsLoading } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [collapsedSlabIds, setCollapsedSlabIds] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Key format: "${pieceId}__${stageName}"
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const { data: projectSlabs, isLoading: isSlabsLoading, refetch: refetchSlabs } = useGetSlabsQuery(selectedProjectId, { 
    skip: !selectedProjectId
  });

  const [manualApprovePieces, { isLoading: isApproving }] = useManualApprovePiecesMutation();

  // Handle scroll for Back-To-Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Precompute Stage Done Map for O(1) Instant Lookups
  const stageDoneMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!projectSlabs) return map;
    for (const slab of projectSlabs) {
      if (!slab.pieces) continue;
      for (const piece of slab.pieces) {
        for (const stg of STAGES) {
          const key = piece.id + '__' + stg.name;
          map.set(key, checkPieceStageDone(piece, stg.name));
        }
      }
    }
    return map;
  }, [projectSlabs]);

  const isStageDoneFast = useCallback((pieceId: string, stageName: string): boolean => {
    return stageDoneMap.get(pieceId + '__' + stageName) || false;
  }, [stageDoneMap]);

  // Precompute all pending keys per stage and across project
  const { allPendingProjectKeys, stagePendingMap, slabPendingMap } = useMemo(() => {
    const allKeys: string[] = [];
    const stageMap = new Map<string, string[]>();
    const slabMap = new Map<string, string[]>();

    if (projectSlabs) {
      for (const slab of projectSlabs) {
        const allowed = getSlabAllowedStages(slab);
        const slabKeys: string[] = [];
        if (slab.pieces) {
          for (const piece of slab.pieces) {
            for (const stg of allowed) {
              const key = piece.id + '__' + stg;
              if (!isStageDoneFast(piece.id, stg)) {
                allKeys.push(key);
                slabKeys.push(key);
                if (!stageMap.has(stg)) stageMap.set(stg, []);
                stageMap.get(stg)!.push(key);
              }
            }
          }
        }
        slabMap.set(slab.id, slabKeys);
      }
    }

    return {
      allPendingProjectKeys: allKeys,
      stagePendingMap: stageMap,
      slabPendingMap: slabMap
    };
  }, [projectSlabs, isStageDoneFast]);

  // Toggle collapse for a slab
  const toggleCollapseSlab = useCallback((slabId: string) => {
    setCollapsedSlabIds(prev => {
      const next = new Set(prev);
      if (next.has(slabId)) next.delete(slabId);
      else next.add(slabId);
      return next;
    });
  }, []);

  const collapseAllSlabs = useCallback(() => {
    if (projectSlabs) {
      setCollapsedSlabIds(new Set(projectSlabs.map((s: any) => s.id)));
    }
  }, [projectSlabs]);

  const expandAllSlabs = useCallback(() => {
    setCollapsedSlabIds(new Set());
  }, []);

  // Fast Toggle a single piece + stage
  const toggleKey = useCallback((pieceId: string, stage: string) => {
    if (isStageDoneFast(pieceId, stage)) return;
    const key = pieceId + '__' + stage;
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [isStageDoneFast]);

  // Fast Toggle all allowed & pending stages for a single piece
  const togglePieceAllStages = useCallback((piece: any, slab: any) => {
    const allowed = getSlabAllowedStages(slab);
    const pendingKeys = allowed
      .filter(stg => !isStageDoneFast(piece.id, stg))
      .map(stg => piece.id + '__' + stg);

    if (pendingKeys.length === 0) return;

    const isAllPieceSelected = pendingKeys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllPieceSelected) {
        pendingKeys.forEach(k => next.delete(k));
      } else {
        pendingKeys.forEach(k => next.add(k));
      }
      return next;
    });
  }, [isStageDoneFast, selectedKeys]);

  // Fast Toggle a specific stage for all pending pieces in a slab
  const toggleSlabStage = useCallback((slab: any, stage: string) => {
    const pieces = slab.pieces || [];
    const pendingKeys = pieces
      .filter((p: any) => !isStageDoneFast(p.id, stage))
      .map((p: any) => p.id + '__' + stage);

    if (pendingKeys.length === 0) return;

    const isAllSelected = pendingKeys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        pendingKeys.forEach(k => next.delete(k));
      } else {
        pendingKeys.forEach(k => next.add(k));
      }
      return next;
    });
  }, [isStageDoneFast, selectedKeys]);

  // Fast Toggle all allowed & pending stages for all pieces in a slab
  const toggleSlabAll = useCallback((slab: any) => {
    const slabPendingKeys = slabPendingMap.get(slab.id) || [];
    if (slabPendingKeys.length === 0) return;

    const isAllSlabSelected = slabPendingKeys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllSlabSelected) {
        slabPendingKeys.forEach(k => next.delete(k));
      } else {
        slabPendingKeys.forEach(k => next.add(k));
      }
      return next;
    });
  }, [slabPendingMap, selectedKeys]);

  // Global: Instant Toggle all required & pending stages across entire project
  const selectAllProjectRequired = useCallback(() => {
    if (allPendingProjectKeys.length === 0) {
      setToast({ open: true, message: 'All stages are already completed for this project!', severity: 'success' });
      return;
    }

    const isAllSelected = allPendingProjectKeys.length > 0 && allPendingProjectKeys.every(k => selectedKeys.has(k));
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allPendingProjectKeys));
    }
  }, [allPendingProjectKeys, selectedKeys]);

  // Global: Instant Toggle a specific stage across all slabs where allowed and pending
  const selectGlobalStage = useCallback((stage: string) => {
    const targetKeys = stagePendingMap.get(stage) || [];
    if (targetKeys.length === 0) {
      setToast({ open: true, message: `All pieces have already completed ${stage}!`, severity: 'success' });
      return;
    }

    const isAllSelected = targetKeys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        targetKeys.forEach(k => next.delete(k));
      } else {
        targetKeys.forEach(k => next.add(k));
      }
      return next;
    });
  }, [stagePendingMap, selectedKeys]);

  // Count unique pieces selected
  const uniquePieceCount = useMemo(() => {
    const pieceIdSet = new Set<string>();
    selectedKeys.forEach(k => {
      pieceIdSet.add(k.split('__')[0]);
    });
    return pieceIdSet.size;
  }, [selectedKeys]);

  const handleBulkApprove = async () => {
    if (selectedKeys.size === 0) {
      setToast({ open: true, message: 'Please select at least one pending piece stage to approve', severity: 'error' });
      return;
    }

    const approvals = Array.from(selectedKeys).map(k => {
      const [pieceId, stage] = k.split('__');
      return { pieceId, stage };
    });

    try {
      await manualApprovePieces({
        projectId: selectedProjectId,
        approvals,
        remarks: remarks.trim() || 'Manual Direct Approval'
      }).unwrap();

      setToast({ open: true, message: `Successfully approved ${approvals.length} piece stage(s)!`, severity: 'success' });
      setSelectedKeys(new Set());
      setRemarks('');
      refetchSlabs();
    } catch (err: any) {
      console.error(err);
      setToast({ open: true, message: err?.data?.message || 'Error executing manual approval', severity: 'error' });
    }
  };

  // Active Project stages list
  const activeProjectStages = useMemo(() => {
    if (!projectSlabs || projectSlabs.length === 0) return STAGES;
    return STAGES.filter(stg => projectSlabs.some((s: any) => getSlabAllowedStages(s).includes(stg.name)));
  }, [projectSlabs]);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1600, mx: 'auto', pb: 12 }}>
      {/* Toast Notification */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ width: '100%', fontWeight: 700 }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* HEADER SECTION */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 4, 
          border: '1px solid #E2E8F0', 
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FlashOnRoundedIcon sx={{ color: '#059669', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                Direct Manual Approval
              </Typography>
              <Chip label="High-Speed Execution" size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 800, fontSize: '0.72rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
              Instantly complete any stage for multiple slabs and pieces without machine assignment delays.
            </Typography>
          </Box>

          {/* Action Approval Button */}
          {selectedProjectId && (
            <Button
              variant="contained"
              disabled={selectedKeys.size === 0 || isApproving}
              onClick={handleBulkApprove}
              startIcon={isApproving ? <CircularProgress size={18} color="inherit" /> : <FlashOnRoundedIcon />}
              sx={{
                borderRadius: 2.5,
                px: 3.5,
                py: 1.2,
                fontWeight: 800,
                fontSize: '0.9rem',
                textTransform: 'none',
                bgcolor: '#059669',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                '&:hover': { bgcolor: '#047857' }
              }}
            >
              {isApproving ? 'Approving Batch...' : `Approve Selected (${selectedKeys.size})`}
            </Button>
          )}
        </Box>

        {/* Project Selector & Search Controls */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', mb: 0.75, display: 'block' }}>
              Select Active Work Order Project *
            </Typography>
            <Autocomplete
              options={projects && Array.isArray(projects) ? projects.filter((p: any) => p.status !== 'cancelled') : []}
              getOptionLabel={(option: any) => {
                if (!option) return '';
                if (typeof option === 'string') return option;
                return `${option.name || 'Unnamed'} (${option.projectId || option.id || 'N/A'}) - ${option.clientName || 'Client'}`;
              }}
              isOptionEqualToValue={(option: any, value: any) => option?.id === value?.id}
              value={projects?.find((p: any) => p.id === selectedProjectId) || null}
              onChange={(_, newValue) => {
                setSelectedProjectId(newValue ? newValue.id : '');
                setSelectedKeys(new Set());
              }}
              renderOption={(props: any, option: any) => {
                const { key, ...restProps } = props;
                return (
                  <li key={key} {...restProps}>
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>{option.name || 'Unnamed Project'}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Client: {option.clientName || 'N/A'} {option.projectId ? ('• ID: ' + option.projectId) : ''}</Typography>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  size="small" 
                  placeholder="Click here to choose a project..."
                  sx={{ bgcolor: '#FAFAFA', borderRadius: 2 }}
                />
              )}
            />
          </Grid>

          {/* Search Box */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SearchIcon sx={{ fontSize: 16, color: '#64748B' }} /> Filter Pieces / Serials
            </Typography>
            <TextField
              fullWidth
              size="small"
              disabled={!selectedProjectId}
              placeholder="Filter by piece name (e.g. Stone.1, P-01)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ bgcolor: '#FAFAFA', borderRadius: 2 }}
            />
          </Grid>
        </Grid>

        {/* BATCH STAGE CONTROLS TOOLBAR */}
        {selectedProjectId && (
          <>
            <Divider sx={{ my: 2.5, borderColor: '#F1F5F9' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', mr: 0.5 }}>
                  QUICK SELECT:
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<DoneAllIcon />}
                  onClick={selectAllProjectRequired}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, bgcolor: '#059669', color: '#FFF', fontSize: '0.78rem', '&:hover': { bgcolor: '#047857' } }}
                >
                  ⚡ All Pending Stages ({allPendingProjectKeys.length})
                </Button>

                {activeProjectStages.map(stg => {
                  const pendingCount = (stagePendingMap.get(stg.name) || []).length;
                  return (
                    <Button
                      key={stg.name}
                      size="small"
                      variant="outlined"
                      disabled={pendingCount === 0}
                      startIcon={stg.icon}
                      onClick={() => selectGlobalStage(stg.name)}
                      sx={{ 
                        borderRadius: 2, 
                        textTransform: 'none', 
                        fontWeight: 700, 
                        borderColor: '#CBD5E1', 
                        color: pendingCount > 0 ? stg.color : '#94A3B8',
                        fontSize: '0.78rem',
                        '&:hover': { bgcolor: stg.bg, borderColor: stg.color }
                      }}
                    >
                      + All {stg.label} ({pendingCount})
                    </Button>
                  );
                })}

                {selectedKeys.size > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<RestartAltIcon />}
                    onClick={() => setSelectedKeys(new Set())}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}
                  >
                    Deselect All
                  </Button>
                )}
              </Box>

              {/* Accordion Controls (Collapse / Expand All) */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<UnfoldLessIcon />}
                  onClick={collapseAllSlabs}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#475569', fontSize: '0.75rem', bgcolor: '#F1F5F9' }}
                >
                  Collapse All Slabs
                </Button>
                <Button
                  size="small"
                  startIcon={<UnfoldMoreIcon />}
                  onClick={expandAllSlabs}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#475569', fontSize: '0.75rem', bgcolor: '#F1F5F9' }}
                >
                  Expand All
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>

      {/* INITIAL SCREEN (BLANK / UNSELECTED STATE) */}
      {!selectedProjectId ? (
        <Paper elevation={0} sx={{ p: 7, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 4, border: '2px dashed #CBD5E1' }}>
          <Box sx={{ p: 2, bgcolor: '#EFF6FF', color: '#0284C7', borderRadius: '50%', width: 70, height: 70, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderSpecialIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mb: 1 }}>
            Select a Project to Start Manual Approval
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 480, mx: 'auto', fontWeight: 500 }}>
            Choose an Active Work Order project from the dropdown above to load its Slabs, custom Sub-Pieces, and configure granular stage approvals.
          </Typography>
        </Paper>
      ) : (isSlabsLoading && !projectSlabs) ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
          <CircularProgress size={44} sx={{ color: '#059669' }} />
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 700 }}>Loading project slabs & pieces...</Typography>
        </Box>
      ) : !projectSlabs || projectSlabs.length === 0 ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', bgcolor: '#FEF3C7', borderRadius: 4, border: '1px solid #FCD34D' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#92400E' }}>No Slabs Found for this Project</Typography>
          <Typography variant="body2" sx={{ color: '#78350F', mt: 0.5 }}>
            Please create slabs and pieces under this project in Active Work Orders before running manual approvals.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {projectSlabs.map((slab: any) => {
            const allowedStages = getSlabAllowedStages(slab);
            const isCollapsed = collapsedSlabIds.has(slab.id);

            const slabPieces = (slab.pieces || []).filter((p: any) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                (p.productName && p.productName.toLowerCase().includes(query)) ||
                (p.pieceNumber && String(p.pieceNumber).includes(query)) ||
                (slab.name && slab.name.toLowerCase().includes(query))
              );
            });

            // Calculate pending keys for this slab
            const slabPendingKeys = slabPendingMap.get(slab.id) || [];
            const isSlabAllSelected = slabPendingKeys.length > 0 && slabPendingKeys.every(k => selectedKeys.has(k));
            const isSlabPartiallySelected = slabPendingKeys.some(k => selectedKeys.has(k)) && !isSlabAllSelected;
            const isSlabFullyDone = slabPendingKeys.length === 0 && (slab.pieces?.length || 0) > 0;

            // Slab stage stats
            const totalPiecesCount = slab.pieces?.length || 0;

            return (
              <Paper 
                key={slab.id} 
                elevation={0} 
                sx={{ 
                  borderRadius: 3.5, 
                  border: '1px solid #E2E8F0', 
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* SLAB ACCORDION HEADER */}
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: isCollapsed ? '#FFFFFF' : '#F8FAFC', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: 1.5, 
                    borderBottom: isCollapsed ? 'none' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#F1F5F9' }
                  }}
                  onClick={() => toggleCollapseSlab(slab.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); toggleCollapseSlab(slab.id); }}
                      sx={{ color: '#64748B' }}
                    >
                      {isCollapsed ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                    </IconButton>

                    {!isSlabFullyDone && (
                      <Checkbox
                        checked={isSlabAllSelected}
                        indeterminate={isSlabPartiallySelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSlabAll(slab)}
                        sx={{ p: 0.5, color: '#059669', '&.Mui-checked': { color: '#059669' } }}
                      />
                    )}

                    <LayersIcon sx={{ color: isSlabFullyDone ? '#059669' : '#B38B36', fontSize: 22 }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                          {slab.name || 'Unnamed Slab'}
                        </Typography>
                        <Chip 
                          label={`${totalPiecesCount} Pieces`} 
                          size="small" 
                          sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22, bgcolor: '#EFF6FF', color: '#1D4ED8' }} 
                        />
                        {isSlabFullyDone && (
                          <Chip 
                            label="All Stages Completed ✓" 
                            size="small" 
                            sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22, bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }} 
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        {slab.size ? `Spec: ${slab.size} • ` : ''}Required: {allowedStages.map(s => s.replace('Polishing - Honed', 'Honed').replace('Polishing - Mirror', 'Mirror')).join(' → ')}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Slab Stage Quick Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                    {allowedStages.map(stgName => {
                      const stgMeta = STAGES.find(s => s.name === stgName) || { name: stgName, label: stgName, color: '#475569', bg: '#F1F5F9', icon: null };
                      const pendingInSlab = (slab.pieces || []).filter((p: any) => !isStageDoneFast(p.id, stgName)).length;
                      const doneInSlab = totalPiecesCount - pendingInSlab;
                      const isAllStgDone = pendingInSlab === 0 && totalPiecesCount > 0;

                      const slabStgPendingKeys = (slab.pieces || []).filter((p: any) => !isStageDoneFast(p.id, stgName)).map((p: any) => p.id + '__' + stgName);
                      const isStgAllSelected = slabStgPendingKeys.length > 0 && slabStgPendingKeys.every(k => selectedKeys.has(k));

                      return (
                        <Chip
                          key={stgName}
                          size="small"
                          label={
                            isAllStgDone 
                              ? `✓ ${stgMeta.label} (${doneInSlab}/${totalPiecesCount})` 
                              : isStgAllSelected 
                                ? `✓ Selected ${stgMeta.label}` 
                                : `+ ${stgMeta.label} (${doneInSlab}/${totalPiecesCount})`
                          }
                          disabled={isAllStgDone}
                          onClick={() => toggleSlabStage(slab, stgName)}
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: isAllStgDone ? 'default' : 'pointer',
                            bgcolor: isAllStgDone ? '#ECFDF5' : (isStgAllSelected ? stgMeta.color : '#FFFFFF'),
                            color: isAllStgDone ? '#059669' : (isStgAllSelected ? '#FFFFFF' : stgMeta.color),
                            border: '1px solid ' + (isAllStgDone ? '#A7F3D0' : stgMeta.color),
                            '&:hover': { bgcolor: isAllStgDone ? '#ECFDF5' : stgMeta.color, color: '#FFFFFF' }
                          }}
                        />
                      );
                    })}

                    {!isSlabFullyDone && (
                      <Button
                        size="small"
                        onClick={() => toggleSlabAll(slab)}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.76rem', color: '#059669', ml: 0.5 }}
                      >
                        {isSlabAllSelected ? 'Deselect Slab' : 'Select Pending in Slab'}
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* COLLAPSIBLE TABLE OF PIECES WITH STAGE MATRIX */}
                <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
                  {slabPieces.length === 0 ? (
                    <Box sx={{ p: 3.5, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        No pieces matching filter under this slab.
                      </Typography>
                    </Box>
                  ) : (
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                        <TableRow>
                          <TableCell sx={{ width: 50, py: 1.25 }} align="center">All</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '24%' }}>Piece / Sub-Piece Name</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '8%' }}>Piece #</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '20%' }}>Dimensions / Size</TableCell>
                          
                          {/* ONLY RENDER THE ACTIVE STAGES CONFIGURED FOR THIS SLAB */}
                          {STAGES.filter(stg => allowedStages.includes(stg.name)).map(stg => (
                            <TableCell key={stg.name} align="center" sx={{ fontWeight: 800, color: stg.color, fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                {stg.icon}
                                {stg.label}
                              </Box>
                            </TableCell>
                          ))}

                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '12%' }} align="center">Overall Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {slabPieces.map((piece: any, pIdx: number) => {
                          const piecePendingKeys = allowedStages
                            .filter(stg => !isStageDoneFast(piece.id, stg))
                            .map(stg => piece.id + '__' + stg);

                          const isPieceAllSelected = piecePendingKeys.length > 0 && piecePendingKeys.every(k => selectedKeys.has(k));
                          const isPiecePartiallySelected = piecePendingKeys.some(k => selectedKeys.has(k)) && !isPieceAllSelected;
                          const isPieceFullyDone = piecePendingKeys.length === 0;

                          return (
                            <TableRow 
                              key={piece.id || pIdx} 
                              hover 
                              sx={{ 
                                bgcolor: (isPieceAllSelected || isPiecePartiallySelected) ? '#F0FDF4' : (pIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA')
                              }}
                            >
                              {/* Piece Row Master Toggle */}
                              <TableCell align="center" sx={{ py: 1 }}>
                                {!isPieceFullyDone ? (
                                  <Checkbox
                                    size="small"
                                    checked={isPieceAllSelected}
                                    indeterminate={isPiecePartiallySelected}
                                    onChange={() => togglePieceAllStages(piece, slab)}
                                    sx={{ p: 0, color: '#059669', '&.Mui-checked': { color: '#059669' } }}
                                  />
                                ) : (
                                  <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#059669' }} />
                                )}
                              </TableCell>

                              {/* Piece Name */}
                              <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                                  {piece.productName || ('Piece ' + piece.pieceNumber)}
                                </Typography>
                              </TableCell>

                              {/* Serial */}
                              <TableCell sx={{ py: 1 }}>
                                <Chip size="small" label={piece.pieceNumber ? ('#' + piece.pieceNumber) : '#1'} sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                              </TableCell>

                              {/* Dimensions */}
                              <TableCell sx={{ py: 1 }}>
                                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                                  {piece.size || 'Standard'}
                                </Typography>
                              </TableCell>

                              {/* DYNAMIC STAGE COLUMNS ONLY */}
                              {STAGES.filter(stg => allowedStages.includes(stg.name)).map(stg => {
                                const key = piece.id + '__' + stg.name;
                                const isChecked = selectedKeys.has(key);
                                const isDone = isStageDoneFast(piece.id, stg.name);

                                if (isDone) {
                                  return (
                                    <TableCell key={stg.name} align="center" sx={{ py: 1 }}>
                                      <Tooltip title={`${stg.label} Completed`}>
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', px: 1, py: 0.3, borderRadius: 1.5 }}>
                                          <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#059669' }} />
                                          <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 800, fontSize: '0.68rem' }}>Done</Typography>
                                        </Box>
                                      </Tooltip>
                                    </TableCell>
                                  );
                                }

                                return (
                                  <TableCell key={stg.name} align="center" sx={{ py: 1 }}>
                                    <Checkbox
                                      size="small"
                                      checked={isChecked}
                                      onChange={() => toggleKey(piece.id, stg.name)}
                                      sx={{ 
                                        p: 0.5, 
                                        color: stg.color, 
                                        '&.Mui-checked': { color: stg.color } 
                                      }}
                                    />
                                  </TableCell>
                                );
                              })}

                              {/* STATUS BADGE */}
                              <TableCell align="center" sx={{ py: 1 }}>
                                <Chip 
                                  size="small" 
                                  label={isPieceFullyDone ? 'Completed' : (piece.stage || 'In Production')} 
                                  sx={{ 
                                    fontWeight: 800, 
                                    fontSize: '0.7rem', 
                                    height: 22, 
                                    bgcolor: isPieceFullyDone ? '#ECFDF5' : '#EFF6FF', 
                                    color: isPieceFullyDone ? '#059669' : '#1D4ED8',
                                    border: '1px solid',
                                    borderColor: isPieceFullyDone ? '#A7F3D0' : '#DBEAFE'
                                  }} 
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* STICKY BOTTOM APPROVAL BAR (When items are selected) */}
      {selectedKeys.size > 0 && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            bgcolor: '#0F172A',
            color: '#FFFFFF',
            px: 3,
            py: 1.5,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '1px solid #334155',
            maxWidth: '90vw',
            flexWrap: 'wrap'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FlashOnRoundedIcon sx={{ color: '#10B981', fontSize: 22 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
              {selectedKeys.size} Stage Approval(s) Selected ({uniquePieceCount} Pieces)
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Remarks (e.g. Approved by Supervisor)..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            sx={{
              width: 250,
              bgcolor: '#1E293B',
              borderRadius: 2,
              '& .MuiInputBase-input': { color: '#FFFFFF', fontSize: '0.82rem' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' }
            }}
          />

          <Button
            variant="contained"
            disabled={isApproving}
            onClick={handleBulkApprove}
            startIcon={isApproving ? <CircularProgress size={16} color="inherit" /> : <DoneAllIcon />}
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
            {isApproving ? 'Approving...' : 'Approve Now'}
          </Button>

          <Button
            size="small"
            onClick={() => setSelectedKeys(new Set())}
            sx={{ color: '#94A3B8', textTransform: 'none', fontWeight: 700 }}
          >
            Clear
          </Button>
        </Paper>
      )}

      {/* FLOATING BACK TO TOP BUTTON */}
      {showBackToTop && (
        <Fab
          size="medium"
          color="primary"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            bgcolor: '#1E293B',
            color: '#FFFFFF',
            '&:hover': { bgcolor: '#0F172A' }
          }}
          title="Back to Top"
        >
          <ArrowUpwardIcon />
        </Fab>
      )}
    </Box>
  );
};

export default ManualApproval;
