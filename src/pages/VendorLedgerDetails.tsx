import React, { useMemo, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Chip, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { useGetAllPiecesQuery, useUpdatePieceMutation, useDeletePieceMutation } from '../store/apiSlice';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams, useNavigate } from 'react-router-dom';

const VendorLedgerDetails = () => {
  const { vendorName } = useParams<{ vendorName: string }>();
  const navigate = useNavigate();
  const { data: pieces, isLoading } = useGetAllPiecesQuery();
  const [updatePiece] = useUpdatePieceMutation();
  const [deletePiece] = useDeletePieceMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pieceToEdit, setPieceToEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ stage: '', status: '', vendorName: '' });

  const selectedVendor = decodeURIComponent(vendorName || '');

  // Compute ledger entries for the selected vendor
  const ledgerEntries = useMemo(() => {
    if (!pieces || !selectedVendor) return [];
    
    const entries: any[] = [];
    
    pieces.forEach((piece: any) => {
      const slabName = piece.slab?.name || 'Unknown Slab';
      const projectName = piece.slab?.project?.name || 'Unknown Project';
      
      let wasGiven = false;
      let wasCompleted = false;
      let assignmentDate = new Date(piece.createdAt);
      let completionDate = null;
      let relevantStage = '';
      
      const sortedLogs = [...(piece.logs || [])].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      sortedLogs.forEach((log: any) => {
        if (log.vendorName === selectedVendor) {
          wasGiven = true;
          relevantStage = log.stage;
          assignmentDate = new Date(log.startTime);
          if (log.status === 'completed' || log.endTime) {
            wasCompleted = true;
            completionDate = new Date(log.endTime || log.startTime);
          }
        }
      });
      
      if (!wasGiven && piece.vendorName === selectedVendor) {
         wasGiven = true;
         relevantStage = piece.stage;
         if (piece.status === 'completed') {
           wasCompleted = true;
           completionDate = new Date(piece.updatedAt || piece.createdAt);
         }
      }

      if (wasGiven) {
        entries.push({
          pieceId: piece.id,
          piece: piece,
          date: assignmentDate,
          type: 'GIVEN',
          description: `${slabName} - Piece ${piece.pieceNumber} (${relevantStage})`,
          project: projectName,
          given: 1,
          completed: 0
        });
        
        if (wasCompleted) {
          entries.push({
            pieceId: piece.id,
            piece: piece,
            date: completionDate || assignmentDate,
            type: 'COMPLETED',
            description: `${slabName} - Piece ${piece.pieceNumber} (${relevantStage})`,
            project: projectName,
            given: 0,
            completed: 1
          });
        }
      }
    });

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let balance = 0;
    entries.forEach(entry => {
      balance = balance + entry.given - entry.completed;
      entry.balance = balance;
    });

    return entries.reverse();
  }, [pieces, selectedVendor]);

  const handleEditClick = (piece: any) => {
    setPieceToEdit(piece);
    setEditForm({
      stage: piece.stage || '',
      status: piece.status || 'active',
      vendorName: piece.vendorName || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updatePiece({ id: pieceToEdit.id, data: editForm }).unwrap();
      setEditDialogOpen(false);
      setPieceToEdit(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClick = async (pieceId: string) => {
    if (window.confirm('Are you sure you want to delete this piece? This will remove all logs associated with it.')) {
      try {
        await deletePiece(pieceId).unwrap();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (isLoading) return <Box p={3}><Typography>Loading Vendor Ledger...</Typography></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/vendor-ledger')} 
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        Back to Vendor Summary
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight={900} sx={{ color: '#1A1A1A', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLongIcon fontSize="large" color="primary" />
          Detailed Statement: {selectedVendor}
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #E0E0E0' }}>
        <Box sx={{ p: 2, bgcolor: '#F8F9FA', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between' }}>
           <Typography variant="h6" fontWeight="bold" color="primary.main">Account Statement</Typography>
           <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
             Current Pending Pieces: 
             <Typography component="span" variant="h5" color="error.main" fontWeight="900" sx={{ ml: 1 }}>
               {ledgerEntries.length > 0 ? ledgerEntries[0].balance : 0}
             </Typography>
           </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA', width: '15%' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA', width: '20%' }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA', width: '30%' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA', textAlign: 'center' }}>Given</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA', textAlign: 'center' }}>Completed</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA', textAlign: 'center' }}>Balance</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ledgerEntries.map((entry, idx) => (
                <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#F5F5F5' } }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {entry.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.project} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{entry.description}</TableCell>
                  <TableCell align="center">
                    {entry.given > 0 ? <Typography fontWeight="bold" color="warning.main">+{entry.given}</Typography> : '-'}
                  </TableCell>
                  <TableCell align="center">
                    {entry.completed > 0 ? <Typography fontWeight="bold" color="success.main">+{entry.completed}</Typography> : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="bold" sx={{ fontSize: '1.05rem', color: entry.balance > 0 ? 'error.main' : 'success.main' }}>
                      {entry.balance}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditClick(entry.piece)} color="primary"><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleDeleteClick(entry.pieceId)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {ledgerEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>No transaction history found for {selectedVendor}.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Piece Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Piece Details</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField 
            label="Vendor Name" 
            fullWidth 
            value={editForm.vendorName} 
            onChange={(e) => setEditForm({ ...editForm, vendorName: e.target.value })} 
          />
          <FormControl fullWidth>
            <InputLabel>Stage</InputLabel>
            <Select
              value={editForm.stage}
              label="Stage"
              onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
            >
              <MenuItem value="cutting">Cutting</MenuItem>
              <MenuItem value="polishing">Polishing</MenuItem>
              <MenuItem value="packaging">Packaging</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={editForm.status}
              label="Status"
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <MenuItem value="active">Active (Pending)</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveEdit}>Save Changes</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default VendorLedgerDetails;
