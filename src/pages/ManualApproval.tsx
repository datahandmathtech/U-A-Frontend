import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Grid, Button, Chip, TextField, 
  CircularProgress, Alert, Snackbar, Checkbox, 
  Autocomplete, Table, TableHead, TableRow, TableCell, TableBody, Divider, Tooltip, IconButton
} from '@mui/material';
import { useGetProjectsQuery, useGetSlabsQuery, useManualApprovePiecesMutation, useGetApprovedLogsQuery, useGetPendingApprovalsQuery } from '../store/apiSlice';
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

const STAGES = [
  { name: 'Production', label: 'Production', icon: <PrecisionManufacturingIcon sx={{ fontSize: 16 }} />, color: '#059669', bg: '#ECFDF5' },
  { name: 'Polishing', label: 'Polishing', icon: <AutoFixHighIcon sx={{ fontSize: 16 }} />, color: '#D97706', bg: '#FFFDF5' },
  { name: 'Packing', label: 'Packing', icon: <Inventory2Icon sx={{ fontSize: 16 }} />, color: '#9333EA', bg: '#FDF4FF' },
  { name: 'Dispatch', label: 'Dispatch', icon: <LocalShippingIcon sx={{ fontSize: 16 }} />, color: '#0284C7', bg: '#EFF6FF' }
];

