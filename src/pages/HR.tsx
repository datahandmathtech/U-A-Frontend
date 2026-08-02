import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab, TextField, MenuItem, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetAttendanceQuery, useGetStaffSalaryQuery, useRegisterUserMutation, useGetStaffListQuery, useDeleteStaffMutation, useEditStaffMutation } from '../store/apiSlice';
import EditIcon from '@mui/icons-material/Edit';

const HR: React.FC = () => {
  const [tab, setTab] = useState(0);
  const { data: attendance, isLoading: attLoading } = useGetAttendanceQuery();
  const { data: staff, isLoading: staffLoading, refetch: refetchStaff } = useGetStaffSalaryQuery();
  const { data: staffList, isLoading: staffListLoading, refetch: refetchStaffList } = useGetStaffListQuery();
  const [registerUser, { isLoading: registering }] = useRegisterUserMutation();
  const [deleteStaff, { isLoading: deleting }] = useDeleteStaffMutation();

  const [staffData, setStaffData] = useState({ name: '', email: '', staffId: '', password: '', role: 'worker', department: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [editStaff] = useEditStaffMutation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStaffData, setEditingStaffData] = useState<any>(null);

  const handleCheckIn = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/hr/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gpsLocation: 'Office', photoUrl: '' })
      });
      window.location.reload();
    } catch (err) {
      console.error('Check-in failed', err);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerUser(staffData).unwrap();
      setSuccessMsg(`Staff ${staffData.name} created successfully! They can now login with Staff ID: ${staffData.staffId}`);
      setStaffData({ name: '', email: '', staffId: '', password: '', role: 'worker', department: '' });
      refetchStaff();
      refetchStaffList();
    } catch (err) {
      console.error(err);
      alert('Error creating staff');
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await deleteStaff(id).unwrap();
        setSuccessMsg(`Staff ${name} deleted successfully!`);
        refetchStaff();
        refetchStaffList();
      } catch (err) {
        console.error(err);
        alert('Error deleting staff');
      }
    }
  };

  const handleEditClick = (staff: any) => {
    setEditingStaffData({ id: staff.id, name: staff.name, staffId: staff.staffId || '', role: staff.role, department: staff.department || '', password: '' });
    setEditDialogOpen(true);
  };

  const handleUpdateStaff = async () => {
    try {
      await editStaff({ id: editingStaffData.id, data: editingStaffData }).unwrap();
      setSuccessMsg(`Staff ${editingStaffData.name} updated successfully!`);
      setEditDialogOpen(false);
      refetchStaffList();
    } catch (err) {
      console.error(err);
      alert('Error updating staff');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">HR & Payroll</Typography>
        <Button variant="contained" color="primary" startIcon={<FingerprintIcon />} onClick={handleCheckIn}>
          Mark Attendance (Check-in)
        </Button>
      </Box>

      <Paper sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Manage Staff" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <>
        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxWidth: 600 }}>
          <Typography variant="h6" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon /> Create New Staff
          </Typography>
          
          {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}
          
          <Box component="form" onSubmit={handleCreateStaff} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Full Name" fullWidth required 
                value={staffData.name} onChange={(e) => setStaffData({...staffData, name: e.target.value})}
              />
              <TextField 
                label="Username / Staff ID" fullWidth required 
                value={staffData.staffId} onChange={(e) => setStaffData({...staffData, staffId: e.target.value})}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Password" fullWidth required type="password"
                value={staffData.password} onChange={(e) => setStaffData({...staffData, password: e.target.value})}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Role" fullWidth select required
                value={staffData.role} onChange={(e) => setStaffData({...staffData, role: e.target.value})}
              >
                <MenuItem value="worker">Worker</MenuItem>
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
              <TextField 
                label="Department" fullWidth 
                value={staffData.department} onChange={(e) => setStaffData({...staffData, department: e.target.value})}
              />
            </Box>

            <Button type="submit" variant="contained" color="primary" size="large" disabled={registering}>
              {registering ? <CircularProgress size={24} /> : 'Create Staff Profile'}
            </Button>
          </Box>
        </Paper>
        <Box mt={4}>
          <Typography variant="h6" mb={2}>All Staff Members</Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: 'secondary.main' }}>
                <TableRow>
                  <TableCell><strong>Staff ID</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Department</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffListLoading ? (
                  <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
                ) : staffList?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">No staff found.</TableCell></TableRow>
                ) : (
                  staffList?.map((s: any) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.staffId || '-'}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell><Chip size="small" label={s.role} color={s.role === 'admin' ? 'secondary' : 'default'} /></TableCell>
                      <TableCell>{s.department || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            color="primary" 
                            variant="outlined" 
                            size="small" 
                            startIcon={<EditIcon />}
                            onClick={() => handleEditClick(s)}
                          >
                            Edit
                          </Button>
                          <Button 
                            color="error" 
                            variant="outlined" 
                            size="small" 
                            startIcon={<DeleteIcon />}
                            disabled={deleting}
                            onClick={() => handleDeleteStaff(s.id, s.name)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        
        {/* Edit Staff Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Staff</DialogTitle>
          <DialogContent dividers>
            {editingStaffData && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    label="Full Name" fullWidth required 
                    value={editingStaffData.name} onChange={(e) => setEditingStaffData({...editingStaffData, name: e.target.value})}
                  />
                  <TextField 
                    label="Staff ID" fullWidth required 
                    value={editingStaffData.staffId} onChange={(e) => setEditingStaffData({...editingStaffData, staffId: e.target.value})}
                  />
                </Box>
                <TextField 
                  label="New Password (leave blank to keep current)" fullWidth type="password"
                  value={editingStaffData.password} onChange={(e) => setEditingStaffData({...editingStaffData, password: e.target.value})}
                  helperText="Only fill this if you want to change their password."
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    label="Role" fullWidth select required
                    value={editingStaffData.role} onChange={(e) => setEditingStaffData({...editingStaffData, role: e.target.value})}
                  >
                    <MenuItem value="worker">Worker</MenuItem>
                    <MenuItem value="employee">Employee</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </TextField>
                  <TextField 
                    label="Department" fullWidth 
                    value={editingStaffData.department} onChange={(e) => setEditingStaffData({...editingStaffData, department: e.target.value})}
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStaff} variant="contained" color="primary">Save Changes</Button>
          </DialogActions>
        </Dialog>
        </>
      )}
    </Box>
  );
};

export default HR;
