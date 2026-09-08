import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Avatar,
  Chip,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useGetProjectByIdQuery, useUpdateProjectMutation } from '../../store/apiSlice';

interface TopbarProps {
  handleDrawerToggle: () => void;
  drawerWidth: number;
}

const Topbar: React.FC<TopbarProps> = ({ handleDrawerToggle, drawerWidth }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state: any) => state.auth.user);
  const isSuperAdmin = user?.role === 'admin' && (!user?.modulesAccess || user.modulesAccess.length === 0);
  const hasCrmAccess = isSuperAdmin || (Array.isArray(user?.modulesAccess) && user.modulesAccess.includes('/crm'));

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [crmOpen, setCrmOpen] = React.useState(false);
  const [projectOpen, setProjectOpen] = React.useState(false);

  // Parse path to see if we are on a project/crm details page
  const match = location.pathname.match(/\/(crm|projects)\/([a-fA-F0-9-]+|[0-9a-fA-F]{24})/);
  const isProjectPage = !!match;
  const pageType = match ? match[1] : ''; // 'crm' or 'projects'
  const projectId = match ? match[2] : '';

  const { data: project } = useGetProjectByIdQuery(projectId, { skip: !projectId });

  const getStepIndex = (status: string) => {
    if (status === 'enquiry') return 0;
    if (status === 'design_sharing') return 1;
    if (status === 'quotation') return 2;
    if (status === 'advance_payment') return 3;
    if (status === 'shop_drawing') return 4;
    if (status === 'production') return 5;
    if (status === 'work_order' || status === 'completed') return 6;
    return 0;
  };

  const dbStep = project ? getStepIndex(project.status) : 0;

  const renderMenuItem = (label: string, stepNumber: number, stepIndex: number, viewParam: number) => {
    const isDirectSkipped = project?.isDirectWorkOrder && stepIndex < 5;
    const isCompleted = !isDirectSkipped && dbStep > stepIndex;
    const isCurrent = dbStep === stepIndex;
    const targetPath = stepIndex < 4 ? `/crm/${projectId}` : `/projects/${projectId}`;

    return (
      <MenuItem
        key={label}
        onClick={() => {
          handleMenuClose();
          navigate(`${targetPath}?view=${viewParam}`);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          py: 1.25,
          px: 2,
          mx: 1,
          my: 0.5,
          borderRadius: 2.5,
          bgcolor: isCurrent ? '#FFFDF5' : 'transparent',
          border: '1px solid',
          borderColor: isCurrent ? '#C89F5A' : 'transparent',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: isCurrent ? '#FFF8EB' : '#F8FAFC',
            transform: 'translateX(2px)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isCompleted ? (
            <Avatar sx={{ width: 26, height: 26, bgcolor: '#ECFDF5', color: '#10B981' }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
            </Avatar>
          ) : isCurrent ? (
            <Avatar sx={{ width: 26, height: 26, bgcolor: '#FFF4E5', color: '#C89F5A', border: '1.5px solid #C89F5A' }}>
              <RadioButtonCheckedRoundedIcon sx={{ fontSize: 18 }} />
            </Avatar>
          ) : (
            <Avatar sx={{ width: 26, height: 26, bgcolor: '#F1F5F9', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700 }}>
              {stepNumber}
            </Avatar>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                color: isCurrent ? '#1E293B' : isCompleted ? '#334155' : '#64748B',
                fontSize: '0.85rem'
              }}
            >
              {label}
            </Typography>
          </Box>
        </Box>

        {isCompleted ? (
          <Chip label="Completed" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#ECFDF5', color: '#059669' }} />
        ) : isCurrent ? (
          <Chip label="In Progress" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#FFF4E5', color: '#B38B36', border: '1px solid #FFE0B2' }} />
        ) : isDirectSkipped ? (
          <Chip label="Skipped" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#F1F5F9', color: '#94A3B8' }} />
        ) : null}
      </MenuItem>
    );
  };

  const [updateProject] = useUpdateProjectMutation();
  const isProjectActive = project ? ['shop_drawing', 'material_planning', 'production', 'work_order', 'completed'].includes(project.status) : false;

  // Edit Dates Dialog State
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [dateFormData, setDateFormData] = useState({ startDate: '', deadline: '' });

  const handleOpenDateDialog = () => {
    handleMenuClose();
    setDateFormData({
      startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      deadline: project?.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
    });
    setIsDateDialogOpen(true);
  };

  const handleSaveDates = async () => {
    try {
      if (projectId) {
        await updateProject({
          id: projectId,
          data: {
            startDate: dateFormData.startDate ? new Date(dateFormData.startDate).toISOString() : undefined,
            deadline: dateFormData.deadline ? new Date(dateFormData.deadline).toISOString() : undefined
          }
        }).unwrap();
      }
      setIsDateDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setCrmOpen(false);
    setProjectOpen(false);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCrmToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCrmOpen((prev) => !prev);
  };

  const handleProjectToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setProjectOpen((prev) => !prev);
  };

  const handleLogout = () => {
    handleMenuClose();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backgroundColor: '#FFFFFF',
        color: '#1E293B',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        borderBottom: '1px solid #E2E8F0'
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px', fontSize: '1.1rem' }}>
              Unnati Arts
            </Typography>
            <Chip
              label="ERP v2.0"
              size="small"
              sx={{
                bgcolor: '#FFF4E5',
                color: '#B38B36',
                fontWeight: 800,
                fontSize: '0.68rem',
                height: 20,
                border: '1px solid #FFE0B2',
                borderRadius: 1
              }}
            />
          </Box>
        </Box>

        {/* User Profile & Project Stepper Quick Trigger */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isProjectPage && project && (
            <Chip
              icon={<LayersRoundedIcon sx={{ fontSize: '15px !important', color: '#B38B36 !important' }} />}
              label={`${project.projectId || 'Project'}: ${project.name || ''}`}
              size="small"
              onClick={handleMenuOpen}
              sx={{
                bgcolor: '#FFFDF5',
                color: '#1E293B',
                fontWeight: 700,
                fontSize: '0.78rem',
                border: '1px solid #C89F5A',
                cursor: 'pointer',
                display: { xs: 'none', md: 'flex' },
                '&:hover': { bgcolor: '#FFF4E5' }
              }}
            />
          )}

          <Tooltip title="Account & Navigation Menu">
            <Button
              onClick={handleMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                textTransform: 'none',
                p: 0.5,
                pl: 1.25,
                pr: 1.5,
                borderRadius: 4,
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: '#F1F5F9', borderColor: '#CBD5E1' }
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#C89F5A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B', lineHeight: 1.1, fontSize: '0.82rem' }}>
                  {user?.name || 'User Account'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', lineHeight: 1, fontSize: '0.7rem' }}>
                  {user?.role === 'admin' ? 'Administrator' : 'Staff'}
                </Typography>
              </Box>
              <ExpandMore sx={{ fontSize: 18, color: '#64748B' }} />
            </Button>
          </Tooltip>

          {/* User & Project Navigation Popover Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: {
                  width: 360,
                  maxHeight: '90vh',
                  borderRadius: 3.5,
                  p: 0.5,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                  border: '1px solid #E2E8F0'
                }
              }
            }}
          >
            {/* User Profile Card Header */}
            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2.5, m: 1, mb: 1.5, border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: '#C89F5A', color: '#FFF', fontWeight: 700, fontSize: '1.1rem' }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body1" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.2, noWrap: true }}>
                    {user?.name || 'Logged User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', noWrap: true }}>
                    {user?.email || 'admin@unnatiarts.com'}
                  </Typography>
                  <Chip
                    icon={<ShieldRoundedIcon sx={{ fontSize: '13px !important', color: '#B38B36 !important' }} />}
                    label={user?.role === 'admin' ? 'Super Administrator' : 'Staff Member'}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, mt: 0.5, bgcolor: '#FFF4E5', color: '#B38B36' }}
                  />
                </Box>
              </Box>
            </Box>

            {isProjectPage && (
              <>
                {/* Back to pipeline link */}
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate(pageType === 'crm' ? '/crm' : '/projects');
                  }}
                  sx={{
                    mx: 1,
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: '#FFFDF5',
                    color: '#B38B36',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: '1px solid #FFE0B2',
                    '&:hover': { bgcolor: '#FFF4E5' }
                  }}
                >
                  <ArrowBackRoundedIcon sx={{ fontSize: 16, mr: 1 }} />
                  {pageType === 'crm' ? 'Back to Enquiries Pipeline' : 'Back to Active Work Orders'}
                </MenuItem>

                {/* CRM 4-Step Stepper */}
                {hasCrmAccess && (
                  <Box sx={{ mb: 1 }}>
                    <Box
                      onClick={handleCrmToggle}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 0.75,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#F8FAFC' }
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        CRM Pipeline Flow (Steps 1–4)
                      </Typography>
                      {crmOpen ? <ExpandLess sx={{ fontSize: 18, color: '#94A3B8' }} /> : <ExpandMore sx={{ fontSize: 18, color: '#94A3B8' }} />}
                    </Box>

                    <Collapse in={crmOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {renderMenuItem('1. Enquiry Details', 1, 0, 0)}
                        {renderMenuItem('2. Reference Design', 2, 1, 1)}
                        {renderMenuItem('3. Costing & Quotation', 3, 2, 2)}
                        {renderMenuItem('4. Advance Payment', 4, 3, 3)}
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Production 3-Step Stepper */}
                {(isProjectActive || pageType === 'projects') && (
                  <Box sx={{ mb: 1 }}>
                    <Divider sx={{ my: 1 }} />
                    <Box
                      onClick={handleProjectToggle}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 0.75,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#F8FAFC' }
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Production Execution (Steps 5–7)
                      </Typography>
                      {projectOpen ? <ExpandLess sx={{ fontSize: 18, color: '#94A3B8' }} /> : <ExpandMore sx={{ fontSize: 18, color: '#94A3B8' }} />}
                    </Box>

                    <Collapse in={projectOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <MenuItem
                          onClick={handleOpenDateDialog}
                          sx={{
                            mx: 1,
                            my: 0.5,
                            borderRadius: 2,
                            py: 1,
                            px: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#475569',
                            '&:hover': { bgcolor: '#F8FAFC' }
                          }}
                        >
                          <EventRoundedIcon sx={{ fontSize: 18, color: '#C89F5A' }} />
                          Project Start & End Dates
                        </MenuItem>
                        {renderMenuItem('5. Shop Drawing & Approval', 5, 4, 4)}
                        {renderMenuItem('6. Production Tracking', 6, 5, 5)}
                        {renderMenuItem('7. Work Order Active', 7, 6, 6)}
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Back to Active Step */}
                {location.search.includes('view=') && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <MenuItem
                      onClick={() => {
                        handleMenuClose();
                        navigate(isProjectActive ? `/projects/${projectId}` : `/crm/${projectId}`);
                      }}
                      sx={{
                        mx: 1,
                        my: 0.5,
                        borderRadius: 2,
                        bgcolor: '#EEF2FF',
                        color: '#4F46E5',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        '&:hover': { bgcolor: '#E0E7FF' }
                      }}
                    >
                      <ArrowForwardRoundedIcon sx={{ fontSize: 16, mr: 1 }} />
                      Back to Current Active Stage
                    </MenuItem>
                  </>
                )}
                <Divider sx={{ my: 1 }} />
              </>
            )}

            {/* Logout Action */}
            <MenuItem
              onClick={handleLogout}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 2,
                color: '#EF4444',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                '&:hover': { bgcolor: '#FEF2F2' }
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 18 }} />
              Sign Out
            </MenuItem>
          </Menu>
        </Box>

        {/* Project Dates Dialog */}
        <Dialog
          open={isDateDialogOpen}
          onClose={() => setIsDateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3.5,
                boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
              }
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#1E293B' }}>Edit Project Dates & Timeline</DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Project Start Date"
                type="date"
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={dateFormData.startDate}
                onChange={(e) => setDateFormData({ ...dateFormData, startDate: e.target.value })}
              />
              <TextField
                label="Project Deadline / Delivery Date"
                type="date"
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={dateFormData.deadline}
                onChange={(e) => setDateFormData({ ...dateFormData, deadline: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#F8FAFC' }}>
            <Button onClick={() => setIsDateDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveDates}
              sx={{
                bgcolor: '#C89F5A',
                color: '#FFF',
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': { bgcolor: '#B38B36' }
              }}
            >
              Save Timeline
            </Button>
          </DialogActions>
        </Dialog>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