const ManualApproval: React.FC = () => {
  const { data: projects, isLoading: isProjectsLoading } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Key format: "${pieceId}__${stageName}"
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const { data: projectSlabs, isLoading: isSlabsLoading, refetch: refetchSlabs } = useGetSlabsQuery(selectedProjectId, { skip: !selectedProjectId });
  const { refetch: refetchApproved } = useGetApprovedLogsQuery();
  const { refetch: refetchPending } = useGetPendingApprovalsQuery();

  const [manualApprovePieces, { isLoading: isApproving }] = useManualApprovePiecesMutation();

  // Helper to get allowed stages for a slab (defaults to all 4 if not specified)
  const getSlabAllowedStages = (slab: any): string[] => {
    if (slab?.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0) {
      return slab.requiredStages;
    }
    return ['Production', 'Polishing', 'Packing', 'Dispatch'];
  };

  // Toggle a single piece + stage
  const toggleKey = (pieceId: string, stage: string) => {
    const key = pieceId + '__' + stage;
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle all allowed stages for a single piece
  const togglePieceAllStages = (piece: any, slab: any) => {
    const allowed = getSlabAllowedStages(slab);
    const pieceKeys = allowed.map(stg => piece.id + '__' + stg);
    const isAllPieceSelected = pieceKeys.every(k => selectedKeys.has(k));

    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllPieceSelected) {
        pieceKeys.forEach(k => next.delete(k));
      } else {
        pieceKeys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  // Toggle a specific stage for all pieces in a slab
  const toggleSlabStage = (slab: any, stage: string) => {
    const pieces = slab.pieces || [];
    const keys = pieces.map((p: any) => p.id + '__' + stage);
    const isAllSelected = keys.length > 0 && keys.every(k => selectedKeys.has(k));

    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        keys.forEach(k => next.delete(k));
      } else {
        keys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  // Toggle all allowed stages for all pieces in a slab
  const toggleSlabAll = (slab: any) => {
    const allowed = getSlabAllowedStages(slab);
    const pieces = slab.pieces || [];
    const slabKeys: string[] = [];
    pieces.forEach((p: any) => {
      allowed.forEach(stg => slabKeys.push(p.id + '__' + stg));
    });

    const isAllSlabSelected = slabKeys.length > 0 && slabKeys.every(k => selectedKeys.has(k));

    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllSlabSelected) {
        slabKeys.forEach(k => next.delete(k));
      } else {
        slabKeys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  // Global: Toggle all required stages across entire project
  const selectAllProjectRequired = () => {
    const allKeys: string[] = [];
    (projectSlabs || []).forEach((slab: any) => {
      const allowed = getSlabAllowedStages(slab);
      (slab.pieces || []).forEach((p: any) => {
        allowed.forEach(stg => allKeys.push(p.id + '__' + stg));
      });
    });

    const isAllSelected = allKeys.length > 0 && allKeys.every(k => selectedKeys.has(k));
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  // Global: Toggle a specific stage across all slabs where allowed
  const selectGlobalStage = (stage: string) => {
    const targetKeys: string[] = [];
    (projectSlabs || []).forEach((slab: any) => {
      const allowed = getSlabAllowedStages(slab);
      if (allowed.includes(stage)) {
        (slab.pieces || []).forEach((p: any) => {
          targetKeys.push(p.id + '__' + stage);
        });
      }
    });

    const isAllSelected = targetKeys.length > 0 && targetKeys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        targetKeys.forEach(k => next.delete(k));
      } else {
        targetKeys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  // Count unique pieces selected
  const uniquePieceCount = new Set(Array.from(selectedKeys).map(k => k.split('__')[0])).size;

  const handleBulkApprove = async () => {
    if (selectedKeys.size === 0) {
      setToast({ open: true, message: 'Please select at least one piece stage to approve', severity: 'error' });
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
        remarks: remarks || ('Manual Direct Approval for ' + approvals.length + ' stage items')
      }).unwrap();

      setToast({ open: true, message: ('Successfully approved ' + approvals.length + ' stage item(s) across ' + uniquePieceCount + ' piece(s)!'), severity: 'success' });
      setSelectedKeys(new Set());
      if (refetchSlabs) refetchSlabs();
      refetchApproved();
      refetchPending();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || err?.message || 'Manual approval failed', severity: 'error' });
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* PAGE HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1.25, bgcolor: '#ECFDF5', color: '#059669', borderRadius: 3, display: 'flex', border: '1px solid #A7F3D0' }}>
            <FlashOnRoundedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              Manual Approval
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600, mt: 0.25 }}>
              Granular & multi-stage direct approval of pieces matching Active Work Orders configuration.
            </Typography>
          </Box>
        </Box>

        {selectedProjectId && (
          <Button
            variant="contained"
            color="success"
            disabled={selectedKeys.size === 0 || isApproving}
            startIcon={isApproving ? <CircularProgress size={18} color="inherit" /> : <DoneAllIcon />}
            onClick={handleBulkApprove}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              px: 3.5,
              py: 1.25,
              bgcolor: '#059669',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            {isApproving ? 'Approving...' : ('Approve Selected (' + selectedKeys.size + ' Approvals / ' + uniquePieceCount + ' Pcs)')}
          </Button>
        )}
      </Box>

      {/* TOP CONTROLS & PROJECT SELECTOR */}
      <Paper elevation={0} sx={{ p: 3, mb: 3.5, bgcolor: '#FFFFFF', borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <Grid container spacing={2.5} alignItems="center">
          {/* Project Selector */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FolderSpecialIcon sx={{ fontSize: 16, color: '#059669' }} /> Select Active Work Order Project *
            </Typography>
            <Autocomplete
              options={projects || []}
              getOptionLabel={(p: any) => ((p.name || 'Unnamed') + ' ' + (p.projectId ? ('(' + p.projectId + ')') : '') + ' - ' + (p.clientName || 'Client'))}
              value={(projects || []).find((p: any) => p.id === selectedProjectId) || null}
              onChange={(_, newValue: any) => {
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

        {/* BATCH STAGE CONTROLS TOOLBAR (Only shown when project is selected) */}
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
                  ⚡ All Required Stages (All Slabs)
                </Button>

                {STAGES.map(stg => (
                  <Button
                    key={stg.name}
                    size="small"
                    variant="outlined"
                    startIcon={stg.icon}
                    onClick={() => selectGlobalStage(stg.name)}
                    sx={{ 
                      borderRadius: 2, 
                      textTransform: 'none', 
                      fontWeight: 700, 
                      borderColor: '#CBD5E1', 
                      color: stg.color,
                      fontSize: '0.78rem',
                      '&:hover': { bgcolor: stg.bg, borderColor: stg.color }
                    }}
                  >
                    + All {stg.label}
                  </Button>
                ))}

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

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip 
                  label={'Selected: ' + selectedKeys.size + ' Approvals (' + uniquePieceCount + ' Pieces)'} 
                  color={selectedKeys.size > 0 ? 'success' : 'default'}
                  sx={{ fontWeight: 800, borderRadius: 2 }}
                />

                <TextField
                  size="small"
                  placeholder="Optional approval remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 260 }, bgcolor: '#FAFAFA', borderRadius: 2 }}
                />
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
      ) : isProjectsLoading || isSlabsLoading ? (
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {projectSlabs.map((slab: any) => {
            const allowedStages = getSlabAllowedStages(slab);

            const slabPieces = (slab.pieces || []).filter((p: any) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                (p.productName && p.productName.toLowerCase().includes(query)) ||
                (p.pieceNumber && String(p.pieceNumber).includes(query)) ||
                (slab.name && slab.name.toLowerCase().includes(query))
              );
            });

            // Calculate slab selection state
            const allSlabKeys: string[] = [];
            (slab.pieces || []).forEach((p: any) => {
              allowedStages.forEach(stg => allSlabKeys.push(p.id + '__' + stg));
            });
            const isSlabAllSelected = allSlabKeys.length > 0 && allSlabKeys.every(k => selectedKeys.has(k));
            const isSlabPartiallySelected = allSlabKeys.some(k => selectedKeys.has(k)) && !isSlabAllSelected;

            return (
              <Paper 
                key={slab.id} 
                elevation={0} 
                sx={{ 
                  borderRadius: 4, 
                  border: '1px solid #E2E8F0', 
                  overflow: 'hidden',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
                }}
              >
                {/* SLAB HEADER */}
                <Box sx={{ p: 2, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid #E2E8F0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Checkbox
                      checked={isSlabAllSelected}
                      indeterminate={isSlabPartiallySelected}
                      onChange={() => toggleSlabAll(slab)}
                      sx={{ p: 0.5, color: '#059669', '&.Mui-checked': { color: '#059669' } }}
                    />
                    <LayersIcon sx={{ color: '#B38B36', fontSize: 24 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                        {slab.name || 'Unnamed Slab'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        Size: {slab.size || 'Standard'} • Active Stages: {allowedStages.join(' → ')}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Slab Stage Quick Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8', fontSize: '0.7rem' }}>
                      SLAB STAGES:
                    </Typography>
                    {allowedStages.map(stgName => {
                      const stgMeta = STAGES.find(s => s.name === stgName) || { name: stgName, label: stgName, color: '#475569', bg: '#F1F5F9', icon: null };
                      const slabStgKeys = (slab.pieces || []).map((p: any) => p.id + '__' + stgName);
                      const isStgAll = slabStgKeys.length > 0 && slabStgKeys.every(k => selectedKeys.has(k));

                      return (
                        <Chip
                          key={stgName}
                          size="small"
                          label={isStgAll ? ('✓ All ' + stgMeta.label) : ('+ ' + stgMeta.label)}
                          onClick={() => toggleSlabStage(slab, stgName)}
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            bgcolor: isStgAll ? stgMeta.color : '#FFFFFF',
                            color: isStgAll ? '#FFFFFF' : stgMeta.color,
                            border: '1px solid ' + stgMeta.color,
                            '&:hover': { bgcolor: stgMeta.color, color: '#FFFFFF' }
                          }}
                        />
                      );
                    })}

                    <Button
                      size="small"
                      onClick={() => toggleSlabAll(slab)}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', color: '#059669', ml: 1 }}
                    >
                      {isSlabAllSelected ? 'Deselect Slab' : 'Select All in Slab'}
                    </Button>
                  </Box>
                </Box>

                {/* TABLE OF PIECES WITH STAGE MATRIX */}
                {slabPieces.length === 0 ? (
                  <Box sx={{ p: 3.5, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                      No pieces matching filter under this slab.
                    </Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#FFFFFF' }}>
                      <TableRow>
                        <TableCell sx={{ width: 50, py: 1.25 }} align="center">All</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '22%' }}>Piece / Sub-Piece Name</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '8%' }}>Piece #</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '18%' }}>Dimensions / Size</TableCell>
                        
                        {/* STAGE MATRIX COLUMNS */}
                        {STAGES.map(stg => (
                          <TableCell key={stg.name} align="center" sx={{ fontWeight: 800, color: stg.color, fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              {stg.icon}
                              {stg.label}
                            </Box>
                          </TableCell>
                        ))}

                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.25, width: '10%' }} align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {slabPieces.map((piece: any, pIdx: number) => {
                        const pieceAllowedStages = allowedStages;
                        const pieceKeys = pieceAllowedStages.map(stg => piece.id + '__' + stg);
                        const isPieceAllSelected = pieceKeys.length > 0 && pieceKeys.every(k => selectedKeys.has(k));
                        const isPiecePartiallySelected = pieceKeys.some(k => selectedKeys.has(k)) && !isPieceAllSelected;

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
                              <Checkbox
                                size="small"
                                checked={isPieceAllSelected}
                                indeterminate={isPiecePartiallySelected}
                                onChange={() => togglePieceAllStages(piece, slab)}
                                sx={{ p: 0, color: '#059669', '&.Mui-checked': { color: '#059669' } }}
                              />
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

                            {/* STAGE COLUMNS (Production, Polishing, Packing, Dispatch) */}
                            {STAGES.map(stg => {
                              const isAllowed = allowedStages.includes(stg.name);
                              const key = piece.id + '__' + stg.name;
                              const isChecked = selectedKeys.has(key);
                              const isAlreadyCompleted = piece.status === 'completed' && piece.stage === stg.name;

                              if (!isAllowed) {
                                return (
                                  <TableCell key={stg.name} align="center" sx={{ py: 1 }}>
                                    <Typography variant="caption" sx={{ color: '#CBD5E1', fontWeight: 700, fontSize: '0.7rem' }}>
                                      — N/A —
                                    </Typography>
                                  </TableCell>
                                );
                              }

                              return (
                                <TableCell key={stg.name} align="center" sx={{ py: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
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
                                    {isAlreadyCompleted && (
                                      <Tooltip title="Already completed in this stage">
                                        <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#059669' }} />
                                      </Tooltip>
                                    )}
                                  </Box>
                                </TableCell>
                              );
                            })}

                            {/* Status */}
                            <TableCell align="center" sx={{ py: 1 }}>
                              <Chip 
                                size="small" 
                                label={piece.status === 'completed' ? (piece.stage || 'Done') : 'Pending'} 
                                color={piece.status === 'completed' ? 'success' : 'warning'}
                                variant={piece.status === 'completed' ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 800, fontSize: '0.68rem' }} 
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      {/* TOAST SNACKBAR */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManualApproval;
