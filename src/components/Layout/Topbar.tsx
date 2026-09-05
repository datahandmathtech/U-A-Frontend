import React, { useState } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Menu, MenuItem, Divider, ListItemText, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useGetProjectByIdQuery, useUpdateProjectMutation } from '../../store/apiSlice';

interface TopbarProps {
  handleDrawerToggle: () => void;
  drawerWidth: number;
}

const Topbar: React.FC<TopbarProps> = ({ handleDrawerToggle, drawerWidth }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const renderMenuItem = (label: string, stepIndex: number, viewParam: number) => {
    const isDirectSkipped = project?.isDirectWorkOrder && stepIndex < 5;
    const isCompleted = !isDirectSkipped && dbStep > stepIndex;
    const isCurrent = dbStep === stepIndex;
    
    return (
      <MenuItem onClick={() => { handleMenuClose(); navigate(`/${isProjectActive ? 'projects' : 'crm'}/${projectId}?view=${viewParam}`); }} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.5, pl: 3 }}>
         {isCompleted ? <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.2 }} /> : isCurrent ? <RadioButtonCheckedIcon color="primary" fontSize="small" sx={{ mt: 0.2 }} /> : <RadioButtonUncheckedIcon color="disabled" fontSize="small" sx={{ mt: 0.2 }} />}
         <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" fontWeight={isCurrent ? 'bold' : 'medium'} color={isCompleted || isCurrent ? 'text.primary' : 'text.secondary'}>
              {label}
            </Typography>
            {isCompleted ? (
              <Typography variant="caption" color="success.main">Completed</Typography>
            ) : isCurrent ? (
              <Typography variant="caption" color="primary.main">In Progress</Typography>
            ) : isDirectSkipped ? (
              <Typography variant="caption" color="text.disabled">Skipped (Direct Work Order)</Typography>
            ) : null}
         </Box>
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
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setCrmOpen(false);
    setProjectOpen(false);
  };

  const handleCrmToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCrmOpen(prev => !prev);
  };

  const handleProjectToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setProjectOpen(prev => !prev);
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
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: 'none',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
          <img src="/logo.png" alt="Unnati Arts" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>
            ERP
          </Typography>
        </Box>
        <Box>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            color="inherit"
            onClick={handleMenuOpen}
          >
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {isProjectPage && (
              <>
                <MenuItem onClick={() => {
                  handleMenuClose();
                  navigate(pageType === 'crm' ? '/crm' : '/projects');
                }} sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  <ListItemText primary={pageType === 'crm' ? "← Back to Pipeline" : "← Back to Projects"} />
                </MenuItem>
                
                <Divider />
                <MenuItem sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 0 }}>
                  <Box 
                    onClick={() => { handleMenuClose(); navigate(`/crm/${projectId}`); }} 
                    sx={{ flexGrow: 1, py: 1, pl: 2, cursor: 'pointer' }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>CRM Details</Typography>
                  </Box>
                  <IconButton onClick={(e) => { e.stopPropagation(); handleCrmToggle(e); }} size="small" sx={{ mr: 1 }}>
                    {crmOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </IconButton>
                </MenuItem>
                <Collapse in={crmOpen} timeout="auto" unmountOnExit>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {renderMenuItem("Enquiry Details", 0, 0)}
                    {renderMenuItem("Reference Design", 1, 1)}
                    {renderMenuItem("Costing & Quotation", 2, 2)}
                    {renderMenuItem("Advance Payment", 3, 3)}
                  </Box>
                </Collapse>

                {isProjectActive && (
                  <>
                    <Divider />
                    <MenuItem sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 0 }}>
                      <Box 
                        onClick={() => { handleMenuClose(); navigate(`/projects/${projectId}`); }} 
                        sx={{ flexGrow: 1, py: 1, pl: 2, cursor: 'pointer' }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Project Details</Typography>
                      </Box>
                      <IconButton onClick={(e) => { e.stopPropagation(); handleProjectToggle(e); }} size="small" sx={{ mr: 1 }}>
                        {projectOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </MenuItem>
                    <Collapse in={projectOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <MenuItem onClick={handleOpenDateDialog} sx={{ pl: 3, py: 1.5 }}>
                          <ListItemText primary="Project Start & End Dates" slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 'medium' } }} />
                        </MenuItem>
                        {renderMenuItem("Shop Drawing & Approval", 4, 4)}
                        {renderMenuItem("Production", 5, 5)}
                        {renderMenuItem("Work Order Active", 6, 6)}
                      </Box>
                    </Collapse>
                  </>
                )}

                {/* Back to Active Step goes to /projects/:id if active, else /crm/:id */}
                {location.search.includes('view=') && (
                  <>
                    <Divider />
                    <MenuItem onClick={() => {
                      handleMenuClose();
                      navigate(isProjectActive ? `/projects/${projectId}` : `/crm/${projectId}`);
                    }} sx={{ color: 'secondary.main', fontWeight: 'bold' }}>
                      <ListItemText primary="Back to Active Step" />
                    </MenuItem>
                  </>
                )}
                <Divider />
              </>
            )}
            <MenuItem onClick={handleLogout}>
              <ListItemText primary="Logout" />
            </MenuItem>
          </Menu>
        </Box>

        <Dialog open={isDateDialogOpen} onClose={() => setIsDateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Project Dates</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <TextField 
                label="Project Start Date" 
                type="date"
                fullWidth 
                slotProps={{ inputLabel: { shrink: true } }}
                value={dateFormData.startDate} 
                onChange={(e) => setDateFormData({...dateFormData, startDate: e.target.value})} 
              />
              <TextField 
                label="Project End Date" 
                type="date"
                fullWidth 
                slotProps={{ inputLabel: { shrink: true } }}
                value={dateFormData.deadline} 
                onChange={(e) => setDateFormData({...dateFormData, deadline: e.target.value})} 
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsDateDialogOpen(false)} color="inherit">Cancel</Button>
            <Button variant="contained" onClick={handleSaveDates}>Save</Button>
          </DialogActions>
        </Dialog>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
