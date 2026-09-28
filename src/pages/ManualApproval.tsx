import React, { useState, useMemo, useCallback } from 'react';
import { 
  Box, Typography, Paper, Grid, Button, Chip, TextField, 
  CircularProgress, Alert, Snackbar, Checkbox, 
  Autocomplete, Divider, Tooltip, IconButton,
  Collapse, LinearProgress, InputAdornment, Card, CardContent
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
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUnchecked';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

const STAGES = [
  { name: 'Production', label: 'Production', icon: <PrecisionManufacturingIcon sx={{ fontSize: 24 }} />, color: '#059669', bg: '#ECFDF5' },
  { name: 'Polishing - Honed', label: 'Polishing', icon: <AutoFixHighIcon sx={{ fontSize: 24 }} />, color: '#D97706', bg: '#FFFDF5' },
  { name: 'Packing', label: 'Packing', icon: <Inventory2Icon sx={{ fontSize: 24 }} />, color: '#9333EA', bg: '#FDF4FF' },
  { name: 'Dispatch', label: 'Dispatch', icon: <LocalShippingIcon sx={{ fontSize: 24 }} />, color: '#0284C7', bg: '#EFF6FF' }
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
    const STAGE_ORDER = ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'];
    const currentIdx = STAGE_ORDER.findIndex(s => s === pStage || pStage.startsWith(s));
    const targetIdx = STAGE_ORDER.findIndex(s => s === norm || norm.startsWith(s));
    if (currentIdx > -1 && targetIdx > -1 && currentIdx >= targetIdx) {
      return true;
    }
  }
  return false;
};

// Canonical stage order sorting
const STAGE_ORDER_MAP: { [key: string]: number } = {
  'Production': 1,
  'Polishing - Honed': 2,
  'Polishing': 2,
  'Packing': 3,
  'Dispatch': 4
};

// Helper to get allowed stages for a slab
const getSlabAllowedStages = (slab: any): string[] => {
  let list: string[] = [];
  if (slab?.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0) {
    slab.requiredStages.forEach((s: string) => {
      if (s === 'Polishing' || s.startsWith('Polishing')) {
        if (!list.includes('Polishing - Honed')) list.push('Polishing - Honed');
      } else {
        if (!list.includes(s)) list.push(s);
      }
    });
  } else {
    list = ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'];
  }
  return list.sort((a, b) => (STAGE_ORDER_MAP[a] || 99) - (STAGE_ORDER_MAP[b] || 99));
};

