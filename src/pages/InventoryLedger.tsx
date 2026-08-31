import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel,
  MenuItem, Select, InputLabel, FormControl, Autocomplete
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGetInventoryLogsQuery, useGetInventoryQuery, useDeductInventoryMutation, useGetAllSlabNamesQuery } from '../store/apiSlice';

const InventoryLedger = () => {
  const { supplier } = useParams();
  const navigate = useNavigate();
  const decodedSupplier = decodeURIComponent(supplier || '');

  const { data: logs, isLoading: isLoadingLogs, refetch } = useGetInventoryLogsQuery(decodedSupplier);
  const { data: inventoryItems } = useGetInventoryQuery();
  const [deductInventory] = useDeductInventoryMutation();
  const { data: slabNames } = useGetAllSlabNamesQuery();

  const [openDeduct, setOpenDeduct] = useState(false);
  const [deductForm, setDeductForm] = useState({ inventoryId: '', productName: '', length: '', width: '', date: new Date().toISOString().substring(0,10) });

  const supplierItems = inventoryItems?.filter((i: any) => i.supplier === decodedSupplier) || [];
  const sortedSupplierItems = [...supplierItems].sort((a: any, b: any) => {
    const numA = parseInt(a.blockNumber || '0') || 0;
    const numB = parseInt(b.blockNumber || '0') || 0;
    return numA - numB;
  });

  const handleDeductSubmit = async () => {
    try {
      const usedArea = (Number(deductForm.length) || 0) * (Number(deductForm.width) || 0);
      
      await deductInventory({
        inventoryId: deductForm.inventoryId,
        usedQuantity: usedArea,
        wasteQuantity: 0,
        projectName: `${deductForm.productName} (${deductForm.length}L x ${deductForm.width}W)`,
        date: deductForm.date
      }).unwrap();
      setOpenDeduct(false);
      setDeductForm({ inventoryId: '', productName: '', length: '', width: '', date: new Date().toISOString().substring(0,10) });
      refetch();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error?.data?.message || 'Could not deduct stock'}`);
    }
  };

  const sortedLogs = React.useMemo(() => {
    if (!logs) return [];
    return [...logs].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).toDateString();
      const dateB = new Date(b.createdAt).toDateString();
      if (dateA === dateB) {
        const numA = parseInt(a.inventory?.blockNumber || '0') || 0;
        const numB = parseInt(b.inventory?.blockNumber || '0') || 0;
        return numA - numB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [logs]);

  return (
    <Box sx={{ p: 4, maxWidth: 1200, margin: '0 auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory')} sx={{ mb: 3 }}>
        Back to Inventory
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary.main">{decodedSupplier}</Typography>
          <Typography variant="body1" color="text.secondary">Material Ledger (In / Out History)</Typography>
        </Box>
        <Button variant="contained" color="error" onClick={() => setOpenDeduct(true)}>
          - Deduct Stock
        </Button>
      </Box>

      {isLoadingLogs ? (
        <Typography align="center" sx={{ mt: 5 }}>Loading ledger...</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Material Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Project / Remarks</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Block No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>L x W x T</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'green' }}>IN (+)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>OUT (-)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs?.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No logs found.</TableCell></TableRow>
              ) : (
                sortedLogs.map((log: any) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{log.inventory?.itemName || 'N/A'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{log.remarks || '-'}</TableCell>
                    <TableCell>{log.inventory?.blockNumber || 'N/A'}</TableCell>
                    <TableCell>
                      {log.inventory?.type !== 'consumable' 
                        ? `${log.inventory?.length || 0} x ${log.inventory?.width || 0} x ${log.inventory?.thickness || 0}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: 'green', fontWeight: log.type === 'IN' ? 'bold' : 'normal' }}>
                      {log.type === 'IN' ? `+ ${log.quantity.toFixed(2)} ${log.inventory?.unit || ''}` : '-'}
                    </TableCell>
                    <TableCell sx={{ color: 'error.main', fontWeight: log.type === 'OUT' ? 'bold' : 'normal' }}>
                      {log.type === 'OUT' ? `- ${log.quantity.toFixed(2)} ${log.inventory?.unit || ''}` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Deduct Stock Dialog */}
      <Dialog open={openDeduct} onClose={() => setOpenDeduct(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Deduct Stock / Record Waste</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label="Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={deductForm.date}
            onChange={(e) => setDeductForm({ ...deductForm, date: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Select Material / Block</InputLabel>
            <Select
              label="Select Material / Block"
              value={deductForm.inventoryId}
              onChange={(e) => setDeductForm({ ...deductForm, inventoryId: e.target.value })}
            >
              {sortedSupplierItems.map((item: any) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.itemName} (Block: {item.blockNumber || 'N/A'}) - Available: {item.quantity.toFixed(2)} {item.unit}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Autocomplete
            freeSolo
            options={slabNames || []}
            value={deductForm.productName}
            onChange={(e, newValue) => setDeductForm({ ...deductForm, productName: newValue || '' })}
            onInputChange={(e, newInputValue) => setDeductForm({ ...deductForm, productName: newInputValue })}
            renderInput={(params) => <TextField {...params} label="Product Name / Slabs (e.g. Wall Cladding)" />}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            
            <TextField 
              label="Length (L)" 
              type="number"
              value={deductForm.length}
              onChange={(e) => setDeductForm({ ...deductForm, length: e.target.value })}
              fullWidth
            />
            <TextField 
              label="Width (W)" 
              type="number"
              value={deductForm.width}
              onChange={(e) => setDeductForm({ ...deductForm, width: e.target.value })}
              fullWidth
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', fontWeight: 'bold' }}>
            Total Used: {((Number(deductForm.length) || 0) * (Number(deductForm.width) || 0)).toFixed(2)} Sq.Ft
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeduct(false)} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeductSubmit}
            disabled={!deductForm.inventoryId || (!(Number(deductForm.length) > 0 && Number(deductForm.width) > 0))}
          >
            Confirm Deduction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryLedger;
