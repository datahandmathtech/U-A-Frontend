import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Avatar,
  Chip,
  Alert,
  Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditIcon from '@mui/icons-material/Edit';
import LayersIcon from '@mui/icons-material/Layers';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';

import {
  useGetMachinesQuery,
  useUploadFilesMutation,
  useQuickCompletePieceMutation,
  useQuickEditPieceLogMutation,
  useLazyGetQuickPieceDetailsQuery
} from '../../store/apiSlice';

interface QuickPieceActionDialogProps {
  open: boolean;
  onClose: () => void;
  slab: any;
  mode: 'add' | 'edit';
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

const STAGE_CONFIG: { [key: string]: { label: string; icon: any; color: string; bg: string } } = {
  'Production': { label: 'Production', icon: <PrecisionManufacturingIcon sx={{ fontSize: 18 }} />, color: '#059669', bg: '#ECFDF5' },
  'Polishing - Honed': { label: 'Polishing (Honed)', icon: <AutoFixHighIcon sx={{ fontSize: 18 }} />, color: '#D97706', bg: '#FFFBEB' },
  'Polishing - Mirror': { label: 'Polishing (Mirror)', icon: <AutoFixHighIcon sx={{ fontSize: 18 }} />, color: '#D97706', bg: '#FFFBEB' },
  'Polishing': { label: 'Polishing', icon: <AutoFixHighIcon sx={{ fontSize: 18 }} />, color: '#D97706', bg: '#FFFBEB' },
  'Packing': { label: 'Packing', icon: <Inventory2Icon sx={{ fontSize: 18 }} />, color: '#9333EA', bg: '#FDF4FF' },
  'Dispatch': { label: 'Dispatch', icon: <LocalShippingIcon sx={{ fontSize: 18 }} />, color: '#0284C7', bg: '#EFF6FF' }
};

const dropdownMenuProps = {
  autoFocus: false,
  disableAutoFocus: true,
  disableAutoFocusItem: true,
  disableEnforceFocus: true,
  anchorOrigin: {
    vertical: 'bottom' as const,
    horizontal: 'left' as const,
  },
  transformOrigin: {
    vertical: 'top' as const,
    horizontal: 'left' as const,
  },
  PaperProps: {
    sx: {
      maxHeight: 280,
      borderRadius: 2.5,
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      mt: 1
    }
  }
};

export const QuickPieceActionDialog: React.FC<QuickPieceActionDialogProps> = ({
  open,
  onClose,
  slab,
  mode,
  onSuccess,
  onError
}) => {
  const { data: machines = [], isLoading: isMachinesLoading } = useGetMachinesQuery();
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();
  const [quickCompletePiece, { isLoading: isCompleting }] = useQuickCompletePieceMutation();
  const [quickEditPieceLog, { isLoading: isEditing }] = useQuickEditPieceLogMutation();
  const [getQuickPieceDetails, { isLoading: isFetchingDetails }] = useLazyGetQuickPieceDetailsQuery();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Webcam state & refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isCameraCapturing, setIsCameraCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  // Turn on live camera (desktop webcam or mobile environment camera)
  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setCameraStream(stream);
      setCameraFacing(facing);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 150);
    } catch (err: any) {
      console.warn('Camera getUserMedia failed:', err);
      onError?.('Camera could not be accessed. Please check permissions or upload from files.');
    }
  };

  // Auto clean-up camera when dialog closes or unmounts
  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Capture current frame from webcam
  const captureCameraPhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsCameraCapturing(true);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const fileName = `Piece_Proof_${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          stopCamera();

          const formData = new FormData();
          formData.append('files', file);
          try {
            const res = await uploadFiles(formData).unwrap();
            if (res?.success && res.urls?.length > 0) {
              setPhotoUrl(res.urls[0]);
            } else {
              onError?.('Failed to upload captured photo');
            }
          } catch (err: any) {
            onError?.(err?.data?.message || err?.message || 'Error uploading photo');
          } finally {
            setIsCameraCapturing(false);
          }
        } else {
          setIsCameraCapturing(false);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const availableStages = useMemo(() => {
    if (slab?.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0) {
      return slab.requiredStages;
    }
    return ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'];
  }, [slab]);

  const [selectedPieceId, setSelectedPieceId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [machineId, setMachineId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const getPieceId = (p: any): string => String(p?.id || p?._id || '');

  // Helper to check if a stage is done for a piece
  const checkStageDone = (piece: any, stageKey: string): boolean => {
    if (!piece) return false;
    const norm = stageKey.split(' - ')[0].replace(' Work', '').trim().toLowerCase();

    // Check piece.logs
    if (piece.logs && Array.isArray(piece.logs) && piece.logs.length > 0) {
      const hasLog = piece.logs.some((l: any) => {
        const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim().toLowerCase();
        const matchesStage = lStage === norm || lStage.startsWith(norm) || norm.startsWith(lStage);
        const isApprovedOrDone = !l.status || ['completed', 'approved', 'done'].includes(String(l.status).toLowerCase());
        return matchesStage && isApprovedOrDone;
      });
      if (hasLog) return true;
    }

    // Check piece stage progress
    const BASE_STAGES = ['production', 'polishing', 'packing', 'dispatch'];
    const pStage = (piece.stage || '').split(' - ')[0].replace(' Work', '').trim().toLowerCase();
    const pIdx = BASE_STAGES.indexOf(pStage);
    const targetIdx = BASE_STAGES.indexOf(norm);

    if (pIdx > targetIdx) return true;
    if (pIdx === targetIdx && (['completed', 'approved', 'done'].includes(String(piece.status || '').toLowerCase()))) {
      return true;
    }

    return false;
  };

  // Get current selected piece object
  const currentPiece = useMemo(() => {
    if (!slab?.pieces || !selectedPieceId) return null;
    if (selectedPieceId === 'new') return null;
    return slab.pieces.find((p: any) => getPieceId(p) === selectedPieceId) || null;
  }, [slab, selectedPieceId]);

  // Filter out stages that are already completed for the selected piece
  const pendingStages = useMemo(() => {
    if (mode === 'edit') {
      return availableStages;
    }
    if (selectedPieceId === 'new') {
      return availableStages;
    }
    if (!currentPiece) {
      return availableStages;
    }
    // Only return stages that are NOT done
    return availableStages.filter(stg => !checkStageDone(currentPiece, stg));
  }, [availableStages, currentPiece, selectedPieceId, mode]);

  // When user selects a piece, pick its first pending stage so completed stages are not selected!
  const handlePieceSelect = (pId: string) => {
    setSelectedPieceId(pId);
    if (pId && pId !== 'new') {
      const p = slab?.pieces?.find((x: any) => getPieceId(x) === pId);
      if (p) {
        const rem = availableStages.filter(stg => !checkStageDone(p, stg));
        if (rem.length > 0) {
          setSelectedStage(rem[0]);
        } else {
          setSelectedStage('');
        }
      }
    } else {
      setSelectedStage(availableStages[0] || 'Production');
    }
  };

  // Available pieces to choose: in 'add' mode, hide pieces that are already 100% completed
  const availablePieces = useMemo(() => {
    if (!slab?.pieces || !Array.isArray(slab.pieces)) return [];
    if (mode === 'edit') return slab.pieces;
    return slab.pieces.filter((p: any) => {
      const isAllDone = availableStages.every(stg => checkStageDone(p, stg));
      return !isAllDone;
    });
  }, [slab, mode, availableStages]);

  // Clean reset: ALWAYS start completely empty so NOTHING is selected automatically!
  useEffect(() => {
    if (open) {
      setSelectedPieceId('');
      setSelectedStage('');
      setMachineId('');
      setDriverName('');
      setPhotoUrl('');
      setRemarks('');
    }
  }, [open, slab?.id, mode]);

  // Handle Photo Upload (Common for Camera and File Picker)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('files', file);

    try {
      const res = await uploadFiles(formData).unwrap();
      if (res?.success && res.urls?.length > 0) {
        setPhotoUrl(res.urls[0]);
      } else {
        onError?.('Failed to upload photo');
      }
    } catch (err: any) {
      onError?.(err?.data?.message || err?.message || 'Error uploading photo');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!slab?.id) return;

    try {
      if (mode === 'add') {
        const res = await quickCompletePiece({
          slabId: slab.id,
          pieceId: selectedPieceId || undefined,
          machineId: machineId || undefined,
          driverName: driverName.trim() || undefined,
          photoUrl: photoUrl || undefined,
          stage: selectedStage,
          remarks: remarks.trim() || undefined
        }).unwrap();

        onSuccess?.(res?.message || `${selectedStage} marked as completed!`);
      } else {
        const res = await quickEditPieceLog({
          slabId: slab.id,
          pieceId: selectedPieceId || undefined,
          machineId: machineId || undefined,
          driverName: driverName.trim() || undefined,
          photoUrl: photoUrl || undefined,
          remarks: remarks.trim() || undefined
        }).unwrap();

        onSuccess?.(res?.message || 'Piece details updated successfully!');
      }
      onClose();
    } catch (err: any) {
      onError?.(err?.data?.message || err?.message || 'Failed to save piece action');
    }
  };

  const isSubmitting = isCompleting || isEditing;

  return (
    <>
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.16)',
            overflow: 'hidden'
          }
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          pb: 2,
          px: 2.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: mode === 'add' ? '#ECFDF5' : '#EFF6FF',
              color: mode === 'add' ? '#059669' : '#1D4ED8',
              width: 44,
              height: 44,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}
          >
            {mode === 'add' ? <CheckCircleRoundedIcon /> : <EditIcon />}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.1rem' }}>
              {mode === 'add' ? 'Quick Complete Piece' : 'Edit Piece Details'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
              {slab?.name}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={isSubmitting} sx={{ color: '#94A3B8' }}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, px: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {isFetchingDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            {/* 1. PIECE SELECTOR */}
            <FormControl fullWidth size="small">
              <InputLabel id="quick-piece-select-label">Select Piece</InputLabel>
              <Select
                labelId="quick-piece-select-label"
                label="Select Piece"
                value={selectedPieceId}
                onChange={(e) => handlePieceSelect(e.target.value)}
                sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}
                MenuProps={dropdownMenuProps}
              >
                <MenuItem value="">
                  <em>-- Select Piece --</em>
                </MenuItem>
                {availablePieces.map((p: any) => {
                  const pId = getPieceId(p);
                  const logs = p.logs && Array.isArray(p.logs) ? p.logs : [];
                  const doneStages = logs
                    .filter((l: any) => !l.status || ['completed', 'approved', 'done'].includes(String(l.status).toLowerCase()))
                    .map((l: any) => l.stage?.split(' - ')[0])
                    .filter(Boolean);
                  const isDone = doneStages.length > 0;

                  return (
                    <MenuItem key={pId} value={pId}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.86rem' }}>
                          Piece #{p.pieceNumber} {p.productName ? `(${p.productName})` : ''}
                        </Typography>
                        {isDone ? (
                          <Chip
                            label={`Done: ${Array.from(new Set(doneStages)).join(', ')}`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#DCFCE7', color: '#166534' }}
                          />
                        ) : (
                          <Chip
                            label="Pending"
                            size="small"
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: '#F1F5F9', color: '#64748B' }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
                <MenuItem value="new" sx={{ fontWeight: 700, color: '#059669', bgcolor: '#F0FDF4' }}>
                  + Add New Piece (Piece #{(slab?.pieces?.length || 0) + 1})
                </MenuItem>
              </Select>
            </FormControl>

            {/* 2. STAGE SELECTION - ONLY SHOW PENDING / REMAINING STAGES */}
            <FormControl fullWidth size="small">
              <InputLabel id="quick-stage-select-label">Manufacturing Stage</InputLabel>
              <Select
                labelId="quick-stage-select-label"
                label="Manufacturing Stage"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}
                MenuProps={dropdownMenuProps}
              >
                {pendingStages.length > 0 ? (
                  pendingStages.map((stg: string) => (
                    <MenuItem key={stg} value={stg}>
                      {stg}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    All stages completed for this piece
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* 3. MACHINE & DRIVER */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                Machine & Operator / Driver
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="quick-machine-label">Machine (Optional)</InputLabel>
                    <Select
                      labelId="quick-machine-label"
                      label="Machine (Optional)"
                      value={machineId}
                      onChange={(e) => setMachineId(e.target.value)}
                      disabled={isMachinesLoading}
                      MenuProps={dropdownMenuProps}
                      sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}
                    >
                      <MenuItem value="">
                        <em>— No Machine / Manual Work —</em>
                      </MenuItem>
                      {machines.map((m: any) => (
                        <MenuItem key={m.id || m._id} value={m.id || m._id}>
                          {m.name} {m.model ? `(${m.model})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Driver / Operator Name"
                    placeholder="Enter driver or operator name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <PersonIcon sx={{ fontSize: 18, color: '#64748B', mr: 1 }} />
                      }
                    }}
                    sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* 4. PHOTO WITH BOTH CAMERA & GALLERY OPTIONS */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                Approval Photo (Piece Proof)
              </Typography>

              {/* Hidden file inputs */}
              {/* Direct Camera Input */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhotoUpload}
              />
              {/* Regular File Picker / Gallery Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoUpload}
              />

              {photoUrl ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: 180,
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1.5px solid #CBD5E1',
                    bgcolor: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={photoUrl}
                    alt="Piece Proof"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setPhotoUrl('')}
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      bgcolor: 'rgba(0,0,0,0.65)',
                      color: '#FFFFFF',
                      '&:hover': { bgcolor: '#DC2626' }
                    }}
                  >
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {/* Option A: Open Camera */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={isUploading || isCameraCapturing}
                      onClick={() => startCamera(cameraFacing)}
                      startIcon={isUploading || isCameraCapturing ? <CircularProgress size={18} /> : <PhotoCameraIcon />}
                      sx={{
                        py: 1.75,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        color: '#0284C7',
                        borderColor: '#BAE6FD',
                        bgcolor: '#F0F9FF',
                        '&:hover': { bgcolor: '#E0F2FE', borderColor: '#0284C7' }
                      }}
                    >
                      📷 Take Photo (Camera)
                    </Button>
                  </Grid>

                  {/* Option B: Upload from Gallery/Files */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      startIcon={isUploading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
                      sx={{
                        py: 1.75,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        color: '#475569',
                        borderColor: '#E2E8F0',
                        bgcolor: '#F8FAFC',
                        '&:hover': { bgcolor: '#F1F5F9', borderColor: '#CBD5E1' }
                      }}
                    >
                      📁 Choose from Files / Gallery
                    </Button>
                  </Grid>
                </Grid>
              )}
            </Box>

            {/* 5. REMARKS */}
            <TextField
              fullWidth
              size="small"
              label="Remarks / Notes (Optional)"
              placeholder="e.g. Dimensions checked, edge finished..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              multiline
              rows={2}
              sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9', gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting} sx={{ fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || isFetchingDetails || (mode === 'add' && (!selectedPieceId || pendingStages.length === 0))}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleRoundedIcon />}
          sx={{
            bgcolor: mode === 'add' ? '#059669' : '#1E293B',
            color: '#FFFFFF',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: 2.5,
            px: 3,
            py: 1,
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
            '&:hover': {
              bgcolor: mode === 'add' ? '#047857' : '#0F172A'
            }
          }}
        >
          {isSubmitting
            ? 'Saving...'
            : mode === 'add'
            ? `Mark ${selectedStage} as Completed`
            : 'Update Piece Details'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Live Webcam Modal */}
    <Dialog
      open={isCameraOpen}
      onClose={stopCamera}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            overflow: 'hidden',
            bgcolor: '#0F172A',
            color: '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.75,
          px: 2.5,
          borderBottom: '1px solid #1E293B'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoCameraIcon sx={{ color: '#10B981', fontSize: 22 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF', fontSize: '1rem' }}>
            Live Camera
          </Typography>
        </Box>
        <IconButton size="small" onClick={stopCamera} sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' } }}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#0B1120' }}>
        <Box
          sx={{
            width: '100%',
            aspectRatio: '4/3',
            bgcolor: '#000000',
            borderRadius: 2.5,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #334155'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          py: 2,
          px: 2.5,
          borderTop: '1px solid #1E293B',
          bgcolor: '#0F172A',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Button
          size="small"
          onClick={() => startCamera(cameraFacing === 'environment' ? 'user' : 'environment')}
          startIcon={<CameraswitchIcon sx={{ fontSize: 18 }} />}
          sx={{
            color: '#94A3B8',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.8rem',
            '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.08)' }
          }}
        >
          Flip Camera
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={stopCamera}
            sx={{ color: '#94A3B8', textTransform: 'none', fontWeight: 600, '&:hover': { color: '#FFFFFF' } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={isCameraCapturing}
            onClick={captureCameraPhoto}
            startIcon={isCameraCapturing ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon />}
            sx={{
              bgcolor: '#059669',
              color: '#FFFFFF',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 2,
              px: 2.5,
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            {isCameraCapturing ? 'Saving...' : 'Snap Photo'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default QuickPieceActionDialog;