const ManualApproval: React.FC = () => {
  const { data: projects } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [collapsedSlabIds, setCollapsedSlabIds] = useState<Set<string>>(new Set());

  // Key format: "${pieceId}__${stageName}"
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const { data: projectSlabs, isLoading: isSlabsLoading, refetch: refetchSlabs } = useGetSlabsQuery(selectedProjectId, { 
    skip: !selectedProjectId
  });

  const [manualApprovePieces, { isLoading: isApproving }] = useManualApprovePiecesMutation();

  const selectedProject = useMemo(() => {
    return projects?.find((p: any) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

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
  const { allPendingProjectKeys, stagePendingMap, slabPendingMap, totalPiecesInProject, totalDoneStagesCount, totalRequiredStagesCount } = useMemo(() => {
    const allKeys: string[] = [];
    const stageMap = new Map<string, string[]>();
    const slabMap = new Map<string, string[]>();
    let totalPieces = 0;
    let totalDone = 0;
    let totalReq = 0;

    if (projectSlabs) {
      for (const slab of projectSlabs) {
        const allowed = getSlabAllowedStages(slab);
        const slabKeys: string[] = [];
        if (slab.pieces) {
          totalPieces += slab.pieces.length;
          for (const piece of slab.pieces) {
            for (const stg of allowed) {
              totalReq++;
              const key = piece.id + '__' + stg;
              if (isStageDoneFast(piece.id, stg)) {
                totalDone++;
              } else {
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
      slabPendingMap: slabMap,
      totalPiecesInProject: totalPieces,
      totalDoneStagesCount: totalDone,
      totalRequiredStagesCount: totalReq
    };
  }, [projectSlabs, isStageDoneFast]);

  // Project Overall Percentage
  const projectProgressPct = useMemo(() => {
    if (totalRequiredStagesCount === 0) return 0;
    return Math.round((totalDoneStagesCount / totalRequiredStagesCount) * 100);
  }, [totalDoneStagesCount, totalRequiredStagesCount]);

  // Toggle collapse for a slab
  const toggleCollapseSlab = useCallback((slabId: string) => {
    setCollapsedSlabIds(prev => {
      const next = new Set(prev);
      if (next.has(slabId)) next.delete(slabId);
      else next.add(slabId);
      return next;
    });
  }, []);

  // Toggle a single piece + stage
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

  // Toggle piece for current active filter stage (or next pending stage)
  const togglePieceActiveStage = useCallback((piece: any, slab: any) => {
    const allowed = getSlabAllowedStages(slab);

    let targetStage = selectedStageFilter;
    if (selectedStageFilter === 'all') {
      // Find the first pending stage
      targetStage = allowed.find(stg => !isStageDoneFast(piece.id, stg)) || '';
    }

    if (!targetStage || isStageDoneFast(piece.id, targetStage)) return;

    toggleKey(piece.id, targetStage);
  }, [selectedStageFilter, isStageDoneFast, toggleKey]);

  // Toggle all pending in a slab for the current stage filter
  const toggleSlabForCurrentStage = useCallback((slab: any) => {
    const pieces = slab.pieces || [];
    const allowed = getSlabAllowedStages(slab);

    let targetKeys: string[] = [];
    if (selectedStageFilter === 'all') {
      // All pending in this slab
      targetKeys = slabPendingMap.get(slab.id) || [];
    } else {
      targetKeys = pieces
        .filter((p: any) => allowed.includes(selectedStageFilter) && !isStageDoneFast(p.id, selectedStageFilter))
        .map((p: any) => p.id + '__' + selectedStageFilter);
    }

    if (targetKeys.length === 0) return;

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
  }, [selectedStageFilter, slabPendingMap, isStageDoneFast, selectedKeys]);

  // Select all pending pieces in current active stage across the whole project
  const toggleSelectAllCurrentStage = useCallback(() => {
    let targetKeys: string[] = [];
    if (selectedStageFilter === 'all') {
      targetKeys = allPendingProjectKeys;
    } else {
      targetKeys = stagePendingMap.get(selectedStageFilter) || [];
    }

    if (targetKeys.length === 0) {
      setToast({ open: true, message: `No pending pieces for ${selectedStageFilter}!`, severity: 'success' });
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
  }, [selectedStageFilter, allPendingProjectKeys, stagePendingMap, selectedKeys]);

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
      setToast({ open: true, message: 'Please select at least one piece to approve', severity: 'error' });
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
        remarks: remarks.trim() || 'Direct Manual Approval'
      }).unwrap();

      setToast({ open: true, message: `Successfully approved ${approvals.length} item(s)!`, severity: 'success' });
      setSelectedKeys(new Set());
      setRemarks('');
      refetchSlabs();
    } catch (err: any) {
      console.error(err);
      setToast({ open: true, message: err?.data?.message || 'Error executing manual approval', severity: 'error' });
    }
  };

  // Keys pending for current stage
  const currentStagePendingCount = useMemo(() => {
    if (selectedStageFilter === 'all') return allPendingProjectKeys.length;
    return (stagePendingMap.get(selectedStageFilter) || []).length;
  }, [selectedStageFilter, allPendingProjectKeys, stagePendingMap]);

  const isCurrentStageAllSelected = useMemo(() => {
    const targetKeys = selectedStageFilter === 'all' 
      ? allPendingProjectKeys 
      : (stagePendingMap.get(selectedStageFilter) || []);
    return targetKeys.length > 0 && targetKeys.every(k => selectedKeys.has(k));
  }, [selectedStageFilter, allPendingProjectKeys, stagePendingMap, selectedKeys]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto', pb: 6 }}>
      {/* Toast Notification */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ width: '100%', fontWeight: 700, fontSize: '0.95rem' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* 1. CLEAN TOP HEADER */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2.5, sm: 3.5 }, 
          mb: 3, 
          borderRadius: 4, 
          border: '1.5px solid #E2E8F0', 
          bgcolor: '#FFFFFF',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
          <Box sx={{ p: 1.25, bgcolor: '#ECFDF5', color: '#059669', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlashOnRoundedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.3px', fontSize: { xs: '1.3rem', sm: '1.6rem' } }}>
              Direct Manual Approval
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600, mt: 0.2 }}>
              Choose a project, pick the stage, and tap the pieces to approve them.
            </Typography>
          </Box>
        </Box>

        {/* Project Selector & Search */}
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: selectedProjectId ? 7 : 12 }}>
            <Autocomplete
              options={projects && Array.isArray(projects) ? projects.filter((p: any) => p.status !== 'cancelled') : []}
              getOptionLabel={(option: any) => {
                if (!option) return '';
                if (typeof option === 'string') return option;
                return `${option.name || 'Unnamed Project'} (${option.projectId || option.id || 'N/A'}) - ${option.clientName || 'Client'}`;
              }}
              isOptionEqualToValue={(option: any, value: any) => option?.id === value?.id}
              value={selectedProject}
              onChange={(_, newValue) => {
                setSelectedProjectId(newValue ? newValue.id : '');
                setSelectedKeys(new Set());
                setSelectedStageFilter('');
              }}
              renderOption={(props: any, option: any) => {
                const { key, ...restProps } = props;
                return (
                  <li key={key} {...restProps}>
                    <Box sx={{ py: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                        {option.name || 'Unnamed Project'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                        Client: {option.clientName || 'N/A'} {option.projectId ? `• ID: ${option.projectId}` : ''}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  placeholder="Select Work Order Project..."
                  sx={{ 
                    bgcolor: '#F8FAFC', 
                    borderRadius: 3,
                    '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '1.05rem', fontWeight: 700 }
                  }}
                />
              )}
            />
          </Grid>

          {/* Quick Search Pieces */}
          {selectedProjectId && (
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                placeholder="Search by piece name, serial, size..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 22, color: '#64748B' }} />
                      </InputAdornment>
                    ),
                    sx: { bgcolor: '#F8FAFC', borderRadius: 3, fontSize: '1rem', fontWeight: 600 }
                  }
                }}
              />
            </Grid>
          )}
        </Grid>

        {/* Project Progress Bar */}
        {selectedProject && (
          <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid #F1F5F9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Overall Project Progress
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 900, color: projectProgressPct === 100 ? '#059669' : '#0284C7' }}>
                {projectProgressPct}% Completed
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={projectProgressPct} 
              sx={{ 
                height: 10, 
                borderRadius: 5, 
                bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': { bgcolor: projectProgressPct === 100 ? '#059669' : '#0284C7', borderRadius: 5 }
              }} 
            />
          </Box>
        )}
      </Paper>

      {/* 2. MCQ STEP 1: CHOOSE TARGET STAGE (LARGE INTERACTIVE MCQ TILES) */}
      {selectedProjectId && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E293B', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ bgcolor: '#059669', color: '#FFF', borderRadius: '50%', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              1
            </Box>
            Select Stage to Approve (MCQ Choice):
          </Typography>

          <Grid container spacing={2}>
            {STAGES.map(stg => {
              const isSelected = selectedStageFilter === stg.name;
              const pendingCount = (stagePendingMap.get(stg.name) || []).length;

              return (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stg.name}>
                  <Card
                    onClick={() => {
                      if (selectedStageFilter === stg.name) {
                        setSelectedStageFilter('');
                        setSelectedKeys(new Set());
                      } else {
                        setSelectedStageFilter(stg.name);
                        setSelectedKeys(new Set());
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 3.5,
                      border: '2.5px solid',
                      borderColor: isSelected ? stg.color : '#E2E8F0',
                      bgcolor: isSelected ? stg.bg : '#FFFFFF',
                      boxShadow: isSelected ? `0 6px 20px ${stg.color}30` : '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      '&:hover': {
                        borderColor: stg.color,
                        boxShadow: `0 6px 16px ${stg.color}25`
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5, pb: '20px !important', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          p: 1.5, 
                          borderRadius: 2.5, 
                          bgcolor: isSelected ? stg.color : '#F1F5F9', 
                          color: isSelected ? '#FFFFFF' : stg.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {stg.icon}
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem', lineHeight: 1.2 }}>
                            {stg.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: pendingCount > 0 ? (isSelected ? stg.color : '#64748B') : '#94A3B8', fontWeight: 800, mt: 0.3 }}>
                            {pendingCount > 0 ? `${pendingCount} Pieces Pending` : 'All Completed ✓'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Radio / Check Circle */}
                      <Box sx={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: '50%', 
                        border: '2px solid',
                        borderColor: isSelected ? stg.color : '#CBD5E1',
                        bgcolor: isSelected ? stg.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF'
                      }}>
                        {isSelected && <CheckRoundedIcon sx={{ fontSize: 18 }} />}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* 3. MCQ STEP 2: SELECT PIECES TO APPROVE */}
      {selectedProjectId && selectedStageFilter && (
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ bgcolor: '#059669', color: '#FFF', borderRadius: '50%', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                2
              </Box>
              Tap Pieces to Approve for {selectedStageFilter}:
            </Typography>

            {/* Quick Action: Select All in Stage */}
            {currentStagePendingCount > 0 && (
              <Button
                variant={isCurrentStageAllSelected ? "contained" : "outlined"}
                onClick={toggleSelectAllCurrentStage}
                startIcon={<DoneAllIcon />}
                sx={{
                  borderRadius: 2.5,
                  px: 2.5,
                  py: 0.8,
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  textTransform: 'none',
                  bgcolor: isCurrentStageAllSelected ? '#059669' : '#FFFFFF',
                  color: isCurrentStageAllSelected ? '#FFFFFF' : '#059669',
                  borderColor: '#059669',
                  '&:hover': {
                    bgcolor: isCurrentStageAllSelected ? '#047857' : '#ECFDF5',
                    borderColor: '#047857'
                  }
                }}
              >
                {isCurrentStageAllSelected 
                  ? `Deselect All ${selectedStageFilter}` 
                  : `✓ Select All ${selectedStageFilter} (${currentStagePendingCount})`}
              </Button>
            )}
          </Box>

          {/* TOP APPROVAL ACTION BAR (When pieces are selected) */}
          {selectedKeys.size > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                mb: 2.5,
                borderRadius: 3.5,
                bgcolor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                border: '1.5px solid #334155',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 0.8, bgcolor: '#059669', color: '#FFF', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
                  <FlashOnRoundedIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2, fontSize: '1.15rem' }}>
                    {selectedKeys.size} Selected
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    {uniquePieceCount} Piece{uniquePieceCount > 1 ? 's' : ''} in {selectedStageFilter}
                  </Typography>
                </Box>
              </Box>

              <TextField
                size="small"
                placeholder="Remarks (e.g. Verified by Admin)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                sx={{
                  flex: 1,
                  minWidth: 220,
                  bgcolor: '#1E293B',
                  borderRadius: 2.5,
                  '& .MuiInputBase-input': { color: '#FFFFFF', fontSize: '0.9rem', py: 1 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' }
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button
                  size="small"
                  onClick={() => setSelectedKeys(new Set())}
                  sx={{ color: '#94A3B8', textTransform: 'none', fontWeight: 700, fontSize: '0.9rem', '&:hover': { color: '#FFF' } }}
                >
                  Clear
                </Button>

                <Button
                  variant="contained"
                  disabled={isApproving}
                  onClick={handleBulkApprove}
                  startIcon={isApproving ? <CircularProgress size={18} color="inherit" /> : <DoneAllIcon />}
                  sx={{
                    borderRadius: 3,
                    bgcolor: '#059669',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    px: 3,
                    py: 1.1,
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                    '&:hover': { bgcolor: '#047857' }
                  }}
                >
                  {isApproving ? 'Approving...' : `Confirm & Approve (${selectedKeys.size})`}
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {/* 4. SLAB & PIECES CARDS (LARGE MCQ TILES) */}
      {!selectedProjectId ? (
        <Paper elevation={0} sx={{ p: 7, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 4, border: '2px dashed #CBD5E1' }}>
          <Box sx={{ p: 2, bgcolor: '#EFF6FF', color: '#0284C7', borderRadius: '50%', width: 72, height: 72, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderSpecialIcon sx={{ fontSize: 44 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mb: 1 }}>
            Select a Project to Start Manual Approval
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 460, mx: 'auto', fontWeight: 500 }}>
            Choose an active work order from the dropdown above to view its pieces and approve stages directly.
          </Typography>
        </Paper>
      ) : isSlabsLoading && !projectSlabs ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
          <CircularProgress size={44} sx={{ color: '#059669' }} />
          <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 800 }}>Loading slabs & pieces...</Typography>
        </Box>
      ) : !projectSlabs || projectSlabs.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#FEF3C7', borderRadius: 4, border: '1px solid #FCD34D' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#92400E' }}>No Slabs Found for this Project</Typography>
          <Typography variant="body2" sx={{ color: '#78350F', mt: 0.5 }}>
            Please create slabs and pieces under this project in Active Work Orders before running manual approvals.
          </Typography>
        </Paper>
      ) : !selectedStageFilter ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 4, border: '2px dashed #CBD5E1' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155', mb: 0.5 }}>
            👆 Step 1 me se kisi ek Stage par tap karein
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 480, mx: 'auto', fontWeight: 500 }}>
            Upar diye gaye <b>Production</b>, <b>Polishing</b>, <b>Packing</b>, ya <b>Dispatch</b> card par click karke pieces load karein.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {projectSlabs.map((slab: any) => {
            const isCollapsed = collapsedSlabIds.has(slab.id);
            const totalPiecesCount = slab.pieces?.length || 0;

            // Filter pieces based on search query and current stage
            const slabPieces = (slab.pieces || []).filter((p: any) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                (p.productName && p.productName.toLowerCase().includes(query)) ||
                (p.pieceNumber && String(p.pieceNumber).includes(query)) ||
                (slab.name && slab.name.toLowerCase().includes(query))
              );
            });

            // Count pending for this slab in the selected stage
            const pendingInSlabForCurrentStage = (slab.pieces || []).filter((p: any) => !isStageDoneFast(p.id, selectedStageFilter));
            const isAllSlabStageSelected = pendingInSlabForCurrentStage.length > 0 && pendingInSlabForCurrentStage.every((p: any) => selectedKeys.has(p.id + '__' + selectedStageFilter));

            return (
              <Paper 
                key={slab.id} 
                elevation={0} 
                sx={{ 
                  borderRadius: 4, 
                  border: '1.5px solid #E2E8F0', 
                  overflow: 'hidden',
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}
              >
                {/* SLAB HEADER */}
                <Box 
                  sx={{ 
                    p: { xs: 2, sm: 2.5 }, 
                    bgcolor: isCollapsed ? '#FFFFFF' : '#F8FAFC', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: 1.5, 
                    borderBottom: isCollapsed ? 'none' : '1.5px solid #E2E8F0'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton 
                      onClick={() => toggleCollapseSlab(slab.id)}
                      sx={{ color: '#64748B', p: 0.5 }}
                    >
                      {isCollapsed ? <KeyboardArrowDownIcon sx={{ fontSize: 28 }} /> : <KeyboardArrowUpIcon sx={{ fontSize: 28 }} />}
                    </IconButton>

                    <LayersIcon sx={{ color: '#0284C7', fontSize: 28 }} />

                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.25rem' }}>
                          {slab.name || 'Unnamed Slab'}
                        </Typography>
                        <Chip 
                          label={`${totalPiecesCount} Pieces`} 
                          size="small" 
                          sx={{ fontWeight: 800, fontSize: '0.8rem', height: 26, bgcolor: '#EFF6FF', color: '#1D4ED8' }} 
                        />
                        {pendingInSlabForCurrentStage.length === 0 ? (
                          <Chip 
                            label={`✓ ${selectedStageFilter} Done`} 
                            size="small" 
                            sx={{ fontWeight: 800, fontSize: '0.78rem', height: 26, bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }} 
                          />
                        ) : (
                          <Chip 
                            label={`${pendingInSlabForCurrentStage.length} Pending ${selectedStageFilter}`} 
                            size="small" 
                            sx={{ fontWeight: 800, fontSize: '0.78rem', height: 26, bgcolor: '#FEF3C7', color: '#B45309' }} 
                          />
                        )}
                      </Box>
                      {slab.size && (
                        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600, mt: 0.3 }}>
                          Specification: {slab.size}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Slab Action: Select All Pending Pieces in this Slab */}
                  {pendingInSlabForCurrentStage.length > 0 && (
                    <Button
                      variant={isAllSlabStageSelected ? "contained" : "outlined"}
                      size="small"
                      onClick={() => toggleSlabForCurrentStage(slab)}
                      sx={{
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        px: 2,
                        py: 0.7,
                        bgcolor: isAllSlabStageSelected ? '#059669' : '#FFFFFF',
                        color: isAllSlabStageSelected ? '#FFFFFF' : '#059669',
                        borderColor: '#059669',
                        '&:hover': {
                          bgcolor: isAllSlabStageSelected ? '#047857' : '#ECFDF5'
                        }
                      }}
                    >
                      {isAllSlabStageSelected ? `Deselect All in Slab` : `+ Select All ${pendingInSlabForCurrentStage.length} in Slab`}
                    </Button>
                  )}
                </Box>

                {/* PIECES MCQ OPTIONS GRID */}
                <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
                  {slabPieces.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                        No pieces matching search query.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Grid container spacing={2}>
                        {slabPieces.map((piece: any, pIdx: number) => {
                          const key = piece.id + '__' + selectedStageFilter;
                          const isDone = isStageDoneFast(piece.id, selectedStageFilter);
                          const isSelected = selectedKeys.has(key);

                          return (
                            <Grid size={{ xs: 12, md: 6 }} key={piece.id || pIdx}>
                              <Card
                                onClick={() => {
                                  if (!isDone) toggleKey(piece.id, selectedStageFilter);
                                }}
                                sx={{
                                  cursor: isDone ? 'default' : 'pointer',
                                  borderRadius: 3.5,
                                  border: '2px solid',
                                  borderColor: isDone 
                                    ? '#E2E8F0' 
                                    : isSelected 
                                      ? '#059669' 
                                      : '#CBD5E1',
                                  bgcolor: isDone 
                                    ? '#F8FAFC' 
                                    : isSelected 
                                      ? '#F0FDF4' 
                                      : '#FFFFFF',
                                  boxShadow: isSelected 
                                    ? '0 6px 18px rgba(5, 150, 105, 0.18)' 
                                    : '0 2px 6px rgba(0,0,0,0.02)',
                                  transition: 'all 0.15s ease',
                                  transform: isSelected ? 'scale(1.01)' : 'none',
                                  opacity: isDone ? 0.75 : 1,
                                  '&:hover': {
                                    borderColor: isDone ? '#E2E8F0' : '#059669',
                                    boxShadow: isDone ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.15)'
                                  }
                                }}
                              >
                                <CardContent sx={{ p: 2.5, pb: '20px !important' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                                    {/* Left: Checkbox + Piece details */}
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
                                      {/* MCQ Option Checkbox Circle */}
                                      <Box sx={{ mt: 0.25 }}>
                                        {isDone ? (
                                          <CheckCircleRoundedIcon sx={{ fontSize: 28, color: '#059669' }} />
                                        ) : isSelected ? (
                                          <Box sx={{ 
                                            width: 28, 
                                            height: 28, 
                                            borderRadius: '50%', 
                                            bgcolor: '#059669', 
                                            color: '#FFF', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.4)'
                                          }}>
                                            <CheckRoundedIcon sx={{ fontSize: 20 }} />
                                          </Box>
                                        ) : (
                                          <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 28, color: '#94A3B8' }} />
                                        )}
                                      </Box>

                                      <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                          <Chip 
                                            label={`#${piece.pieceNumber || (pIdx + 1)}`} 
                                            size="small" 
                                            sx={{ fontWeight: 900, fontSize: '0.8rem', bgcolor: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1', height: 24 }} 
                                          />
                                          <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem', lineHeight: 1.2 }}>
                                            {piece.productName || `Piece #${piece.pieceNumber || (pIdx + 1)}`}
                                          </Typography>
                                        </Box>

                                        {piece.size && (
                                          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 700, mt: 0.5, fontSize: '0.92rem' }}>
                                            Dimensions: <span style={{ color: '#0F172A' }}>{piece.size}</span>
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>

                                    {/* Right: Stage Status Badge */}
                                    <Box sx={{ textAlign: 'right' }}>
                                      {isDone ? (
                                        <Chip 
                                          label={`✓ ${selectedStageFilter} Done`} 
                                          size="small" 
                                          sx={{ fontWeight: 800, fontSize: '0.78rem', bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', height: 26 }} 
                                        />
                                      ) : isSelected ? (
                                        <Chip 
                                          label={`✓ Selected for ${selectedStageFilter}`} 
                                          size="small" 
                                          sx={{ fontWeight: 900, fontSize: '0.8rem', bgcolor: '#059669', color: '#FFFFFF', height: 26 }} 
                                        />
                                      ) : (
                                        <Chip 
                                          label={`Tap to Approve`} 
                                          size="small" 
                                          sx={{ fontWeight: 800, fontSize: '0.78rem', bgcolor: '#F8FAFC', color: '#64748B', border: '1px dashed #CBD5E1', height: 26 }} 
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* 5. BOTTOM APPROVAL BAR (Static, at the end of the page so user scrolled to the bottom doesn't need to scroll up) */}
      {selectedKeys.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            mb: 2,
            bgcolor: '#0F172A',
            color: '#FFFFFF',
            p: { xs: 2.5, sm: 3 },
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1.5px solid #334155',
            flexWrap: 'wrap'
          }}
        >
          {/* Selected Count: "⚡ 12 Selected (8 Pieces)" - NO "Approval(s) Selected" */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 0.8, bgcolor: '#059669', color: '#FFF', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
              <FlashOnRoundedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2, fontSize: '1.15rem' }}>
                {selectedKeys.size} Selected
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                {uniquePieceCount} Piece{uniquePieceCount > 1 ? 's' : ''} in {selectedStageFilter}
              </Typography>
            </Box>
          </Box>

          {/* Remarks Field */}
          <TextField
            size="small"
            placeholder="Remarks (e.g. Verified by Admin)..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 200,
              bgcolor: '#1E293B',
              borderRadius: 2.5,
              '& .MuiInputBase-input': { color: '#FFFFFF', fontSize: '0.9rem', py: 1 },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' }
            }}
          />

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              size="small"
              onClick={() => setSelectedKeys(new Set())}
              sx={{ color: '#94A3B8', textTransform: 'none', fontWeight: 700, fontSize: '0.9rem', '&:hover': { color: '#FFF' } }}
            >
              Clear
            </Button>

            <Button
              variant="contained"
              disabled={isApproving}
              onClick={handleBulkApprove}
              startIcon={isApproving ? <CircularProgress size={18} color="inherit" /> : <DoneAllIcon />}
              sx={{
                borderRadius: 3,
                bgcolor: '#059669',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '0.95rem',
                textTransform: 'none',
                px: 3,
                py: 1.1,
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                '&:hover': { bgcolor: '#047857' }
              }}
            >
              {isApproving ? 'Approving...' : `Confirm & Approve (${selectedKeys.size})`}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ManualApproval;
