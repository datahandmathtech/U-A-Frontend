import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TablePagination, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetProjectsQuery, useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation, useCreateSlabMutation } from '../store/apiSlice';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading, refetch } = useGetProjectsQuery();
  const [createProject] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [createSlab] = useCreateSlabMutation();
  const [open, setOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({ name: '', clientName: '', description: '', status: 'work_order', totalPieces: 0, deliveryDate: '', startDate: '', deadline: '', clientHandle: '' });

  const projectsData = projects;

  const handleOpen = (project?: any) => {
    if (project && project.id) {
      setEditingProjectId(project.id);
      setFormData({
        name: project.name || '',
        clientName: project.clientName || '',
        description: project.description || '',
        status: project.status || 'work_order',
        totalPieces: project.totalPieces || 0,
        products: [{ name: '', length: '', width: '', thickness: '', pieces: 0 }],
        deliveryDate: project.deliveryDate ? new Date(project.deliveryDate).toISOString().split('T')[0] : '',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
        clientHandle: project.clientHandle || ''
      });
    } else {
      setEditingProjectId(null);
      setFormData({ name: '', clientName: '', description: '', status: 'work_order', totalPieces: 0, products: [{ name: '', length: '', width: '', thickness: '', pieces: 0 }], deliveryDate: '', startDate: '', deadline: '', clientHandle: '' });
    }
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setEditingProjectId(null);
  };

  const handleSubmit = async () => {
    try {
      const existingProject = projectsData?.find((p: any) => p.id === editingProjectId);
      if (editingProjectId && existingProject) {
        await updateProject({ 
          id: editingProjectId, 
          data: {
            ...formData, 
            totalPieces: parseInt(formData.totalPieces) || 0,
            deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : undefined,
            startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
            deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
          } 
        }).unwrap();
      } else {
        const createdProject = await createProject({ 
          ...formData,
          totalPieces: formData.products ? formData.products.reduce((acc: number, p: any) => acc + (p.pieces || 0), 0) : 0,
          projectId: `U-A-${Math.floor(100 + Math.random() * 900)}`,
          status: 'production',
          isDirectWorkOrder: true,
          deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : undefined,
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        }).unwrap();
        
        // Create slabs for each product
        if (formData.products && formData.products.length > 0) {
           for (const prod of formData.products) {
             if (prod.name && prod.pieces > 0) {
               await createSlab({
                 projectId: createdProject.id,
                 name: prod.name,
                 size: `${prod.length}L x ${prod.width}W${prod.thickness ? ` | ${prod.thickness}MM` : ''}`,
                 cost: 0,
                 requiredStages: ['Production', 'Polishing', 'Packing', 'Dispatch'],
                 pieces: Array.from({ length: parseInt(prod.pieces) }).map((_, i) => ({
                   pieceNumber: i + 1,
                   size: `${prod.length}L x ${prod.width}W${prod.thickness ? ` | ${prod.thickness}MM` : ''}`,
                   status: 'pending',
                   stage: 'Production'
                 }))
               }).unwrap();
             }
           }
        }
        
        // Immediately navigate to Production step
        navigate(`/projects/${createdProject.id}?view=5`);
        return;
      }
      refetch();
      handleClose();
    } catch (err) {
      console.error('Failed to save work order', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      try {
        await deleteProject(id).unwrap();
      } catch (err) {
        console.error('Failed to delete project', err);
      }
    }
  };

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Only show active or completed work orders
  const workOrders = projects?.filter((p: any) => ['shop_drawing', 'material_planning', 'production', 'work_order', 'completed'].includes(p.status)) || [];

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 2, bgcolor: '#fcfbf9', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#222' }}>Active Work Orders</Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>List of all active projects for the current month.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpen()} 
          sx={{ 
            borderRadius: 8, 
            bgcolor: '#d59853', 
            color: '#fff',
            fontWeight: 'bold',
            px: 3,
            py: 1,
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(213,152,83,0.3)',
            '&:hover': { bgcolor: '#c28540' }
          }}
        >
          Direct Work Order
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ backgroundColor: '#F3EAE1' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Work Order ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Client Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Start Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Total Pieces</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Completed Pieces</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Remaining Pieces</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>End Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Client Handle</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#444', py: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>Loading...</TableCell></TableRow>
            ) : workOrders?.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>No active work orders found.</TableCell></TableRow>
            ) : (
              workOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((project: any) => {
                const totalPieces = project.totalPieces || 0;
                const completedPieces = project.completedPieces || 0;
                const remainingPieces = Math.max(0, totalPieces - completedPieces);
                
                let deliveryDateColor = '#333';
                const finalEndDate = project.deadline || project.deliveryDate;
                if (finalEndDate) {
                   const today = new Date();
                   const delivery = new Date(finalEndDate);
                   if (delivery < today) deliveryDateColor = '#d32f2f'; // overdue (red)
                   else if (delivery.getTime() - today.getTime() < 3 * 24 * 60 * 60 * 1000) deliveryDateColor = '#ed6c02'; // close (orange)
                   else deliveryDateColor = '#2e7d32'; // fine (green)
                }

                return (
                  <TableRow 
                    key={project.id} 
                    hover 
                    sx={{ 
                      cursor: 'pointer',
                      '& td': { borderBottom: '1px solid #f0f0f0', py: 2.5 }
                    }} 
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold', color: '#d59853', fontSize: '0.95rem' }}>
                        {project.projectId}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#333' }}>{project.clientName || project.name || '-'}</TableCell>
                    <TableCell sx={{ color: '#555' }}>
                      {project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ color: '#333', fontWeight: 'bold' }}>{totalPieces}</TableCell>
                    <TableCell align="center" sx={{ color: '#333' }}>{completedPieces}</TableCell>
                    <TableCell align="center" sx={{ color: '#333' }}>{remainingPieces}</TableCell>
                    <TableCell sx={{ color: deliveryDateColor, fontWeight: 'bold' }}>
                      {finalEndDate ? new Date(finalEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                    </TableCell>
                    <TableCell sx={{ color: '#333' }}>{project.clientHandle || project.assignedTo?.name || '-'}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpen(project); }} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleDelete(e, project.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#fff', borderTop: '1px solid #f0f0f0' }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 'bold' }}>
            Total Work Orders: {workOrders.length}
          </Typography>
          <TablePagination
            component="div"
            count={workOrders.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{ borderBottom: 'none' }}
          />
        </Box>
      </TableContainer>

      {/* Add Direct Work Order Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editingProjectId ? 'Edit Work Order' : 'Create Direct Work Order'}</DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField 
              label="Project Name" 
              fullWidth 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
            />
            <TextField 
              label="Client Name" 
              fullWidth 
              value={formData.clientName} 
              onChange={(e) => setFormData({...formData, clientName: e.target.value})} 
            />
            {!editingProjectId && (
              <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">Products / Materials</Typography>
                <Button 
                  size="small" 
                  startIcon={<AddIcon />} 
                  onClick={() => setFormData({ ...formData, products: [...(formData.products || []), { name: '', length: '', width: '', thickness: '', pieces: 0 }] })}
                >
                  Add Item
                </Button>
              </Box>
            )}

            {!editingProjectId && formData.products?.map((prod: any, index: number) => (
              <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: '1px solid #eee', borderRadius: 2, position: 'relative' }}>
                {formData.products.length > 1 && (
                  <IconButton 
                    size="small" 
                    color="error" 
                    sx={{ position: 'absolute', top: -10, right: -10, bgcolor: '#fff', boxShadow: 1, '&:hover': { bgcolor: '#ffebee' } }}
                    onClick={() => {
                      const newProds = [...formData.products];
                      newProds.splice(index, 1);
                      setFormData({ ...formData, products: newProds });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <TextField 
                  label="Product Name / Material Name" 
                  fullWidth 
                  size="small"
                  value={prod.name} 
                  onChange={(e) => {
                    const newProds = [...formData.products];
                    newProds[index].name = e.target.value;
                    setFormData({...formData, products: newProds});
                  }} 
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField 
                    label="Length (L)" 
                    size="small"
                    value={prod.length} 
                    onChange={(e) => {
                      const newProds = [...formData.products];
                      newProds[index].length = e.target.value;
                      setFormData({...formData, products: newProds});
                    }} 
                  />
                  <TextField 
                    label="Width (W)" 
                    size="small"
                    value={prod.width} 
                    onChange={(e) => {
                      const newProds = [...formData.products];
                      newProds[index].width = e.target.value;
                      setFormData({...formData, products: newProds});
                    }} 
                  />
                  <TextField 
                    label="Thickness (MM)" 
                    size="small"
                    value={prod.thickness} 
                    onChange={(e) => {
                      const newProds = [...formData.products];
                      newProds[index].thickness = e.target.value;
                      setFormData({...formData, products: newProds});
                    }} 
                  />
                  <TextField 
                    label="Pieces" 
                    type="number"
                    size="small"
                    value={prod.pieces} 
                    onChange={(e) => {
                      const newProds = [...formData.products];
                      newProds[index].pieces = parseInt(e.target.value) || 0;
                      setFormData({...formData, products: newProds});
                    }} 
                  />
                </Box>
              </Box>
            ))}

            <Box sx={{ display: 'flex', gap: 2, mt: editingProjectId ? 0 : 1 }}>
              {editingProjectId && (
                <TextField 
                  label="Total Pieces" 
                  type="number"
                  fullWidth 
                  value={formData.totalPieces} 
                  onChange={(e) => setFormData({...formData, totalPieces: parseInt(e.target.value) || 0})} 
                />
              )}
              <TextField 
                label="End Date" 
                type="date"
                fullWidth 
                slotProps={{ inputLabel: { shrink: true } }}
                value={formData.deadline || formData.deliveryDate} 
                onChange={(e) => setFormData({...formData, deadline: e.target.value, deliveryDate: e.target.value})} 
              />
            </Box>
            <TextField 
              label="Client Handle (Manager)" 
              fullWidth 
              value={formData.clientHandle} 
              onChange={(e) => setFormData({...formData, clientHandle: e.target.value})} 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#d59853', color: '#fff', '&:hover': { bgcolor: '#c28540' } }}>
            {editingProjectId ? 'Save Changes' : 'Start Work Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;
