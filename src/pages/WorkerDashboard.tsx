import React, { useState } from 'react';
import { Box, Typography, Button, Paper, TextField, MenuItem, CircularProgress, Alert, Snackbar, Divider, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, Autocomplete, RadioGroup, FormControlLabel, Radio, FormControl, Grid } from '@mui/material';
import { useGetMachinesQuery, usePunchInMutation, usePunchOutMutation, useGetActiveSessionQuery, useMachineClockInMutation, useGetDailyMachineLogsQuery, useMachineClockOutMutation, useCreateMaterialLogMutation, useGetStaffListQuery, useGetActiveOutLogsQuery, useGetProjectsQuery, useGetVendorsQuery } from '../store/apiSlice';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import OutputIcon from '@mui/icons-material/Output';
import InputIcon from '@mui/icons-material/Input';
import InventoryIcon from '@mui/icons-material/Inventory';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const ImageUploadBox = ({ label, previewUrl, onClick }: { label: string, previewUrl: string, onClick: () => void }) => {
  return (
    <Box sx={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
      <Box 
        onClick={onClick}
        sx={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: 120, border: '2px dashed', borderColor: previewUrl ? 'success.main' : 'divider',
          borderRadius: 3, bgcolor: previewUrl ? 'success.light' : 'rgba(0,0,0,0.02)',
          cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'all 0.2s',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
        }}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <Box sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'success.main', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ color: 'white', fontSize: 16 }} />
            </Box>
          </>
        ) : (
          <>
            <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
            <Typography variant="caption" color="textSecondary" fontWeight="bold">TAP TO CAPTURE</Typography>
          </>
        )}
      </Box>
      <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
        {label}
      </Typography>
    </Box>
  );
};

