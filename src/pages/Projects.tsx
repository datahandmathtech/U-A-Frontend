import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  TablePagination,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  LinearProgress,
  Tooltip,
  InputAdornment,
  Card
} from '@mui/material';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import WorkIcon from '@mui/icons-material/Work';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useCreateSlabMutation
} from '../store/apiSlice';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading, refetch } = useGetProjectsQuery();
  const [createProject] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [createSlab] = useCreateSlabMutation();

  const [open, setOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<any>({
    name: '',
    clientName: '',
    description: '',
    status: 'work_order',
    totalPieces: 0,
    products: [{ name: '', length: '', width: '', thickness: '', unit: 'inch' }],
    deliveryDate: '',
    startDate: '',
    deadline: '',
    clientHandle: ''
  });

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
        products: [{ name: '', length: '', width: '', thickness: '', unit: 'inch' }],
        deliveryDate: project.deliveryDate ? new Date(project.deliveryDate).toISOString().split('T')[0] : '',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
        clientHandle: project.clientHandle || ''
      });
    } else {
      setEditingProjectId(null);
      setFormData({
        name: '',
        clientName: '',
        description: '',
        status: 'work_order',
        totalPieces: 0,
        products: [{ name: '', length: '', width: '', thickness: '', unit: 'inch' }],
        deliveryDate: '',
        startDate: new Date().toISOString().split('T')[0],
        deadline: '',
        clientHandle: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProjectId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.clientName.trim()) {
      alert('Please provide Project Name and Client Name.');
      return;
    }
    try {
      const existingProject = projectsData?.find((p: any) => p.id === editingProjectId);
      if (editingProjectId && existingProject) {
        const { products, ...updatePayload } = formData;
        await updateProject({
          id: editingProjectId,
          data: {
            ...updatePayload,
            totalPieces: parseInt(formData.totalPieces) || 0,
            deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : undefined,
            startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
            deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined
          }
        }).unwrap();
      } else {
        const createdProject = await createProject({
          ...formData,
          totalPieces: 0,
          projectId: `U-A-${Math.floor(100 + Math.random() * 900)}`,
          status: 'production',
          isDirectWorkOrder: true,
          deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : undefined,
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined
        }).unwrap();

        // Create slabs for each product without automatically creating internal pieces
        if (formData.products && formData.products.length > 0) {
          for (const prod of formData.products) {
            if (prod.name && (prod.length || prod.width)) {
              const unitLabel = prod.unit === 'feet' || prod.unit === 'sq_ft' ? 'Feet' : 'Inch';
              const calcSqFt = (
                prod.unit === 'feet' || prod.unit === 'sq_ft'
                  ? (parseFloat(prod.length) || 0) * (parseFloat(prod.width) || 0)
                  : ((parseFloat(prod.length) || 0) * (parseFloat(prod.width) || 0)) / 144
              ).toFixed(2);

              const sizeFormatted = `${prod.length || 0}L x ${prod.width || 0}W ${unitLabel}${prod.thickness ? ` | ${prod.thickness}MM` : ''} (${calcSqFt} Sq.Ft)`;

              await createSlab({
                projectId: createdProject.id,
                name: prod.name,
                size: sizeFormatted,
                cost: 0,
                requiredStages: ['Production', 'Polishing', 'Packing', 'Dispatch']
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
      alert('Failed to save work order. Please try again.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
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
  const workOrders = useMemo(() => {
    return (
      projects?.filter((p: any) =>
        ['shop_drawing', 'material_planning', 'production', 'work_order', 'completed'].includes(p.status)
      ) || []
    );
  }, [projects]);

  // Metric Computations
  const stats = useMemo(() => {
    const totalOrders = workOrders.length;
    let totalPieces = 0;
    let completedPieces = 0;
    let overdueCount = 0;
    const today = new Date();

    workOrders.forEach((wo: any) => {
      totalPieces += wo.totalPieces || 0;
      completedPieces += wo.completedPieces || 0;
      const targetDate = wo.deadline || wo.deliveryDate;
      if (targetDate && new Date(targetDate) < today && wo.status !== 'completed') {
        overdueCount++;
      }
    });

    const completionRate = totalPieces > 0 ? Math.round((completedPieces / totalPieces) * 100) : 0;

    return { totalOrders, totalPieces, completedPieces, overdueCount, completionRate };
  }, [workOrders]);

  // Filter by Search Query
  const filteredWorkOrders = useMemo(() => {
    if (!searchQuery.trim()) return workOrders;
    const q = searchQuery.toLowerCase().trim();
    return workOrders.filter((p: any) => {
      return (
        p.projectId?.toLowerCase().includes(q) ||
        p.clientName?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.clientHandle?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    });
  }, [workOrders, searchQuery]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Top Header Banner */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>
              Active Work Orders
            </Typography>
            <Chip
              label={`${workOrders.length} Active`}
              size="small"
              sx={{
                bgcolor: '#FFF4E5',
                color: '#B38B36',
                fontWeight: 700,
                border: '1px solid #FFE0B2',
                borderRadius: '8px'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
            Track machine production progress, piece completions, and delivery deadlines in real time.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            bgcolor: '#C89F5A',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            px: 2.5,
            py: 1,
            borderRadius: 3,
            boxShadow: '0 4px 14px rgba(200, 159, 90, 0.35)',
            textTransform: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: '#B38B36',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 18px rgba(200, 159, 90, 0.45)'
            }
          }}
        >
          Direct Work Order
        </Button>
      </Box>

      {/* 2. Executive KPI Cards Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Active Orders */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #EAE0D5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Active Work Orders
              </Typography>
              <Avatar sx={{ bgcolor: '#FFF4E5', color: '#B38B36', width: 34, height: 34 }}>
                <WorkIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.totalOrders}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              Live production lines
            </Typography>
          </Card>
        </Grid>

        {/* Pieces In Production */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Pieces In Production
              </Typography>
              <Avatar sx={{ bgcolor: '#F0F9FF', color: '#0284C7', width: 34, height: 34 }}>
                <PrecisionManufacturingIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.totalPieces}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              Total stone pieces scheduled
            </Typography>
          </Card>
        </Grid>

        {/* Completed Pieces */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Completed Pieces
              </Typography>
              <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 34, height: 34 }}>
                <CheckCircleIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.completedPieces}
            </Typography>
            <Typography variant="caption" sx={{ color: '#059669', mt: 0.5, display: 'block', fontWeight: 600 }}>
              {stats.completionRate}% Overall Completion Rate
            </Typography>
          </Card>
        </Grid>

        {/* Overdue / Due Deadlines */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: stats.overdueCount > 0 ? '#FEF2F2' : '#FFFFFF',
              border: '1px solid',
              borderColor: stats.overdueCount > 0 ? '#FCA5A5' : '#E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: stats.overdueCount > 0 ? '#DC2626' : '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Attention / Overdue
              </Typography>
              <Avatar sx={{ bgcolor: stats.overdueCount > 0 ? '#FEE2E2' : '#F1F5F9', color: stats.overdueCount > 0 ? '#DC2626' : '#94A3B8', width: 34, height: 34 }}>
                <WarningAmberIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: stats.overdueCount > 0 ? '#DC2626' : '#1E293B', lineHeight: 1.1 }}>
              {stats.overdueCount}
            </Typography>
            <Typography variant="caption" sx={{ color: stats.overdueCount > 0 ? '#DC2626' : '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              {stats.overdueCount > 0 ? 'Orders past delivery deadline' : 'All orders on schedule'}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Search Bar Control */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          bgcolor: '#FFFFFF',
          borderRadius: 3.5,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <TextField
          size="small"
          placeholder="Search by Work Order ID, client name, title, manager..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: '#F8FAFC',
              '& fieldset': { borderColor: '#E2E8F0' },
              '&:hover fieldset': { borderColor: '#CBD5E1' }
            }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }
          }}
        />
        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
          Showing <strong>{filteredWorkOrders.length}</strong> of {workOrders.length} orders
        </Typography>
      </Paper>

      {/* 4. Work Orders Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 4,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 850 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>WORK ORDER ID / TITLE</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>CLIENT & MANAGER</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>START DATE</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8, minWidth: 160 }}>PRODUCTION PROGRESS</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>DEADLINE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  Loading Work Orders...
                </TableCell>
              </TableRow>
            ) : filteredWorkOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Avatar sx={{ bgcolor: '#FFF4E5', color: '#B38B36', width: 54, height: 54, mx: 'auto', mb: 1.5 }}>
                    <WorkIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
                    No Work Orders Found
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    {searchQuery ? 'Try clearing your search query.' : 'Create a Direct Work Order or convert an enquiry.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((project: any) => {
                const totalPieces = project.totalPieces || 0;
                const completedPieces = project.completedPieces || 0;
                const remainingPieces = Math.max(0, totalPieces - completedPieces);
                const percent = totalPieces > 0 ? Math.round((completedPieces / totalPieces) * 100) : 0;

                const finalEndDate = project.deadline || project.deliveryDate;
                let statusChip = { label: 'On Schedule', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };

                if (finalEndDate) {
                  const today = new Date();
                  const delivery = new Date(finalEndDate);
                  const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  if (diffDays < 0 && project.status !== 'completed') {
                    statusChip = { label: `Overdue by ${Math.abs(diffDays)}d`, color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' };
                  } else if (diffDays <= 3 && project.status !== 'completed') {
                    statusChip = { label: `Due in ${diffDays}d`, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
                  }
                }

                return (
                  <TableRow
                    key={project.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: '#FBFBFC' }
                    }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {/* ID & Title */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: '#FFF4E5',
                            color: '#B38B36',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            width: 38,
                            height: 38,
                            border: '1.5px solid #FFE0B2'
                          }}
                        >
                          {project.clientName ? project.clientName.charAt(0).toUpperCase() : 'W'}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Chip
                              label={project.projectId || 'WO'}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                bgcolor: '#FFF4E5',
                                color: '#B38B36',
                                borderRadius: 1
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                              {project.name}
                            </Typography>
                          </Box>
                          {project.description && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#64748B',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                maxWidth: 220,
                                mt: 0.25
                              }}
                            >
                              {project.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Client & Handle */}
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {project.clientName || '—'}
                      </Typography>
                      {project.clientHandle && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <PersonIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            {project.clientHandle}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>

                    {/* Start Date */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarMonthIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                          {project.startDate
                            ? new Date(project.startDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '—'}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Production Progress Bar */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ width: '100%', maxWidth: 180 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E293B' }}>
                            {completedPieces} / {totalPieces} Pcs
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#B38B36' }}>
                            {percent}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#E2E8F0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: percent === 100 ? '#10B981' : '#C89F5A',
                              borderRadius: 3
                            }
                          }}
                        />
                      </Box>
                    </TableCell>

                    {/* Deadline */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
                          {finalEndDate
                            ? new Date(finalEndDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'No deadline'}
                        </Typography>
                        {finalEndDate && (
                          <Chip
                            label={statusChip.label}
                            size="small"
                            sx={{
                              height: 19,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: statusChip.bg,
                              color: statusChip.color,
                              border: `1px solid ${statusChip.border}`
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" sx={{ py: 2 }} onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Open Work Order Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            sx={{ bgcolor: '#FFF4E5', color: '#B38B36', '&:hover': { bgcolor: '#FFE0B2' } }}
                          >
                            <ArrowForwardIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Work Order">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpen(project);
                            }}
                            sx={{ color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Work Order">
                          <IconButton
                            size="small"
                            onClick={(e) => handleDelete(e, project.id)}
                            sx={{ color: '#94A3B8', '&:hover': { bgcolor: '#FEF2F2', color: '#EF4444' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            Total Work Orders: <strong>{filteredWorkOrders.length}</strong>
          </Typography>
          <TablePagination
            component="div"
            count={filteredWorkOrders.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{ borderBottom: 'none' }}
          />
        </Box>
      </TableContainer>

      {/* 5. Add / Edit Direct Work Order Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
            }
          }
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
              {editingProjectId ? 'Edit Work Order Details' : 'Create Direct Work Order'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Setup project items, slab sizes, and production schedule directly.
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: '#94A3B8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Section 1: Project Information */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                1. Basic Work Order Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Project Name *"
                    fullWidth
                    size="small"
                    placeholder="e.g. Royal Heritage Marble Facade"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Client Name *"
                    fullWidth
                    size="small"
                    placeholder="e.g. Anand Mahindra"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Client Manager / Handle"
                    fullWidth
                    size="small"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.clientHandle}
                    onChange={(e) => setFormData({ ...formData, clientHandle: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Target Deadline / Delivery Date"
                    type="date"
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={formData.deadline || formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value, deliveryDate: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section 2: Products & Slabs */}
            {!editingProjectId && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    2. Product Slabs & Dimensions
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        products: [...(formData.products || []), { name: '', length: '', width: '', thickness: '', unit: 'inch' }]
                      })
                    }
                    sx={{
                      bgcolor: '#FFFDF5',
                      color: '#B38B36',
                      fontWeight: 700,
                      borderRadius: 2,
                      border: '1px solid #FFE0B2',
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#FFF4E5' }
                    }}
                  >
                    + Add Product Slab
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {formData.products?.map((prod: any, index: number) => {
                    const isFeet = prod.unit === 'feet' || prod.unit === 'sq_ft';
                    const l = parseFloat(prod.length) || 0;
                    const w = parseFloat(prod.width) || 0;
                    const area = isFeet ? l * w : (l * w) / 144;

                    return (
                      <Paper
                        key={index}
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: 3,
                          position: 'relative'
                        }}
                      >
                        {formData.products.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              const newProds = [...formData.products];
                              newProds.splice(index, 1);
                              setFormData({ ...formData, products: newProds });
                            }}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              bgcolor: '#FEF2F2',
                              color: '#EF4444',
                              p: 0.4,
                              '&:hover': { bgcolor: '#FEE2E2' }
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}

                        <Grid container spacing={1.5} alignItems="center">
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                              label="Product / Material Name"
                              fullWidth
                              size="small"
                              placeholder="e.g. Italian White Marble"
                              value={prod.name}
                              onChange={(e) => {
                                const newProds = [...formData.products];
                                newProds[index].name = e.target.value;
                                setFormData({ ...formData, products: newProds });
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField
                              label="Length (L)"
                              size="small"
                              fullWidth
                              type="number"
                              value={prod.length}
                              onChange={(e) => {
                                const newProds = [...formData.products];
                                newProds[index].length = e.target.value;
                                setFormData({ ...formData, products: newProds });
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField
                              label="Width (W)"
                              size="small"
                              fullWidth
                              type="number"
                              value={prod.width}
                              onChange={(e) => {
                                const newProds = [...formData.products];
                                newProds[index].width = e.target.value;
                                setFormData({ ...formData, products: newProds });
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Unit</InputLabel>
                              <Select
                                label="Unit"
                                value={prod.unit || 'inch'}
                                onChange={(e) => {
                                  const newProds = [...formData.products];
                                  newProds[index].unit = e.target.value;
                                  setFormData({ ...formData, products: newProds });
                                }}
                              >
                                <MenuItem value="inch">Inch</MenuItem>
                                <MenuItem value="feet">Feet (Sq.Ft)</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField
                              label="Thickness (MM)"
                              size="small"
                              fullWidth
                              type="number"
                              value={prod.thickness}
                              onChange={(e) => {
                                const newProds = [...formData.products];
                                newProds[index].thickness = e.target.value;
                                setFormData({ ...formData, products: newProds });
                              }}
                            />
                          </Grid>
                        </Grid>

                        {l > 0 && w > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Chip
                              size="small"
                              label={`Calculated Area: ${area.toFixed(2)} Sq.Ft`}
                              sx={{
                                bgcolor: '#FFF4E5',
                                border: '1px solid #FFE0B2',
                                color: '#B38B36',
                                fontWeight: 700,
                                fontSize: '0.72rem'
                              }}
                            />
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Editing: Total Pieces */}
            {editingProjectId && (
              <Box>
                <TextField
                  label="Total Pieces"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.totalPieces}
                  onChange={(e) => setFormData({ ...formData, totalPieces: parseInt(e.target.value) || 0 })}
                />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC' }}>
          <Button onClick={handleClose} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              bgcolor: '#C89F5A',
              color: '#FFF',
              fontWeight: 700,
              px: 3,
              borderRadius: 2.5,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(200, 159, 90, 0.3)',
              '&:hover': { bgcolor: '#B38B36' }
            }}
          >
            {editingProjectId ? 'Save Changes' : 'Start Work Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;
