import React, { useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDeductInventoryMutation, useUpdateInventoryLogMutation, useDeleteInventoryLogMutation, useGetAllSlabNamesQuery } from '../store/apiSlice';
import { useEffect } from 'react';

const ItemLedger = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [openDeduct, setOpenDeduct] = useState(false);
  const [deductForm, setDeductForm] = useState({ length: '', width: '', date: new Date().toISOString().substring(0,10), productName: '' });
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  
  const { data: allSlabNames = [] } = useGetAllSlabNamesQuery();
  const [deductInventory] = useDeductInventoryMutation();
  const [updateLog] = useUpdateInventoryLogMutation();
  const [deleteLog] = useDeleteInventoryLogMutation();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/inventory/item-logs/${itemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
      if (data.length > 0 && data[0].inventory) {
        setInventory(data[0].inventory);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [itemId]);

  const handleDeductSubmit = async () => {
    try {
      const usedArea = (Number(deductForm.length) || 0) * (Number(deductForm.width) || 0);
      
      await deductInventory({
        inventoryId: itemId as string,
        usedQuantity: usedArea,
        wasteQuantity: 0,
        projectName: `${deductForm.productName} (${deductForm.length}L x ${deductForm.width}W)`,
        date: deductForm.date
      }).unwrap();
      setOpenDeduct(false);
      setDeductForm({ length: '', width: '', date: new Date().toISOString().substring(0,10), productName: '' });
      fetchLogs();
    } catch (error) {
      console.error(error);
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
        remarks = `${editForm.productName} (${editForm.length}L x ${editForm.width}W)`;
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
      fetchLogs();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this log? The quantity will be added back to the inventory.')) {
      try {
        await deleteLog(id).unwrap();
        fetchLogs();
      } catch (error) {
        console.error(error);
      }
    }
  };

  if (isLoading) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;

  // Compute Balance dynamically
  let runningBalance = 0;
  const ledgerRows = logs.map(log => {
    if (log.type === 'IN') {
      runningBalance += Number(log.quantity);
    } else {
      runningBalance -= Number(log.quantity);
    }
    return {
      ...log,
      balance: runningBalance
    };
  });

  return (
    <Box sx={{ p: 4, maxWidth: 1200, margin: '0 auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2, color: '#b8860b' }}>
        Back to Ledger
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>{inventory?.itemName} (Block {inventory?.blockNumber})</Typography>
          <Typography variant="subtitle1" color="text.secondary">Item Ledger Details</Typography>
        </Box>
        <Button variant="contained" color="error" onClick={() => setOpenDeduct(true)} sx={{ fontWeight: 'bold' }}>
          - Deduct Stock
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Project / Remarks</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'green' }}>IN (+)</TableCell>
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
                    {log.type === 'IN' ? `+ ${log.quantity.toFixed(2)} ${inventory?.unit || ''}` : '-'}
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
        </Table>
      </TableContainer>

      {/* Deduct Stock Dialog */}
      <Dialog open={openDeduct} onClose={() => setOpenDeduct(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f8f9fa' }}>Deduct Stock for Block {inventory?.blockNumber}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>Available Balance: {inventory?.quantity?.toFixed(2)} {inventory?.unit}</Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={deductForm.date}
              onChange={(e) => setDeductForm({ ...deductForm, date: e.target.value })}
            />
            <Autocomplete
              options={allSlabNames}
              value={deductForm.productName}
              onInputChange={(_, newInputValue) => {
                setDeductForm({ ...deductForm, productName: newInputValue });
              }}
              freeSolo
              renderInput={(params) => <TextField {...params} label="Project / Product Name" />}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Length (L)" type="number" fullWidth value={deductForm.length} onChange={(e) => setDeductForm({ ...deductForm, length: e.target.value })} />
              <TextField label="Width (W)" type="number" fullWidth value={deductForm.width} onChange={(e) => setDeductForm({ ...deductForm, width: e.target.value })} />
            </Box>
            {(Number(deductForm.length) > 0 && Number(deductForm.width) > 0) && (
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                Total Used: {(Number(deductForm.length) * Number(deductForm.width)).toFixed(2)} sq_ft
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenDeduct(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeductSubmit} disabled={!(Number(deductForm.length) > 0 && Number(deductForm.width) > 0)}>
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
              InputLabelProps={{ shrink: true }}
              value={editForm?.date || ''}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
            <Autocomplete
              options={allSlabNames}
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
