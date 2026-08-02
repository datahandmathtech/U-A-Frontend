import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetProjectByIdQuery, useGetSlabsQuery, useAddPiecesMutation, useUpdatePieceMutation, useDeletePieceMutation } from '../store/apiSlice';

const SlabPieceTracker: React.FC = () => {
  const { id: projectId, slabId } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading: isProjectLoading } = useGetProjectByIdQuery(projectId as string, { skip: !projectId });
  const { data: slabs, isLoading: isSlabsLoading } = useGetSlabsQuery(projectId as string, { skip: !projectId });
  const [addPieces] = useAddPiecesMutation();
  const [updatePiece] = useUpdatePieceMutation();
  const [deletePiece] = useDeletePieceMutation();
  
  const [addPieceOpen, setAddPieceOpen] = useState(false);
  const [pieceCount, setPieceCount] = useState<number>(1);

  const [editPieceOpen, setEditPieceOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<any>(null);
  const [editData, setEditData] = useState({ vendorName: '', stage: '', status: '' });

  const [viewPieceOpen, setViewPieceOpen] = useState(false);
  const [viewingPiece, setViewingPiece] = useState<any>(null);

  if (isProjectLoading || isSlabsLoading) return <Box sx={{ p: 4 }}><Typography>Loading...</Typography></Box>;

  // Find Slab
  const slab = slabs?.find((s: any) => s.id === slabId);

  if (!project || !slab) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h6">Slab not found or loading...</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Back</Button>
      </Box>
    );
  }

  const handleAddPieces = async () => {
    try {
      await addPieces({ slabId: slab.id, data: { count: pieceCount } }).unwrap();
      setAddPieceOpen(false);
      setPieceCount(1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClick = (p: any, stageName: string) => {
    setEditingPiece(p);
    const STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];
    const currentStageIdx = Math.max(0, STAGES.indexOf(p.stage || 'Production'));
    const targetStageIdx = STAGES.indexOf(stageName);

    let vendor = '';
    let status = 'pending';

    if (targetStageIdx < currentStageIdx) {
       const log = p.logs?.find((l: any) => l.stage === stageName);
       if (log) vendor = log.vendorName || '';
       else if (targetStageIdx === 0 && p.vendorName) vendor = p.vendorName;
       status = 'completed';
    } else if (targetStageIdx === currentStageIdx) {
       vendor = p.vendorName || '';
       status = p.status || 'pending';
    }

    setEditData({ vendorName: vendor, stage: stageName, status });
    setEditPieceOpen(true);
  };

  const handleUpdatePiece = async () => {
    try {
      await updatePiece({ id: editingPiece.id, data: editData }).unwrap();
      setEditPieceOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePiece = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this piece?')) {
      try {
        await deletePiece(id).unwrap();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 4, lg: 6 }, py: 4, margin: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
        Back to Project
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Piece Tracker: {slab.name}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Project: {project.name} | Slab Size: {slab.size || 'N/A'}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" color="text.secondary">
          {slab.pieces?.length || 0} Pieces Total
        </Typography>
        <Button size="medium" variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setAddPieceOpen(true)} sx={{ borderRadius: 2 }}>
          Add Pieces
        </Button>
      </Box>
      
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Table aria-label="pieces">
          <TableHead sx={{ bgcolor: 'primary.dark' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', py: 2, color: 'white' }}>Piece #</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2, color: 'white' }} align="center">Production</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2, color: 'white' }} align="center">Polishing</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2, color: 'white' }} align="center">Packing</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2, color: 'white' }} align="center">Dispatch</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2, color: 'white' }} align="center">Delete Piece</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slab.pieces?.map((p: any, pIdx: number) => {
              const currentStageIdx = Math.max(0, ['Production', 'Polishing', 'Packing', 'Dispatch'].indexOf(p.stage || 'Production'));

              const renderStageCell = (stageName: string, stageIdx: number) => {
                let status = 'pending';
                let vendor = '-';

                if (stageIdx < currentStageIdx) {
                  status = 'completed';
                  const log = p.logs?.find((l: any) => l.stage === stageName);
                  if (log && log.vendorName) vendor = log.vendorName;
                  else if (stageIdx === 0 && p.vendorName && currentStageIdx > 0) vendor = p.vendorName; // fallback for legacy data
                } else if (stageIdx === currentStageIdx) {
                  status = p.status || 'pending';
                  vendor = p.vendorName || '-';
                  if (status === 'completed') {
                    // if current stage is completed, it's completed but hasn't moved to next stage yet
                  }
                }

                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, '&:hover .edit-btn': { opacity: 1 }, minHeight: 40 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 80 }}>
                      {vendor !== '-' && (
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {vendor}
                        </Typography>
                      )}
                      {status === 'completed' && <Chip label="COMPLETED" color="success" size="small" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 'bold' }} />}
                      {status === 'active' && <Chip label="IN PROGRESS" color="warning" size="small" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 'bold' }} />}
                      {status === 'pending' && <Chip label="PENDING" size="small" variant="outlined" sx={{ color: 'text.secondary', fontSize: '0.65rem', height: 20, fontWeight: 'bold' }} />}
                    </Box>
                    <IconButton className="edit-btn" size="small" color="primary" onClick={() => handleEditClick(p, stageName)} sx={{ opacity: 0, transition: 'opacity 0.2s', bgcolor: 'rgba(25, 118, 210, 0.08)', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.2)' } }}>
                      <EditIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Box>
                );
              };

              return (
                <TableRow key={pIdx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #f0f0f0', width: '12%' }}>
                    <Button 
                      variant="text" 
                      sx={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'primary.main', p: 0, '&:hover': { textDecoration: 'underline', bgcolor: 'transparent' } }}
                      onClick={() => {
                        setViewingPiece(p);
                        setViewPieceOpen(true);
                      }}
                    >
                      Piece {p.pieceNumber}
                    </Button>
                  </TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid #f0f0f0', width: '20%' }}>{renderStageCell('Production', 0)}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid #f0f0f0', width: '20%' }}>{renderStageCell('Polishing', 1)}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid #f0f0f0', width: '20%' }}>{renderStageCell('Packing', 2)}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid #f0f0f0', width: '20%' }}>{renderStageCell('Dispatch', 3)}</TableCell>
                  <TableCell align="center" sx={{ width: '8%' }}>
                    <IconButton size="small" color="error" onClick={() => handleDeletePiece(p.id)} sx={{ bgcolor: 'rgba(211, 47, 47, 0.08)', '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.2)' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!slab.pieces || slab.pieces.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No pieces added yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Dialog for adding pieces */}
      <Dialog open={addPieceOpen} onClose={() => setAddPieceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Pieces to {slab.name}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Number of Pieces to Add"
            type="number"
            fullWidth
            value={pieceCount}
            onChange={(e) => setPieceCount(Number(e.target.value))}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddPieceOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleAddPieces} disabled={pieceCount < 1}>Add Pieces</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for editing piece */}
      <Dialog open={editPieceOpen} onClose={() => setEditPieceOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Piece {editingPiece?.pieceNumber}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Stage</InputLabel>
            <Select
              label="Stage"
              value={editData.stage}
              onChange={(e) => setEditData({ ...editData, stage: e.target.value })}
            >
              <MenuItem value="Production">Production</MenuItem>
              <MenuItem value="Polishing">Polishing</MenuItem>
              <MenuItem value="Packing">Packing</MenuItem>
              <MenuItem value="Dispatch">Dispatch</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={editData.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditPieceOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleUpdatePiece}>Update Piece</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog for viewing piece history perfectly */}
      <Dialog open={viewPieceOpen} onClose={() => setViewPieceOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
          Piece Data: Piece {viewingPiece?.pieceNumber}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {viewingPiece && viewingPiece.logs && viewingPiece.logs.length > 0 ? (
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Stage</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Operator / Vendor</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewingPiece.logs.slice().reverse().map((log: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{log.stage}</TableCell>
                    <TableCell>{log.vendorName || log.operatorId || '-'}</TableCell>
                    <TableCell>{new Date(log.endTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{log.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No historical data available for this piece yet.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setViewPieceOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SlabPieceTracker;
