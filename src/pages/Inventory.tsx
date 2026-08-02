import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetInventoryQuery, useCreateInventoryMutation } from '../store/apiSlice';

const Inventory: React.FC = () => {
  const { data: inventory, isLoading } = useGetInventoryQuery();
  const [createInventory] = useCreateInventoryMutation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    type: 'block', 
    jobWorkType: 'company',
    itemName: '', 
    length: '', width: '', height: '', weight: '',
    quantity: '', 
    unit: 'pieces', 
    supplier: '', 
    costPerUnit: '' 
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSubmit = async () => {
    try {
      await createInventory(formData).unwrap();
      handleClose();
      setFormData({ 
        type: 'block', jobWorkType: 'company', itemName: '', 
        length: '', width: '', height: '', weight: '',
        quantity: '', unit: 'pieces', supplier: '', costPerUnit: '' 
      });
    } catch (err) {
      console.error('Failed to add inventory', err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Inventory Management</Typography>
          <Typography variant="body2" color="textSecondary">Manage blocks, slabs, and factory consumables.</Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen} sx={{ borderRadius: 8 }}>
          Add Item
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
        <Table>
          <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell><strong>Item Name</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Job Work</strong></TableCell>
              <TableCell align="center"><strong>Opening</strong></TableCell>
              <TableCell align="center"><strong>Monthly In</strong></TableCell>
              <TableCell align="center"><strong>Monthly Out</strong></TableCell>
              <TableCell align="center"><strong>Closing (Current)</strong></TableCell>
              <TableCell><strong>Unit Cost</strong></TableCell>
              <TableCell><strong>Supplier</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} align="center">Loading...</TableCell></TableRow>
            ) : inventory?.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">No inventory found.</TableCell></TableRow>
            ) : (
              inventory?.map((item: any) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{item.itemName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.type.replace('_', ' ').toUpperCase()} 
                      color={item.type === 'block' ? 'info' : (item.type === 'slab' ? 'success' : 'secondary')} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.jobWorkType.toUpperCase()} 
                      variant="outlined"
                      color={item.jobWorkType === 'company' ? 'primary' : 'warning'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="bold" color="text.secondary">{item.openingStock} {item.unit}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="bold" color="success.main">+{item.inCurrentMonth || 0}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="bold" color="error.main">-{item.outCurrentMonth || 0}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="900" sx={{ fontSize: '1.05rem' }}>{item.closingStock} {item.unit}</Typography>
                  </TableCell>
                  <TableCell>₹{item.costPerUnit}</TableCell>
                  <TableCell>{item.supplier || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Inventory Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Inventory Item</DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                select 
                label="Type" 
                fullWidth 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <MenuItem value="block">Raw Block</MenuItem>
                <MenuItem value="slab">Finished Slab</MenuItem>
                <MenuItem value="consumable">Consumables</MenuItem>
              </TextField>
              <TextField 
                select 
                label="Ownership" 
                fullWidth 
                value={formData.jobWorkType} 
                onChange={(e) => setFormData({...formData, jobWorkType: e.target.value})}
              >
                <MenuItem value="company">Company Purchase</MenuItem>
                <MenuItem value="client">Client Job Work</MenuItem>
              </TextField>
            </Box>
            
            <TextField 
              label="Item Name / Block Number" 
              fullWidth 
              value={formData.itemName} 
              onChange={(e) => setFormData({...formData, itemName: e.target.value})} 
            />

            {(formData.type === 'block' || formData.type === 'slab') && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="Length" type="number" fullWidth value={formData.length} onChange={(e) => setFormData({...formData, length: e.target.value})} />
                <TextField label="Width" type="number" fullWidth value={formData.width} onChange={(e) => setFormData({...formData, width: e.target.value})} />
                <TextField label="Height" type="number" fullWidth value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
                <TextField label="Weight (tons)" type="number" fullWidth value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Quantity" 
                type="number"
                fullWidth 
                value={formData.quantity} 
                onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
              />
              <TextField 
                select 
                label="Unit" 
                fullWidth 
                value={formData.unit} 
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                <MenuItem value="pieces">Pieces</MenuItem>
                <MenuItem value="sq_ft">Sq Ft</MenuItem>
                <MenuItem value="kg">Kg</MenuItem>
                <MenuItem value="liters">Liters</MenuItem>
                <MenuItem value="tons">Tons</MenuItem>
              </TextField>
            </Box>
            
            {formData.jobWorkType === 'company' && (
              <TextField 
                label="Cost Per Unit (₹)" 
                type="number"
                fullWidth 
                value={formData.costPerUnit} 
                onChange={(e) => setFormData({...formData, costPerUnit: e.target.value})} 
              />
            )}
            
            <TextField 
              label="Supplier / Client Name" 
              fullWidth 
              value={formData.supplier} 
              onChange={(e) => setFormData({...formData, supplier: e.target.value})} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">Save Item</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
