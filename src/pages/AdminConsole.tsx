import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Checkbox, FormControlLabel, Grid, InputAdornment } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { useGetStaffListQuery, useRegisterUserMutation, useEditStaffMutation, useDeleteStaffMutation } from '../store/apiSlice';

const MODULES = [
  { label: 'Dashboard Access', path: '/' },
  { label: 'Live Feed Access', path: '/live-feed' },
  { label: 'Log Book Access', path: '/log-book' },
  { label: 'Enquiries Pipeline', path: '/crm' },
  { label: 'Active Work Orders', path: '/projects' },
  { label: 'Inventory', path: '/inventory' },
  { label: 'Machine Master', path: '/machines' },
  { label: 'Approvals', path: '/approvals' },
  { label: 'Dispatch & Packing', path: '/dispatch' },
  { label: 'In/Out Ledger', path: '/in-out-ledger' },
  { label: 'Waste Ledger', path: '/waste-ledger' },
  { label: 'HR & Payroll', path: '/hr' },
  { label: 'Admin Console', path: '/admin-console' },
];

const AdminConsole: React.FC = () => {
  const { data: staff, refetch } = useGetStaffListQuery();
  const [registerUser] = useRegisterUserMutation();
  const [editStaff] = useEditStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    staffId: '', // Mobile Number or Unique ID
    password: '',
    role: 'admin',
    modulesAccess: [] as string[]
  });

  // Filter out workers, keep admins and employees
  const admins = staff?.filter((u: any) => u.role === 'admin' || u.role === 'employee') || [];

  const handleOpen = () => {
    setIsEditing(false);
    setFormData({ name: '', staffId: '', password: '', role: 'admin', modulesAccess: [] });
    setOpen(true);
  };

  const handleEdit = (user: any) => {
    setIsEditing(true);
    setEditingId(user.id);
    setFormData({
      name: user.name,
      staffId: user.staffId || '',
      password: '',
      role: user.role,
      modulesAccess: user.modulesAccess || []
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this access?')) {
      await deleteStaff(id);
      refetch();
    }
  };

  const handleToggleModule = (path: string) => {
    setFormData(prev => {
      if (prev.modulesAccess.includes(path)) {
        return { ...prev, modulesAccess: prev.modulesAccess.filter(p => p !== path) };
      } else {
        return { ...prev, modulesAccess: [...prev.modulesAccess, path] };
      }
    });
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await editStaff({ id: editingId, data: formData }).unwrap();
      } else {
        await registerUser(formData).unwrap();
      }
      setOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.data?.message || 'Error saving user');
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: '100vh', borderRadius: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2, fontWeight: 'bold' }}>SYSTEM ACCESS</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Admin Console</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen} sx={{ borderRadius: 8, px: 3, py: 1.5, fontWeight: 'bold', color: 'black' }}>
          Create New Access
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.1)', borderRadius: 4, bgcolor: '#ffffff' }}>
        <Table>
          <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>USER DETAILS</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>LOGIN IDENTITY</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>MODULES ACCESS</TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.map((user: any) => (
              <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>{user.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Role: {user.role.toUpperCase()}</Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Chip label={'@' + (user.staffId || user.email.split('@')[0])} sx={{ bgcolor: 'rgba(255, 179, 54, 0.2)', color: '#B38B36', fontWeight: 'bold' }} size="small" />
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {user.role === 'admin' && (!user.modulesAccess || user.modulesAccess.length === 0) ? (
                      <Chip label="FULL ACCESS" size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50', fontWeight: 'bold', fontSize: '0.7rem' }} />
                    ) : (
                      user.modulesAccess?.map((path: string, i: number) => {
                        const mod = MODULES.find(m => m.path === path);
                        return mod ? (
                          <Chip key={i} label={mod.label.toUpperCase()} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.1)', color: 'text.primary', fontWeight: 'bold', fontSize: '0.7rem' }} />
                        ) : null;
                      })
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <IconButton sx={{ color: 'primary.main', bgcolor: 'rgba(0,0,0,0.04)', mr: 1 }} size="small" onClick={() => handleEdit(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton sx={{ color: 'error.main', bgcolor: 'rgba(0,0,0,0.04)' }} size="small" onClick={() => handleDelete(user.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {admins.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary', borderBottom: 'none' }}>
                  No admin users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#ffffff', borderRadius: 4, color: 'text.primary' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 2, pt: 3, px: 3 }}>
          <Typography variant="h5" fontWeight="bold">{isEditing ? 'Edit Access' : 'Create New Access'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>PERMISSIONS & CREDENTIALS</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid xs={12} sm={6}>
              <TextField 
                label="Full Name" 
                fullWidth 
                variant="outlined" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                slotProps={{
                  input: { sx: { color: 'text.primary', bgcolor: 'rgba(0,0,0,0.02)' } },
                  inputLabel: { sx: { color: 'text.secondary' } }
                }}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField 
                label="System Username / Unique ID" 
                fullWidth 
                variant="outlined" 
                value={formData.staffId} 
                onChange={e => setFormData({...formData, staffId: e.target.value})}
                slotProps={{
                  input: { sx: { color: 'text.primary', bgcolor: 'rgba(0,0,0,0.02)' } },
                  inputLabel: { sx: { color: 'text.secondary' } },
                  formHelperText: { sx: { color: 'text.secondary' } }
                }}
                helperText="They will use this to log in."
              />
            </Grid>
            <Grid xs={12}>
              <TextField 
                label="Access Password" 
                fullWidth 
                type="password"
                variant="outlined" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder={isEditing ? 'Leave blank to keep unchanged' : ''}
                slotProps={{
                  input: { sx: { color: 'text.primary', bgcolor: 'rgba(0,0,0,0.02)' } },
                  inputLabel: { sx: { color: 'text.secondary' } }
                }}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 4, mb: 2, fontWeight: 'bold', letterSpacing: 1, color: 'text.secondary' }}>ASSIGN MODULES ACCESS</Typography>
          <Grid container spacing={2}>
            {MODULES.map((mod, index) => {
              const isChecked = formData.modulesAccess.includes(mod.path);
              return (
                <Grid xs={12} sm={6} md={4} key={index}>
                  <Box 
                    onClick={() => handleToggleModule(mod.path)}
                    sx={{ 
                      p: 1.5, 
                      borderRadius: 2, 
                      border: '1px solid', 
                      borderColor: isChecked ? 'primary.main' : 'rgba(0,0,0,0.1)',
                      bgcolor: isChecked ? 'rgba(179, 139, 54, 0.1)' : 'rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Checkbox checked={isChecked} sx={{ color: 'text.secondary', '&.Mui-checked': { color: 'primary.main' } }} />
                    <Typography sx={{ fontWeight: isChecked ? 'bold' : 'normal', color: isChecked ? 'text.primary' : 'text.secondary' }}>
                      {mod.label}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" sx={{ borderRadius: 8, px: 3, fontWeight: 'bold', color: 'black' }}>
            {isEditing ? 'Update Access' : 'Create Access'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminConsole;
