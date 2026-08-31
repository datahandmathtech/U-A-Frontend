import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel,
  MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGetInventoryLogsQuery, useGetInventoryQuery, useDeductInventoryMutation } from '../store/apiSlice';

const InventoryLedger = () => {
  const { supplier } = useParams();
  const navigate = useNavigate();
  const decodedSupplier = decodeURIComponent(supplier || '');

  const { data: logs, isLoading: isLoadingLogs, refetch } = useGetInventoryLogsQuery(decodedSupplier);
  const { data: inventoryItems } = useGetInventoryQuery();
  const [deductInventory] = useDeductInventoryMutation();

  const [openDeduct, setOpenDeduct] = useState(false);
  const [deductForm, setDeductForm] = useState({ inventoryId: '', quantity: '', isWaste: false });

  const supplierItems = inventoryItems?.filter((i: any) => i.supplier === decodedSupplier) || [];

  const handleDeductSubmit = async () => {
    try {
      await deductInventory({
        inventoryId: deductForm.inventoryId,
        quantity: Number(deductForm.quantity),
        isWaste: deductForm.isWaste
      }).unwrap();
      setOpenDeduct(false);
      setDeductForm({ inventoryId: '', quantity: '', isWaste: false });
      refetch();
    } catch (error) {
      console.error(error);
      alert('Error deducting stock');
    }
  };

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
                logs?.map((log: any) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{log.inventory?.itemName || 'N/A'}</TableCell>
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
          <FormControl fullWidth>
            <InputLabel>Select Material / Block</InputLabel>
            <Select
              label="Select Material / Block"
              value={deductForm.inventoryId}
              onChange={(e) => setDeductForm({ ...deductForm, inventoryId: e.target.value })}
            >
              {supplierItems.map((item: any) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.itemName} (Block: {item.blockNumber || 'N/A'}) - Available: {item.quantity.toFixed(2)} {item.unit}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField 
            label="Quantity to Deduct" 
            type="number"
            value={deductForm.quantity}
            onChange={(e) => setDeductForm({ ...deductForm, quantity: e.target.value })}
            fullWidth
          />

          <FormControlLabel
            control={
              <Checkbox 
                checked={deductForm.isWaste}
                onChange={(e) => setDeductForm({ ...deductForm, isWaste: e.target.checked })}
              />
            }
            label="Send to Waste Ledger"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeduct(false)} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeductSubmit}
            disabled={!deductForm.inventoryId || !deductForm.quantity}
          >
            Confirm Deduction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryLedger;