const WorkerDashboard: React.FC = () => {
  const user = useSelector((state: any) => state.auth.user);
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  const { data: machines, isLoading: machinesLoading } = useGetMachinesQuery();
  
  const [machineClockIn, { isLoading: clockingIn }] = useMachineClockInMutation();
  const [machineClockOut, { isLoading: clockingOut }] = useMachineClockOutMutation();
  const [createMaterialLog, { isLoading: creatingMaterial }] = useCreateMaterialLogMutation();
  const { data: activeMachineLogs, refetch: refetchMachineLogs } = useGetDailyMachineLogsQuery();
  const { data: staffList } = useGetStaffListQuery();
  const { data: vendorsList } = useGetVendorsQuery();
  const { data: activeOutLogs, refetch: refetchActiveOutLogs } = useGetActiveOutLogsQuery();
  
  const { data: projectsData } = useGetProjectsQuery();
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [photos, setPhotos] = useState({ machine: '', unit: '', software: '' });
  const [startMachineDialogOpen, setStartMachineDialogOpen] = useState(false);
  
  const [selectedEndMachine, setSelectedEndMachine] = useState('');
  const [endPhotos, setEndPhotos] = useState({ machine: '', unit: '', software: '' });
  const [endRemarks, setEndRemarks] = useState('');
  const [endQuantity, setEndQuantity] = useState('');
  const [endMachineDialogOpen, setEndMachineDialogOpen] = useState(false);
  
  const [attendancePhoto, setAttendancePhoto] = useState('');
  
  // Material Tracking State
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialType, setMaterialType] = useState<'OUT' | 'IN'>('OUT');
  const [dialogOrigin, setDialogOrigin] = useState('');
  const [materialStage, setMaterialStage] = useState('Pending Assignment');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [materialPhotos, setMaterialPhotos] = useState({ machine: '', unit: '', software: '' });
  const [assigneeType, setAssigneeType] = useState<'self'|'worker'|'vendor'>('vendor');
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]); // Keep for legacy
  const [vendorRows, setVendorRows] = useState<any[]>([{ vendorId: '', vendorName: '', stage: 'Production', qty: '' }]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const [selectedOutLogId, setSelectedOutLogId] = useState('');

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success'|'error' });
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  React.useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  const startCamera = async (target: string) => {
    setCameraTarget(target);
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      showToast("Could not access camera", 'error');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
    setStream(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      if (cameraTarget === 'attendance') setAttendancePhoto(dataUrl);
      else if (cameraTarget.startsWith('end_')) {
        const key = cameraTarget.replace('end_', '');
        setEndPhotos(prev => ({ ...prev, [key]: dataUrl }));
      }
      else if (cameraTarget.startsWith('mat_')) {
        const key = cameraTarget.replace('mat_', '');
        setMaterialPhotos(prev => ({ ...prev, [key]: dataUrl }));
      }
      else setPhotos(prev => ({ ...prev, [cameraTarget]: dataUrl }));
      
      stopCamera();
    }
  };

  const showToast = (message: string, severity: 'success'|'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handlePunchIn = async () => {
    try {
      await punchIn({ gpsLocation: 'Factory', photoUrl: attendancePhoto }).unwrap();
      showToast("Shift Started successfully! You are now Punched In.");
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || "Failed to Punch In.", 'error');
      console.error(err);
    }
  };

  const handleMachineClockIn = async () => {
    try {
      // Find selected product name for payload
      const selectedProject = projectsData?.find((p: any) => p.id === selectedProjectId);
      let productName = '';
      if (selectedProject && selectedProject.quotations && selectedProject.quotations.length > 0) {
        const prod = selectedProject.quotations[0].products?.find((p: any) => p.id === selectedProductId);
        if (prod) productName = prod.name;
      }
      
      await machineClockIn({ 
        machineId: selectedMachine, 
        machinePhotoUrl: photos.machine, 
        unitPhotoUrl: photos.unit, 
        softwarePhotoUrl: photos.software,
        projectId: selectedProjectId || undefined,
        productId: selectedProductId || undefined,
        productName: productName || undefined,
        estimatedHours: estimatedHours || undefined
      }).unwrap();
      showToast("Machine Log started successfully!");
      setSelectedMachine('');
      setSelectedProjectId('');
      setSelectedProductId('');
      setEstimatedHours('');
      setPhotos({ machine: '', unit: '', software: '' });
      setStartMachineDialogOpen(false);
      refetchMachineLogs();
    } catch (err: any) {
      showToast(err.data?.message || "Failed to start machine log.", 'error');
    }
  };

  const handlePunchOut = async () => {
    try {
      await punchOut().unwrap();
      showToast("Shift Ended successfully! You are now Punched Out.");
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || "Failed to Punch Out.", 'error');
      console.error(err);
    }
  };

  const handleMachineClockOut = async () => {
    try {
      if (!endQuantity || isNaN(Number(endQuantity)) || Number(endQuantity) <= 0) {
        showToast("Please enter a valid quantity.", "error");
        return;
      }
      await machineClockOut({ 
        logId: selectedEndMachine, 
        remarks: endRemarks,
        quantityProduced: Number(endQuantity),
        endMachinePhotoUrl: endPhotos.machine,
        endUnitPhotoUrl: endPhotos.unit,
        endSoftwarePhotoUrl: endPhotos.software
      }).unwrap();
      showToast("Machine Log ended successfully!");
      setSelectedEndMachine('');
      setEndRemarks('');
      setEndPhotos({ machine: '', unit: '', software: '' });
      setEndMachineDialogOpen(false);
      refetchMachineLogs();
    } catch (err: any) {
      showToast(err.data?.message || "Failed to end machine log.", 'error');
    }
  };

  const handleOpenMaterialDialog = (type: 'OUT' | 'IN', stageName: string) => {
    setMaterialType(type);
    setDialogOrigin(stageName);
    setMaterialStage(stageName);
    setMaterialQuantity('');
    setMaterialPhotos({ machine: '', unit: '', software: '' });
    setAssigneeType('vendor');
    setSelectedStaffId('');
    setSelectedVendors([]);
    setVendorRows([{ vendorId: '', vendorName: '', stage: 'Production', qty: '' }]);
    setVehicleNumber('');

    setSelectedOutLogId('');
    if (type === 'IN') {
      refetchActiveOutLogs();
    }
    setMaterialDialogOpen(true);
  };

  const handleMaterialSubmit = async () => {
    if (materialType === 'IN' && selectedOutLogId) {
      const outLog = activeOutLogs?.find((l: any) => l.id === selectedOutLogId);
      if (outLog) {
        const pending = (outLog.quantityProduced || 0) - (outLog.returnedQty || 0);
        if (Number(materialQuantity) > pending) {
          alert(`Error: You cannot return more than ${pending} pending pieces!`);
          return;
        }
      }
    }

    try {
      await createMaterialLog({
        stage: materialStage,
        quantityProduced: materialQuantity,
        transactionType: materialType,
        startPhotos: materialPhotos,
        workerId: assigneeType === 'worker' ? selectedStaffId : (assigneeType === 'self' ? (user?.id || user?._id) : undefined),
        vendors: vendorRows,
        vehicleNumber: vehicleNumber || undefined,
        parentLogId: materialType === 'IN' ? selectedOutLogId : undefined,
        source: 'Material Tracking',
      }).unwrap();
      showToast(
        materialType === 'OUT' 
          ? `Material OUT logged successfully!`
          : `Material IN logged successfully!`
      );
      setMaterialDialogOpen(false);
      if (materialType === 'IN') {
        refetchActiveOutLogs();
      }
    } catch (err: any) {
      console.error("Material Submit Error:", err);
      showToast(err.data?.message || err.message || "Failed to submit material log.", 'error');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (machinesLoading) return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, bgcolor: 'primary.main', color: 'white', borderBottomRadius: 24, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: 'white', px: 1.5, py: 0.8, borderRadius: 2, display: 'flex', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            <img src="/logo.png" alt="Unnati Arts" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>{user?.name || 'Worker Portal'}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>ID: {user?.staffId || '-'}</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="error" onClick={handleLogout} sx={{ borderRadius: 8, boxShadow: 'none' }}>
          Logout
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, px: 2, maxWidth: 1000, mx: 'auto' }}>
        
        {/* Left Column: Main Steps */}
        <Box sx={{ flex: 1, maxWidth: { md: 600 } }}>
        
        {/* Action Buttons for Machine Work */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button 
            variant="contained" 
            color="success" 
            size="large" 
            fullWidth 
            startIcon={<PrecisionManufacturingIcon />}
            onClick={() => setStartMachineDialogOpen(true)}
            sx={{ borderRadius: 4, py: 2, fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(46,125,50,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(46,125,50,0.4)' } }}
          >
            START MACHINE
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            size="large" 
            fullWidth 
            startIcon={<CancelIcon />}
            onClick={() => setEndMachineDialogOpen(true)}
            disabled={!activeMachineLogs || !activeMachineLogs.some((l: any) => l.status === 'active')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(211,47,47,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(211,47,47,0.4)' } }}
          >
            END MACHINE
          </Button>
        </Box>

        {/* Dialog: Start Machine Work */}
        <Dialog open={startMachineDialogOpen} onClose={() => setStartMachineDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <PrecisionManufacturingIcon /> Start Machine Work
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Select your machine and upload the 3 mandatory photos.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField 
                select
                label="1. Select Machine" 
                fullWidth 
                value={selectedMachine} 
                onChange={(e) => setSelectedMachine(e.target.value)} 
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              >
                {machines?.length ? machines.filter((m: any) => !activeMachineLogs?.some((l: any) => l.machineId === m.id && l.status === 'active')).map((m: any) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                )) : <MenuItem value="" disabled>No machines available</MenuItem>}
              </TextField>

              <TextField 
                fullWidth 
                label="Estimated Time (in Hours)" 
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                placeholder="e.g., 2.5"
              />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>2. Upload Mandatory Photos</Typography>
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                  <ImageUploadBox label="MACHINE" previewUrl={photos.machine} onClick={() => startCamera('machine')} />
                  <ImageUploadBox label="STONE/UNIT" previewUrl={photos.unit} onClick={() => startCamera('unit')} />
                  <ImageUploadBox label="SOFTWARE" previewUrl={photos.software} onClick={() => startCamera('software')} />
                </Box>
              </Box>

            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setStartMachineDialogOpen(false)} color="inherit">Cancel</Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleMachineClockIn}
              disabled={!selectedMachine || !photos.machine || !photos.unit || !photos.software || clockingIn}
              sx={{ fontWeight: 'bold' }}
            >
              {clockingIn ? 'Starting...' : 'Submit & Start'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: End Machine Work */}
        <Dialog open={endMachineDialogOpen} onClose={() => setEndMachineDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <PrecisionManufacturingIcon /> End Machine Work
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Select the active machine, enter quantity produced, add closing remarks, and upload the 3 final photos.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField 
                select
                label="1. Select Active Machine" 
                fullWidth 
                value={selectedEndMachine} 
                onChange={(e) => setSelectedEndMachine(e.target.value)} 
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              >
                {activeMachineLogs?.filter((l: any) => l.status === 'active').map((log: any) => (
                  <MenuItem key={log.id} value={log.id}>
                    {log.machine?.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField 
                fullWidth 
                label="1. Pieces Processed / Quantity" 
                type="number"
                value={endQuantity}
                onChange={(e) => setEndQuantity(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              <TextField 
                fullWidth 
                label="2. Work Completed / Remarks" 
                multiline 
                rows={3}
                value={endRemarks}
                onChange={(e) => setEndRemarks(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>3. Upload Final Photos</Typography>
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                  <ImageUploadBox label="MACHINE" previewUrl={endPhotos.machine} onClick={() => startCamera('end_machine')} />
                  <ImageUploadBox label="STONE/UNIT" previewUrl={endPhotos.unit} onClick={() => startCamera('end_unit')} />
                  <ImageUploadBox label="SOFTWARE" previewUrl={endPhotos.software} onClick={() => startCamera('end_software')} />
                </Box>
              </Box>

            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEndMachineDialogOpen(false)} color="inherit">Cancel</Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleMachineClockOut}
              disabled={!selectedEndMachine || !endPhotos.machine || !endPhotos.unit || !endPhotos.software || clockingOut}
              sx={{ fontWeight: 'bold' }}
            >
              {clockingOut ? 'Ending...' : 'Submit & End Work'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box> {/* End Left Column */}

      {/* Global Snackbar for feedback */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 'bold' }} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Camera Dialog */}
      <Dialog open={isCameraOpen} onClose={stopCamera} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#222', color: '#FFF' }}>
          Take Photo
          <IconButton onClick={stopCamera} sx={{ color: '#FFF' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#000', p: 0, position: 'relative' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '70vh', objectFit: 'cover', display: 'block' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#222', p: 2, justifyContent: 'center' }}>
          <Button variant="contained" color="success" size="large" onClick={capturePhoto} startIcon={<PhotoCameraIcon />} fullWidth sx={{ borderRadius: 8, py: 1.5, fontWeight: 'bold' }}>
            Capture Photo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  );
};

export default WorkerDashboard;
