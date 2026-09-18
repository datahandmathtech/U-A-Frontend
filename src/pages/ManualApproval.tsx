import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Chip,
  IconButton,
  TextField,
  Paper,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Stack,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  PrecisionManufacturing as PrecisionManufacturingIcon,
  AutoAwesome as AutoAwesomeIcon,
  Inventory2 as Inventory2Icon,
  LocalShipping as LocalShippingIcon,
  Layers as LayersIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon
} from '@mui/icons-material';
import {
  useGetProjectsQuery,
  useGetSlabsQuery,
  useManualApprovePiecesMutation
} from '../store/apiSlice';


const ALL_STAGES = [
  { name: 'Production', label: 'Production', icon: <PrecisionManufacturingIcon sx={{ fontSize: 16 }} />, color: '#059669', bg: '#ECFDF5' },
  { name: 'Polishing', label: 'Polishing', icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, color: '#D97706', bg: '#FFFBEB' },
  { name: 'Packing', label: 'Packing', icon: <Inventory2Icon sx={{ fontSize: 16 }} />, color: '#4F46E5', bg: '#EEF2FF' },
  { name: 'Dispatch', label: 'Dispatch', icon: <LocalShippingIcon sx={{ fontSize: 16 }} />, color: '#2563EB', bg: '#EFF6FF' }
];

interface SlabCardProps {
  slab: any;
  searchTerm: string;
  selectedSet: Set<string>;
  onToggleKey: (key: string) => void;
  onTogglePiece: (piece: any, requiredStages: string[]) => void;
  onToggleSlabStage: (slab: any, stage: string) => void;
  onToggleSlabAll: (slab: any, requiredStages: string[]) => void;
}

