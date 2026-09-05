import React, { useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { useDeductInventoryMutation, useUpdateInventoryLogMutation, useDeleteInventoryLogMutation, useGetAllSlabNamesQuery, useGetItemLogsQuery, useGetProjectHierarchyQuery } from '../store/apiSlice';

const ItemLedger = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const { data: itemLogsData, isLoading, refetch } = useGetItemLogsQuery(itemId || '', { skip: !itemId });

  // Safely extract logs & inventory whether backend returns { item, logs } or [ ...logs ]
  const logs: any[] = Array.isArray(itemLogsData) 
    ? itemLogsData 
    : (itemLogsData?.logs && Array.isArray(itemLogsData.logs) ? itemLogsData.logs : []);

  const inventory: any = (!Array.isArray(itemLogsData) && itemLogsData?.item)
    ? itemLogsData.item 
    : (logs.length > 0 && logs[0]?.inventory ? logs[0].inventory : null);

  const [openDeduct, setOpenDeduct] = useState(false);
  const [deductForm, setDeductForm] = useState({ length: '', width: '', thickness: '', date: new Date().toISOString().substring(0,10), productName: '' });
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  
  const { data: allSlabNames = [] } = useGetAllSlabNamesQuery();
  const uniqueSlabNames = React.useMemo(() => Array.from(new Set(allSlabNames || [])), [allSlabNames]);
  const { data: projectHierarchy = [] } = useGetProjectHierarchyQuery();
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedSlab, setSelectedSlab] = useState<any>(null);
  const [selectedPiece, setSelectedPiece] = useState<any>(null);

  const [deductInventory] = useDeductInventoryMutation();
  const [updateLog] = useUpdateInventoryLogMutation();
  const [deleteLog] = useDeleteInventoryLogMutation();

  const [deductError, setDeductError] = useState('');
  const [openWastage, setOpenWastage] = useState(false);
  const [isWastageLoading, setIsWastageLoading] = useState(false);

  const autoProject = React.useMemo(() => {
    if (!projectHierarchy || projectHierarchy.length === 0) return null;
    
    // Check if inventory has explicit project relation from backend
    const relProject = inventory?.projectMaterials?.[0]?.project || inventory?.slabs?.[0]?.project;
    if (relProject) {
      const match = projectHierarchy.find((p: any) => p.id === relProject.id || p.name === relProject.name);
      if (match) return match;
    }

    // Check supplier string against project name, clientName, or projectId
    const sup = (inventory?.supplier || '').toLowerCase().trim();
    if (sup) {
      const match = projectHierarchy.find((p: any) => 
        (p.name && p.name.toLowerCase().trim() === sup) ||
        (p.clientName && p.clientName.toLowerCase().trim() === sup) ||
        (p.projectId && p.projectId.toLowerCase().trim() === sup)
      );
      if (match) return match;
    }

    // Check if any slab matches inventory item name
    const itemNm = (inventory?.itemName || '').toLowerCase().trim();
    if (itemNm) {
      const match = projectHierarchy.find((p: any) => 
        p.slabs?.some((s: any) => s.name && s.name.toLowerCase().trim() === itemNm)
      );
      if (match) return match;
    }

    return null;
  }, [inventory, projectHierarchy]);

  const activeProject = selectedProject || autoProject;

  // Auto-select slab if matching or only 1 slab
  React.useEffect(() => {
    if (activeProject && !selectedSlab && (activeProject.slabs || []).length > 0) {
      const matchingSlab = activeProject.slabs.find((s: any) => s.name?.toLowerCase().trim() === (inventory?.itemName || '').toLowerCase().trim()) || (activeProject.slabs.length === 1 ? activeProject.slabs[0] : null);
      if (matchingSlab) {
        setSelectedSlab(matchingSlab);
      }
    }
  }, [activeProject, selectedSlab, inventory]);

  const handleDeductSubmit = async () => {
    try {
      setDeductError('');
      const usedArea = (Number(deductForm.length) || 0) * (Number(deductForm.width) || 0);
      
      if (usedArea <= 0) {
        setDeductError('Please enter valid length and width');
        return;
      }

      // Size check: Used size cannot be smaller than the required piece size ("kam se kabhi nahi banega")
      if (selectedPiece?.size) {
        const lMatch = selectedPiece.size.match(/(\d+(?:\.\d+)?)L/i);
        const wMatch = selectedPiece.size.match(/(\d+(?:\.\d+)?)W/i);
        const tMatch = selectedPiece.size.match(/(\d+(?:\.\d+)?)MM/i);
        const minL = lMatch ? parseFloat(lMatch[1]) : 0;
        const minW = wMatch ? parseFloat(wMatch[1]) : 0;
        const minT = tMatch ? parseFloat(tMatch[1]) : 0;

        if (minL > 0 && Number(deductForm.length) < minL) {
          const msg = `Used Length (${deductForm.length}) cannot be smaller than piece original length (${minL})! Larger or equal size is required.`;
          setDeductError(msg);
          alert(msg);
          return;
        }
        if (minW > 0 && Number(deductForm.width) < minW) {
          const msg = `Used Width (${deductForm.width}) cannot be smaller than piece original width (${minW})! Larger or equal size is required.`;
          setDeductError(msg);
          alert(msg);
          return;
        }
        if (minT > 0 && deductForm.thickness && Number(deductForm.thickness) < minT) {
          const msg = `Used Thickness (${deductForm.thickness}MM) cannot be smaller than piece original thickness (${minT}MM)! Larger or equal size is required.`;
          setDeductError(msg);
          alert(msg);
          return;
        }
      }

      if (usedArea > (inventory?.quantity || 0)) {
        setDeductError(`Not enough stock available! Remaining stock is only ${(inventory?.quantity || 0).toFixed(2)} ${inventory?.unit || 'sq_ft'}`);
        return;
      }

      await deductInventory({
        inventoryId: itemId as string,
        usedQuantity: usedArea,
        wasteQuantity: 0,
        projectName: activeProject ? activeProject.name : deductForm.productName,
        projectId: activeProject?.id,
        slabId: selectedSlab?.id,
        pieceId: selectedPiece?.id,
        pieceName: selectedPiece?.productName || selectedPiece?.name || selectedSlab?.name || '',
        length: deductForm.length,
        width: deductForm.width,
        thickness: deductForm.thickness,
        date: deductForm.date
      }).unwrap();
      setOpenDeduct(false);
      setSelectedProject(null);
      setSelectedSlab(null);
      setSelectedPiece(null);
      setDeductForm({ length: '', width: '', thickness: '', date: new Date().toISOString().substring(0,10), productName: '' });
      refetch();
    } catch (error: any) {
      console.error(error);
      setDeductError(error?.data?.message || 'Failed to deduct stock');
    }
  };

  const handleWastageSubmit = async () => {
    try {
      setIsWastageLoading(true);
      const remainingStock = Number(inventory?.quantity) || 0;
      if (remainingStock <= 0) {
        setOpenWastage(false);
        setIsWastageLoading(false);
        return;
      }
      await deductInventory({
        inventoryId: itemId as string,
        usedQuantity: 0,
        wasteQuantity: remainingStock,
        projectName: 'Waste',
        date: new Date().toISOString().substring(0, 10)
      }).unwrap();
      setOpenWastage(false);
      refetch();
    } catch (error: any) {
      console.error('Failed to record wastage:', error);
    } finally {
      setIsWastageLoading(false);
    }
  };

  const handleEditClick = (log: any) => {
    let l = '', w = '';
    const match = log.remarks?.match(/(.*?)\s*\((.*?)L x (.*?)W\)/);
    if (match) {
      l = match[2];
      w = match[3];
    }
    setEditForm({ 
      id: log.id, 
      productName: match ? match[1].trim() : (log.remarks || '').replace('Project: ', ''),
      length: l, 
      width: w,
      date: new Date(log.createdAt).toISOString().substring(0,10) 
    });
    setOpenEdit(true);
  };

  const handleEditSubmit = async () => {
    try {
      const usedArea = (Number(editForm.length) || 0) * (Number(editForm.width) || 0);
      let remarks = editForm.productName;
      if (editForm.length && editForm.width) {
        remarks = `${editForm.productName} (${editForm.length}L x ${editForm.width}W | ${usedArea.toFixed(2)} ${inventory?.unit || 'sq_ft'})`;
      }
      
      await updateLog({
        id: editForm.id,
        data: {
          quantity: usedArea,
          remarks,
          date: editForm.date
        }
      }).unwrap();
      
      setOpenEdit(false);
      refetch();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this log? The quantity will be added back to the inventory.')) {
      try {
        await deleteLog(id).unwrap();
        refetch();
      } catch (error) {
        console.error(error);
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading ledger...</Typography>
      </Box>
    );
  }

  // Compute Balance dynamically in chronological order
  const sortedLogsAsc = Array.isArray(logs)
    ? [...logs].sort((a, b) => {
        const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        if (a.type === 'IN' && b.type !== 'IN') return -1;
        if (b.type === 'IN' && a.type !== 'IN') return 1;
        return 0;
      })
    : [];

  let runningBal = 0;
  const computedWithBalance = sortedLogsAsc.map(log => {
    const prev = runningBal;
    if (log.type === 'IN') {
      runningBal += Number(log.quantity);
    } else {
      runningBal -= Number(log.quantity);
    }
    return {
      ...log,
      previousBalance: prev,
      balance: runningBal
    };
  });

  // Display newest logs on top
  const ledgerRows = [...computedWithBalance].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.type === 'OUT' && b.type !== 'OUT') return -1;
    if (b.type === 'OUT' && a.type !== 'OUT') return 1;
    return 0;
  });

  // Calculations for Grand Total & Percentages
  const totalIn = Array.isArray(logs) 
    ? logs.filter((l: any) => l.type === 'IN').reduce((sum: number, l: any) => sum + Number(l.quantity), 0)
    : 0;

  const totalUsed = Array.isArray(logs)
    ? logs.filter((l: any) => l.type === 'OUT' && l.remarks !== 'Waste' && !l.remarks?.toLowerCase().includes('waste')).reduce((sum: number, l: any) => sum + Number(l.quantity), 0)
    : 0;

  const totalWaste = Array.isArray(logs)
    ? logs.filter((l: any) => l.type === 'OUT' && (l.remarks === 'Waste' || l.remarks?.toLowerCase().includes('waste'))).reduce((sum: number, l: any) => sum + Number(l.quantity), 0)
    : 0;

  const remBalance = inventory?.quantity ?? (totalIn - totalUsed - totalWaste);

  const usedPct = totalIn > 0 ? ((totalUsed / totalIn) * 100).toFixed(1) : '0.0';
  const wastePct = totalIn > 0 ? ((totalWaste / totalIn) * 100).toFixed(1) : '0.0';
  const balancePct = totalIn > 0 ? ((remBalance / totalIn) * 100).toFixed(1) : '0.0';

  return (
    <Box sx={{ p: 4, maxWidth: 1200, margin: '0 auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2, color: '#b8860b' }}>
        Back to Ledger
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>{inventory?.itemName} (Block {inventory?.blockNumber})</Typography>
          <Typography variant="subtitle1" color="text.secondary">Item Ledger Details</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            sx={{ fontWeight: 'bold', bgcolor: '#ed6c02', '&:hover': { bgcolor: '#e65100' } }}
            onClick={() => setOpenWastage(true)}
            disabled={(inventory?.quantity || 0) <= 0}
          >
            Wastage
          </Button>
          <Button variant="contained" color="error" onClick={() => setOpenDeduct(true)} sx={{ fontWeight: 'bold' }}>
            - Deduct Stock
          </Button>
        </Box>
      </Box>

      {/* Item Ledger Details / Grand Total Cards (3 Cards) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #2e7d32' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">Available / IN (+) First</Typography>
          <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ my: 0.5 }}>
            {totalIn.toFixed(2)} {inventory?.unit || 'sq_ft'}
          </Typography>
          <Typography variant="caption" color="text.secondary">100% (Base)</Typography>
        </Paper>

        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">Total Used (Production)</Typography>
          <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ my: 0.5 }}>
            {totalUsed.toFixed(2)} {inventory?.unit || 'sq_ft'}
          </Typography>
          <Typography variant="caption" fontWeight="bold" color="primary.main">{usedPct}%</Typography>
        </Paper>

        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #ed6c02' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">Total Wastage</Typography>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#ed6c02', my: 0.5 }}>
            {wastePct}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalWaste.toFixed(2)} {inventory?.unit || 'sq_ft'}
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Project / Remarks</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'green' }}>Available / IN (+)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>OUT (-)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Balance</TableCell>
              <TableCell sx={{ fontWeight: 'bold', align: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ledgerRows.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No logs found.</TableCell></TableRow>
            ) : (
              ledgerRows.map((log: any) => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{log.remarks || '-'}</TableCell>
                  <TableCell sx={{ color: 'green', fontWeight: log.type === 'IN' ? 'bold' : 'normal' }}>
                    {log.type === 'IN' ? `+ ${log.quantity.toFixed(2)} ${inventory?.unit || ''}` : `${log.previousBalance.toFixed(2)} ${inventory?.unit || ''}`}
                  </TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: log.type === 'OUT' ? 'bold' : 'normal' }}>
                    {log.type === 'OUT' ? `- ${log.quantity.toFixed(2)} ${inventory?.unit || ''}` : '-'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {log.balance.toFixed(2)} {inventory?.unit || ''}
                  </TableCell>
                  <TableCell align="center">
                    {log.remarks === 'Initial stock addition' ? (
                      <Typography variant="caption" color="text.secondary">Initial</Typography>
                    ) : (
                      <>
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(log)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(log.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Grand Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555' }}>
                Used: {usedPct}% | Waste: {wastePct}%
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'green' }}>
                + {totalIn.toFixed(2)} {inventory?.unit || ''}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                - {(totalUsed + totalWaste).toFixed(2)} {inventory?.unit || ''}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {remBalance.toFixed(2)} {inventory?.unit || ''}
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption" fontWeight="bold" sx={{ color: '#ed6c02' }}>
                  Waste: {wastePct}%
                </Typography>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      {/* Confirm Wastage Dialog */}
      <Dialog open={openWastage} onClose={() => setOpenWastage(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', color: '#e65100' }}>
          Confirm Wastage
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to mark the remaining stock as <strong>Wastage</strong>?
          </Typography>
          <Box sx={{ bgcolor: '#fafafa', p: 2, borderRadius: 2, border: '1px solid #eee' }}>
            <Typography variant="body2" color="text.secondary">
              Available to mark as Waste: <strong>{(inventory?.quantity || 0).toFixed(2)} {inventory?.unit || 'sq_ft'}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Initial Available / IN (+) First: <strong>{totalIn.toFixed(2)} {inventory?.unit || 'sq_ft'}</strong>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setOpenWastage(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            sx={{ bgcolor: '#ed6c02', '&:hover': { bgcolor: '#e65100' }, fontWeight: 'bold', px: 4 }}
            onClick={handleWastageSubmit}
            disabled={isWastageLoading}
          >
            {isWastageLoading ? 'Processing...' : 'OK'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deduct Stock Dialog */}
      <Dialog open={openDeduct} onClose={() => setOpenDeduct(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f8f9fa' }}>Deduct Stock for Block {inventory?.blockNumber}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>Available Balance: {inventory?.quantity?.toFixed(2)} {inventory?.unit}</Alert>
          {deductError && <Alert severity="error" sx={{ mb: 2 }}>{deductError}</Alert>}
          {Number(deductForm.length) > 0 && Number(deductForm.width) > 0 && (Number(deductForm.length) * Number(deductForm.width)) > (inventory?.quantity || 0) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Entered area ({((Number(deductForm.length) * Number(deductForm.width))).toFixed(2)} {inventory?.unit}) exceeds available balance ({(inventory?.quantity || 0).toFixed(2)} {inventory?.unit})!
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={deductForm.date}
              onChange={(e) => setDeductForm({ ...deductForm, date: e.target.value })}
            />

            {/* Project Indicator (Auto-detected from current ledger) */}
            {activeProject ? (
              <Box sx={{ p: 1.5, px: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="#166534" fontWeight="bold">
                  Project: <span style={{ fontSize: '1rem', color: '#15803D' }}>{activeProject.name}</span>
                </Typography>
                <Typography variant="caption" sx={{ bgcolor: '#DCFCE7', px: 1, py: 0.5, borderRadius: 1, color: '#166534', fontWeight: 'bold' }}>
                  {(activeProject.slabs || []).length} Slabs Available
                </Typography>
              </Box>
            ) : (
              <Autocomplete
                options={projectHierarchy}
                getOptionLabel={(option: any) => typeof option === 'string' ? option : option.name}
                value={selectedProject}
                onChange={(_, val: any) => {
                  setSelectedProject(val);
                  setSelectedSlab(null);
                  setSelectedPiece(null);
                  setDeductForm(prev => ({ ...prev, productName: val?.name || '' }));
                }}
                renderInput={(params) => <TextField {...params} label="Select Project" placeholder="Choose project..." />}
              />
            )}

            {/* 1. Select Slab / Stone (Pattar) */}
            {activeProject && (
              <Autocomplete
                options={activeProject.slabs || []}
                getOptionLabel={(option: any) => {
                  const pendingCount = (option.pieces || []).filter((p: any) => !p.sourceMaterialId).length;
                  return `${option.name} ${option.size ? `(${option.size})` : ''} - ${pendingCount > 0 ? `${pendingCount} Pieces Pending` : 'All Pieces Completed'}`;
                }}
                value={selectedSlab}
                onChange={(_, val: any) => {
                  setSelectedSlab(val);
                  setSelectedPiece(null);
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select Slab / Stone (Pattar)" 
                    placeholder="Choose slab / stone..." 
                    helperText={`Total Slabs for Project: ${(activeProject.slabs || []).length}`}
                  />
                )}
              />
            )}

            {/* 2. Select Piece (Pic) */}
            {selectedSlab && (() => {
              const uncompletedPieces = (selectedSlab.pieces || []).filter((p: any) => !p.sourceMaterialId);
              return (
                <Autocomplete
                  options={uncompletedPieces}
                  noOptionsText="All pieces in this slab are already completed/allocated!"
                  getOptionLabel={(option: any) => `${option.productName || `Piece ${option.pieceNumber}`} ${option.size ? `(${option.size})` : ''}`}
                  value={selectedPiece}
                  onChange={(_, val: any) => {
                    setSelectedPiece(val);
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Select Piece (Pic)" 
                      placeholder="Choose specific piece..." 
                      helperText={uncompletedPieces.length > 0 ? `Pending Pieces: ${uncompletedPieces.length} of ${(selectedSlab.pieces || []).length}` : 'All pieces already deducted!'}
                    />
                  )}
                />
              );
            })()}

            {/* Display Original Size Banner */}
            {(selectedPiece?.size || selectedSlab?.size) && (
              <Paper sx={{ p: 2, bgcolor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 2 }}>
                <Typography variant="caption" fontWeight="bold" color="#B78103" display="block">
                  ORIGINAL SIZE IN PRODUCTION:
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="#795548">
                  {selectedPiece?.size ? `${selectedPiece.productName || 'Piece'}: ${selectedPiece.size}` : `${selectedSlab.name}: ${selectedSlab.size}`}
                </Typography>
              </Paper>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Used Length (L)" 
                type="number" 
                fullWidth 
                value={deductForm.length} 
                onChange={(e) => setDeductForm({ ...deductForm, length: e.target.value })} 
              />
              <TextField 
                label="Used Width (W)" 
                type="number" 
                fullWidth 
                value={deductForm.width} 
                onChange={(e) => setDeductForm({ ...deductForm, width: e.target.value })} 
              />
              <TextField 
                label="Used Thickness (MM)" 
                type="number" 
                fullWidth 
                value={deductForm.thickness} 
                onChange={(e) => setDeductForm({ ...deductForm, thickness: e.target.value })} 
              />
            </Box>

            {(Number(deductForm.length) > 0 && Number(deductForm.width) > 0) && (
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                Total Used: {(Number(deductForm.length) * Number(deductForm.width)).toFixed(2)} {inventory?.unit || 'sq_ft'}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => {
            setOpenDeduct(false);
            setSelectedProject(null);
            setSelectedSlab(null);
            setSelectedPiece(null);
          }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeductSubmit} 
            disabled={!(Number(deductForm.length) > 0 && Number(deductForm.width) > 0) || ((Number(deductForm.length) * Number(deductForm.width)) > (inventory?.quantity || 0))}
          >
            Confirm Deduction
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Log Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f8f9fa' }}>Edit Deducted Stock</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={editForm?.date || ''}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
            <Autocomplete
              options={uniqueSlabNames}
              value={editForm?.productName || ''}
              onInputChange={(_, newInputValue) => {
                setEditForm({ ...editForm, productName: newInputValue });
              }}
              freeSolo
              renderInput={(params) => <TextField {...params} label="Project / Product Name" />}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Length (L)" type="number" fullWidth value={editForm?.length || ''} onChange={(e) => setEditForm({ ...editForm, length: e.target.value })} />
              <TextField label="Width (W)" type="number" fullWidth value={editForm?.width || ''} onChange={(e) => setEditForm({ ...editForm, width: e.target.value })} />
            </Box>
            {(Number(editForm?.length) > 0 && Number(editForm?.width) > 0) && (
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                New Total Used: {(Number(editForm?.length) * Number(editForm?.width)).toFixed(2)} sq_ft
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleEditSubmit}>
            Update Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ItemLedger;
