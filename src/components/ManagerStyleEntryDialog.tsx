import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, MenuItem, Button, Typography, Switch, FormControlLabel, RadioGroup, Radio, FormControl, IconButton, Paper, Autocomplete, InputAdornment, Chip, Divider } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OutputIcon from '@mui/icons-material/Output';
import InputIcon from '@mui/icons-material/Input';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import EditNoteIcon from '@mui/icons-material/EditNote';

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

interface ManagerStyleEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: () => void;
  initialData?: any;
  vendors?: any[];
  staff?: any[];
  projects?: any[];
  defaultVendorId?: string;
  isEditMode?: boolean;
  activeOutLogs?: any[];
}

const ManagerStyleEntryDialog: React.FC<ManagerStyleEntryDialogProps> = ({ open, onClose, onSave, onDelete, initialData, vendors = [], staff = [], projects = [], defaultVendorId, isEditMode, activeOutLogs = [] }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().substring(0, 10),
    transactionType: 'OUT',
    assigneeType: defaultVendorId ? 'vendor' : 'staff',
    assigneeId: defaultVendorId || '',
    stage: 'Production',
    quantity: '',
    vehicleNumber: '',
    productName: '',
    photoUrl: '',
    remarks: '',
    projectId: '',
    productId: ''
  });

  const [vendorRows, setVendorRows] = useState<any[]>([
    { vendorId: defaultVendorId || '', vendorName: '', stage: 'Production', qty: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Compute pending balance per vendor from activeOutLogs and vendor balances
  const vendorPendingStats = useMemo(() => {
    const stats: Record<string, { pendingQty: number; latestStage?: string }> = {};

    // 1. First populate from activeOutLogs
    (activeOutLogs || []).forEach((log: any) => {
      const vId = log.vendorId;
      const vName = (log.vendorName || '').trim().toLowerCase();
      const remaining = Math.max(0, (Number(log.quantityProduced) || 0) - (Number(log.returnedQty) || 0));
      if (remaining > 0) {
        if (vId) {
          if (!stats[vId]) stats[vId] = { pendingQty: 0, latestStage: log.stage };
          stats[vId].pendingQty += remaining;
          if (log.stage) stats[vId].latestStage = log.stage;
        }
        if (vName) {
          if (!stats[vName]) stats[vName] = { pendingQty: 0, latestStage: log.stage };
          stats[vName].pendingQty += remaining;
          if (log.stage) stats[vName].latestStage = log.stage;
        }
      }
    });

    // 2. Also check vendor.balance if available and not yet captured
    (vendors || []).forEach((v: any) => {
      const vBalance = Number(v.balance) || 0;
      if (vBalance > 0 && !stats[v.id]) {
        stats[v.id] = { pendingQty: vBalance, latestStage: 'Production' };
      }
    });

    return stats;
  }, [activeOutLogs, vendors]);

  // For IN transaction: sort vendors so that vendors with pending materials appear first
  const sortedInVendors = useMemo(() => {
    if (formData.transactionType !== 'IN') return vendors;
    return [...vendors].sort((a: any, b: any) => {
      const pendA = vendorPendingStats[a.id]?.pendingQty || (typeof a.balance === 'number' && a.balance > 0 ? a.balance : 0);
      const pendB = vendorPendingStats[b.id]?.pendingQty || (typeof b.balance === 'number' && b.balance > 0 ? b.balance : 0);
      if (pendA > 0 && pendB <= 0) return -1;
      if (pendB > 0 && pendA <= 0) return 1;
      if (pendA !== pendB) return pendB - pendA;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [vendors, formData.transactionType, vendorPendingStats]);

  const selectedInVendor = vendors.find((v: any) => v.id === formData.assigneeId);
  const selectedVendorPending = formData.assigneeId 
    ? (vendorPendingStats[formData.assigneeId]?.pendingQty || (typeof selectedInVendor?.balance === 'number' && selectedInVendor.balance > 0 ? selectedInVendor.balance : 0)) 
    : 0;
  const selectedVendorStage = formData.assigneeId 
    ? (vendorPendingStats[formData.assigneeId]?.latestStage || 'Production') 
    : 'Production';

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (open && initialData) {
      const initialVendorId = initialData.vendorId || initialData.vendors?.[0]?.vendorId || defaultVendorId || '';
      const initialVendorName = initialData.vendorName || initialData.vendors?.[0]?.vendorName || '';
      const initialQty = initialData.quantityProduced || initialData.piecesOut || initialData.piecesIn || initialData.vendors?.[0]?.qty || '';
      const initialStage = initialData.stage || 'Production';

      setFormData({
        date: initialData.date ? new Date(initialData.date).toISOString().substring(0, 10) : new Date(initialData.createdAt || Date.now()).toISOString().substring(0, 10),
        transactionType: initialData.transactionType || 'OUT',
        assigneeType: initialData.assigneeType || (initialData.vendorId ? 'vendor' : 'staff'),
        assigneeId: initialData.vendorId || initialData.workerId || defaultVendorId || '',
        stage: initialStage,
        quantity: String(initialQty),
        vehicleNumber: initialData.vehicleNumber || '',
        productName: initialData.productName || '',
        photoUrl: initialData.photoUrl || initialData.startPhotos?.unit || initialData.startPhotos?.machine || '',
        remarks: initialData.remarks || '',
        projectId: initialData.projectId || '',
        productId: initialData.productId || ''
      });

      if (initialData.vendors && initialData.vendors.length > 0) {
        setVendorRows(initialData.vendors.map((v: any) => ({
          vendorId: v.vendorId,
          vendorName: v.vendorName || v.name,
          stage: v.stage || initialStage,
          qty: String(v.qty || initialQty)
        })));
      } else {
        setVendorRows([{ vendorId: initialVendorId, vendorName: initialVendorName, stage: initialStage, qty: String(initialQty) }]);
      }
    } else if (open && !initialData) {
      setFormData({
        date: new Date().toISOString().substring(0, 10),
        transactionType: 'OUT',
        assigneeType: defaultVendorId ? 'vendor' : 'staff',
        assigneeId: defaultVendorId || '',
        stage: 'Production',
        quantity: '',
        vehicleNumber: '',
        productName: '',
        photoUrl: '',
        remarks: '',
        projectId: '',
        productId: ''
      });
      setVendorRows([{ vendorId: defaultVendorId || '', vendorName: '', stage: 'Production', qty: '' }]);
    }
  }, [open, initialData, defaultVendorId]);

  const handleSubmit = async () => {
    let finalQty = formData.quantity;
    let finalStage = formData.stage;
    let finalVendorId = formData.assigneeId;
    let finalVendorName = '';

    if (formData.transactionType === 'OUT' && vendorRows.length > 0) {
      finalQty = vendorRows[0].qty || formData.quantity;
      finalStage = vendorRows[0].stage || formData.stage;
      finalVendorId = vendorRows[0].vendorId || formData.assigneeId;
      finalVendorName = vendorRows[0].vendorName || '';
    }

    if (!finalQty) {
      alert("Quantity is required");
      return;
    }
    
    setLoading(true);
    try {
      const payload: any = {
        date: formData.date,
        transactionType: formData.transactionType,
        stage: finalStage,
        quantityProduced: Number(finalQty),
        vehicleNumber: formData.vehicleNumber,
        productName: formData.productName,
        photoUrl: formData.photoUrl,
        remarks: formData.remarks?.trim() || undefined,
        startPhotos: formData.photoUrl ? { unit: formData.photoUrl, machine: formData.photoUrl } : undefined,
        assigneeType: formData.assigneeType,
        projectId: formData.projectId || undefined,
        productId: formData.productId || undefined,
        vendors: formData.transactionType === 'OUT' ? vendorRows : undefined
      };

      if (formData.assigneeType === 'vendor' || formData.transactionType === 'OUT') {
        const v = vendors.find(x => x.id === finalVendorId);
        payload.vendorId = v?.id || finalVendorId;
        payload.vendorName = v?.name || finalVendorName;
      } else if (formData.assigneeType === 'staff') {
        const s = staff.find(x => x.id === formData.assigneeId);
        payload.workerId = s?.id;
        payload.workerName = s?.name;
      }
      
      await onSave(payload);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (useCameraCapture = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCameraCapture) {
      input.setAttribute('capture', 'environment');
    }
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX = 800; // Compress down to max 800px
          if (width > height && width > MAX) {
            height *= MAX / width;
            width = MAX;
          } else if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setFormData(prev => ({ ...prev, photoUrl: canvas.toDataURL('image/jpeg', 0.6) }));
        };
      }
    };
    input.click();
  };

  const handleOpenLiveCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        streamRef.current = stream;
        setCameraOpen(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 100);
        return;
      } catch (err) {
        console.warn('Live camera access failed, falling back to capture input:', err);
      }
    }
    handlePhotoUpload(true);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    const MAX = 800;
    if (width > height && width > MAX) {
      height *= MAX / width;
      width = MAX;
    } else if (height > MAX) {
      width *= MAX / height;
      height = MAX;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
    stopCameraStream();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 3, sm: 4 },
            overflow: 'hidden',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)',
            border: '1px solid #E2E8F0'
          }
        }
      }}
    >
      {/* Modern Dark Header (Matching Manager App Image 1 Exactly) */}
      <Box sx={{ 
        px: { xs: 2.5, sm: 3 }, 
        py: { xs: 2, sm: 2.2 }, 
        bgcolor: '#0F172A', 
        color: '#FFFFFF', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ 
            width: 38, 
            height: 38, 
            borderRadius: 2, 
            bgcolor: formData.transactionType === 'OUT' ? 'rgba(234, 88, 12, 0.2)' : 'rgba(2, 132, 199, 0.2)', 
            border: formData.transactionType === 'OUT' ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid rgba(2, 132, 199, 0.4)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {formData.transactionType === 'OUT' ? <OutputIcon sx={{ color: '#FB923C', fontSize: 20 }} /> : <InputIcon sx={{ color: '#38BDF8', fontSize: 20 }} />}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.98rem', sm: '1.08rem' }, color: '#FFFFFF', lineHeight: 1.2 }}>
              {isEditMode ? 'Edit ' : ''}{formData.transactionType === 'OUT' ? 'Material Outward (Take)' : 'Material Inward (Return)'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: { xs: '0.72rem', sm: '0.76rem' } }}>
              Enter piece quantities, spec &amp; mandatory verification photo
            </Typography>
          </Box>
        </Box>

        <IconButton onClick={onClose} sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' }, p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          
          <TextField
            label="Date (Backdate allowed)"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            size="small"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Transaction Type"
              fullWidth
              size="small"
              value={formData.transactionType}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="OUT">OUT (Take/Send)</MenuItem>
              <MenuItem value="IN">IN (Receive/Return)</MenuItem>
            </TextField>
          </Box>

          {formData.transactionType === 'OUT' ? (
            /* Material Tracking Vendor Assignment Rows (Matching Manager App Image 1) */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ color: '#0F172A', fontWeight: 800, fontSize: '0.88rem' }}>
                  Assign Stone to Vendor(s):
                </Typography>
                <Chip label={`${vendorRows.length} Vendor${vendorRows.length > 1 ? 's' : ''}`} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#FFF7ED', color: '#EA580C', border: '1px solid #FFEDD5' }} />
              </Box>

              {vendorRows.map((row, index) => {
                const DEFAULT_STAGES = ['Production', 'Spare Part', 'Spare Parts', 'Polishing - Honed', 'Polishing - Mirror', 'Polishing', 'Packing', 'Dispatch', 'Fabrication', 'Grooving', 'CNC Cutting', 'Inlay Work', 'Carving'];
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
                        const vName = vendors.find((v: any) => v.id === e.target.value)?.name || '';
                        setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], vendorId: e.target.value, vendorName: vName }; return arr; });
                      }}
                      slotProps={{ input: { sx: { borderRadius: 2, bgcolor: '#F8FAFC' } } }}
                    >
                      {vendors.map((v: any) => (
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
                        <MenuItem value="Spare Part">Spare Part</MenuItem>
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
                Add Another Vendor Assignment
              </Button>
            </Box>
          ) : (
            /* Standard IN Single Assignment */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Select Vendor / Staff *"
                fullWidth
                size="small"
                value={formData.assigneeId}
                onChange={(e) => {
                  const newVendorId = e.target.value;
                  const stg = vendorPendingStats[newVendorId]?.latestStage;
                  setFormData(prev => ({
                    ...prev,
                    assigneeId: newVendorId,
                    stage: stg || prev.stage
                  }));
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                {sortedInVendors.map((v: any) => {
                  const pend = vendorPendingStats[v.id]?.pendingQty || (typeof v.balance === 'number' && v.balance > 0 ? v.balance : 0);
                  return (
                    <MenuItem 
                      key={v.id} 
                      value={v.id}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        py: 1,
                        bgcolor: pend > 0 ? 'rgba(254, 242, 242, 0.4)' : 'inherit'
                      }}
                    >
                      <Typography sx={{ fontWeight: pend > 0 ? 700 : 500, fontSize: '0.88rem', color: '#0F172A' }}>
                        {v.name} (Vendor)
                      </Typography>
                      {pend > 0 && (
                        <Chip
                          label={`Pending: ${pend} pcs`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            bgcolor: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            height: 22,
                            ml: 1
                          }}
                        />
                      )}
                    </MenuItem>
                  );
                })}
              </TextField>

              {/* Pending Return Alert Banner with 1-Tap Auto Fill */}
              {selectedVendorPending > 0 && (
                <Box sx={{
                  bgcolor: '#FFF7ED',
                  border: '1.5px solid #FDBA74',
                  borderRadius: 2.5,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Inventory2OutlinedIcon sx={{ color: '#EA580C', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#9A3412', lineHeight: 1.2 }}>
                        Pending Return from {selectedInVendor?.name || 'Vendor'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: '#EA580C', lineHeight: 1.2 }}>
                        {selectedVendorPending} Pcs Pending
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        quantity: String(selectedVendorPending),
                        stage: selectedVendorStage || prev.stage
                      }));
                    }}
                    sx={{
                      bgcolor: '#EA580C',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      borderRadius: 2,
                      textTransform: 'none',
                      px: 1.5,
                      py: 0.6,
                      boxShadow: 'none',
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#C2410C', boxShadow: 'none' }
                    }}
                  >
                    Auto-fill ({selectedVendorPending} Pcs)
                  </Button>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  select
                  label="Work Stage *"
                  fullWidth
                  size="small"
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="Production">Production</MenuItem>
                  <MenuItem value="Spare Part">Spare Part</MenuItem>
                  <MenuItem value="Polishing - Honed">Polishing - Honed</MenuItem>
                  <MenuItem value="Polishing - Mirror">Polishing - Mirror</MenuItem>
                  <MenuItem value="Polishing">Polishing</MenuItem>
                  <MenuItem value="Packing">Packing</MenuItem>
                  <MenuItem value="Dispatch">Dispatch</MenuItem>
                </TextField>
                <TextField
                  label="Quantity *"
                  type="number"
                  fullWidth
                  size="small"
                  placeholder="e.g. 5"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  slotProps={{
                    input: {
                      endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>Pcs</Typography></InputAdornment>,
                      sx: { borderRadius: 2 }
                    }
                  }}
                />
              </Box>
            </Box>
          )}

          <TextField
            label="Vehicle Number (Optional)"
            fullWidth
            size="small"
            value={formData.vehicleNumber}
            onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          {/* Verification Photo Upload Section (Change 4: Both Click Photo (Camera) and Upload Photo options) */}
          <Box sx={{ pt: 1 }}>
            <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
              Upload Verification Photos *
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={handleOpenLiveCamera}
                sx={{
                  flex: 1,
                  minWidth: 160,
                  py: 1.2,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  textTransform: 'none',
                  borderColor: '#0284C7',
                  color: '#0284C7',
                  bgcolor: '#F0F9FF',
                  '&:hover': { bgcolor: '#E0F2FE', borderColor: '#0369A1' }
                }}
              >
                Click Photo (Camera)
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadFileRoundedIcon />}
                onClick={() => handlePhotoUpload(false)}
                sx={{
                  flex: 1,
                  minWidth: 160,
                  py: 1.2,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  textTransform: 'none',
                  borderColor: '#64748B',
                  color: '#334155',
                  bgcolor: '#F8FAFC',
                  '&:hover': { bgcolor: '#F1F5F9', borderColor: '#475569' }
                }}
              >
                Upload Photo (Gallery)
              </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <ImageUploadBox 
                label={formData.photoUrl ? "START PHOTO ATTACHED (TAP TO CHANGE)" : "START PHOTO PREVIEW"} 
                previewUrl={formData.photoUrl} 
                onClick={() => handlePhotoUpload(false)} 
              />
            </Box>
          </Box>

          {/* Remarks / Damage Notes Section (User Request: 5 pcs broken etc.) */}
          <Box>
            <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 0.8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EditNoteIcon sx={{ fontSize: 18, color: '#64748B' }} />
              Remarks / Damage Notes (Optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="e.g. 5 pcs broken during cutting, polish scratches, extra pieces returned..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              slotProps={{
                input: {
                  sx: {
                    borderRadius: 2,
                    bgcolor: '#F8FAFC',
                    fontSize: '0.88rem',
                    '&:hover': { bgcolor: '#F1F5F9' }
                  }
                }
              }}
            />
          </Box>

          {/* Live Camera Viewfinder Dialog */}
          <Dialog open={cameraOpen} onClose={stopCameraStream} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Click Verification Photo
              <IconButton size="small" onClick={stopCameraStream}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 2, textAlign: 'center' }}>
              <Box sx={{ width: '100%', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#000', mb: 2 }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 320, display: 'block', objectFit: 'cover' }} />
              </Box>
              <Button
                variant="contained"
                fullWidth
                startIcon={<PhotoCameraIcon />}
                onClick={handleCaptureSnapshot}
                sx={{ py: 1.2, borderRadius: 2, fontWeight: 800, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
              >
                Capture Photo Now
              </Button>
            </DialogContent>
          </Dialog>

        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1, bgcolor: '#FFFFFF', justifyContent: 'space-between' }}>
        <Box>
          {isEditMode && onDelete && (
            <Button 
              onClick={onDelete} 
              disabled={loading} 
              color="error" 
              startIcon={<DeleteIcon />}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Delete Entry
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={loading} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={loading || (formData.transactionType === 'OUT' ? vendorRows.some(r => !r.vendorId || !r.qty) : !formData.quantity)}
            sx={{ 
              borderRadius: 2.5, 
              px: 4, 
              py: 1.2,
              fontWeight: 800, 
              textTransform: 'none',
              fontSize: '0.92rem',
              background: formData.transactionType === 'OUT' 
                ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)' 
                : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
            }}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Submit to Admin')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ManagerStyleEntryDialog;