const SlabCard: React.FC<SlabCardProps> = React.memo(({
  slab,
  searchTerm,
  selectedSet,
  onToggleKey,
  onTogglePiece,
  onToggleSlabStage,
  onToggleSlabAll
}) => {
  const reqStages: string[] = useMemo(() => {
    if (slab.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0) {
      return slab.requiredStages;
    }
    return ['Production', 'Polishing', 'Packing', 'Dispatch'];
  }, [slab.requiredStages]);

  const pieces = slab.pieces || [];

  const filteredPieces = useMemo(() => {
    if (!searchTerm.trim()) return pieces;
    const s = searchTerm.toLowerCase();
    return pieces.filter((p: any) =>
      (p.productName && p.productName.toLowerCase().includes(s)) ||
      (p.pieceNumber && String(p.pieceNumber).toLowerCase().includes(s)) ||
      (p.status && p.status.toLowerCase().includes(s))
    );
  }, [pieces, searchTerm]);

  const { totalSelectableInSlab, totalSelectedInSlab } = useMemo(() => {
    let selectable = 0;
    let selected = 0;
    for (const p of filteredPieces) {
      for (const stg of reqStages) {
        selectable++;
        if (selectedSet.has(p.id + '::' + stg)) {
          selected++;
        }
      }
    }
    return { totalSelectableInSlab: selectable, totalSelectedInSlab: selected };
  }, [filteredPieces, reqStages, selectedSet]);

  const isSlabAllSelected = totalSelectableInSlab > 0 && totalSelectedInSlab === totalSelectableInSlab;
  const isSlabIndeterminate = totalSelectedInSlab > 0 && totalSelectedInSlab < totalSelectableInSlab;

  if (filteredPieces.length === 0 && searchTerm.trim()) {
    return null;
  }

  return (
    <Card
      elevation={2}
      sx={{
        mb: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: totalSelectedInSlab > 0 ? 'primary.light' : 'divider',
        overflow: 'hidden',
        transition: 'border-color 0.2s'
      }}
    >
      <Box
        sx={{
          p: 2,
          bgcolor: totalSelectedInSlab > 0 ? 'rgba(37, 99, 235, 0.04)' : '#f8fafc',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Checkbox
            size="small"
            checked={isSlabAllSelected}
            indeterminate={isSlabIndeterminate}
            onChange={() => onToggleSlabAll(slab, reqStages)}
            sx={{ p: 0.5 }}
          />
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                {slab.name || ('Slab ' + (slab.slabNumber || ''))}
              </Typography>
              {slab.stoneName && (
                <Chip label={slab.stoneName} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {filteredPieces.length} Pieces &bull; {reqStages.length} Required Stages ({reqStages.join(', ')})
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {reqStages.map((stg) => {
            let stgSelected = 0;
            for (const p of filteredPieces) {
              if (selectedSet.has(p.id + '::' + stg)) stgSelected++;
            }
            const allStgSelected = filteredPieces.length > 0 && stgSelected === filteredPieces.length;
            const someStgSelected = stgSelected > 0 && stgSelected < filteredPieces.length;

            return (
              <Button
                key={stg}
                size="small"
                variant={allStgSelected ? 'contained' : someStgSelected ? 'outlined' : 'text'}
                color="primary"
                onClick={() => onToggleSlabStage(slab, stg)}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.3,
                  px: 1,
                  borderRadius: 2
                }}
              >
                {stg} ({stgSelected}/{filteredPieces.length})
              </Button>
            );
          })}
        </Stack>
      </Box>

      <TableContainer sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.8rem', py: 1 } }}>
              <TableCell sx={{ width: 60 }}>Select</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Piece / Sub-Piece</TableCell>
              <TableCell sx={{ width: 100 }}>Dimensions</TableCell>
              <TableCell sx={{ width: 90 }}>Current Status</TableCell>
              {ALL_STAGES.map((stg) => (
                <TableCell key={stg.name} align="center" sx={{ width: 110 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    {stg.icon}
                    <span>{stg.label}</span>
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPieces.map((piece: any, idx: number) => {
              let pieceSelectedCount = 0;
              for (const s of reqStages) {
                if (selectedSet.has(piece.id + '::' + s)) pieceSelectedCount++;
              }
              const isPieceAllSelected = reqStages.length > 0 && pieceSelectedCount === reqStages.length;
              const isPieceIndeterminate = pieceSelectedCount > 0 && pieceSelectedCount < reqStages.length;

              return (
                <TableRow
                  key={piece.id || idx}
                  hover
                  sx={{
                    bgcolor: pieceSelectedCount > 0 ? 'rgba(37, 99, 235, 0.02)' : 'inherit',
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  <TableCell>
                    <Checkbox
                      size="small"
                      checked={isPieceAllSelected}
                      indeterminate={isPieceIndeterminate}
                      onChange={() => onTogglePiece(piece, reqStages)}
                      sx={{ p: 0.5 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {piece.productName || ('Piece #' + (piece.pieceNumber || idx + 1))}
                    </Typography>
                    {piece.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {piece.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {piece.length || piece.width ? (piece.length || 0) + ' × ' + (piece.width || 0) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={piece.status || 'pending'}
                      size="small"
                      color={
                        piece.status === 'completed'
                          ? 'success'
                          : piece.status === 'in_progress'
                          ? 'info'
                          : 'default'
                      }
                      sx={{ textTransform: 'capitalize', fontSize: '0.7rem', height: 20 }}
                    />
                  </TableCell>
                  {ALL_STAGES.map((stg) => {
                    const isRequired = reqStages.includes(stg.name);
                    const key = piece.id + '::' + stg.name;
                    const isChecked = selectedSet.has(key);

                    if (!isRequired) {
                      return (
                        <TableCell key={stg.name} align="center">
                          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            — N/A —
                          </Typography>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={stg.name} align="center" sx={{ py: 0.5 }}>
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          onChange={() => onToggleKey(key)}
                          sx={{
                            p: 0.5,
                            color: isChecked ? stg.color : undefined,
                            '&.Mui-checked': {
                              color: stg.color
                            }
                          }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
});

export const ManualApproval: React.FC = () => {
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [approvalRemarks, setApprovalRemarks] = useState<string>('Manual Direct Approval by Admin');
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());

  const { data: projects = [], isLoading: isLoadingProjects } = useGetProjectsQuery();

  const {
    data: slabs = [],
    isLoading: isLoadingSlabs,
    refetch: refetchSlabs
  } = useGetSlabsQuery(selectedProjectId, {
    skip: !selectedProjectId
  });

  const [manualApprovePieces, { isLoading: isApproving }] = useManualApprovePiecesMutation();

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSet(new Set());
    setSearchTerm('');
  };

  const handleToggleKey = useCallback((key: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleTogglePiece = useCallback((piece: any, requiredStages: string[]) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const pieceKeys = requiredStages.map((s) => piece.id + '::' + s);
      const allSelected = pieceKeys.every((k) => next.has(k));

      if (allSelected) {
        pieceKeys.forEach((k) => next.delete(k));
      } else {
        pieceKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  }, []);

  const handleToggleSlabStage = useCallback((slab: any, stage: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const pieces = slab.pieces || [];
      const keys = pieces.map((p: any) => p.id + '::' + stage);
      const allSelected = keys.every((k: string) => next.has(k));

      if (allSelected) {
        keys.forEach((k: string) => next.delete(k));
      } else {
        keys.forEach((k: string) => next.add(k));
      }
      return next;
    });
  }, []);

  const handleToggleSlabAll = useCallback((slab: any, requiredStages: string[]) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const pieces = slab.pieces || [];
      const keys: string[] = [];
      for (const p of pieces) {
        for (const s of requiredStages) {
          keys.push(p.id + '::' + s);
        }
      }
      const allSelected = keys.every((k) => next.has(k));

      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  }, []);

  const handleToggleGlobalStage = (stage: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const keys: string[] = [];
      for (const slab of slabs) {
        const reqStages: string[] =
          slab.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0
            ? slab.requiredStages
            : ['Production', 'Polishing', 'Packing', 'Dispatch'];

        if (reqStages.includes(stage)) {
          for (const p of slab.pieces || []) {
            keys.push(p.id + '::' + stage);
          }
        }
      }
      const allSelected = keys.length > 0 && keys.every((k) => next.has(k));
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const next = new Set<string>();
    for (const slab of slabs) {
      const reqStages: string[] =
        slab.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0
          ? slab.requiredStages
          : ['Production', 'Polishing', 'Packing', 'Dispatch'];

      for (const p of slab.pieces || []) {
        for (const s of reqStages) {
          next.add(p.id + '::' + s);
        }
      }
    }
    setSelectedSet(next);
  };

  const handleDeselectAll = () => {
    setSelectedSet(new Set());
  };

  const handleDirectApprove = async () => {
    if (selectedSet.size === 0) {
      setToast({ open: true, message: 'Please select at least one piece stage to approve', severity: 'warning' });
      return;
    }

    try {
      const approvals = Array.from(selectedSet).map((key) => {
        const [pieceId, stage] = key.split('::');
        return { pieceId, stage };
      });

      const res = await manualApprovePieces({
        projectId: selectedProjectId,
        approvals,
        remarks: approvalRemarks || 'Manual Direct Approval by Admin'
      }).unwrap();

      setToast({ open: true, message: res.message || ('Successfully approved ' + approvals.length + ' item(s)!'), severity: 'success' });
      setSelectedSet(new Set());
      refetchSlabs();
    } catch (err: any) {
      console.error('Direct approval failed:', err);
      setToast({ open: true, message: err?.data?.message || 'Failed to approve pieces manually', severity: 'error' });
    }
  };

  const selectedCount = selectedSet.size;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, margin: '0 auto' }}>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <AssignmentTurnedInIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Manual Production Approval
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Directly approve production, polishing, packing, and dispatch stages for pieces in Active Work Orders.
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <FormControl sx={{ minWidth: 320, width: { xs: '100%', md: 'auto' } }} size="small">
            <InputLabel id="select-project-label">Select Project / Work Order</InputLabel>
            <Select
              labelId="select-project-label"
              value={selectedProjectId}
              label="Select Project / Work Order"
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={isLoadingProjects}
            >
              <MenuItem value="">
                <em>— None (Select a Project) —</em>
              </MenuItem>
              {projects.map((proj: any) => (
                <MenuItem key={proj.id} value={proj.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {proj.name}
                    </Typography>
                    {proj.clientName && (
                      <Typography variant="caption" color="text.secondary">
                        ({proj.clientName})
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedProjectId && (
            <TextField
              size="small"
              placeholder="Search slab, piece name or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: { xs: '100%', md: 320 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          )}
        </Stack>
      </Paper>

      {!selectedProjectId ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 4,
            border: '2px dashed #cbd5e1',
            bgcolor: '#f8fafc'
          }}
        >
          <LayersIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
            No Project Selected
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 500, margin: '0 auto' }}>
            Please select a project from the dropdown above to view its slabs, sub-pieces, and perform direct manual stage approvals.
          </Typography>
        </Paper>
      ) : isLoadingSlabs ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={48} thickness={4} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading slabs and pieces...
          </Typography>
        </Box>
      ) : slabs.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          No slabs or pieces found for this project. Please configure slabs in the project details page.
        </Alert>
      ) : (
        <Box>
          <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: '#ffffff' }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<DeselectIcon />}
                  onClick={handleDeselectAll}
                  disabled={selectedCount === 0}
                  sx={{ textTransform: 'none' }}
                >
                  Deselect All
                </Button>

                <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />

                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mr: 0.5 }}>
                  Batch Stage Select:
                </Typography>

                {ALL_STAGES.map((stg) => (
                  <Chip
                    key={stg.name}
                    icon={stg.icon}
                    label={'All ' + stg.label}
                    onClick={() => handleToggleGlobalStage(stg.name)}
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: stg.color,
                      color: stg.color,
                      fontWeight: 600,
                      '&:hover': { bgcolor: stg.bg }
                    }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', lg: 'auto' } }}>
                <TextField
                  size="small"
                  label="Approval Remarks"
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  sx={{ minWidth: 240 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  disabled={selectedCount === 0 || isApproving}
                  onClick={handleDirectApprove}
                  startIcon={
                    isApproving ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />
                  }
                  sx={{
                    px: 3,
                    py: 1,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: 3
                  }}
                >
                  {isApproving ? 'Approving...' : ('Direct Approve (' + selectedCount + ')')}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {slabs.map((slab: any) => (
            <SlabCard
              key={slab.id}
              slab={slab}
              searchTerm={searchTerm}
              selectedSet={selectedSet}
              onToggleKey={handleToggleKey}
              onTogglePiece={handleTogglePiece}
              onToggleSlabStage={handleToggleSlabStage}
              onToggleSlabAll={handleToggleSlabAll}
            />
          ))}
        </Box>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setToast(prev => ({ ...prev, open: false }))} 
          severity={toast.severity} 
          sx={{ width: '100%', fontWeight: 700, borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManualApproval;
