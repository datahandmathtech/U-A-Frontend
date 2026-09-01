import React, { useState } from 'react';
import { Box, Typography, Button, Paper, TextField, MenuItem, CircularProgress, Alert, Snackbar, Divider, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, Autocomplete, RadioGroup, FormControlLabel, Radio, FormControl, Grid, Switch } from '@mui/material';
import { useGetMachinesQuery, usePunchInMutation, usePunchOutMutation, useGetActiveSessionQuery, useMachineClockInMutation, useGetDailyMachineLogsQuery, useMachineClockOutMutation, useCreateMaterialLogMutation, useGetStaffListQuery, useGetActiveOutLogsQuery, useGetProjectsQuery, useGetVendorsQuery, useGetRejectedLogsQuery, useApproveMaterialLogMutation } from '../store/apiSlice';
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

const ManagerDashboard: React.FC = () => {
  const user = useSelector((state: any) => state.auth.user);
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

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
  const { data: activeOutLogs, refetch: refetchActiveOutLogs } = useGetActiveOutLogsQuery(undefined);
  const { data: rejectedLogs, refetch: refetchRejectedLogs } = useGetRejectedLogsQuery();
  const [approveMaterialLog] = useApproveMaterialLogMutation();

  const openRedoDialog = (log: any) => {
    setRedoLog(log);
    setRedoRequiresMachine(true);
    setRedoMachineId('');
    setRedoStartPhoto('');
    setRedoEndPhoto('');
    setRedoDialogOpen(true);
  };

  const handleRedoSubmit = async () => {
    if (!redoLog) return;
    if (redoRequiresMachine && !redoStartPhoto) {
      showToast('Start photo is mandatory!', 'error');
      return;
    }
    if (!redoRequiresMachine && !redoEndPhoto) {
      showToast('Completion photo is mandatory!', 'error');
      return;
    }
    if (redoRequiresMachine && !redoMachineId) {
      showToast('Please select a machine!', 'error');
      return;
    }
    setRedoSubmitting(true);
    try {
      if (redoRequiresMachine) {
        // Just update the existing log to 'redo_in_progress' with start photo
        await approveMaterialLog({ 
          id: redoLog.id, 
          data: { 
            approvalStatus: 'redo_in_progress', 
            remarks: 'Re-doing on machine',
            machineId: redoMachineId,
            startPhotos: { machine: redoStartPhoto, unit: '', software: '' }
          } 
        }).unwrap();
        showToast('Machine ON! Stone is now in progress.');
      } else {
        // Hand work: Update existing log to 'pending' (completed) directly
        await approveMaterialLog({ 
          id: redoLog.id, 
          data: { 
            approvalStatus: 'pending', 
            remarks: 'Hand work completed by manager',
            startPhotos: { machine: redoEndPhoto, unit: '', software: '', endPhoto: redoEndPhoto }
          } 
        }).unwrap();
        showToast('Work completed & sent to Admin for approval!');
      }
      setRedoDialogOpen(false);
      refetchRejectedLogs();
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to re-submit', 'error');
    } finally {
      setRedoSubmitting(false);
    }
  };

  const handleCompleteRedoSubmit = async () => {
    if (!redoLog) return;
    if (!redoEndPhoto) {
      showToast('Completion photo is mandatory!', 'error');
      return;
    }
    setRedoSubmitting(true);
    try {
      await approveMaterialLog({ 
        id: redoLog.id, 
        data: { 
          approvalStatus: 'pending', 
          remarks: 'Machine work completed by manager',
          startPhotos: { ...redoLog.startPhotos, endPhoto: redoEndPhoto }
        } 
      }).unwrap();
      showToast('Machine OFF! Work completed & sent to Admin.');
      setCompleteRedoDialogOpen(false);
      refetchRejectedLogs();
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to complete', 'error');
    } finally {
      setRedoSubmitting(false);
    }
  };
  
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
  const [materialPhotos, setMaterialPhotos] = useState({ machine: '', unit: '', software: '', endPhoto: '' });
  const [requiresMachine, setRequiresMachine] = useState(true);
  const [assigneeType, setAssigneeType] = useState<'self'|'worker'|'vendor'>('vendor');
  const [simpleAssigneeType, setSimpleAssigneeType] = useState<'client'|'vendor'>('client');
  const [customClientName, setCustomClientName] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]); // Keep for legacy
  const [vendorRows, setVendorRows] = useState<any[]>([{ vendorId: '', vendorName: '', stage: 'Production', qty: '' }]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const [selectedOutLogId, setSelectedOutLogId] = useState('');

  // Re-do Rejected Item State
  const [redoDialogOpen, setRedoDialogOpen] = useState(false);
  const [completeRedoDialogOpen, setCompleteRedoDialogOpen] = useState(false);
  const [redoLog, setRedoLog] = useState<any>(null);
  const [redoRequiresMachine, setRedoRequiresMachine] = useState(true);
  const [redoMachineId, setRedoMachineId] = useState('');
  const [redoStartPhoto, setRedoStartPhoto] = useState('');
  const [redoEndPhoto, setRedoEndPhoto] = useState('');
  const [redoSubmitting, setRedoSubmitting] = useState(false);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success'|'error' });
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const openCompleteRedoDialog = (log: any) => {
    setRedoLog(log);
    setRedoEndPhoto('');
    setCompleteRedoDialogOpen(true);
  };
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
      else if (cameraTarget === 'redo_start') setRedoStartPhoto(dataUrl);
      else if (cameraTarget === 'redo_end') setRedoEndPhoto(dataUrl);
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
    // If not Material Tracking, we want it to act exactly like Machine OFF
    const isStageCompletion = stageName !== 'Material Tracking';
    
    setMaterialType(isStageCompletion ? 'OUT' : type);
    setDialogOrigin(stageName);
    setMaterialStage(stageName);
    setMaterialQuantity('');
    setMaterialPhotos({ machine: '', unit: '', software: '' });
    setAssigneeType(isStageCompletion ? 'self' : 'vendor');
    setSimpleAssigneeType('client');
    setCustomClientName('');
    setRequiresMachine(isStageCompletion ? false : true);
    setSelectedStaffId('');
    setSelectedVendors([]);
    setVendorRows([{ vendorId: '', vendorName: '', stage: 'Production', qty: '' }]);
    setVehicleNumber('');
    setSelectedProjectId('');
    setSelectedProductId('');

    setSelectedOutLogId('');
    if (type === 'IN' && !isStageCompletion) {
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
      let productName = '';
      if (selectedProjectId && selectedProductId) {
        const selectedProject = projectsData?.find((p: any) => p.id === selectedProjectId);
        if (selectedProject && selectedProject.quotations && selectedProject.quotations.length > 0) {
          const prod = selectedProject.quotations[0].products?.find((p: any) => p.id === selectedProductId);
          if (prod) productName = prod.name;
        }
      }

      const isStageCompletion = dialogOrigin !== 'Material Tracking';

      await createMaterialLog({
        stage: materialStage,
        quantityProduced: isStageCompletion ? 1 : materialQuantity, // Default to 1 for simple tracking
        transactionType: materialType,
        startPhotos: materialPhotos,
        workerId: !isStageCompletion && assigneeType === 'worker' ? selectedStaffId : (!isStageCompletion && assigneeType === 'self' ? (user?.id || user?._id) : undefined),
        vendors: !isStageCompletion ? vendorRows : [],
        vendorName: undefined,
        vehicleNumber: vehicleNumber || undefined,
        parentLogId: materialType === 'IN' && !isStageCompletion ? selectedOutLogId : undefined,
        source: 'Material Tracking',
        requiresMachine: isStageCompletion ? false : (materialType === 'OUT' ? requiresMachine : undefined),
        projectId: materialType === 'OUT' ? (selectedProjectId || undefined) : undefined,
        productId: materialType === 'OUT' ? (selectedProductId || undefined) : undefined,
        productName: materialType === 'OUT' ? (productName || undefined) : undefined,
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
    localStorage.removeItem('token');
    window.location.reload();
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
        
        {/* Action Buttons for Material Tracking */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon /> Step 3: Material Tracking
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Move raw materials around. (No admin approval required)</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
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
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Complete polishing work for a specific stone.</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button variant="contained" color="success" size="large" fullWidth startIcon={<CheckCircleIcon />}
            onClick={() => handleOpenMaterialDialog('OUT', 'Polishing')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(46,125,50,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            MARK POLISHING DONE
          </Button>
        </Box>

        {/* Packing */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          📦 Step 5: Packing
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Complete packing work for a specific stone.</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button variant="contained" color="success" size="large" fullWidth startIcon={<CheckCircleIcon />}
            onClick={() => handleOpenMaterialDialog('OUT', 'Packing')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(46,125,50,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            MARK PACKING DONE
          </Button>
        </Box>

        {/* Dispatch */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          🚚 Step 6: Dispatch
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Complete dispatch work for a specific stone.</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button variant="contained" color="success" size="large" fullWidth startIcon={<CheckCircleIcon />}
            onClick={() => handleOpenMaterialDialog('OUT', 'Dispatch')}
            sx={{ borderRadius: 4, py: 2, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(46,125,50,0.3)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            MARK DISPATCH DONE
          </Button>
        </Box>

        {/* Dialog: Material Tracking */}
        <Dialog open={materialDialogOpen} onClose={() => setMaterialDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, bgcolor: materialType === 'OUT' ? 'warning.light' : 'info.light', color: materialType === 'OUT' ? 'warning.dark' : 'info.dark' }}>
            {dialogOrigin === 'Material Tracking' ? (materialType === 'OUT' ? 'OUT (Take)' : 'IN (Return)') : 'Complete Stage'} - {materialStage}
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Select the stage of work, enter quantity, and capture photos. Admin approval is required.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {materialType === 'OUT' && dialogOrigin === 'Material Tracking' && (
                <FormControlLabel 
                  control={<Switch checked={requiresMachine} onChange={(e) => setRequiresMachine(e.target.checked)} />} 
                  label="Requires Machine? (If false, directly complete the piece log)" 
                  sx={{ mb: 1 }}
                />
              )}

              {materialType === 'IN' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>1. Select Active Assignment to Return</Typography>
                  <TextField 
                    select
                    label="Select Active OUT Log" 
                    fullWidth 
                    value={selectedOutLogId}
                    onChange={(e) => setSelectedOutLogId(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  >
                    <MenuItem value="" disabled>-- Select Pending Assignment --</MenuItem>
                    {activeOutLogs?.filter((log: any) => dialogOrigin === 'Material Tracking' || log.stage === materialStage).map((log: any) => (
                      <MenuItem key={log.id} value={log.id}>
                        {log.project?.name || 'No Client'} | {log.productName || 'Unknown Stone'} | {log.stage} - {log.quantityProduced - (log.returnedQty || 0)} qty pending ({log.worker?.name || log.vendorName})
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}

              {materialType === 'IN' && selectedOutLogId && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>2. Fill Details</Typography>
                  <TextField 
                    fullWidth 
                    label="Quantity Returning" 
                    type="number"
                    value={materialQuantity}
                    onChange={(e) => setMaterialQuantity(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                </Box>
              )}

              {materialType === 'OUT' && (
                <>
                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dialogOrigin !== 'Material Tracking' ? (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>1. Select Client</Typography>
                        
                        <TextField 
                          select
                          label="Select Client (Fetched from Admin)" 
                          fullWidth 
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        >
                          <MenuItem value="" disabled>-- Select Client --</MenuItem>
                          {projectsData?.map((p: any) => (
                            <MenuItem key={p.id} value={p.id}>{p.clientName} ({p.name})</MenuItem>
                          ))}
                        </TextField>

                      </>
                    ) : (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>1. Select Client & Stone</Typography>
                        <TextField 
                          select
                          label="Select Project / Client" 
                          fullWidth 
                          value={selectedProjectId}
                          onChange={(e) => {
                            setSelectedProjectId(e.target.value);
                            setSelectedProductId('');
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        >
                          <MenuItem value="" disabled>-- Select Project --</MenuItem>
                          {projectsData?.map((p: any) => (
                            <MenuItem key={p.id} value={p.id}>{p.name} ({p.clientName})</MenuItem>
                          ))}
                        </TextField>

                        {selectedProjectId && (
                          <TextField 
                            select
                            label="Select Stone / Product" 
                            fullWidth 
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                          >
                            <MenuItem value="" disabled>-- Select Stone --</MenuItem>
                            {projectsData?.find((p: any) => p.id === selectedProjectId)?.quotations?.[0]?.products?.map((prod: any) => (
                              <MenuItem key={prod.id} value={prod.id}>{prod.name}</MenuItem>
                            ))}
                          </TextField>
                        )}

                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>2. Who is taking this material?</Typography>
                        <RadioGroup row value={assigneeType} onChange={(e) => setAssigneeType(e.target.value as any)}>
                          <FormControlLabel value="vendor" control={<Radio />} label="Vendor" />
                          <FormControlLabel value="worker" control={<Radio />} label="Staff/Worker" />
                          <FormControlLabel value="self" control={<Radio />} label="Self (Me)" />
                        </RadioGroup>

                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2 }}>
                          3. Fill Details
                        </Typography>
                        {assigneeType === 'vendor' && (
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
                        )}

                        {assigneeType === 'worker' && (
                          <>
                            <TextField 
                              select
                              label="Select Staff/Worker" 
                              fullWidth 
                              value={selectedStaffId} 
                              onChange={(e) => setSelectedStaffId(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            >
                              {staffList?.map((s: any) => (
                                <MenuItem key={s.id} value={s.id}>{s.name} ({s.role})</MenuItem>
                              ))}
                            </TextField>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <TextField 
                                select
                                label="Work Stage" 
                                fullWidth 
                                value={materialStage} 
                                onChange={(e) => setMaterialStage(e.target.value)}
                                disabled={dialogOrigin !== 'Material Tracking'}
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
                                value={materialQuantity}
                                onChange={(e) => setMaterialQuantity(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                              />
                            </Box>
                          </>
                        )}

                        {assigneeType === 'self' && (
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField 
                              select
                              label="Work Stage" 
                              fullWidth 
                              value={materialStage} 
                              onChange={(e) => setMaterialStage(e.target.value)}
                              disabled={dialogOrigin !== 'Material Tracking'}
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
                              value={materialQuantity}
                              onChange={(e) => setMaterialQuantity(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                          </Box>
                        )}
                      </>
                    )}

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
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                  {materialType === 'OUT' ? (dialogOrigin === 'Material Tracking' ? '4.' : '2.') : '3.'} Upload Photos
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                  <ImageUploadBox label="START PHOTO (Mandatory)" previewUrl={materialPhotos.machine} onClick={() => startCamera('mat_machine')} />
                  {materialType === 'OUT' && !requiresMachine && (
                    <ImageUploadBox label="FINAL PHOTO (Mandatory)" previewUrl={materialPhotos.endPhoto} onClick={() => startCamera('mat_endPhoto')} />
                  )}
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
                dialogOrigin !== 'Material Tracking' 
                ? (
                  !selectedProjectId ||
                  !materialPhotos.machine || 
                  !materialPhotos.endPhoto || 
                  creatingMaterial
                )
                : (
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
                  (materialType === 'OUT' && !requiresMachine && !materialPhotos.endPhoto) ||
                  creatingMaterial
                )
              }
              sx={{ fontWeight: 'bold' }}
            >
              {creatingMaterial ? 'Submitting...' : 'Submit to Admin'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box> {/* End Left Column */}

      {/* Right Column: Admin Rejected Items */}
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
            bgcolor: '#ffebee', 
            p: 3, 
            borderBottom: '1px solid #ffcdd2' 
          }}>
            <Typography variant="h6" sx={{ fontWeight: '900', color: '#c62828', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              ❌ ADMIN REJECTED ITEMS
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500, color: '#d32f2f' }}>
              Items rejected by admin.
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
            {rejectedLogs?.flatMap((log: any, index: number) => {
              return (
                <Paper key={`${log.id}-${index}`} elevation={0} sx={{ 
                  p: 2.5, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderRadius: 3, 
                  border: '1px solid #ef9a9a',
                  borderLeft: '6px solid #d32f2f', 
                  bgcolor: '#ffffff',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(211,47,47,0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    {(log.startPhotos?.machine || log.startPhotos?.unit) && (
                      <Box 
                        component="img" 
                        src={log.startPhotos?.machine || log.startPhotos?.unit} 
                        sx={{ width: 48, height: 48, borderRadius: 2, objectFit: 'cover', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} 
                      />
                    )}
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: '800', color: '#424242' }}>
                        {log.stage} {log.worker?.name ? `(${log.worker.name})` : ''}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#757575', mt: 0.3 }}>
                        Qty: {log.quantityProduced} sq.ft
                      </Typography>
                      {log.remarks && (
                        <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 600, mt: 0.5 }}>
                          ❌ Reason: {log.remarks}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: '#757575', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 500 }}>
                        <AccessTimeIcon sx={{ fontSize: 14 }} /> {new Date(log.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {log.approvalStatus === 'redo_in_progress' ? (
                      <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => openCompleteRedoDialog(log)}
                        color="success"
                        sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 'bold', minWidth: 120, py: 1 }}
                      >
                        ✅ Complete Re-do Work
                      </Button>
                    ) : (
                      <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => openRedoDialog(log)}
                        sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 'bold', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, minWidth: 120, py: 1 }}
                      >
                        🔄 Re-do Work
                      </Button>
                    )}
                  </Box>
                </Paper>
              );
            })}
            
            {(!rejectedLogs || rejectedLogs.length === 0) && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: '#a5d6a7', mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#9e9e9e' }}>
                  All Good!
                </Typography>
                <Typography variant="body2" sx={{ color: '#bdbdbd', mt: 1 }}>
                  No rejected items found.
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box> {/* End Right Column */}

      {/* Re-do Rejected Item Dialog */}
      <Dialog open={redoDialogOpen} onClose={() => setRedoDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
          🔄 Re-do Rejected Work
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {redoLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Rejected Item Info */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Stage: {redoLog.stage} | Qty: {redoLog.quantityProduced} sq.ft
                </Typography>
                {redoLog.remarks && (
                  <Typography variant="body2" sx={{ color: '#d32f2f', mt: 0.5 }}>
                    ❌ Admin Reason: {redoLog.remarks}
                  </Typography>
                )}
              </Paper>

              {/* Machine Toggle */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  1. Will this stone go on a machine?
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant={redoRequiresMachine ? 'contained' : 'outlined'} 
                    onClick={() => setRedoRequiresMachine(true)}
                    sx={{ flex: 1, borderRadius: 3, fontWeight: 'bold', py: 1.5 }}
                    color="primary"
                  >
                    🏭 Yes, Machine
                  </Button>
                  <Button 
                    variant={!redoRequiresMachine ? 'contained' : 'outlined'} 
                    onClick={() => setRedoRequiresMachine(false)}
                    sx={{ flex: 1, borderRadius: 3, fontWeight: 'bold', py: 1.5 }}
                    color="warning"
                  >
                    ✋ No, Hand Work
                  </Button>
                </Box>
              </Box>

              {/* Machine Selector (if requires machine) */}
              {redoRequiresMachine && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    2. Select Machine
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    value={redoMachineId}
                    onChange={(e) => setRedoMachineId(e.target.value)}
                    label="Choose Machine"
                    variant="outlined"
                  >
                    {machines?.map((m: any) => (
                      <MenuItem key={m.id} value={m.id}>{m.name} ({m.type})</MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}

              {/* Photos */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {redoRequiresMachine ? '3' : '2'}. Take Photo
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {redoRequiresMachine ? (
                    <ImageUploadBox 
                      label="START PHOTO (Mandatory)" 
                      previewUrl={redoStartPhoto} 
                      onClick={() => startCamera('redo_start')} 
                    />
                  ) : (
                    <ImageUploadBox 
                      label="COMPLETION PHOTO (Mandatory)" 
                      previewUrl={redoEndPhoto} 
                      onClick={() => startCamera('redo_end')} 
                    />
                  )}
                </Box>
              </Box>

              {/* Info Text */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: redoRequiresMachine ? '#e3f2fd' : '#e8f5e9', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: redoRequiresMachine ? '#1565c0' : '#2e7d32' }}>
                  {redoRequiresMachine 
                    ? '🏭 Stone will be assigned to the machine. Worker will start (ON), complete (OFF), and it will go to Admin for re-approval.'
                    : '✋ Take one completion photo. It will go directly to Admin for re-approval.'}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setRedoDialogOpen(false)} color="inherit" sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleRedoSubmit} 
            disabled={redoSubmitting || (redoRequiresMachine && (!redoMachineId || !redoStartPhoto)) || (!redoRequiresMachine && !redoEndPhoto)}
            sx={{ borderRadius: 3, fontWeight: 'bold', px: 4 }}
          >
            {redoSubmitting ? <CircularProgress size={20} color="inherit" /> : '✅ Submit Re-do'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Re-do Dialog */}
      <Dialog open={completeRedoDialogOpen} onClose={() => setCompleteRedoDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
          ✅ Complete Re-do Work
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {redoLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1565c0' }}>
                  Stage: {redoLog.stage} | Qty: {redoLog.quantityProduced} sq.ft
                </Typography>
                <Typography variant="body2" sx={{ color: '#1565c0', mt: 0.5 }}>
                  This stone is currently IN PROGRESS on the machine. Take the final completion photo to turn the machine OFF and send it to Admin.
                </Typography>
              </Paper>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Take Completion Photo
                </Typography>
                <ImageUploadBox 
                  label="COMPLETION PHOTO (Mandatory)" 
                  previewUrl={redoEndPhoto} 
                  onClick={() => startCamera('redo_end')} 
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setCompleteRedoDialogOpen(false)} color="inherit" sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCompleteRedoSubmit} 
            disabled={redoSubmitting || !redoEndPhoto}
            color="success"
            sx={{ borderRadius: 3, fontWeight: 'bold', px: 4 }}
          >
            {redoSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Machine OFF & Submit'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default ManagerDashboard;
