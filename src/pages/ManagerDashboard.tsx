import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, TextField, MenuItem, CircularProgress, 
  Alert, Snackbar, Divider, Avatar, Dialog, DialogTitle, DialogContent, 
  DialogActions, IconButton, Chip, Autocomplete, RadioGroup, FormControlLabel, 
  Radio, FormControl, Grid, Switch, Tooltip, Checkbox, InputAdornment 
} from '@mui/material';
import { 
  useGetMachinesQuery, usePunchInMutation, usePunchOutMutation, 
  useGetActiveSessionQuery, useMachineClockInMutation, useGetDailyMachineLogsQuery, 
  useMachineClockOutMutation, useCreateMaterialLogMutation, useGetStaffListQuery, 
  useGetActiveOutLogsQuery, useGetProjectsQuery, useGetVendorsQuery, 
  useGetRejectedLogsQuery, useApproveMaterialLogMutation, useGetPackingItemsQuery, 
  useGetApprovedLogsQuery, useGetSlabsQuery 
} from '../store/apiSlice';
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
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ReplayIcon from '@mui/icons-material/Replay';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';

// Responsive Luxury Image Upload Tile
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
          height: { xs: 110, sm: 130 }, 
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
            
            {/* Verified badge */}
            <Box sx={{ 
              position: 'absolute', 
              top: 6, 
              right: 6, 
              bgcolor: '#10B981', 
              color: '#FFF', 
              borderRadius: '50%', 
              width: 22, 
              height: 22, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              <CheckCircleIcon sx={{ fontSize: 15 }} />
            </Box>

            {/* Retake overlay on hover */}
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(15, 23, 42, 0.75)',
              color: '#FFF',
              py: 0.4,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textAlign: 'center'
            }}>
              TAP TO RETAKE
            </Box>
          </>
        ) : (
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'rgba(200, 159, 90, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 0.8
            }}>
              <PhotoCameraIcon sx={{ fontSize: 20, color: '#C89F5A' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: { xs: '0.68rem', sm: '0.72rem' }, lineHeight: 1.2 }}>
              TAP TO CAPTURE
            </Typography>
          </Box>
        )}
      </Box>

      <Typography variant="caption" sx={{ 
        mt: 0.8, 
        display: 'block', 
        fontWeight: 700, 
        color: previewUrl ? '#047857' : '#64748B',
        fontSize: { xs: '0.68rem', sm: '0.74rem' },
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
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
  const { data: activeSession, isLoading: sessionLoading, refetch } = useGetActiveSessionQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true
  });
  
  const [punchIn, { isLoading: punchingIn }] = usePunchInMutation();
  const [punchOut, { isLoading: punchingOut }] = usePunchOutMutation();
  const [machineClockIn, { isLoading: clockingIn }] = useMachineClockInMutation();
  const [machineClockOut, { isLoading: clockingOut }] = useMachineClockOutMutation();
  const [createMaterialLog, { isLoading: creatingMaterial }] = useCreateMaterialLogMutation();
  const { data: activeMachineLogs, refetch: refetchMachineLogs } = useGetDailyMachineLogsQuery(undefined, {
    pollingInterval: 20000,
    skipPollingIfUnfocused: true
  });
  const { data: staffList } = useGetStaffListQuery();
  const { data: vendorsList } = useGetVendorsQuery();
  const { data: activeOutLogs, refetch: refetchActiveOutLogs } = useGetActiveOutLogsQuery(undefined, {
    pollingInterval: 20000,
    skipPollingIfUnfocused: true
  });
  const { data: rejectedLogs, refetch: refetchRejectedLogs } = useGetRejectedLogsQuery(undefined, {
    pollingInterval: 20000,
    skipPollingIfUnfocused: true
  });
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
  const { data: projectSlabs } = useGetSlabsQuery(selectedProjectId, { skip: !selectedProjectId });
  const [selectedSlabId, setSelectedSlabId] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const { data: approvedLogs } = useGetApprovedLogsQuery(undefined);
  const packedBoxes = approvedLogs?.filter((log: any) => log.stage === 'Packing' && log.projectId === selectedProjectId) || [];
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
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [vendorRows, setVendorRows] = useState<any[]>([{ vendorId: '', vendorName: '', stage: 'Production', qty: '' }]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [packingBox, setPackingBox] = useState('');
  const [dispatchBoxCodes, setDispatchBoxCodes] = useState<string[]>([]);
  const [packingCode, setPackingCode] = useState('');
  const [packingSize, setPackingSize] = useState('');

  const [selectedOutLogId, setSelectedOutLogId] = useState('');

  // Calculate project-wide production & polishing limits for the selected project
  const selectedProjectObj = projectsData?.find((p: any) => p.id === selectedProjectId);
  const polishingStats = React.useMemo(() => {
    if (!selectedProjectId) return { totalProjectPieces: 0, producedPieces: 0, polishedPieces: 0, availableToPolish: 0 };
    
    let totalProjectPieces = 0;
    let producedPieces = 0;
    let polishedPieces = 0;

    const slabs = (projectSlabs && projectSlabs.length > 0) ? projectSlabs : (selectedProjectObj?.slabs || []);
    if (slabs.length > 0) {
      slabs.forEach((slab: any) => {
        const pList = slab.pieces || [];
        const slabTargetPieces = pList.length > 0 ? pList.length : 1;
        totalProjectPieces += slabTargetPieces;
        
        if (pList.length > 0) {
          pList.forEach((p: any) => {
            // Check if piece has completed Production stage
            const isProdCompleted = p.status === 'completed' || 
              (p.stage && p.stage !== 'Production' && p.stage !== 'Production Work') ||
              p.logs?.some((l: any) => (l.stage === 'Production' || l.stage === 'Production Work') && (l.status === 'completed' || l.status === 'approved'));
            
            if (isProdCompleted) {
              producedPieces++;
            }

            // Check if piece has already completed Polishing
            const isPolishCompleted = p.logs?.some((l: any) => l.stage?.startsWith('Polishing') && (l.status === 'completed' || l.status === 'approved'));
            if (isPolishCompleted) {
              polishedPieces++;
            }
          });
        } else {
          if (slab.status === 'completed') {
            producedPieces += slabTargetPieces;
          }
        }
      });
    } else {
      totalProjectPieces = selectedProjectObj?.totalPieces || 1;
      producedPieces = selectedProjectObj?.completedPieces || 0;
    }

    // Also check approved production & polishing logs
    if (approvedLogs && approvedLogs.length > 0) {
      const prodLogsForProj = approvedLogs.filter((l: any) => 
        l.projectId === selectedProjectId && 
        (l.stage === 'Production' || l.stage === 'Production Work') &&
        (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
      );
      const prodLogQty = prodLogsForProj.reduce((sum: number, l: any) => sum + (Number(l.quantityProduced) || l.pieceIds?.length || 1), 0);
      if (prodLogQty > producedPieces) {
        producedPieces = prodLogQty;
      }

      const polishLogsForProj = approvedLogs.filter((l: any) => 
        l.projectId === selectedProjectId && 
        (l.stage?.startsWith('Polishing') || l.stage === 'Polishing') &&
        (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
      );
      const polishLogQty = polishLogsForProj.reduce((sum: number, l: any) => sum + (Number(l.quantityProduced) || l.pieceIds?.length || 1), 0);
      if (polishLogQty > polishedPieces) {
        polishedPieces = polishLogQty;
      }
    }

    // If production pieces are recorded (> 0), strictly limit to produced pieces.
    // If no production logs are tracked yet, allow up to total project pieces so user is never blocked.
    const effectiveProduced = producedPieces > 0 ? producedPieces : totalProjectPieces;
    const maxPossible = Math.min(totalProjectPieces, effectiveProduced);
    const availableToPolish = Math.max(0, maxPossible - polishedPieces);
    return { totalProjectPieces, producedPieces, polishedPieces, availableToPolish };
  }, [selectedProjectId, selectedProjectObj, projectSlabs, approvedLogs]);

  // Helper to check if a slab has completed a stage
  const isSlabStageCompleted = (slab: any, stageName: string) => {
    if (!slab) return false;
    const normalizedStage = stageName.split(' - ')[0].replace(' Work', '').trim();
    const targetQty = slab.pieces && slab.pieces.length > 0 ? slab.pieces.length : 1;

    // 1. Piece-level tracking
    if (slab.pieces && slab.pieces.length > 0) {
      const completedPiecesCount = slab.pieces.filter((p: any) => {
        const pStage = (p.stage || 'Production').split(' - ')[0].replace(' Work', '').trim();
        const hasLog = p.logs && p.logs.some((l: any) => {
          const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
          return (lStage === normalizedStage || lStage.startsWith(normalizedStage)) && (l.status === 'completed' || l.status === 'approved');
        });
        const hasProdLog = approvedLogs && approvedLogs.some((l: any) => {
          const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
          if (lStage !== normalizedStage && !lStage.startsWith(normalizedStage)) return false;
          return (l.pieceIds && l.pieceIds.includes(p.id)) || (l.slabId === slab.id && (!l.pieceIds || l.pieceIds.length === 0));
        });
        return hasLog || hasProdLog || (pStage === normalizedStage && p.status === 'completed');
      }).length;

      if (completedPiecesCount >= targetQty) return true;
    }

    // 2. Production logs check
    if (approvedLogs) {
      let sumQty = 0;
      if (normalizedStage === 'Dispatch') {
        const directDispatchLogs = approvedLogs.filter((l: any) => 
          (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') &&
          (l.slabId === slab.id || l.productId === slab.id || l.productName === slab.name || (l.pieceIds && l.pieceIds.some((pid: string) => slab.pieces?.some((p: any) => p.id === pid))))
        );
        const packedLogs = approvedLogs.filter((l: any) => 
          (l.stage === 'Packing' || l.stage === 'Packing Work') &&
          (l.productName === slab.name || l.productId === slab.id || l.slabId === slab.id)
        );
        const allDispatchLogs = approvedLogs.filter((l: any) => (l.stage === 'Dispatch' || l.stage === 'Dispatch Work'));
        const dispatchedPackedLogs = packedLogs.filter((pLog: any) => 
           allDispatchLogs.some((d: any) => d.boxCode && pLog.boxCode && d.boxCode.includes(pLog.boxCode))
        );
        const directQty = directDispatchLogs.reduce((acc: number, l: any) => acc + (l.quantityProduced || 0), 0);
        const packedDispatchedQty = dispatchedPackedLogs.reduce((acc: number, l: any) => acc + (l.quantityProduced || 0), 0);
        sumQty = Math.max(directQty, packedDispatchedQty);
      } else {
        const stageLogs = approvedLogs.filter((l: any) => 
          (l.stage === normalizedStage || l.stage === `${normalizedStage} Work` || l.stage.startsWith(normalizedStage)) &&
          (l.productName === slab.name || l.productId === slab.id || l.slabId === slab.id || (l.pieceIds && l.pieceIds.some((pid: string) => slab.pieces?.some((p: any) => p.id === pid))))
        );
        sumQty = stageLogs.reduce((acc: number, l: any) => acc + (l.quantityProduced || 0), 0);
      }

      if (sumQty >= targetQty) return true;
    }

    return false;
  };

  // Auto-select single pending stone when project is selected
  React.useEffect(() => {
    if (selectedProjectId && projectSlabs && materialDialogOpen) {
      const pendingSlabs = projectSlabs.filter((s: any) => {
        if (s.requiredStages && s.requiredStages.length > 0) {
          if (materialStage === 'Polishing' || materialStage.startsWith('Polishing')) {
            if (!s.requiredStages.some((rs: string) => rs.startsWith('Polishing'))) return false;
          } else if (materialStage === 'Packing') {
            if (!s.requiredStages.includes('Packing')) return false;
          } else if (materialStage === 'Production') {
            if (!s.requiredStages.includes('Production')) return false;
          }
        }
        return !isSlabStageCompleted(s, materialStage);
      });

      if (pendingSlabs.length === 1) {
        const singleSlab = pendingSlabs[0];
        setSelectedSlabId(singleSlab.id);
        setSelectedProductName(singleSlab.name);
        const totalPieces = singleSlab.pieces && singleSlab.pieces.length > 0 ? singleSlab.pieces.length : 1;
        setMaterialQuantity(String(totalPieces));
      }
    }
  }, [selectedProjectId, projectSlabs, materialStage, materialDialogOpen]);

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
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
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
      refetchMachineLogs();
      refetchActiveOutLogs();
    } catch (err: any) {
      showToast(err.data?.message || "Failed to Punch In.", 'error');
      console.error(err);
    }
  };

  const handleMachineClockIn = async () => {
    try {
      const selectedProject = projectsData?.find((p: any) => p.id === selectedProjectId);
      let productName = '';
      if (selectedProject && selectedProject.products && selectedProject.products.length > 0) {
        const prod = selectedProject.products?.find((p: any) => p.id === selectedProductId);
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
      refetchMachineLogs();
      refetchActiveOutLogs();
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
        id: selectedEndMachine, 
        endPhotos: endPhotos, 
        remarks: endRemarks,
        piecesProcessed: Number(endQuantity)
      }).unwrap();
      showToast("Machine Log ended successfully!");
      setSelectedEndMachine('');
      setEndRemarks('');
      setEndQuantity('');
      setEndPhotos({ machine: '', unit: '', software: '' });
      setEndMachineDialogOpen(false);
      refetchMachineLogs();
    } catch (err: any) {
      showToast(err.data?.message || "Failed to end machine log.", 'error');
    }
  };

  const handleOpenMaterialDialog = (type: 'OUT' | 'IN', stageName: string) => {
    const isStageCompletion = stageName !== 'Material Tracking';
    
    setMaterialType(isStageCompletion ? 'OUT' : type);
    setDialogOrigin(stageName);
    setMaterialStage(stageName);
    setMaterialQuantity('');
    setMaterialPhotos({ machine: '', unit: '', software: '', endPhoto: '' });
    setAssigneeType(isStageCompletion ? 'self' : 'vendor');
    setSimpleAssigneeType('client');
    setCustomClientName('');
    setRequiresMachine(isStageCompletion ? false : true);
    setSelectedStaffId('');
    setSelectedVendors([]);
    setVendorRows([{ vendorId: '', vendorName: '', stage: 'Production', qty: '' }]);
    setVehicleNumber('');
    setPackingBox('');
    setPackingCode('');
    setPackingSize('');
    setDispatchBoxCodes([]);
    setSelectedProjectId('');
    setSelectedProductId('');

    setSelectedOutLogId('');
    setSelectedSlabId('');
    setSelectedProductName('');
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

    if (materialStage === 'Packing') {
      if (!packingBox || !packingCode) {
        showToast('Both Box and Code are required for Packing!', 'error');
        return;
      }
    }
    if (materialStage === 'Dispatch' && !vehicleNumber) {
      showToast('Vehicle Number is required for Dispatch!', 'error');
      return;
    }
    if (materialStage === 'Dispatch' && (!dispatchBoxCodes || dispatchBoxCodes.length === 0) && (!materialQuantity || Number(materialQuantity) <= 0)) {
      showToast('Quantity or Packed Box is required for Dispatch!', 'error');
      return;
    }

    if (materialStage === 'Polishing' || materialStage.startsWith('Polishing')) {
      if (!selectedProjectId) {
        showToast('Please select a project!', 'error');
        return;
      }
      if (!materialQuantity || Number(materialQuantity) <= 0) {
        showToast('Please enter a valid polishing quantity!', 'error');
        return;
      }
      if (Number(materialQuantity) > polishingStats.availableToPolish) {
        showToast(`Cannot polish ${materialQuantity} pieces! Only ${polishingStats.availableToPolish} stone(s) are completed in production and ready to polish.`, 'error');
        return;
      }
    }

    const finalBoxCode = materialStage === 'Dispatch' 
      ? (dispatchBoxCodes && dispatchBoxCodes.length > 0 ? dispatchBoxCodes.join('||') : undefined) 
      : ((packingBox || packingCode || packingSize) ? `${packingBox}|${packingCode}|${packingSize}` : undefined);

    try {
      let finalProductName = selectedProductName;
      if (!finalProductName && selectedProjectId && selectedProductId) {
        const selectedProject = projectsData?.find((p: any) => p.id === selectedProjectId);
        if (selectedProject && selectedProject.products && selectedProject.products.length > 0) {
          const prod = selectedProject.products?.find((p: any) => p.id === selectedProductId);
          if (prod) finalProductName = prod.name;
        }
      }
      if (!finalProductName && selectedSlabId && projectSlabs) {
        const slab = projectSlabs.find((s: any) => s.id === selectedSlabId);
        if (slab) finalProductName = slab.name;
      }

      const isStageCompletion = dialogOrigin !== 'Material Tracking';

      await createMaterialLog({
        stage: materialStage,
        quantityProduced: materialQuantity || 1,
        transactionType: materialType,
        startPhotos: materialPhotos,
        workerId: isStageCompletion ? (user?.id || user?._id) : undefined,
        vendors: !isStageCompletion && materialType === 'OUT' ? vendorRows : [],
        vendorName: undefined,
        vehicleNumber: vehicleNumber || undefined,
        boxCode: finalBoxCode,
        parentLogId: materialType === 'IN' && !isStageCompletion ? selectedOutLogId : undefined,
        source: 'Material Tracking',
        requiresMachine: isStageCompletion ? false : (materialType === 'OUT' ? requiresMachine : undefined),
        projectId: materialType === 'OUT' ? (selectedProjectId || undefined) : undefined,
        productId: materialType === 'OUT' ? (selectedProductId || selectedSlabId || undefined) : undefined,
        productName: materialType === 'OUT' ? (finalProductName || undefined) : undefined,
        slabId: materialType === 'OUT' ? (selectedSlabId || undefined) : undefined,
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

  if (sessionLoading || machinesLoading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#0F172A' }}>
        <CircularProgress sx={{ color: '#C89F5A' }} />
      </Box>
    );
  }

  const rejectedCount = rejectedLogs?.length || 0;
  const activeOutCount = activeOutLogs?.length || 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', pb: 12 }}>
      
      {/* 1. LUXURY TOP APP BAR */}
      <Paper 
        elevation={0} 
        sx={{ 
          bgcolor: '#0F172A', 
          color: '#FFFFFF', 
          borderRadius: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          px: { xs: 2, sm: 3, md: 5 },
          py: { xs: 1.8, sm: 2.2 },
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.4)'
        }}
      >
        <Box sx={{ 
          maxWidth: 1240, 
          mx: 'auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: 2
        }}>
          {/* Brand & User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
            <Box sx={{ 
              bgcolor: '#FFFFFF', 
              px: { xs: 1.2, sm: 1.5 }, 
              py: 0.6, 
              borderRadius: 2, 
              display: 'flex', 
              alignItems: 'center', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              flexShrink: 0 
            }}>
              <img src="/logo.png" alt="Unnati Arts" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
            </Box>
            
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                  {user?.name || 'Operations Manager'}
                </Typography>
                <Chip 
                  size="small" 
                  label="MANAGER" 
                  sx={{ 
                    height: 18, 
                    bgcolor: 'rgba(200, 159, 90, 0.2)', 
                    color: '#C89F5A', 
                    fontWeight: 800, 
                    fontSize: '0.62rem',
                    border: '1px solid rgba(200, 159, 90, 0.4)',
                    display: { xs: 'none', sm: 'inline-flex' }
                  }} 
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 500 }}>
                Staff ID: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{user?.staffId || '-'}</span> • Factory Ops
              </Typography>
            </Box>
          </Box>

          {/* Quick Metrics & Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexShrink: 0 }}>
            {/* Outward active badge */}
            <Chip 
              icon={<OutputIcon sx={{ color: '#FB923C !important', fontSize: 16 }} />}
              label={`${activeOutCount} Outward`}
              size="small"
              sx={{ 
                bgcolor: 'rgba(251, 146, 60, 0.15)', 
                color: '#FED7AA', 
                border: '1px solid rgba(251, 146, 60, 0.3)',
                fontWeight: 700,
                fontSize: '0.75rem',
                display: { xs: 'none', md: 'inline-flex' }
              }}
            />

            {/* Quality alert chip */}
            {rejectedCount > 0 && (
              <Chip 
                icon={<ReportProblemIcon sx={{ color: '#F87171 !important', fontSize: 16 }} />}
                label={`${rejectedCount} Rejected`}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(239, 68, 68, 0.2)', 
                  color: '#FECACA', 
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  animation: 'pulse 2s infinite'
                }}
              />
            )}

            {/* Logout button */}
            <Button 
              variant="outlined" 
              onClick={handleLogout} 
              startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
              sx={{ 
                color: '#F87171', 
                borderColor: 'rgba(239, 68, 68, 0.35)', 
                bgcolor: 'rgba(239, 68, 68, 0.08)',
                borderRadius: 2.5,
                py: { xs: 0.6, sm: 0.8 },
                px: { xs: 1.2, sm: 2 },
                fontWeight: 700,
                fontSize: { xs: '0.76rem', sm: '0.82rem' },
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'rgba(239, 68, 68, 0.18)',
                  borderColor: '#EF4444'
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 2. MAIN OPERATIONS CONTAINER */}
      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, sm: 3, md: 5 }, mt: { xs: 2.5, sm: 3.5 } }}>
        <Grid container spacing={3.5}>
          
          {/* LEFT COLUMN: Main Operations Hub */}
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              
              {/* SECTION 1: Logistics & Material In/Out */}
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 2.5, sm: 3.5 }, 
                  borderRadius: { xs: 3, sm: 4 }, 
                  bgcolor: '#FFFFFF', 
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
                }}
              >
                {/* Section Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 42, 
                      height: 42, 
                      borderRadius: 2.5, 
                      bgcolor: 'rgba(200, 159, 90, 0.15)', 
                      border: '1px solid rgba(200, 159, 90, 0.3)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <InventoryIcon sx={{ color: '#C89F5A', fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: { xs: '1.05rem', sm: '1.15rem' }, lineHeight: 1.2 }}>
                        Step 3: Material Movement & Logistics
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, fontSize: '0.78rem' }}>
                        Dispatch raw stone to vendors or receive processed material back
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Chip 
                    size="small" 
                    label="Logistics" 
                    sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '0.7rem' }} 
                  />
                </Box>

                {/* Dual Action Buttons */}
                <Grid container spacing={2}>
                  {/* MATERIAL OUT CARD */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box 
                      onClick={() => handleOpenMaterialDialog('OUT', 'Material Tracking')}
                      sx={{ 
                        p: 2.5, 
                        borderRadius: 3, 
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 8px 24px -6px rgba(234, 88, 12, 0.35)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 120,
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 14px 30px -6px rgba(234, 88, 12, 0.5)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <OutputIcon sx={{ color: '#FFFFFF', fontSize: 20 }} />
                        </Box>
                        <ArrowForwardIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.08rem', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                          MATERIAL OUT
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 500, mt: 0.3 }}>
                          Assign stone to external vendor
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* MATERIAL IN CARD */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box 
                      onClick={() => handleOpenMaterialDialog('IN', 'Material Tracking')}
                      sx={{ 
                        p: 2.5, 
                        borderRadius: 3, 
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 8px 24px -6px rgba(2, 132, 199, 0.35)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 120,
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 14px 30px -6px rgba(2, 132, 199, 0.5)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <InputIcon sx={{ color: '#FFFFFF', fontSize: 20 }} />
                        </Box>
                        <Chip 
                          size="small" 
                          label={`${activeOutCount} Pending`} 
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 700, fontSize: '0.68rem', height: 20 }} 
                        />
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.08rem', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                          MATERIAL IN
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 500, mt: 0.3 }}>
                          Receive processed stone back
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* SECTION 2: Stage Operations Hub (Polishing, Packing, Dispatch) */}
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 2.5, sm: 3.5 }, 
                  borderRadius: { xs: 3, sm: 4 }, 
                  bgcolor: '#FFFFFF', 
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
                }}
              >
                {/* Section Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 42, 
                      height: 42, 
                      borderRadius: 2.5, 
                      bgcolor: 'rgba(16, 185, 129, 0.12)', 
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <PrecisionManufacturingIcon sx={{ color: '#10B981', fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: { xs: '1.05rem', sm: '1.15rem' }, lineHeight: 1.2 }}>
                        Factory Stage Completions
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, fontSize: '0.78rem' }}>
                        Quick 1-tap submission for finished polishing, packing, and dispatch
                      </Typography>
                    </Box>
                  </Box>

                  <Chip 
                    size="small" 
                    label="Operations" 
                    sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 700, fontSize: '0.7rem' }} 
                  />
                </Box>

                {/* 3 Stage Action Cards */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  
                  {/* STEP 4: POLISHING */}
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 3, 
                      bgcolor: '#F8FAFC', 
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: '#F1F5F9', borderColor: '#CBD5E1' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AutoAwesomeIcon sx={{ color: '#059669', fontSize: 22 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem' }}>
                          Step 4: Polishing
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.78rem' }}>
                          Surface polishing work (Honed / Mirror finish)
                        </Typography>
                      </Box>
                    </Box>

                    <Button 
                      variant="contained" 
                      onClick={() => handleOpenMaterialDialog('OUT', 'Polishing')}
                      startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                      sx={{ 
                        borderRadius: 2.5, 
                        py: 1.1, 
                        px: 2.5,
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)'
                        }
                      }}
                    >
                      Mark Polishing Done
                    </Button>
                  </Paper>

                  {/* STEP 5: PACKING */}
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 3, 
                      bgcolor: '#F8FAFC', 
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: '#F1F5F9', borderColor: '#CBD5E1' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Inventory2Icon sx={{ color: '#7C3AED', fontSize: 22 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem' }}>
                          Step 5: Packing
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.78rem' }}>
                          Log box names, package codes &amp; dimensions
                        </Typography>
                      </Box>
                    </Box>

                    <Button 
                      variant="contained" 
                      onClick={() => handleOpenMaterialDialog('OUT', 'Packing')}
                      startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                      sx={{ 
                        borderRadius: 2.5, 
                        py: 1.1, 
                        px: 2.5,
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)'
                        }
                      }}
                    >
                      Mark Packing Done
                    </Button>
                  </Paper>

                  {/* STEP 6: DISPATCH */}
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 3, 
                      bgcolor: '#F8FAFC', 
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: '#F1F5F9', borderColor: '#CBD5E1' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: '#FFF1F2', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LocalShippingIcon sx={{ color: '#E11D48', fontSize: 22 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem' }}>
                          Step 6: Dispatch
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.78rem' }}>
                          Log vehicle number &amp; customer delivery
                        </Typography>
                      </Box>
                    </Box>

                    <Button 
                      variant="contained" 
                      onClick={() => handleOpenMaterialDialog('OUT', 'Dispatch')}
                      startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                      sx={{ 
                        borderRadius: 2.5, 
                        py: 1.1, 
                        px: 2.5,
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                        boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #BE123C 0%, #9F1239 100%)'
                        }
                      }}
                    >
                      Mark Dispatch Done
                    </Button>
                  </Paper>

                </Box>
              </Paper>

            </Box>
          </Grid>

          {/* RIGHT COLUMN: Quality Control & Admin Rejected Items Queue */}
          <Grid size={{ xs: 12, lg: 4.5 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                position: { lg: 'sticky' }, 
                top: 90, 
                borderRadius: { xs: 3, sm: 4 }, 
                overflow: 'hidden',
                bgcolor: '#FFFFFF',
                boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
                border: rejectedCount > 0 ? '1.5px solid #FECACA' : '1px solid #E2E8F0'
              }}
            >
              {/* Card Header */}
              <Box sx={{ 
                bgcolor: rejectedCount > 0 ? '#FEF2F2' : '#F8FAFC', 
                p: { xs: 2.5, sm: 3 }, 
                borderBottom: rejectedCount > 0 ? '1px solid #FEE2E2' : '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{ 
                    width: 34, 
                    height: 34, 
                    borderRadius: 2, 
                    bgcolor: rejectedCount > 0 ? '#FEE2E2' : '#F1F5F9', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {rejectedCount > 0 ? (
                      <ReportProblemIcon sx={{ color: '#DC2626', fontSize: 19 }} />
                    ) : (
                      <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 19 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: rejectedCount > 0 ? '#991B1B' : '#0F172A', fontSize: '0.95rem', lineHeight: 1.2 }}>
                      Admin Rejected Tasks
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 500 }}>
                      Quality control &amp; rework queue
                    </Typography>
                  </Box>
                </Box>

                <Chip 
                  size="small" 
                  label={rejectedCount > 0 ? `${rejectedCount} Action Needed` : 'All Clear'} 
                  sx={{ 
                    bgcolor: rejectedCount > 0 ? '#FEE2E2' : '#ECFDF5', 
                    color: rejectedCount > 0 ? '#B91C1C' : '#047857', 
                    fontWeight: 800, 
                    fontSize: '0.7rem' 
                  }} 
                />
              </Box>

              {/* Rejected Items List */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2, 
                maxHeight: { xs: 'auto', lg: 'calc(100vh - 240px)' }, 
                overflowY: 'auto', 
                p: { xs: 2, sm: 2.5 },
                bgcolor: '#FFFFFF'
              }}>
                {rejectedLogs?.flatMap((log: any, index: number) => {
                  return (
                    <Paper 
                      key={`${log.id}-${index}`} 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2.5, 
                        border: '1px solid #FECDD3',
                        borderLeft: '4px solid #E11D48', 
                        bgcolor: '#FFF1F2',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(225, 29, 72, 0.06)'
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        {(log.startPhotos?.rejectionPhoto || log.rejectionPhoto || log.startPhotos?.machine || log.startPhotos?.unit) && (
                          <Box 
                            component="img" 
                            src={log.startPhotos?.rejectionPhoto || log.rejectionPhoto || log.startPhotos?.machine || log.startPhotos?.unit} 
                            onClick={() => setPreviewPhoto(log.startPhotos?.rejectionPhoto || log.rejectionPhoto || log.startPhotos?.machine || log.startPhotos?.unit)}
                            sx={{ 
                              width: 55, 
                              height: 55, 
                              borderRadius: 2, 
                              objectFit: 'cover', 
                              border: (log.startPhotos?.rejectionPhoto || log.rejectionPhoto) ? '2px solid #DC2626' : '1px solid #FDA4AF', 
                              cursor: 'pointer',
                              flexShrink: 0 
                            }} 
                          />
                        )}
                        
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                            <Typography sx={{ fontWeight: 800, color: '#9F1239', fontSize: '0.88rem', lineHeight: 1.2 }}>
                              {log.stage} {log.worker?.name ? `• ${log.worker.name}` : ''}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={`${log.quantityProduced} Pcs`} 
                              sx={{ bgcolor: '#FFE4E6', color: '#BE123C', fontWeight: 800, fontSize: '0.65rem', height: 18 }} 
                            />
                          </Box>

                          {log.remarks && (
                            <Box sx={{ 
                              mt: 1, 
                              p: 1, 
                              bgcolor: '#FEE2E2', 
                              borderRadius: 1.5, 
                              border: '1px solid #FCA5A5' 
                            }}>
                              <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 800, display: 'block', fontSize: '0.75rem' }}>
                                Admin Note: <span style={{ fontWeight: 800, color: '#DC2626' }}>{log.remarks}</span>
                              </Typography>
                            </Box>
                          )}

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 13 }} /> {new Date(log.createdAt).toLocaleDateString()}
                            </Typography>

                            {log.approvalStatus === 'redo_in_progress' ? (
                              <Button 
                                variant="contained" 
                                size="small"
                                onClick={() => openCompleteRedoDialog(log)}
                                color="success"
                                sx={{ 
                                  borderRadius: 2, 
                                  textTransform: 'none', 
                                  fontWeight: 800, 
                                  fontSize: '0.74rem', 
                                  py: 0.5,
                                  px: 1.5 
                                }}
                              >
                                Complete Rework
                              </Button>
                            ) : (
                              <Button 
                                variant="contained" 
                                size="small"
                                onClick={() => openRedoDialog(log)}
                                startIcon={<ReplayIcon sx={{ fontSize: 14 }} />}
                                sx={{ 
                                  borderRadius: 2, 
                                  textTransform: 'none', 
                                  fontWeight: 800, 
                                  fontSize: '0.74rem', 
                                  py: 0.5,
                                  px: 1.5,
                                  bgcolor: '#0F172A',
                                  '&:hover': { bgcolor: '#1E293B' } 
                                }}
                              >
                                Re-do Work
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
                
                {(!rejectedLogs || rejectedLogs.length === 0) && (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '50%', 
                      bgcolor: '#ECFDF5', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.5 
                    }}>
                      <CheckCircleIcon sx={{ fontSize: 32, color: '#10B981' }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                      All Quality Checks Passed
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5, px: 2 }}>
                      No tasks are rejected by Admin. Factory operations running smoothly.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

        </Grid>
      </Box>

      {/* 3. DIALOG: MATERIAL LOGISTICS & STAGE COMPLETION */}
      <Dialog 
        open={materialDialogOpen} 
        onClose={() => setMaterialDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 3, sm: 4 },
              overflow: 'hidden',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)',
              border: '1px solid #E2E8F0',
              m: { xs: 1.5, sm: 2 }
            }
          }
        }}
      >
        {/* Modern Dark Header */}
        <Box sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: { xs: 1.8, sm: 2.2 }, 
          bgcolor: '#0F172A', 
          color: '#FFFFFF', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 36, 
              height: 36, 
              borderRadius: 2, 
              bgcolor: materialType === 'OUT' ? 'rgba(234, 88, 12, 0.2)' : 'rgba(2, 132, 199, 0.2)', 
              border: materialType === 'OUT' ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid rgba(2, 132, 199, 0.4)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              {materialType === 'OUT' ? <OutputIcon sx={{ color: '#FB923C', fontSize: 18 }} /> : <InputIcon sx={{ color: '#38BDF8', fontSize: 18 }} />}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.98rem', sm: '1.08rem' }, color: '#FFFFFF', lineHeight: 1.2 }}>
                {dialogOrigin === 'Material Tracking' ? (materialType === 'OUT' ? 'Material Outward (Take)' : 'Material Inward (Return)') : `Complete ${materialStage}`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: { xs: '0.72rem', sm: '0.76rem' } }}>
                Enter piece quantities, spec &amp; mandatory verification photo
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={() => setMaterialDialogOpen(false)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' }, p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Inward Section: Select active out log to return using Checkboxes */}
            {materialType === 'IN' && (
              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 800, fontSize: '0.88rem', mb: 1.2 }}>
                  1. Select Active Assignment to Return
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
                  {activeOutLogs?.filter((log: any) => dialogOrigin === 'Material Tracking' || log.stage === materialStage).map((log: any) => {
                    const clientName = log.project?.clientName || log.project?.name || log.vendorName || 'Client';
                    const projName = log.project?.name && log.project?.clientName ? log.project.name : (log.project?.projectId || '');
                    const pendingQty = (log.quantityProduced || 0) - (log.returnedQty || 0);
                    const isChecked = selectedOutLogId === log.id;

                    return (
                      <Paper
                        key={log.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedOutLogId('');
                            setMaterialQuantity('');
                          } else {
                            setSelectedOutLogId(log.id);
                            setMaterialQuantity(String(pendingQty));
                          }
                        }}
                        elevation={0}
                        sx={{
                          p: 1.75,
                          borderRadius: 3,
                          border: '1.5px solid',
                          borderColor: isChecked ? '#0284C7' : '#E2E8F0',
                          bgcolor: isChecked ? '#F0F9FF' : '#F8FAFC',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          boxShadow: isChecked ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none',
                          '&:hover': { borderColor: '#0284C7', bgcolor: '#F0F9FF' }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Checkbox 
                            checked={isChecked} 
                            onChange={(e) => {
                              e.stopPropagation();
                              if (isChecked) {
                                setSelectedOutLogId('');
                                setMaterialQuantity('');
                              } else {
                                setSelectedOutLogId(log.id);
                                setMaterialQuantity(String(pendingQty));
                              }
                            }} 
                            color="primary"
                            sx={{ p: 0.5 }}
                          />
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                              Client: <span style={{ color: '#0284C7', fontWeight: 900 }}>{clientName}</span>{projName ? ` (${projName})` : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, display: 'block', mt: 0.3 }}>
                              {log.productName ? `${log.productName} • ` : ''}{log.stage} ({log.worker?.name || log.vendorName || 'External Vendor'})
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Chip 
                          label={`${pendingQty} pcs pending`} 
                          size="small" 
                          sx={{ 
                            bgcolor: isChecked ? '#0284C7' : '#E2E8F0', 
                            color: isChecked ? '#FFFFFF' : '#334155', 
                            fontWeight: 800, 
                            fontSize: '0.74rem' 
                          }} 
                        />
                      </Paper>
                    );
                  })}

                  {(!activeOutLogs || activeOutLogs.filter((log: any) => dialogOrigin === 'Material Tracking' || log.stage === materialStage).length === 0) && (
                    <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px dashed #CBD5E1' }}>
                      <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                        No pending assignments available to return.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Outward & Stage Completion Flow */}
            {materialType === 'OUT' && (
              <>
                {dialogOrigin !== 'Material Tracking' ? (
                  <>
                    <Box>
                      <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 0.6 }}>
                        1. Select Client / Project
                      </Typography>
                      <Autocomplete
                        size="small"
                        options={projectsData || []}
                        getOptionLabel={(p: any) => `${p.projectId ? `[${p.projectId}] ` : ''}${p.name || ''}`}
                        value={projectsData?.find((p: any) => p.id === selectedProjectId) || null}
                        onChange={(_, p: any) => {
                          setSelectedProjectId(p ? p.id : '');
                          setSelectedSlabId('');
                          setSelectedProductName('');
                          setMaterialQuantity('');
                        }}
                        isOptionEqualToValue={(option: any, val: any) => option.id === val?.id}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            placeholder="-- Click to Select Work Order --"
                            sx={{ 
                              '& .MuiOutlinedInput-root': { 
                                borderRadius: 2.5, 
                                bgcolor: '#F8FAFC',
                                '& fieldset': { borderColor: '#E2E8F0' },
                                '&:hover fieldset': { borderColor: '#CBD5E1' }
                              } 
                            }}
                          />
                        )}
                      />
                    </Box>

                    {/* Polishing: Skip Step 2 and show project-wide stats */}
                    {(materialStage === 'Polishing' || materialStage.startsWith('Polishing')) ? (
                      selectedProjectId && (
                        <Box sx={{ p: 2, bgcolor: '#F0F9FF', borderRadius: 2.5, border: '1px solid #BAE6FD', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369A1' }}>Total Order Stones:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0369A1' }}>{polishingStats.totalProjectPieces} Pcs</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669' }}>Production Completed (Ready to Polish):</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#059669' }}>{polishingStats.producedPieces} Pcs</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>Already Polished:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#64748B' }}>{polishingStats.polishedPieces} Pcs</Typography>
                          </Box>
                          <Divider sx={{ borderColor: '#BAE6FD' }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Available to Polish:</Typography>
                            <Chip 
                              label={`${polishingStats.availableToPolish} Pcs Remaining`} 
                              size="small" 
                              sx={{ 
                                bgcolor: polishingStats.availableToPolish > 0 ? '#10B981' : '#EF4444', 
                                color: '#FFF', 
                                fontWeight: 800 
                              }} 
                            />
                          </Box>
                        </Box>
                      )
                    ) : (
                      selectedProjectId && (
                        <Box>
                          <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 0.6 }}>
                            2. Select Main Stone / Product
                          </Typography>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            value={selectedSlabId}
                            onChange={(e) => {
                              const sId = e.target.value;
                              setSelectedSlabId(sId);
                              const slab = projectSlabs?.find((s: any) => s.id === sId);
                              if (slab) {
                                setSelectedProductName(slab.name);
                                const totalPieces = slab.pieces && slab.pieces.length > 0 ? slab.pieces.length : 1;
                                setMaterialQuantity(String(totalPieces));
                              } else {
                                setSelectedProductName('');
                                setMaterialQuantity('');
                              }
                            }}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { 
                                borderRadius: 2.5, 
                                bgcolor: '#F8FAFC',
                                '& fieldset': { borderColor: '#E2E8F0' },
                                '&:hover fieldset': { borderColor: '#CBD5E1' }
                              } 
                            }}
                          >
                            {(() => {
                              const filteredSlabs = projectSlabs?.filter((s: any) => {
                                if (s.requiredStages && s.requiredStages.length > 0) {
                                  if (materialStage === 'Packing') {
                                    if (!s.requiredStages.includes('Packing')) return false;
                                  } else if (materialStage === 'Production') {
                                    if (!s.requiredStages.includes('Production')) return false;
                                  }
                                }
                                return !isSlabStageCompleted(s, materialStage);
                              }) || [];

                              if (filteredSlabs.length === 0) {
                                return (
                                  <MenuItem value="" disabled sx={{ fontSize: '0.88rem', color: '#EF4444', fontWeight: 700 }}>
                                    -- All stones in this project have completed {materialStage} --
                                  </MenuItem>
                                );
                              }

                              return [
                                <MenuItem key="default" value="" disabled sx={{ fontSize: '0.88rem' }}>-- Select Main Stone / Product --</MenuItem>,
                                ...filteredSlabs.map((s: any) => (
                                  <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.88rem' }}>
                                    {s.name} ({s.pieces?.length || 1} Pcs)
                                  </MenuItem>
                                ))
                              ];
                            })()}
                          </TextField>
                        </Box>
                      )
                    )}

                    {materialStage !== 'Dispatch' && (
                      <Box>
                        <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 0.6 }}>
                          {(materialStage === 'Polishing' || materialStage.startsWith('Polishing')) ? '2. Quantity Polished / Completed' : '3. Quantity Produced / Completed'}
                        </Typography>
                        <TextField 
                          fullWidth 
                          size="small"
                          type="number"
                          value={materialQuantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (materialStage === 'Polishing' || materialStage.startsWith('Polishing')) {
                              if (Number(val) > polishingStats.availableToPolish) {
                                showToast(`Cannot exceed produced pieces! Only ${polishingStats.availableToPolish} pieces available to polish.`, 'error');
                                setMaterialQuantity(String(polishingStats.availableToPolish));
                                return;
                              }
                            }
                            setMaterialQuantity(val);
                          }}
                          placeholder={(materialStage === 'Polishing' || materialStage.startsWith('Polishing')) ? `Max ${polishingStats.availableToPolish} pieces` : "e.g. 5 pieces"}
                          helperText={(materialStage === 'Polishing' || materialStage.startsWith('Polishing')) && selectedProjectId ? `Max allowed: ${polishingStats.availableToPolish} pcs (${polishingStats.producedPieces > 0 ? `Production: ${polishingStats.producedPieces} completed` : `Total Order: ${polishingStats.totalProjectPieces} pcs`})` : undefined}
                          error={(materialStage === 'Polishing' || materialStage.startsWith('Polishing')) && selectedProjectId && materialQuantity !== '' ? Number(materialQuantity) > polishingStats.availableToPolish : false}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2.5, 
                              bgcolor: '#F8FAFC',
                              '& fieldset': { borderColor: '#E2E8F0' },
                              '&:hover fieldset': { borderColor: '#CBD5E1' }
                            } 
                          }}
                        />
                      </Box>
                    )}
                  </>
                ) : (
                  <>
                    {/* Material Tracking Assignment flow - Strictly External Vendor */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ color: '#0F172A', fontWeight: 800, fontSize: '0.88rem' }}>
                          Assign Stone to Vendor(s):
                        </Typography>
                        <Chip label={`${vendorRows.length} Vendor${vendorRows.length > 1 ? 's' : ''}`} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#FFF7ED', color: '#EA580C', border: '1px solid #FFEDD5' }} />
                      </Box>

                      {vendorRows.map((row, index) => {
                        const DEFAULT_STAGES = ['Production', 'Polishing - Honed', 'Polishing - Mirror', 'Polishing', 'Packing', 'Dispatch'];
                        const isCustomStage = !DEFAULT_STAGES.includes(row.stage);

                        return (
                          <Paper 
                            key={index} 
                            elevation={0} 
                            sx={{ 
                              p: 2, 
                              border: '1px solid #E2E8F0', 
                              borderRadius: 3, 
                              bgcolor: '#FFFFFF', 
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 1.5 
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: '#EA580C', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>
                                  {index + 1}
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem' }}>
                                  Assignment {index + 1}
                                </Typography>
                              </Box>
                              {vendorRows.length > 1 && (
                                <IconButton size="small" color="error" onClick={() => setVendorRows(prev => prev.filter((_, i) => i !== index))} sx={{ bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              )}
                            </Box>
                            
                            {/* 1. Vendor Selection */}
                            <TextField 
                              select
                              label="Select Vendor *" 
                              fullWidth 
                              size="small"
                              value={row.vendorId} 
                              onChange={(e) => {
                                const vName = vendorsList?.find((v:any) => v.id === e.target.value)?.name || '';
                                setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], vendorId: e.target.value, vendorName: vName }; return arr; });
                              }}
                              slotProps={{ input: { sx: { borderRadius: 2, bgcolor: '#F8FAFC' } } }}
                            >
                              {vendorsList?.map((v: any) => (
                                <MenuItem key={v.id} value={v.id} sx={{ fontSize: '0.88rem' }}>{v.name}</MenuItem>
                              ))}
                            </TextField>

                            {/* 2. Work Stage & Quantity in clean 2-column grid */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 1.5 }}>
                              <TextField 
                                select
                                label="Work Stage *" 
                                fullWidth 
                                size="small"
                                value={isCustomStage ? 'OTHER' : (row.stage || 'Production')} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVendorRows(prev => { 
                                    const arr = [...prev]; 
                                    arr[index] = { ...arr[index], stage: val === 'OTHER' ? '' : val }; 
                                    return arr; 
                                  });
                                }} 
                                slotProps={{ input: { sx: { borderRadius: 2, bgcolor: '#F8FAFC' } } }}
                              >
                                <MenuItem value="Production">Production</MenuItem>
                                <MenuItem value="Polishing - Honed">Polishing - Honed</MenuItem>
                                <MenuItem value="Polishing - Mirror">Polishing - Mirror</MenuItem>
                                <MenuItem value="Polishing">Polishing</MenuItem>
                                <MenuItem value="Packing">Packing</MenuItem>
                                <MenuItem value="Dispatch">Dispatch</MenuItem>
                                <Divider sx={{ my: 0.5 }} />
                                <MenuItem value="OTHER" sx={{ color: '#EA580C', fontWeight: 800 }}>+ Custom Work Stage...</MenuItem>
                              </TextField>

                              <TextField 
                                fullWidth 
                                size="small"
                                label="Quantity *" 
                                type="number"
                                placeholder="e.g. 5"
                                value={row.qty}
                                onChange={(e) => setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], qty: e.target.value }; return arr; })}
                                slotProps={{ 
                                  input: { 
                                    endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>Pcs</Typography></InputAdornment>,
                                    sx: { borderRadius: 2, bgcolor: '#F8FAFC' } 
                                  } 
                                }}
                              />
                            </Box>

                            {/* Custom stage input if 'OTHER' is selected */}
                            {isCustomStage && (
                              <TextField
                                fullWidth
                                size="small"
                                label="Enter Custom Work Stage *"
                                placeholder="e.g. Chamfering / Sandblast / Custom Work"
                                value={row.stage}
                                onChange={(e) => setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], stage: e.target.value }; return arr; })}
                                slotProps={{ input: { sx: { borderRadius: 2, bgcolor: '#FFF7ED' } } }}
                                autoFocus
                              />
                            )}
                          </Paper>
                        );
                      })}

                      <Button 
                        startIcon={<AddIcon sx={{ fontSize: 18 }} />} 
                        onClick={() => setVendorRows(prev => [...prev, { vendorId: '', vendorName: '', stage: 'Production', qty: '' }])} 
                        sx={{ 
                          alignSelf: 'flex-start', 
                          textTransform: 'none', 
                          fontWeight: 800, 
                          fontSize: '0.82rem',
                          color: '#EA580C',
                          bgcolor: '#FFF7ED',
                          border: '1px solid #FFEDD5',
                          borderRadius: 2,
                          px: 2,
                          py: 0.7,
                          '&:hover': { bgcolor: '#FFEDD5' }
                        }}
                      >
                        + Add Another Vendor Assignment
                      </Button>
                    </Box>
                  </>
                )}
              </>
            )}

            {/* Packing stage specifics */}
            {materialStage === 'Packing' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                <TextField 
                  fullWidth 
                  size="small"
                  label="Box *"
                  placeholder="e.g. Ram"
                  value={packingBox}
                  onChange={(e) => setPackingBox(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField 
                  fullWidth 
                  size="small"
                  label="Code *"
                  placeholder="e.g. 101"
                  value={packingCode}
                  onChange={(e) => setPackingCode(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField 
                  fullWidth 
                  size="small"
                  label="Size (Opt)"
                  placeholder="e.g. 10x25x52"
                  value={packingSize}
                  onChange={(e) => setPackingSize(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            )}

            {/* Dispatch stage specifics */}
            {materialStage === 'Dispatch' && (
              <>
                {packedBoxes.length > 0 && (
                  <Autocomplete
                    multiple
                    options={packedBoxes}
                    getOptionLabel={(option: any) => option.boxCode ? option.boxCode.replace(/\|/g, ' / ') : `No Box Code - ${option.productName}`}
                    value={packedBoxes.filter((b: any) => dispatchBoxCodes.includes(b.boxCode || b.id))}
                    onChange={(_, newValue) => {
                      setDispatchBoxCodes(newValue.map((v: any) => v.boxCode || v.id));
                      const totalQty = newValue.reduce((acc: number, log: any) => acc + (log.quantityProduced || 0), 0);
                      if (totalQty > 0) setMaterialQuantity(String(totalQty));
                      const firstBox = newValue[0];
                      if (firstBox && firstBox.boxCode) {
                        const parts = firstBox.boxCode.split('|');
                        if (parts[0]) setPackingBox(parts[0]);
                        if (parts[1]) setPackingCode(parts[1]);
                        if (parts[2]) setPackingSize(parts[2]);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        size="small"
                        label="Select Packed Box(es) (Optional)" 
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                      />
                    )}
                    renderTags={(value: readonly any[], getTagProps) =>
                      value.map((option: any, index: number) => {
                        const { key, ...tagProps } = getTagProps({ index }) as any;
                        return (
                          <Chip size="small" variant="outlined" label={option.boxCode ? option.boxCode.split('|')[0] : 'Box'} key={key} {...tagProps} />
                        );
                      })
                    }
                  />
                )}
                
                <TextField 
                  fullWidth 
                  size="small"
                  label="Quantity Dispatched *" 
                  type="number"
                  value={materialQuantity}
                  onChange={(e) => setMaterialQuantity(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Box *"
                    placeholder="e.g. Ram"
                    value={packingBox}
                    onChange={(e) => setPackingBox(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Code *"
                    placeholder="e.g. 101"
                    value={packingCode}
                    onChange={(e) => setPackingCode(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Size (Opt)"
                    placeholder="e.g. 10x25x52"
                    value={packingSize}
                    onChange={(e) => setPackingSize(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Box>
              </>
            )}

            {/* Vehicle Number (if relevant) */}
            {((dialogOrigin === 'Material Tracking' && !(materialType === 'IN' && materialStage === 'Polishing') && !(materialType === 'OUT' && materialStage === 'Packing')) || materialStage === 'Dispatch') && (
              <TextField 
                fullWidth 
                size="small"
                label={materialStage === 'Dispatch' ? "Vehicle Number *" : "Vehicle Number (Optional)"}
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.substring(0, 15).toUpperCase())}
                placeholder="e.g. RJ14-XX-1234"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            )}

            {/* Photo Verification Upload Tile */}
            <Box>
              <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 1.2 }}>
                Upload Verification Photos
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: dialogOrigin !== 'Material Tracking' ? '1fr' : (materialType === 'OUT' && !requiresMachine ? '1fr 1fr' : '1fr'), gap: 1.5 }}>
                {dialogOrigin !== 'Material Tracking' ? (
                  <ImageUploadBox label="VERIFICATION PHOTO *" previewUrl={materialPhotos.machine} onClick={() => startCamera('mat_machine')} />
                ) : (
                  <>
                    <ImageUploadBox label="START PHOTO *" previewUrl={materialPhotos.machine} onClick={() => startCamera('mat_machine')} />
                    {materialType === 'OUT' && !requiresMachine && (
                      <ImageUploadBox label="COMPLETION PHOTO *" previewUrl={materialPhotos.endPhoto} onClick={() => startCamera('mat_endPhoto')} />
                    )}
                  </>
                )}
              </Box>
            </Box>

          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setMaterialDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          
          <Button 
            variant="contained" 
            fullWidth
            onClick={handleMaterialSubmit}
            disabled={
              dialogOrigin !== 'Material Tracking' 
              ? (
                !selectedProjectId ||
                !materialQuantity ||
                !materialPhotos.machine || 
                creatingMaterial
              )
              : (
                (materialType === 'OUT' && vendorRows.some(r => !r.vendorId || !r.qty)) ||
                (materialType === 'IN' && !materialQuantity && !selectedOutLogId) ||
                !materialPhotos.machine ||
                (materialType === 'OUT' && !requiresMachine && !materialPhotos.endPhoto) ||
                creatingMaterial
              )
            }
            sx={{ 
              borderRadius: 2.5,
              py: 1.2,
              fontWeight: 800,
              fontSize: '0.92rem',
              textTransform: 'none',
              background: materialType === 'OUT' ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)' : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
            }}
          >
            {creatingMaterial ? <CircularProgress size={20} color="inherit" /> : 'Submit to Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 4. DIALOG: RE-DO REJECTED TASK */}
      <Dialog 
        open={redoDialogOpen} 
        onClose={() => setRedoDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0'
            }
          }
        }}
      >
        <Box sx={{ px: 3, py: 2, bgcolor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReplayIcon sx={{ color: '#F87171', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>
              Rework Rejected Task
            </Typography>
          </Box>
          <IconButton onClick={() => setRedoDialogOpen(false)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFF' }, p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#FFFFFF' }}>
          {redoLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Rejected item banner */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF1F2', borderRadius: 2.5, border: '1px solid #FECDD3' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#9F1239' }}>
                  Stage: {redoLog.stage} • Quantity: {redoLog.quantityProduced} Pcs
                </Typography>
                {redoLog.remarks && (
                  <Typography variant="body2" sx={{ color: '#BE123C', mt: 0.5, fontWeight: 600 }}>
                    ❌ Admin Rejection Reason: {redoLog.remarks}
                  </Typography>
                )}
              </Paper>

              {/* Machine or Hand work selection */}
              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
                  1. How will this rework be performed?
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Button 
                    variant={redoRequiresMachine ? 'contained' : 'outlined'} 
                    onClick={() => setRedoRequiresMachine(true)}
                    startIcon={<PrecisionManufacturingIcon />}
                    sx={{ 
                      borderRadius: 2.5, 
                      fontWeight: 800, 
                      py: 1.3,
                      textTransform: 'none',
                      bgcolor: redoRequiresMachine ? '#0F172A' : '#F8FAFC',
                      borderColor: '#CBD5E1',
                      color: redoRequiresMachine ? '#FFF' : '#475569'
                    }}
                  >
                    Machine Work
                  </Button>
                  <Button 
                    variant={!redoRequiresMachine ? 'contained' : 'outlined'} 
                    onClick={() => setRedoRequiresMachine(false)}
                    startIcon={<PersonIcon />}
                    sx={{ 
                      borderRadius: 2.5, 
                      fontWeight: 800, 
                      py: 1.3,
                      textTransform: 'none',
                      bgcolor: !redoRequiresMachine ? '#0F172A' : '#F8FAFC',
                      borderColor: '#CBD5E1',
                      color: !redoRequiresMachine ? '#FFF' : '#475569'
                    }}
                  >
                    Hand Work (Direct)
                  </Button>
                </Box>
              </Box>

              {/* Machine selector if machine work */}
              {redoRequiresMachine && (
                <Box>
                  <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 0.6 }}>
                    2. Select Machine
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={redoMachineId}
                    onChange={(e) => setRedoMachineId(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                  >
                    {machines?.map((m: any) => (
                      <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.88rem' }}>{m.name} ({m.type})</MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}

              {/* Photo capture */}
              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
                  {redoRequiresMachine ? '3' : '2'}. Take Verification Photo
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
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
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setRedoDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            fullWidth
            onClick={handleRedoSubmit} 
            disabled={redoSubmitting || (redoRequiresMachine && (!redoMachineId || !redoStartPhoto)) || (!redoRequiresMachine && !redoEndPhoto)}
            sx={{ 
              borderRadius: 2.5, 
              fontWeight: 800, 
              py: 1.2,
              bgcolor: '#0F172A',
              color: '#FFFFFF',
              textTransform: 'none'
            }}
          >
            {redoSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Submit Rework to Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 5. DIALOG: COMPLETE RE-DO WORK */}
      <Dialog 
        open={completeRedoDialogOpen} 
        onClose={() => setCompleteRedoDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0'
            }
          }
        }}
      >
        <Box sx={{ px: 3, py: 2, bgcolor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(22, 163, 74, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>
              Complete Machine Rework
            </Typography>
          </Box>
          <IconButton onClick={() => setCompleteRedoDialogOpen(false)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFF' }, p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#FFFFFF' }}>
          {redoLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#ECFDF5', borderRadius: 2.5, border: '1px solid #A7F3D0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065F46' }}>
                  Stage: {redoLog.stage} • Quantity: {redoLog.quantityProduced} Pcs
                </Typography>
                <Typography variant="caption" sx={{ color: '#047857', display: 'block', mt: 0.5 }}>
                  This item was re-worked on machine. Capture the final completed photo to mark machine OFF and submit to Admin.
                </Typography>
              </Paper>

              <Box>
                <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
                  Final Completion Photo
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

        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setCompleteRedoDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            fullWidth
            onClick={handleCompleteRedoSubmit} 
            disabled={redoSubmitting || !redoEndPhoto}
            sx={{ 
              borderRadius: 2.5, 
              fontWeight: 800, 
              py: 1.2,
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: '#FFFFFF',
              textTransform: 'none'
            }}
          >
            {redoSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Machine OFF & Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. RESPONSIVE CAMERA DIALOG (Front / Back Flip) */}
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
              Capture Verification Photo
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

          {/* Viewfinder Corner Reticles */}
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

          {/* Live Indicator Badge */}
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

      {/* 7. PREVIEW PHOTO DIALOG */}
      <Dialog 
        open={!!previewPhoto} 
        onClose={() => setPreviewPhoto(null)} 
        maxWidth="md" 
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0B0F19',
              color: '#FFF',
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }
        }}
      >
        <Box sx={{ px: 3, py: 1.8, bgcolor: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, color: '#FFF', fontSize: '0.95rem' }}>
            High-Resolution Photo Preview
          </Typography>
          <IconButton onClick={() => setPreviewPhoto(null)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFF' } }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ textAlign: 'center', p: 2, bgcolor: '#000' }}>
          {previewPhoto && (
            <img src={previewPhoto} alt="Preview" style={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: '8px', objectFit: 'contain' }} />
          )}
        </DialogContent>
      </Dialog>

      {/* 8. SNACKBAR NOTIFICATIONS */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%', borderRadius: 2.5, fontWeight: 'bold' }} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default ManagerDashboard;
