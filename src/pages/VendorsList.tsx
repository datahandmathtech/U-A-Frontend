import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetVendorsQuery, useCreateVendorMutation, useUpdateVendorMutation, useDeleteVendorMutation } from '../store/apiSlice';

const VendorsList = ({ hideHeader, selectedMonth, selectedFY }: { hideHeader?: boolean, selectedMonth?: string, selectedFY?: string }) => {
  const navigate = useNavigate();
  const { data: vendors = [], isLoading } = useGetVendorsQuery({ month: selectedMonth, fy: selectedFY });
  const [createVendor] = useCreateVendorMutation();
  const [updateVendor] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', contact: '', address: '', services: [] as string[]
  });

  const handleOpen = (vendor?: any) => {
    if (vendor) {
      setEditMode(true);
      setCurrentId(vendor.id);
      setFormData({ name: vendor.name, contact: vendor.contact || '', address: vendor.address || '', services: vendor.services || [] });
    } else {
      setEditMode(false);
      setCurrentId('');
      setFormData({ name: '', contact: '', address: '', services: [] });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (editMode) {
      await updateVendor({ id: currentId, vendor: formData });
    } else {
      await createVendor(formData);
    }
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      try {
        await deleteVendor(id).unwrap();
      } catch (err) {
        console.error("Failed to delete vendor", err);
      }
    }
  };

  const availableServices = ['Production', 'Polishing', 'Packing', 'Dispatch', 'Carving', 'Inlay'];

  const filteredVendors = vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.contact?.includes(searchQuery));

  return (
    <Box sx={{ p: hideHeader ? 0 : 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        {!hideHeader && <Typography variant="h4" fontWeight="bold">Vendor Master</Typography>}
        <TextField 
          placeholder="Search vendors..." 
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300, bgcolor: '#fff', borderRadius: 1 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ ml: 'auto' }}>
          + Enlist New Vendor
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell>Vendor Name</TableCell>
              <TableCell align="center">Opening Balance</TableCell>
              <TableCell align="center">Month OUT</TableCell>
              <TableCell align="center">Month IN</TableCell>
              <TableCell align="center">Closing Balance</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVendors.map((v: any) => (
              <TableRow key={v.id} hover onClick={() => navigate(`/vendors/${v.id}`)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>{v.name}</TableCell>
                <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>{v.openingBalance || 0}</TableCell>
                <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>{v.totalOut}</TableCell>
                <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>{v.totalIn}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{v.balance}</TableCell>
                <TableCell align="center">
                  <IconButton color="info" onClick={(e) => { e.stopPropagation(); handleOpen(v); }} title="Edit">
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }} title="Delete">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Vendor Name" fullWidth value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <TextField label="Contact Number" fullWidth value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
            <TextField label="Address" fullWidth multiline rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formData.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorsList;
