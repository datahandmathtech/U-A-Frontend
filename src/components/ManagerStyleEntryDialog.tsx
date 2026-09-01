import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, MenuItem, Button, Typography, Switch, FormControlLabel, RadioGroup, Radio, FormControl } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
  defaultVendorId?: string;
  isEditMode?: boolean;
}

const ManagerStyleEntryDialog: React.FC<ManagerStyleEntryDialogProps> = ({ open, onClose, onSave, initialData, vendors = [], staff = [], defaultVendorId, isEditMode }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().substring(0, 10),
    transactionType: 'OUT',
    assigneeType: defaultVendorId ? 'vendor' : 'staff',
    assigneeId: defaultVendorId || '',
    stage: 'Production',
    quantity: '',
    vehicleNumber: '',
    productName: '',
    photoUrl: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        date: initialData.date ? new Date(initialData.date).toISOString().substring(0, 10) : new Date(initialData.createdAt || Date.now()).toISOString().substring(0, 10),
        transactionType: initialData.transactionType || 'OUT',
        assigneeType: initialData.assigneeType || (initialData.vendorId ? 'vendor' : 'staff'),
        assigneeId: initialData.vendorId || initialData.workerId || defaultVendorId || '',
        stage: initialData.stage || 'Production',
        quantity: initialData.quantityProduced || initialData.piecesOut || initialData.piecesIn || '',
        vehicleNumber: initialData.vehicleNumber || '',
        productName: initialData.productName || '',
        photoUrl: initialData.photoUrl || initialData.startPhotos?.unit || initialData.startPhotos?.machine || ''
      });
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
        photoUrl: ''
      });
    }
  }, [open, initialData, defaultVendorId]);

  const handleSubmit = async () => {
    if (!formData.quantity) {
      alert("Quantity is required");
      return;
    }
    
    setLoading(true);
    try {
      const payload: any = {
        date: formData.date,
        transactionType: formData.transactionType,
        stage: formData.stage,
        quantityProduced: Number(formData.quantity),
        vehicleNumber: formData.vehicleNumber,
        productName: formData.productName,
        photoUrl: formData.photoUrl,
        assigneeType: formData.assigneeType
      };

      if (formData.assigneeType === 'vendor') {
        const v = vendors.find(x => x.id === formData.assigneeId);
        payload.vendorId = v?.id;
        payload.vendorName = v?.name;
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#ff9800', color: 'white' }}>
        {isEditMode ? 'Edit' : 'Add'} Material Tracking
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          
          <TextField
            label="Date (Backdate allowed)"
            type="date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Transaction Type"
              fullWidth
              value={formData.transactionType}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
            >
              <MenuItem value="OUT">OUT (Take/Send)</MenuItem>
              <MenuItem value="IN">IN (Receive/Return)</MenuItem>
            </TextField>

            <TextField
              select
              label="Work Stage"
              fullWidth
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            >
              <MenuItem value="Production">Production</MenuItem>
              <MenuItem value="Polishing">Polishing</MenuItem>
              <MenuItem value="Packing">Packing</MenuItem>
              <MenuItem value="Dispatch">Dispatch</MenuItem>
            </TextField>
          </Box>

          {!defaultVendorId && (
            <FormControl component="fieldset">
              <Typography variant="body2" color="text.secondary" gutterBottom>Assignee Type</Typography>
              <RadioGroup
                row
                value={formData.assigneeType}
                onChange={(e) => setFormData({ ...formData, assigneeType: e.target.value })}
              >
                <FormControlLabel value="vendor" control={<Radio />} label="Vendor" />
                <FormControlLabel value="staff" control={<Radio />} label="Staff/Worker" />
              </RadioGroup>
            </FormControl>
          )}

          <TextField
            select
            label={`Select ${formData.assigneeType === 'vendor' ? 'Vendor' : 'Staff'}`}
            fullWidth
            value={formData.assigneeId}
            onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
            disabled={!!defaultVendorId}
          >
            {formData.assigneeType === 'vendor' 
              ? vendors.map((v: any) => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)
              : staff.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
            }
          </TextField>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
            <TextField
              label="Vehicle Number (Optional)"
              fullWidth
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
            />
          </Box>

          <TextField
            label="Product Name / Notes (Optional)"
            fullWidth
            value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ImageUploadBox 
              label={formData.photoUrl ? "RETAKE PHOTO" : "CAPTURE PHOTO"} 
              previewUrl={formData.photoUrl} 
              onClick={handlePhotoUpload} 
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading || !formData.quantity}>
          {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManagerStyleEntryDialog;
