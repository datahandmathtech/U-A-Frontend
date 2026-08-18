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
  const { data: machines, isLoading: machinesLoading } = useGetMachinesQuery();
  const { data: activeSession, isLoading: sessionLoading, refetch } = useGetActiveSessionQuery();
  
  const [punchIn, { isLoading: punchingIn }] = usePunchInMutation();
  const [punchOut, { isLoading: punchingOut }] = usePunchOutMutation();
  const [machineClockIn, { isLoading: clockingIn }] = useMachineClockInMutation();
  const [machineClockOut, { isLoading: clockingOut }] = useMachineClockOutMutation();
  const [createMaterialLog, { isLoading: creatingMaterial }] = useCreateMaterialLogMutation();
  const { data: activeMachineLogs, refetch: refetchMachineLogs } = useGetDailyMachineLogsQuery();
  const { data: staffList } = useGetStaffListQuery();
  const { data: vendorsList } = useGetVendorsQuery();
  const { data: activeOutLogs, refetch: refetchActiveOutLogs } = useGetActiveOutLogsQuery(undefined, {
    skip: !activeSession
  });
  
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
      await machineClockOut({ 
        logId: selectedEndMachine, 
        remarks: endRemarks,
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

  if (sessionLoading || machinesLoading) return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, bgcolor: 'primary.main', color: 'white', borderBottomRadius: 24, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            {user?.name?.charAt(0) || 'W'}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{user?.name || 'Worker Portal'}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>ID: {user?.staffId || '-'}</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="error" onClick={handleLogout} sx={{ borderRadius: 8, boxShadow: 'none' }}>
          Logout
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, px: 2, maxWidth: 1000, mx: 'auto' }}>
        
        {/* Left Column: Main Steps */}
        <Box sx={{ flex: 1, maxWidth: { md: 600 } }}>
        
        {/* Step 1: Punch In / Out Card */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 4, mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon /> Step 1: Factory Attendance
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {activeSession ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 3, py: 1, bgcolor: 'success.light', color: 'success.dark', borderRadius: 8, mb: 2, fontWeight: 'bold' }}>
                <CheckCircleIcon fontSize="small" /> PUNCHED IN
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Your shift started at <strong>{new Date(activeSession.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
              </Typography>
              <Button 
                variant="contained" 
                color="error" 
                size="large" 
                fullWidth 
                startIcon={punchingOut ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
                onClick={handlePunchOut}
                disabled={punchingOut}
                sx={{ borderRadius: 3, py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
              >
                {punchingOut ? 'Ending Shift...' : 'END SHIFT (PUNCH OUT)'}
              </Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                You must punch in with a selfie to record your daily attendance.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                 <Box sx={{ width: 140 }}>
                   <ImageUploadBox label="YOUR SELFIE" previewUrl={attendancePhoto} onClick={() => startCamera('attendance')} />
                 </Box>
              </Box>
              <Button 
                variant="contained" 
                color="success" 
                size="large" 
                fullWidth 
                startIcon={punchingIn ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                onClick={handlePunchIn}
                disabled={punchingIn || !attendancePhoto}
                sx={{ borderRadius: 3, py: 1.5, fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(46,125,50,0.2)' }}
              >
                {punchingIn ? 'Starting Shift...' : 'START SHIFT (PUNCH IN)'}
              </Button>
            </Box>
          )}
        </Paper>

        {/* Active Machine Logs Removed per request */}

        {/* Action Buttons for Machine Work */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, opacity: activeSession ? 1 : 0.5, pointerEvents: activeSession ? 'auto' : 'none' }}>
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

        {/* Action Buttons for Material Tracking */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon /> Step 3: Material Tracking
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Move raw materials around. (No admin approval required)</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, opacity: activeSession ? 1 : 0.5, pointerEvents: activeSession ? 'auto' : 'none' }}>
          <Button variant="contained" color="warning" size="large" fullWidth startIcon={<OutputIcon />}
            onClick={() => handleOpenMaterialDialog('OUT', 'Material Tracking')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(237,108,2,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            MATERIAL OUT
          </Button>
          <Button variant="contained" color="info" size="large" fullWidth startIcon={<InputIcon />}
            onClick={() => handleOpenMaterialDialog('IN', 'Material Tracking')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(2,136,209,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            MATERIAL IN
          </Button>
        </Box>

        {/* Polishing */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          ✨ Step 4: Polishing
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Polishing IN requires admin approval.</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, opacity: activeSession ? 1 : 0.5, pointerEvents: activeSession ? 'auto' : 'none' }}>
          <Button variant="contained" color="info" size="large" fullWidth startIcon={<InputIcon />}
            onClick={() => handleOpenMaterialDialog('IN', 'Polishing')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(2,136,209,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            POLISHING IN
          </Button>
        </Box>

        {/* Packing */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          📦 Step 5: Packing
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Send material for packing.</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, opacity: activeSession ? 1 : 0.5, pointerEvents: activeSession ? 'auto' : 'none' }}>
          <Button variant="contained" color="warning" size="large" fullWidth startIcon={<OutputIcon />}
            onClick={() => handleOpenMaterialDialog('OUT', 'Packing')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(237,108,2,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            PACKING OUT
          </Button>
        </Box>

        {/* Dispatch */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          🚚 Step 6: Dispatch
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, opacity: activeSession ? 1 : 0.5, pointerEvents: activeSession ? 'auto' : 'none' }}>
          <Button variant="contained" color="warning" size="large" fullWidth startIcon={<OutputIcon />}
            onClick={() => handleOpenMaterialDialog('OUT', 'Dispatch')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(237,108,2,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            DISPATCH OUT
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

        {/* Dialog: Material Tracking */}
        <Dialog open={materialDialogOpen} onClose={() => setMaterialDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, bgcolor: materialType === 'OUT' ? 'warning.light' : 'info.light', color: materialType === 'OUT' ? 'warning.dark' : 'info.dark' }}>
            {materialType === 'OUT' ? 'OUT (Take)' : 'IN (Return)'} - {materialStage}
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Select the stage of work, enter quantity, and capture 3 photos. Admin approval is required.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {dialogOrigin === 'Material Tracking' && (
                <>
                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <>
                            {vendorRows.map((row, index) => (
                              <Paper key={index} elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" fontWeight="bold">Assignment {index + 1}</Typography>
                                  {vendorRows.length > 1 && (
                                    <IconButton size="small" color="error" onClick={() => setVendorRows(prev => prev.filter((_, i) => i !== index))}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                                <TextField 
                                  select
                                  label="Select Vendor" 
                                  fullWidth 
                                  value={row.vendorId} 
                                  onChange={(e) => {
                                    const vName = vendorsList?.find((v:any) => v.id === e.target.value)?.name || '';
                                    setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], vendorId: e.target.value, vendorName: vName }; return arr; });
                                  }}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                >
                                  {vendorsList?.map((v: any) => (
                                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                                  ))}
                                </TextField>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                  <TextField 
                                    select
                                    label="Work Stage" 
                                    fullWidth 
                                    value={row.stage} 
                                    onChange={(e) => setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], stage: e.target.value }; return arr; })} 
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                  >
                                    <MenuItem value="Production">Production</MenuItem>
                                    <MenuItem value="Polishing">Polishing</MenuItem>
                                    <MenuItem value="Packing">Packing</MenuItem>
                                    <MenuItem value="Dispatch">Dispatch</MenuItem>
                                  </TextField>
                                  <TextField 
                                    fullWidth 
                                    label="Quantity" 
                                    type="number"
                                    value={row.qty}
                                    onChange={(e) => setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], qty: e.target.value }; return arr; })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                  />
                                </Box>
                              </Paper>
                            ))}
                            <Button startIcon={<AddIcon />} onClick={() => setVendorRows(prev => [...prev, { vendorId: '', vendorName: '', stage: 'Production', qty: '' }])} sx={{ alignSelf: 'flex-start' }}>
                              Add Another Vendor
                            </Button>
                          </>
                  </Box>
                </>
              )}





              {!(materialType === 'IN' && materialStage === 'Polishing') && !(materialType === 'OUT' && materialStage === 'Packing') && (
                <TextField 
                  fullWidth 
                  label="Vehicle Number (Optional)" 
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.substring(0, 10).toUpperCase())}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>3. Upload Mandatory Photo</Typography>
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                  <ImageUploadBox label="PHOTO" previewUrl={materialPhotos.machine} onClick={() => startCamera('mat_machine')} />
                </Box>
              </Box>

            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setMaterialDialogOpen(false)} color="inherit">Cancel</Button>
            <Button 
              variant="contained" 
              color={materialType === 'OUT' ? 'warning' : 'info'} 
              onClick={handleMaterialSubmit}
              disabled={
                // OUT with vendor: need vendorId and qty in every row
                (materialType === 'OUT' && assigneeType === 'vendor' && vendorRows.some(r => !r.vendorId || !r.qty)) ||
                // OUT with self: need materialStage
                (materialType === 'OUT' && assigneeType === 'self' && !materialStage) ||
                // OUT with worker: need quantity and stage
                (materialType === 'OUT' && assigneeType === 'worker' && (!materialQuantity || !materialStage)) ||
                // IN: need quantity (except vendor OUT handled above)
                (materialType === 'IN' && !materialQuantity && !selectedOutLogId) ||
                // Always need the mandatory photo
                !materialPhotos.machine ||
                creatingMaterial
              }
              sx={{ fontWeight: 'bold' }}
            >
              {creatingMaterial ? 'Submitting...' : 'Submit to Admin'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box> {/* End Left Column */}

      {/* Right Column: Pending Items */}
      <Box sx={{ width: { md: 420 }, shrink: 0 }}>
        <Paper elevation={0} sx={{ 
          position: 'sticky', top: 20, 
          borderRadius: 4, 
          overflow: 'hidden',
          bgcolor: '#ffffff',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
          border: '1px solid #f0f0f0'
        }}>
          {/* Header */}
          <Box sx={{ 
            bgcolor: '#fff3e0', 
            p: 3, 
            borderBottom: '1px solid #ffe0b2' 
          }}>
            <Typography variant="h6" sx={{ fontWeight: '900', color: '#e65100', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              📥 PENDING PACKING
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500, color: '#ef6c00' }}>
              Select items below to return them one by one.
            </Typography>
          </Box>

          {/* List Content */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2.5, 
            maxHeight: 'calc(100vh - 160px)', 
            overflowY: 'auto', 
            p: 3,
            bgcolor: '#fafafa'
          }}>
            {activeOutLogs?.filter((log: any) => log.stage === 'Packing' && (log.quantityProduced - (log.returnedQty || 0)) > 0).flatMap((log: any) => {
              const pending = (log.quantityProduced || 0) - (log.returnedQty || 0);
              return Array.from({ length: pending }).map((_, index) => (
                <Paper key={`${log.id}-${index}`} elevation={0} sx={{ 
                  p: 2.5, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderRadius: 3, 
                  border: '1px solid #ffcc80',
                  borderLeft: '6px solid #ed6c02', 
                  bgcolor: '#ffffff',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(237,108,2,0.1)',
                  '&:hover': { 
                    transform: 'translateY(-3px)',
                    boxShadow: '0 6px 16px rgba(237,108,2,0.2)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {(log.startPhotos?.machine || log.startPhotos?.unit) && (
                      <Box 
                        component="img" 
                        src={log.startPhotos?.machine || log.startPhotos?.unit} 
                        sx={{ width: 48, height: 48, borderRadius: 2, objectFit: 'cover', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} 
                      />
                    )}
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: '800', color: '#424242' }}>
                        📦 Item {index + 1} <span style={{ color: '#9e9e9e', fontSize: '0.9em', fontWeight: '500' }}>of {pending}</span>
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#757575', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 500 }}>
                        <AccessTimeIcon sx={{ fontSize: 14 }} /> {new Date(log.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Button variant="contained" color="warning" size="medium" sx={{ 
                    borderRadius: 3, 
                    fontWeight: 'bold', 
                    minWidth: 90,
                    boxShadow: '0 4px 10px rgba(237,108,2,0.3)',
                    '&:hover': { bgcolor: '#e65100', transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                    onClick={() => { 
                      handleOpenMaterialDialog('IN', 'Packing'); 
                      setSelectedOutLogId(log.id); 
                      setMaterialQuantity('1');
                    }}>
                    RETURN
                  </Button>
                </Paper>
              ));
            })}
            
            {activeOutLogs?.filter((log: any) => log.stage === 'Packing' && (log.quantityProduced - (log.returnedQty || 0)) > 0).length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: '#a5d6a7', mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#9e9e9e' }}>
                  All Caught Up!
                </Typography>
                <Typography variant="body2" sx={{ color: '#bdbdbd', mt: 1 }}>
                  No pending packing items found.
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box> {/* End Right Column */}

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
