import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, MenuItem, Button, Typography, Switch, FormControlLabel, RadioGroup, Radio, FormControl, IconButton, Paper, Autocomplete, InputAdornment, Chip, Divider } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OutputIcon from '@mui/icons-material/Output';
import InputIcon from '@mui/icons-material/Input';
import CloseIcon from '@mui/icons-material/Close';
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

interface ManagerStyleEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: any;
  vendors?: any[];
  staff?: any[];
  projects?: any[];
  defaultVendorId?: string;
  isEditMode?: boolean;
}

const ManagerStyleEntryDialog: React.FC<ManagerStyleEntryDialogProps> = ({ open, onClose, onSave, initialData, vendors = [], staff = [], projects = [], defaultVendorId, isEditMode }) => {
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
                + Add Another Vendor Assignment
              </Button>
            </Box>
          ) : (
            /* Standard IN Single Assignment */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Select Vendor / Staff"
                fullWidth
                size="small"
                value={formData.assigneeId}
                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                {vendors.map((v: any) => (
                  <MenuItem key={v.id} value={v.id}>{v.name} (Vendor)</MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  select
                  label="Work Stage"
                  fullWidth
                  size="small"
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="Production">Production</MenuItem>
                  <MenuItem value="Spare Part">Spare Part</MenuItem>
                  <MenuItem value="Polishing">Polishing</MenuItem>
                  <MenuItem value="Packing">Packing</MenuItem>
                  <MenuItem value="Dispatch">Dispatch</MenuItem>
                </TextField>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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

          <TextField
            select
            label="Select Project / Client (Optional)"
            fullWidth
            size="small"
            value={formData.projectId}
            onChange={(e) => {
              setFormData({ ...formData, projectId: e.target.value, productId: '' });
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            <MenuItem value="">-- Select Project / Client --</MenuItem>
            {projects.map((p: any) => (
              <MenuItem key={p.id} value={p.id}>{p.clientName ? `${p.clientName} ` : ''}{p.projectId ? `[${p.projectId}] ` : ''}({p.name})</MenuItem>
            ))}
          </TextField>

          {formData.projectId && (
            <TextField
              select
              label="Select Stone / Product (Optional)"
              fullWidth
              size="small"
              value={formData.productId}
              onChange={(e) => {
                const proj = projects.find(p => p.id === formData.projectId);
                const prod = proj?.quotations?.[0]?.products?.find((x: any) => x.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  productId: e.target.value, 
                  productName: prod ? prod.name : formData.productName 
                });
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">-- Select Stone --</MenuItem>
              {projects.find(p => p.id === formData.projectId)?.quotations?.[0]?.products?.map((prod: any) => (
                <MenuItem key={prod.id} value={prod.id}>{prod.name}</MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Product Name / Notes (Optional)"
            fullWidth
            size="small"
            value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
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
      <DialogActions sx={{ p: 3, pt: 1, bgcolor: '#FFFFFF' }}>
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
      </DialogActions>
    </Dialog>
  );
};

export default ManagerStyleEntryDialog;
