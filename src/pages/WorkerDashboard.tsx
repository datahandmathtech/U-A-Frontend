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
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';

import { InputAdornment } from '@mui/material';

const ImageUploadBox = ({ 
  label, 
  previewUrl, 
  onClick, 
  onClear 
}: { 
  label: string, 
  previewUrl: string, 
  onClick: () => void,
  onClear?: () => void 
}) => {
  return (
    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
      <Box 
        onClick={onClick}
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: { xs: 105, sm: 125 }, 
          border: '2px dashed', 
          borderColor: previewUrl ? '#10B981' : '#CBD5E1',
          borderRadius: { xs: 2.5, sm: 3 }, 
          bgcolor: previewUrl ? '#ECFDF5' : '#F8FAFC',
          cursor: 'pointer', 
          overflow: 'hidden', 
          position: 'relative', 
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: previewUrl ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
          '&:hover': { 
            bgcolor: previewUrl ? '#D1FAE5' : '#F1F5F9',
            borderColor: previewUrl ? '#059669' : '#94A3B8',
            transform: 'translateY(-2px)'
          }
        }}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* Top Right Verified Check */}
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 4, 
                right: 4, 
                bgcolor: '#10B981', 
                color: 'white',
                borderRadius: '50%', 
                width: { xs: 20, sm: 24 }, 
                height: { xs: 20, sm: 24 }, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <CheckCircleIcon sx={{ fontSize: { xs: 13, sm: 16 } }} />
            </Box>

            {/* Bottom Overlay to Retake */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                py: 0.3,
                bgcolor: 'rgba(15, 23, 42, 0.75)',
                color: '#FFFFFF',
                fontSize: { xs: '0.62rem', sm: '0.68rem' },
                fontWeight: 600,
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.3
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: { xs: 10, sm: 12 } }} /> Retake
            </Box>

            {onClear && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  bgcolor: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  p: 0.2,
                  '&:hover': { bgcolor: '#DC2626' }
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            )}
          </>
        ) : (
          <Box sx={{ p: { xs: 0.5, sm: 1 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: { xs: 32, sm: 40 },
                height: { xs: 32, sm: 40 },
                borderRadius: 2,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 0.6,
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: { xs: 18, sm: 22 }, color: '#64748B' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: { xs: '0.62rem', sm: '0.72rem' }, letterSpacing: '0.2px' }}>
              CAPTURE
            </Typography>
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{ mt: 0.6, display: 'block', fontWeight: 700, color: '#334155', fontSize: { xs: '0.68rem', sm: '0.78rem' }, lineHeight: 1.2 }}>
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
  const { data: activeSession, refetch: refetchSession } = useGetActiveSessionQuery();
  const [punchIn] = usePunchInMutation();
  const [punchOut] = usePunchOutMutation();
  
  const [machineClockIn, { isLoading: clockingIn }] = useMachineClockInMutation();
  const [machineClockOut, { isLoading: clockingOut }] = useMachineClockOutMutation();
  const [createMaterialLog, { isLoading: creatingMaterial }] = useCreateMaterialLogMutation();
  const { data: activeMachineLogs, refetch: refetchMachineLogs } = useGetDailyMachineLogsQuery(undefined, {
    pollingInterval: 10000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
  });
  const { data: staffList } = useGetStaffListQuery();
  const { data: vendorsList } = useGetVendorsQuery();
  const { data: activeOutLogs, refetch: refetchActiveOutLogs } = useGetActiveOutLogsQuery(undefined, {
    pollingInterval: 10000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
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

  const startCamera = async (target: string, forcedMode?: 'environment' | 'user') => {
    setCameraTarget(target);
    setIsCameraOpen(true);
    const mode = forcedMode || facingMode;

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (e1) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: mode } 
          });
        } catch (e2) {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check actual active track facingMode if available
      try {
        const track = mediaStream.getVideoTracks()[0];
        const actualFacing = track?.getSettings()?.facingMode;
        if (actualFacing === 'user' || actualFacing === 'environment') {
          setFacingMode(actualFacing as any);
        } else if (forcedMode) {
          setFacingMode(forcedMode);
        }
      } catch (e) {
        if (forcedMode) setFacingMode(forcedMode);
      }
    } catch (err) {
      console.error("Camera error:", err);
      showToast("Could not access camera. Please check camera permissions.", 'error');
      setIsCameraOpen(false);
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraTarget) {
      await startCamera(cameraTarget, nextMode);
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      const maxDim = 800;
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      context?.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      
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
      refetchSession();
      refetchMachineLogs();
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
      refetchSession();
      refetchMachineLogs();
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

  const hasStartPhoto = Boolean(photos.machine || photos.unit || photos.software);
  const startPhotoCount = [photos.machine, photos.unit, photos.software].filter(Boolean).length;

  const hasEndPhoto = Boolean(endPhotos.machine || endPhotos.unit || endPhotos.software);
  const endPhotoCount = [endPhotos.machine, endPhotos.unit, endPhotos.software].filter(Boolean).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', pb: 10 }}>
      {/* Executive Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 1.2, sm: 2 }, 
          bgcolor: '#0F172A', 
          color: 'white', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          mb: { xs: 2.5, sm: 4 }, 
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
            <Box 
              sx={{ 
                bgcolor: '#FFFFFF', 
                px: { xs: 0.8, sm: 1.5 }, 
                py: { xs: 0.4, sm: 0.8 }, 
                borderRadius: 2, 
                display: 'flex', 
                alignItems: 'center', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                flexShrink: 0
              }}
            >
              <img src="/logo.png" alt="Unnati Arts" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                variant="h6" 
                noWrap 
                sx={{ 
                  fontWeight: 800, 
                  lineHeight: 1.2, 
                  color: '#FFFFFF', 
                  fontSize: { xs: '0.88rem', sm: '1.15rem' } 
                }}
              >
                {user?.name || 'Worker Portal'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.2, flexWrap: 'nowrap' }}>
                <Chip 
                  label={`ID: ${user?.staffId || '-'}`} 
                  size="small" 
                  sx={{ 
                    height: 18,
                    bgcolor: 'rgba(200, 159, 90, 0.15)', 
                    color: '#C89F5A', 
                    fontWeight: 700, 
                    fontSize: '0.65rem',
                    border: '1px solid rgba(200, 159, 90, 0.3)'
                  }} 
                />
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem', display: { xs: 'none', sm: 'inline-block' } }}>
                  Workshop Telemetry
                </Typography>
              </Box>
            </Box>
          </Box>
          <Button 
            variant="outlined" 
            color="error" 
            size="small"
            onClick={handleLogout} 
            startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
            sx={{ 
              borderRadius: 2, 
              fontWeight: 700,
              fontSize: '0.74rem',
              py: 0.4,
              px: { xs: 1, sm: 1.8 },
              textTransform: 'none',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#F87171',
              flexShrink: 0,
              '&:hover': {
                borderColor: '#EF4444',
                bgcolor: 'rgba(239, 68, 68, 0.1)'
              }
            }}
          >
            Logout
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2.5, md: 4 }, px: { xs: 1.5, sm: 2 }, maxWidth: 1000, mx: 'auto' }}>
        
        {/* Left Column: Main Steps */}
        <Box sx={{ flex: 1, maxWidth: { md: 600 } }}>
        
        {/* Action Buttons for Machine Work */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: { xs: 1.2, sm: 2.5 }, mb: 3 }}>
          <Button 
            variant="contained" 
            onClick={() => setStartMachineDialogOpen(true)}
            sx={{ 
              borderRadius: { xs: 3, sm: 3.5 }, 
              py: { xs: 1.4, sm: 2 }, 
              px: { xs: 0.8, sm: 2 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 0.5, sm: 1 },
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 20px rgba(22, 163, 74, 0.35)', 
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
              '&:hover': { 
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                transform: 'translateY(-2px)', 
                boxShadow: '0 10px 24px rgba(22, 163, 74, 0.45)' 
              } 
            }}
          >
            <PrecisionManufacturingIcon sx={{ fontSize: { xs: 24, sm: 26 } }} />
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.78rem', sm: '1rem' }, lineHeight: 1.15, textTransform: 'none' }}>
              START MACHINE
            </Typography>
          </Button>

          <Button 
            variant="contained" 
            onClick={() => setEndMachineDialogOpen(true)}
            disabled={!activeMachineLogs || !activeMachineLogs.some((l: any) => l.status === 'active')}
            sx={{ 
              borderRadius: { xs: 3, sm: 3.5 }, 
              py: { xs: 1.4, sm: 2 }, 
              px: { xs: 0.8, sm: 2 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 0.5, sm: 1 },
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.35)', 
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
              '&:hover': { 
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                transform: 'translateY(-2px)', 
                boxShadow: '0 10px 24px rgba(220, 38, 38, 0.45)' 
              },
              '&.Mui-disabled': {
                background: '#E2E8F0',
                color: '#94A3B8'
              }
            }}
          >
            <CancelIcon sx={{ fontSize: { xs: 24, sm: 26 } }} />
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.78rem', sm: '1rem' }, lineHeight: 1.15, textTransform: 'none' }}>
              END MACHINE
            </Typography>
          </Button>
        </Box>

        {/* Dialog: Start Machine Work */}
        <Dialog 
          open={startMachineDialogOpen} 
          onClose={() => setStartMachineDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: { xs: 3, sm: 4 },
                m: { xs: 1.5, sm: 2 },
                overflow: 'hidden',
                boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)',
                border: '1px solid #E2E8F0'
              }
            }
          }}
        >
          {/* Modern Header */}
          <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.8, sm: 2.5 }, bgcolor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 }, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PrecisionManufacturingIcon sx={{ color: '#4ADE80', fontSize: { xs: 18, sm: 22 } }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.98rem', sm: '1.1rem' }, color: '#FFFFFF', lineHeight: 1.2 }}>
                  Start Machine Work
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: { xs: '0.72rem', sm: '0.78rem' } }}>
                  Attach at least 1 photo to start
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setStartMachineDialogOpen(false)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' }, p: 0.5 }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                  1. Select Machine
                </Typography>
                <TextField 
                  select
                  fullWidth 
                  size="small"
                  value={selectedMachine} 
                  onChange={(e) => setSelectedMachine(e.target.value)} 
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2.5, 
                      bgcolor: '#F8FAFC',
                      '& fieldset': { borderColor: '#E2E8F0' },
                      '&:hover fieldset': { borderColor: '#CBD5E1' },
                      '&.Mui-focused fieldset': { borderColor: '#16A34A', borderWidth: 2 }
                    } 
                  }}
                >
                  {machines?.length ? machines.filter((m: any) => !activeMachineLogs?.some((l: any) => l.machineId === m.id && l.status === 'active')).map((m: any) => (
                    <MenuItem key={m.id} value={m.id} sx={{ py: 0.8, fontWeight: 500, fontSize: '0.88rem' }}>
                      {m.name} {m.type ? `(${m.type})` : ''}
                    </MenuItem>
                  )) : <MenuItem value="" disabled>No machines available</MenuItem>}
                </TextField>
              </Box>

              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                  Estimated Time (in Hours)
                </Typography>
                <TextField 
                  fullWidth 
                  size="small"
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 1.5 or 2"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccessTimeIcon sx={{ color: '#94A3B8', fontSize: 17 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2.5, 
                      bgcolor: '#F8FAFC',
                      '& fieldset': { borderColor: '#E2E8F0' },
                      '&:hover fieldset': { borderColor: '#CBD5E1' },
                      '&.Mui-focused fieldset': { borderColor: '#16A34A', borderWidth: 2 }
                    } 
                  }}
                />
              </Box>

              <Box sx={{ pt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem' }}>
                    2. Workstation Photos
                  </Typography>
                  <Chip 
                    size="small"
                    label={hasStartPhoto ? `${startPhotoCount}/3 Photos` : 'Min. 1 Photo Req.'} 
                    sx={{ 
                      height: 20,
                      fontWeight: 700, 
                      fontSize: '0.68rem',
                      bgcolor: hasStartPhoto ? '#ECFDF5' : '#FEF3C7',
                      color: hasStartPhoto ? '#059669' : '#D97706',
                      border: '1px solid',
                      borderColor: hasStartPhoto ? '#A7F3D0' : '#FDE68A'
                    }} 
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, fontSize: '0.72rem' }}>
                  Attach at least 1 photo (Machine, Stone/Unit, or CNC Software screen).
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1, sm: 1.5 } }}>
                  <ImageUploadBox 
                    label="MACHINE" 
                    previewUrl={photos.machine} 
                    onClick={() => startCamera('machine')} 
                    onClear={() => setPhotos(prev => ({ ...prev, machine: '' }))}
                  />
                  <ImageUploadBox 
                    label="STONE / UNIT" 
                    previewUrl={photos.unit} 
                    onClick={() => startCamera('unit')} 
                    onClear={() => setPhotos(prev => ({ ...prev, unit: '' }))}
                  />
                  <ImageUploadBox 
                    label="CNC SOFTWARE" 
                    previewUrl={photos.software} 
                    onClick={() => startCamera('software')} 
                    onClear={() => setPhotos(prev => ({ ...prev, software: '' }))}
                  />
                </Box>
              </Box>

            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, px: { xs: 2, sm: 3 }, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
            <Button 
              onClick={() => setStartMachineDialogOpen(false)} 
              size="small"
              sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleMachineClockIn}
              disabled={!selectedMachine || !hasStartPhoto || clockingIn}
              startIcon={!clockingIn && <PrecisionManufacturingIcon sx={{ fontSize: 17 }} />}
              sx={{ 
                px: { xs: 2, sm: 3 },
                py: { xs: 0.8, sm: 1 },
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: { xs: '0.82rem', sm: '0.9rem' },
                textTransform: 'none',
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px -4px rgba(22, 163, 74, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                },
                '&.Mui-disabled': {
                  background: '#E2E8F0',
                  color: '#94A3B8'
                }
              }}
            >
              {clockingIn ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} color="inherit" />
                  <span>Starting...</span>
                </Box>
              ) : (
                'Submit & Start'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: End Machine Work */}
        <Dialog 
          open={endMachineDialogOpen} 
          onClose={() => setEndMachineDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: { xs: 3, sm: 4 },
                m: { xs: 1.5, sm: 2 },
                overflow: 'hidden',
                boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)',
                border: '1px solid #E2E8F0'
              }
            }
          }}
        >
          {/* Modern Header */}
          <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.8, sm: 2.5 }, bgcolor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 }, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CancelIcon sx={{ color: '#F87171', fontSize: { xs: 18, sm: 22 } }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.98rem', sm: '1.1rem' }, color: '#FFFFFF', lineHeight: 1.2 }}>
                  End Machine Work
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: { xs: '0.72rem', sm: '0.78rem' } }}>
                  Log quantity, notes, &amp; at least 1 closing photo
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setEndMachineDialogOpen(false)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' }, p: 0.5 }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                  1. Select Active Machine
                </Typography>
                <TextField 
                  select
                  fullWidth 
                  size="small"
                  value={selectedEndMachine} 
                  onChange={(e) => setSelectedEndMachine(e.target.value)} 
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2.5, 
                      bgcolor: '#F8FAFC',
                      '& fieldset': { borderColor: '#E2E8F0' },
                      '&:hover fieldset': { borderColor: '#CBD5E1' },
                      '&.Mui-focused fieldset': { borderColor: '#DC2626', borderWidth: 2 }
                    } 
                  }}
                >
                  {activeMachineLogs?.filter((l: any) => l.status === 'active').map((log: any) => (
                    <MenuItem key={log.id} value={log.id} sx={{ py: 0.8, fontWeight: 500, fontSize: '0.88rem' }}>
                      {log.machine?.name} — Started {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                  Pieces Processed / Quantity
                </Typography>
                <TextField 
                  fullWidth 
                  size="small"
                  type="number"
                  value={endQuantity}
                  onChange={(e) => setEndQuantity(e.target.value)}
                  placeholder="e.g. 4 pieces"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2.5, 
                      bgcolor: '#F8FAFC',
                      '& fieldset': { borderColor: '#E2E8F0' },
                      '&:hover fieldset': { borderColor: '#CBD5E1' },
                      '&.Mui-focused fieldset': { borderColor: '#DC2626', borderWidth: 2 }
                    } 
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                  Work Completed / Remarks
                </Typography>
                <TextField 
                  fullWidth 
                  size="small"
                  multiline 
                  rows={2}
                  value={endRemarks}
                  onChange={(e) => setEndRemarks(e.target.value)}
                  placeholder="Add any notes on cutting, tool changes, or finish quality..."
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2.5, 
                      bgcolor: '#F8FAFC',
                      '& fieldset': { borderColor: '#E2E8F0' },
                      '&:hover fieldset': { borderColor: '#CBD5E1' },
                      '&.Mui-focused fieldset': { borderColor: '#DC2626', borderWidth: 2 }
                    } 
                  }}
                />
              </Box>

              <Box sx={{ pt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem' }}>
                    Final Workstation Photos
                  </Typography>
                  <Chip 
                    size="small"
                    label={hasEndPhoto ? `${endPhotoCount}/3 Photos` : 'Min. 1 Photo Req.'} 
                    sx={{ 
                      height: 20,
                      fontWeight: 700, 
                      fontSize: '0.68rem',
                      bgcolor: hasEndPhoto ? '#ECFDF5' : '#FEF3C7',
                      color: hasEndPhoto ? '#059669' : '#D97706',
                      border: '1px solid',
                      borderColor: hasEndPhoto ? '#A7F3D0' : '#FDE68A'
                    }} 
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, fontSize: '0.72rem' }}>
                  Attach at least 1 photo of completed stone, machine state, or CNC screen.
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1, sm: 1.5 } }}>
                  <ImageUploadBox 
                    label="MACHINE" 
                    previewUrl={endPhotos.machine} 
                    onClick={() => startCamera('end_machine')} 
                    onClear={() => setEndPhotos(prev => ({ ...prev, machine: '' }))}
                  />
                  <ImageUploadBox 
                    label="STONE / UNIT" 
                    previewUrl={endPhotos.unit} 
                    onClick={() => startCamera('end_unit')} 
                    onClear={() => setEndPhotos(prev => ({ ...prev, unit: '' }))}
                  />
                  <ImageUploadBox 
                    label="CNC SOFTWARE" 
                    previewUrl={endPhotos.software} 
                    onClick={() => startCamera('end_software')} 
                    onClear={() => setEndPhotos(prev => ({ ...prev, software: '' }))}
                  />
                </Box>
              </Box>

            </Box>
          </DialogContent>

          <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, px: { xs: 2, sm: 3 }, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
            <Button 
              onClick={() => setEndMachineDialogOpen(false)} 
              size="small"
              sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleMachineClockOut}
              disabled={!selectedEndMachine || !hasEndPhoto || clockingOut}
              startIcon={!clockingOut && <CancelIcon sx={{ fontSize: 17 }} />}
              sx={{ 
                px: { xs: 2, sm: 3 },
                py: { xs: 0.8, sm: 1 },
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: { xs: '0.82rem', sm: '0.9rem' },
                textTransform: 'none',
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px -4px rgba(220, 38, 38, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                },
                '&.Mui-disabled': {
                  background: '#E2E8F0',
                  color: '#94A3B8'
                }
              }}
            >
              {clockingOut ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} color="inherit" />
                  <span>Ending...</span>
                </Box>
              ) : (
                'Submit & End Work'
              )}
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
      <Dialog 
        open={isCameraOpen} 
        onClose={stopCamera} 
        maxWidth="sm" 
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 3, sm: 4 },
              bgcolor: '#0B0F19',
              color: '#FFFFFF',
              overflow: 'hidden',
              m: { xs: 1, sm: 2 },
              width: { xs: 'calc(100% - 16px)', sm: '100%' },
              maxWidth: '480px',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)'
            }
          }
        }}
      >
        {/* Responsive Header */}
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          bgcolor: '#0F172A', 
          color: '#FFF', 
          py: 1.25, 
          px: { xs: 1.5, sm: 2 }, 
          borderBottom: '1px solid rgba(255,255,255,0.08)' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            <Box sx={{ 
              width: 30, 
              height: 30, 
              borderRadius: 1.5, 
              bgcolor: 'rgba(200, 159, 90, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              <PhotoCameraIcon sx={{ color: '#C89F5A', fontSize: 17 }} />
            </Box>
            <Typography sx={{ 
              fontWeight: 700, 
              fontSize: { xs: '0.88rem', sm: '0.95rem' }, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {cameraTarget === 'machine' ? 'Machine Photo' : cameraTarget === 'unit' ? 'Unit Photo' : cameraTarget === 'software' ? 'Software Photo' : 'Capture Photo'}
            </Typography>
            <Chip 
              size="small"
              label={facingMode === 'environment' ? 'Back' : 'Front'} 
              sx={{ 
                height: 20, 
                bgcolor: 'rgba(255,255,255,0.1)', 
                color: '#CBD5E1', 
                fontSize: '0.65rem', 
                fontWeight: 700,
                flexShrink: 0
              }} 
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0, ml: 1 }}>
            <IconButton 
              onClick={toggleFacingMode} 
              sx={{ 
                color: '#C89F5A', 
                bgcolor: 'rgba(200, 159, 90, 0.12)',
                '&:hover': { bgcolor: 'rgba(200, 159, 90, 0.25)' },
                p: 0.75
              }}
              title={facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Back Camera'}
            >
              <CameraswitchIcon sx={{ fontSize: 19 }} />
            </IconButton>
            <IconButton 
              onClick={stopCamera} 
              sx={{ 
                color: '#94A3B8', 
                bgcolor: 'rgba(255,255,255,0.06)',
                '&:hover': { color: '#FFF', bgcolor: 'rgba(255,255,255,0.15)' }, 
                p: 0.75 
              }}
            >
              <CloseIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Viewfinder Content */}
        <DialogContent sx={{ 
          bgcolor: '#000000', 
          p: 0, 
          position: 'relative', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: { xs: 260, sm: 320 } 
        }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            style={{ 
              width: '100%', 
              maxHeight: '56vh', 
              objectFit: 'cover', 
              display: 'block' 
            }} 
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Viewfinder Corner Reticle Guides */}
          <Box sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            bottom: 16,
            pointerEvents: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 2
          }} />

          {/* Active Target Indicator Badge */}
          <Box sx={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            bgcolor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)',
            px: 1.2,
            py: 0.4,
            borderRadius: 1.5,
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            pointerEvents: 'none'
          }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <Typography sx={{ color: '#F8FAFC', fontSize: '0.68rem', fontWeight: 600 }}>
              Live • {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
            </Typography>
          </Box>
        </DialogContent>

        {/* Bottom Actions */}
        <DialogActions sx={{ 
          bgcolor: '#0F172A', 
          p: { xs: 1.25, sm: 1.75 }, 
          borderTop: '1px solid rgba(255,255,255,0.08)', 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1.6fr', sm: '1fr 1.5fr' },
          gap: 1.2 
        }}>
          {/* Flip camera button */}
          <Button
            variant="outlined"
            onClick={toggleFacingMode}
            startIcon={<CameraswitchIcon sx={{ fontSize: 18 }} />}
            sx={{
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.2)',
              bgcolor: 'rgba(255,255,255,0.04)',
              borderRadius: 2.5,
              py: 1.15,
              px: { xs: 1, sm: 2 },
              fontWeight: 600,
              fontSize: { xs: '0.76rem', sm: '0.84rem' },
              textTransform: 'none',
              whiteSpace: 'nowrap',
              minWidth: 0,
              '&:hover': {
                borderColor: '#C89F5A',
                bgcolor: 'rgba(200, 159, 90, 0.12)'
              }
            }}
          >
            {facingMode === 'environment' ? 'Front Cam' : 'Back Cam'}
          </Button>

          {/* Snap Photo Button */}
          <Button 
            variant="contained" 
            size="large" 
            onClick={capturePhoto} 
            startIcon={<PhotoCameraIcon sx={{ fontSize: 19 }} />} 
            sx={{ 
              borderRadius: 2.5, 
              py: 1.15, 
              px: { xs: 1.5, sm: 2 },
              fontWeight: 800,
              fontSize: { xs: '0.84rem', sm: '0.92rem' },
              textTransform: 'none',
              whiteSpace: 'nowrap',
              minWidth: 0,
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 16px -4px rgba(22, 163, 74, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
              }
            }}
          >
            Snap Photo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  );
};

export default WorkerDashboard;
