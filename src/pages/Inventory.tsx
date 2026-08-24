import React, { useState, useMemo } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tabs, Tab, FormControl, InputLabel, Select, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import { useGetInventoryQuery, useCreateInventoryMutation } from '../store/apiSlice';

const Inventory: React.FC = () => {
  const currentMonth = new Date().getMonth();
  const defaultFy = currentMonth >= 3 ? new Date().getFullYear().toString() : (new Date().getFullYear() - 1).toString();
  
  const [activeTab, setActiveTab] = useState(0);
  const [fyYear, setFyYear] = useState(defaultFy);

  const { data: inventory, isLoading, refetch } = useGetInventoryQuery(fyYear);
  const [createInventory] = useCreateInventoryMutation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    type: 'block', 
    jobWorkType: 'company',
    itemName: '', 
    blockNumber: '',
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
      refetch();
      setFormData({ 
        type: 'block', jobWorkType: 'company', itemName: '', blockNumber: '',
        length: '', width: '', height: '', weight: '',
        quantity: '', unit: 'pieces', supplier: '', costPerUnit: '' 
      });
    } catch (err) {
      console.error('Failed to add inventory', err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Group inventory items by supplier/client
  const groupedInventory = useMemo(() => {
    if (!inventory) return {};
    const filtered = inventory.filter((item: any) => 
      activeTab === 0 ? item.jobWorkType === 'company' : item.jobWorkType === 'client'
    );
    
    return filtered.reduce((acc: any, item: any) => {
      const key = item.supplier || (activeTab === 0 ? 'Unknown Vendor' : 'Unknown Client');
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [inventory, activeTab]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Inventory Management</Typography>
          <Typography variant="body2" color="textSecondary">Track Company Materials and Client Materials grouped by FY.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: '#FFF', borderRadius: 2 }}>
            <InputLabel>Financial Year</InputLabel>
            <Select 
              label="Financial Year" 
              value={fyYear} 
              onChange={(e) => setFyYear(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <MenuItem key={y} value={y.toString()}>FY {y}-{y+1}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen} sx={{ borderRadius: 2, px: 3, py: 1 }}>
            Add Material
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
          <Tab label="Company Material (Vendors)" sx={{ fontWeight: 'bold', fontSize: '1.05rem' }} />
          <Tab label="Client Material (Clients)" sx={{ fontWeight: 'bold', fontSize: '1.05rem' }} />
        </Tabs>
      </Box>

      {isLoading ? (
        <Typography>Loading inventory...</Typography>
      ) : Object.keys(groupedInventory).length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, bgcolor: '#FAFAFA', border: '1px dashed #CCC' }}>
          <Typography variant="h6" color="text.secondary">No materials found for this tab.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(groupedInventory).map(([supplier, items]: [string, any]) => (
            <Accordion key={supplier} defaultExpanded sx={{ border: '1px solid #E0E0E0', borderRadius: 3, overflow: 'hidden', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: activeTab === 0 ? '#F4F6F8' : '#FFFDF5', borderBottom: '1px solid #E0E0E0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FolderSpecialIcon sx={{ color: activeTab === 0 ? 'primary.main' : '#B38B36' }} />
                  <Typography variant="h6" fontWeight="bold">
                    {activeTab === 0 ? 'Vendor' : 'Client'}: <span style={{ color: activeTab === 0 ? '#1976d2' : '#B38B36' }}>{supplier}</span>
                  </Typography>
                  <Chip label={`${items.length} items`} size="small" />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                      <TableRow>
                        <TableCell><strong>Material / Block No</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell align="center"><strong>Opening (Start of FY)</strong></TableCell>
                        <TableCell align="center"><strong>IN (FY)</strong></TableCell>
                        <TableCell align="center"><strong>OUT (FY)</strong></TableCell>
                        <TableCell align="center"><strong>Closing (Current)</strong></TableCell>
                        {activeTab === 0 && <TableCell><strong>Unit Cost</strong></TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item: any) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 'bold' }}>{item.itemName}</Typography>
                            {item.blockNumber && <Typography variant="caption" color="text.secondary">Block: {item.blockNumber}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.type.replace('_', ' ').toUpperCase()} 
                              color={item.type === 'block' ? 'info' : (item.type === 'slab' ? 'success' : 'secondary')} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight="500" color="text.secondary">{item.openingStock?.toFixed(2) || 0} {item.unit}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight="bold" color="success.main">+{item.inCurrentFY?.toFixed(2) || 0}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight="bold" color="error.main">-{item.outCurrentFY?.toFixed(2) || 0}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight="900" sx={{ fontSize: '1.05rem', color: '#333' }}>{item.closingStock?.toFixed(2) || 0} {item.unit}</Typography>
                          </TableCell>
                          {activeTab === 0 && (
                            <TableCell>₹{item.costPerUnit}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

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
              label="Item Name" 
              fullWidth 
              value={formData.itemName} 
              onChange={(e) => setFormData({...formData, itemName: e.target.value})} 
            />
            
            <TextField 
              label="Block Number (Optional)" 
              fullWidth 
              value={formData.blockNumber} 
              onChange={(e) => setFormData({...formData, blockNumber: e.target.value})} 
            />

            {(formData.type === 'block' || formData.type === 'slab') && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="Length" type="number" fullWidth value={formData.length} onChange={(e) => setFormData({...formData, length: e.target.value})} />
                <TextField label="Width" type="number" fullWidth value={formData.width} onChange={(e) => setFormData({...formData, width: e.target.value})} />
                <TextField label="Thickness" type="number" fullWidth value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Total Quantity" 
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
                <MenuItem value="sq_ft">Sq Ft</MenuItem>
                <MenuItem value="pieces">Pieces</MenuItem>
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
              label={formData.jobWorkType === 'company' ? "Vendor Name" : "Client Name"} 
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
