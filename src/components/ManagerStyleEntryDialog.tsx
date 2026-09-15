import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, MenuItem, Button, Typography, Switch, FormControlLabel, RadioGroup, Radio, FormControl, IconButton, Paper } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
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

  const handlePhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, photoUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
              <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem' }}>
                Assign Stone to Vendor:
              </Typography>
              {vendorRows.map((row, index) => (
                <Paper key={index} elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem' }}>
                      Assignment {index + 1}
                    </Typography>
                    {vendorRows.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => setVendorRows(prev => prev.filter((_, i) => i !== index))}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                  
                  <TextField 
                    select
                    label="Select Vendor" 
                    fullWidth 
                    size="small"
                    value={row.vendorId} 
                    onChange={(e) => {
                      const vName = vendors.find((v: any) => v.id === e.target.value)?.name || '';
                      setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], vendorId: e.target.value, vendorName: vName }; return arr; });
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#FFFFFF' } }}
                  >
                    {vendors.map((v: any) => (
                      <MenuItem key={v.id} value={v.id} sx={{ fontSize: '0.85rem' }}>{v.name}</MenuItem>
                    ))}
                  </TextField>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField 
                      select
                      label="Work Stage" 
                      fullWidth 
                      size="small"
                      value={row.stage}
                      onChange={(e) => setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], stage: e.target.value }; return arr; })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#FFFFFF' } }}
                    >
                      <MenuItem value="Production">Production</MenuItem>
                      <MenuItem value="Polishing">Polishing</MenuItem>
                      <MenuItem value="Packing">Packing</MenuItem>
                      <MenuItem value="Dispatch">Dispatch</MenuItem>
                      <MenuItem value="Spare Parts">Spare Parts</MenuItem>
                    </TextField>
                    <TextField 
                      fullWidth 
                      size="small"
                      label="Quantity" 
                      type="number"
                      value={row.qty}
                      onChange={(e) => setVendorRows(prev => { const arr = [...prev]; arr[index] = { ...arr[index], qty: e.target.value }; return arr; })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#FFFFFF' } }}
                    />
                  </Box>
                </Paper>
              ))}

              <Button 
                startIcon={<AddIcon sx={{ fontSize: 16 }} />} 
                onClick={() => setVendorRows(prev => [...prev, { vendorId: '', vendorName: '', stage: 'Production', qty: '' }])} 
                sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 800, fontSize: '0.82rem', color: '#D97706' }}
              >
                + Add Another Vendor
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

          {/* Verification Photo Upload Section (Matching Image 1) */}
          <Box sx={{ pt: 1 }}>
            <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
              Upload Verification Photos
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <ImageUploadBox 
                label={formData.photoUrl ? "START PHOTO (TAP TO RETAKE)" : "START PHOTO *"} 
                previewUrl={formData.photoUrl} 
                onClick={handlePhotoUpload} 
              />
            </Box>
          </Box>

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
