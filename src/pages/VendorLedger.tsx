import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, Breadcrumbs, Link, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetVendorLedgerQuery, useGetVendorsQuery, useDeleteProductionLogMutation, useCreateMaterialLogMutation, useGetActiveOutLogsQuery } from '../store/apiSlice';

const VendorLedger = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ledger = [], isLoading } = useGetVendorLedgerQuery(id || '');
  const { data: vendors = [] } = useGetVendorsQuery();
  const { data: activeOutLogs = [] } = useGetActiveOutLogsQuery();
  const vendor = vendors.find(v => v.id === id);

  const [openEdit, setOpenEdit] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [deleteProductionLog] = useDeleteProductionLogMutation();
  const [createMaterialLog] = useCreateMaterialLogMutation();

  // Manual Entry State
  const [openManual, setOpenManual] = useState(false);
  const [manualType, setManualType] = useState<'OUT' | 'IN'>('OUT');
  const [manualStage, setManualStage] = useState('Production');
  const [manualQty, setManualQty] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [selectedOutLogId, setSelectedOutLogId] = useState('');

  const handleManualSubmit = async () => {
    if (!manualQty) {
      alert("Please enter quantity");
      return;
    }
    if (manualType === 'IN' && !selectedOutLogId) {
      alert("Please select a pending item to return");
      return;
    }
    
    try {
      await createMaterialLog({
        stage: manualStage,
        quantityProduced: manualQty,
        transactionType: manualType,
        vendors: manualType === 'OUT' ? [{ vendorId: vendor?.id, vendorName: vendor?.name, qty: manualQty }] : undefined,
        vendorId: manualType === 'IN' ? vendor?.id : undefined,
        vendorName: manualType === 'IN' ? vendor?.name : undefined,
        parentLogId: manualType === 'IN' ? selectedOutLogId : undefined,
        productName: manualProductName,
        source: 'admin_manual', // bypass approval
        startPhotos: { unit: '', machine: '', software: '' }
      }).unwrap();
      
      setOpenManual(false);
      setManualQty('');
      setManualProductName('');
      setSelectedOutLogId('');
    } catch (error) {
      console.error("Failed to add manual entry", error);
      alert("Failed to add entry");
    }
  };

  const handleEditClick = (entry: any) => {
    setSelectedEntry(entry);
    setOpenEdit(true);
  };

  const handleEditSave = async () => {
    // TODO: Connect to updateProductionLog mutation
    alert("Edit functionality will be connected to Production API");
    setOpenEdit(false);
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm("Are you sure you want to delete this ledger entry?")) {
      try {
        await deleteProductionLog(entryId).unwrap();
      } catch (error) {
        console.error("Failed to delete log", error);
        alert("Failed to delete log");
      }
    }
  };

  if (isLoading) return <Typography>Loading Ledger...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Breadcrumbs>
          <Link component="button" variant="body1" onClick={() => navigate('/vendors')} sx={{ display: 'flex', alignItems: 'center' }}>
            <ArrowBackIcon sx={{ mr: 0.5, fontSize: 20 }} /> Back to Vendors
          </Link>
          <Typography color="text.primary">{vendor?.name}</Typography>
        </Breadcrumbs>
        <Button variant="contained" color="primary" onClick={() => setOpenManual(true)}>
          + Add Manual Entry
        </Button>
      </Box>

      <Typography variant="h4" fontWeight="bold" mb={3}>
        {vendor?.name} - Ledger Account
      </Typography>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8F9FA' }}>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>MATERIAL TYPE</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>VEHICLE NUMBER</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#d32f2f', textAlign: 'center' }}>OUTWARD (-)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' }}>INWARD (+)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#1976d2', textAlign: 'center' }}>BALANCE</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666', textAlign: 'center' }}>STATUS</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#666' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ledger.map((entry: any, index: number) => {
              const isOut = entry.transactionType === 'OUT';
              
              return (
                <TableRow key={entry.id} hover sx={{ bgcolor: isOut ? '#fff5f5' : '#f5fff5' }}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#444' }}>
                    {entry.stage}
                  </TableCell>
                  <TableCell>{entry.vehicleNumber}</TableCell>
                  
                  <TableCell align="center" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                    {entry.piecesOut > 0 ? entry.piecesOut : '-'}
                  </TableCell>
                  
                  <TableCell align="center" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    {entry.piecesIn > 0 ? entry.piecesIn : '-'}
                  </TableCell>
                  
                  <TableCell align="center">
                    <Box sx={{ 
                      display: 'inline-block', 
                      px: 2, 
                      py: 0.5, 
                      borderRadius: 1, 
                      bgcolor: entry.balance > 0 ? '#e3f2fd' : (entry.balance < 0 ? '#ffebee' : '#f5f5f5'),
                      color: entry.balance > 0 ? '#1565c0' : (entry.balance < 0 ? '#c62828' : '#757575'),
                      fontWeight: 'bold'
                    }}>
                      {entry.balance > 0 ? `${entry.balance} (Pending)` : (entry.balance < 0 ? `${Math.abs(entry.balance)} (Adv)` : '0')}
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: '900', color: isOut ? '#d32f2f' : '#2e7d32', bgcolor: isOut ? '#ffebee' : '#e8f5e9', display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1 }}>
                      {isOut ? 'OUT (-)' : 'IN (+)'}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleEditClick(entry)} title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)} title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {ledger.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No transactions found in this financial year.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
        <DialogTitle>Edit Ledger Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField 
              label="Pieces OUT (DR)" 
              type="number" 
              fullWidth 
              value={selectedEntry?.piecesOut || 0}
              onChange={(e) => setSelectedEntry({...selectedEntry, piecesOut: Number(e.target.value)})}
            />
            <TextField 
              label="Pieces IN (CR)" 
              type="number" 
              fullWidth 
              value={selectedEntry?.piecesIn || 0}
              onChange={(e) => setSelectedEntry({...selectedEntry, piecesIn: Number(e.target.value)})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openManual} onClose={() => setOpenManual(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual Ledger Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Transaction Type"
              fullWidth
              value={manualType}
              onChange={(e) => setManualType(e.target.value as 'OUT' | 'IN')}
            >
              <MenuItem value="OUT">Material OUT (To Vendor)</MenuItem>
              <MenuItem value="IN">Material IN (From Vendor)</MenuItem>
            </TextField>

            <TextField
              select
              label="Work Stage"
              fullWidth
              value={manualStage}
              onChange={(e) => setManualStage(e.target.value)}
            >
              <MenuItem value="Production">Production</MenuItem>
              <MenuItem value="Polishing">Polishing</MenuItem>
              <MenuItem value="Packing">Packing</MenuItem>
              <MenuItem value="Dispatch">Dispatch</MenuItem>
            </TextField>

            {manualType === 'IN' && (
              <TextField 
                select
                label="Select Pending Item to Return (Material OUT Log)" 
                fullWidth 
                value={selectedOutLogId} 
                onChange={(e) => setSelectedOutLogId(e.target.value)} 
              >
                {activeOutLogs?.filter((log: any) => log.vendorId === vendor?.id && log.stage === manualStage).map((log: any) => {
                  const pending = (log.quantityProduced || 0) - (log.returnedQty || 0);
                  return (
                    <MenuItem key={log.id} value={log.id}>
                      {log.stage} - {pending > 0 ? pending : log.quantityProduced} pcs pending
                    </MenuItem>
                  );
                })}
              </TextField>
            )}

            <TextField
              label="Quantity (Pieces)"
              type="number"
              fullWidth
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
            />

            <TextField
              label="Product / Notes (Optional)"
              fullWidth
              value={manualProductName}
              onChange={(e) => setManualProductName(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManual(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleManualSubmit}>Submit Entry</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorLedger;
