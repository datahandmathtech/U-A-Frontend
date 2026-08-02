import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Chip, Button, IconButton, TextField, MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox 
} from '@mui/material';
import { useGetAllPiecesQuery, useUpdatePieceMutation, useCreatePieceLogMutation } from '../store/apiSlice';
import EditIcon from '@mui/icons-material/Edit';
import DoneAllIcon from '@mui/icons-material/DoneAll';

const PieceTracker = () => {
  const { data: pieces, isLoading, refetch } = useGetAllPiecesQuery();
  const [updatePiece] = useUpdatePieceMutation();
  const [createPieceLog] = useCreatePieceLogMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<any>(null);
  const [formData, setFormData] = useState({ vendorName: '', size: '', productName: '', stage: '' });
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && pieces) {
      // Only select pending/active pieces
      setSelectedPieceIds(pieces.filter((p: any) => p.status !== 'completed').map((p: any) => p.id));
    } else {
      setSelectedPieceIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedPieceIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleBulkComplete = async () => {
    if (!window.confirm(`Are you sure you want to mark ${selectedPieceIds.length} pieces as COMPLETED?`)) return;
    
    try {
      // Basic Promise.all to update pieces in parallel (in a real app, use a dedicated bulk endpoint)
      await Promise.all(selectedPieceIds.map(async (id) => {
        await updatePiece({ id, data: { status: 'completed' } }).unwrap();
        await createPieceLog({ id, data: { status: 'completed' } }).unwrap();
      }));
      setSelectedPieceIds([]);
      refetch();
    } catch (e) {
      console.error(e);
      alert('Failed to complete some pieces.');
    }
  };

  const handleEditClick = (piece: any) => {
    setSelectedPiece(piece);
    setFormData({
      vendorName: piece.vendorName || '',
      size: piece.size || '',
      productName: piece.productName || '',
      stage: piece.stage || 'cutting'
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updatePiece({ 
        id: selectedPiece.id, 
        data: {
          vendorName: formData.vendorName,
          size: formData.size,
          productName: formData.productName,
          stage: formData.stage
        }
      }).unwrap();
      
      if (formData.stage !== selectedPiece.stage) {
         await createPieceLog({
           id: selectedPiece.id,
           data: {
             stage: formData.stage,
             status: 'active',
             vendorName: formData.vendorName
           }
         }).unwrap();
      }
      
      setEditDialogOpen(false);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompletePiece = async (piece: any) => {
    try {
      await updatePiece({ 
        id: piece.id, 
        data: { status: 'completed' }
      }).unwrap();
      
      await createPieceLog({
         id: piece.id,
         data: { status: 'completed' }
      }).unwrap();
      
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <Box p={3}><Typography>Loading Pieces...</Typography></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={900} sx={{ color: '#1A1A1A', letterSpacing: '-0.5px' }}>
          Global Piece Tracker
        </Typography>
        {selectedPieceIds.length > 0 && (
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<DoneAllIcon />}
            onClick={handleBulkComplete}
            sx={{ fontWeight: 'bold' }}
          >
            Mark {selectedPieceIds.length} Selected as Completed
          </Button>
        )}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #E0E0E0' }}>
        <TableContainer sx={{ maxHeight: '75vh' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ bgcolor: '#F8F9FA' }}>
                  <Checkbox 
                    onChange={handleSelectAll} 
                    checked={pieces && pieces.filter((p: any) => p.status !== 'completed').length > 0 && selectedPieceIds.length === pieces.filter((p: any) => p.status !== 'completed').length}
                    indeterminate={selectedPieceIds.length > 0 && pieces && selectedPieceIds.length < pieces.filter((p: any) => p.status !== 'completed').length}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Slab</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Piece #</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Vendor</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8F9FA' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pieces?.map((piece: any) => (
                <TableRow key={piece.id} sx={{ '&:hover': { bgcolor: '#F5F5F5' }, bgcolor: piece.status === 'completed' ? 'rgba(46,125,50,0.03)' : 'inherit' }}>
                  <TableCell padding="checkbox">
                    <Checkbox 
                      checked={selectedPieceIds.includes(piece.id)}
                      onChange={() => handleSelectOne(piece.id)}
                      disabled={piece.status === 'completed'}
                    />
                  </TableCell>
                  <TableCell>{piece.slab?.project?.name || 'Unknown Project'}</TableCell>
                  <TableCell>{piece.slab?.name || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>#{piece.pieceNumber}</TableCell>
                  <TableCell>{piece.productName || '-'}</TableCell>
                  <TableCell>{piece.size || '-'}</TableCell>
                  <TableCell>{piece.vendorName || '-'}</TableCell>
                  <TableCell>
                    <Chip label={piece.stage.toUpperCase()} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={piece.status.toUpperCase()} 
                      color={piece.status === 'completed' ? 'success' : piece.status === 'active' ? 'warning' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEditClick(piece)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {piece.status !== 'completed' && (
                      <Button size="small" variant="contained" color="success" sx={{ ml: 1, textTransform: 'none' }} onClick={() => handleCompletePiece(piece)}>
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!pieces || pieces.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 5 }}>No pieces found in the system.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* EDIT DIALOG */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Piece #{selectedPiece?.pieceNumber}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField 
            label="Product Name" 
            fullWidth 
            value={formData.productName} 
            onChange={e => setFormData({ ...formData, productName: e.target.value })} 
          />
          <TextField 
            label="Size (e.g., 2x2)" 
            fullWidth 
            value={formData.size} 
            onChange={e => setFormData({ ...formData, size: e.target.value })} 
          />
          <TextField 
            label="Vendor Name (Optional)" 
            fullWidth 
            value={formData.vendorName} 
            onChange={e => setFormData({ ...formData, vendorName: e.target.value })} 
          />
          <FormControl fullWidth>
            <InputLabel>Current Stage</InputLabel>
            <Select
              value={formData.stage}
              label="Current Stage"
              onChange={e => setFormData({ ...formData, stage: e.target.value })}
            >
              <MenuItem value="cutting">Cutting</MenuItem>
              <MenuItem value="polishing">Polishing</MenuItem>
              <MenuItem value="packaging">Packaging</MenuItem>
              <MenuItem value="dispatched">Dispatched</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PieceTracker;
