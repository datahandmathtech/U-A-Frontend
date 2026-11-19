import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';

// Icons
import BuildCircleRoundedIcon from '@mui/icons-material/BuildCircleRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import {
  useGetMaintenancesQuery,
  useCreateMaintenanceMutation,
  useUpdateMaintenanceMutation,
  useDeleteMaintenanceMutation,
  useSettleMaintenanceDueMutation,
  useGetMachinesQuery,
  useUploadFilesMutation
} from '../store/apiSlice';

// CNC & Factory Machine Categories
const CNC_CATEGORIES = [
  'Tooling & Cutters / Router Bits',
  'Spindle & Motor Servicing',
  'Waterjet & Slurry Pump System',
  'Diamond Wire / Saw Blades',
  'Bridge Cutting Alignment & Oil',
  'Pneumatics & Air Compressor',
  'Linear Guide Rails & Ball Screws',
  'Automatic Lubrication System',
  'CNC Controller & Electricals',
  'Vacuum Table & Suction Cups',
  'Regular Scheduled Servicing',
  'Emergency Breakdown Repair',
  'Calibration & Sensor Check',
  'Other Machine Repair'
];

const formatDateInput = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${MM}-${dd}`;
};

const Maintenance: React.FC = () => {
  // Filters
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // API Queries & Mutations
  const { data: machinesData, isLoading: isMachinesLoading } = useGetMachinesQuery();
  const { data: maintenanceData, isLoading, refetch } = useGetMaintenancesQuery({
    machineId: selectedMachine !== 'all' ? selectedMachine : undefined,
    paymentStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined
  });

  const [createMaintenance, { isLoading: isCreating }] = useCreateMaintenanceMutation();
  const [updateMaintenance, { isLoading: isUpdating }] = useUpdateMaintenanceMutation();
  const [deleteMaintenance] = useDeleteMaintenanceMutation();
  const [settleMaintenanceDue, { isLoading: isSettling }] = useSettleMaintenanceDueMutation();
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    machineId: string;
    category: string;
    workDescription: string;
    partsReplaced: string;
    vendorName: string;
    technicianName: string;
    billNumber: string;
    billPhoto: string;
    amount: string;
    paymentStatus: 'Paid' | 'Due';
    paymentMode: 'Cash' | 'Bank';
    serviceDate: string;
    notes: string;
  }>({
    machineId: '',
    category: 'Regular Scheduled Servicing',
    workDescription: '',
    partsReplaced: '',
    vendorName: '',
    technicianName: '',
    billNumber: '',
    billPhoto: '',
    amount: '',
    paymentStatus: 'Paid',
    paymentMode: 'Cash',
    serviceDate: formatDateInput(new Date()),
    notes: ''
  });

  // Settle Due Modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settlingItem, setSettlingItem] = useState<any>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState<'Cash' | 'Bank'>('Cash');
  const [settleDate, setSettleDate] = useState<string>(formatDateInput(new Date()));

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const machines = useMemo(() => {
    return machinesData || [];
  }, [machinesData]);

  const maintenancesList = useMemo(() => {
    return maintenanceData?.maintenances || [];
  }, [maintenanceData]);

  const stats = useMemo(() => {
    return maintenanceData?.stats || {
      totalExpense: 0,
      totalPaid: 0,
      totalDue: 0,
      dueCount: 0,
      totalCount: 0,
      machineBreakdown: []
    };
  }, [maintenanceData]);

  // Filtered maintenance list by search query
  const filteredList = useMemo(() => {
    let list = maintenancesList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m: any) =>
        (m.machine?.name || '').toLowerCase().includes(q) ||
        (m.workDescription || '').toLowerCase().includes(q) ||
        (m.partsReplaced || '').toLowerCase().includes(q) ||
        (m.vendorName || '').toLowerCase().includes(q) ||
        (m.technicianName || '').toLowerCase().includes(q) ||
        (m.billNumber || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [maintenancesList, searchQuery]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      machineId: machines.length > 0 ? machines[0].id : '',
      category: 'Regular Scheduled Servicing',
      workDescription: '',
      partsReplaced: '',
      vendorName: '',
      technicianName: '',
      billNumber: '',
      billPhoto: '',
      amount: '',
      paymentStatus: 'Paid',
      paymentMode: 'Cash',
      serviceDate: formatDateInput(new Date()),
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      machineId: item.machineId,
      category: item.category || 'Regular Scheduled Servicing',
      workDescription: item.workDescription || '',
      partsReplaced: item.partsReplaced || '',
      vendorName: item.vendorName || '',
      technicianName: item.technicianName || '',
      billNumber: item.billNumber || '',
      billPhoto: item.billPhoto || '',
      amount: String(item.amount || ''),
      paymentStatus: item.paymentStatus || 'Paid',
      paymentMode: item.paymentMode || 'Cash',
      serviceDate: item.serviceDate ? formatDateInput(new Date(item.serviceDate)) : formatDateInput(new Date()),
      notes: item.notes || ''
    });
    setModalOpen(true);
  };

  const handleOpenSettleDue = (item: any) => {
    setSettlingItem(item);
    setSettlePaymentMode('Cash');
    setSettleDate(formatDateInput(new Date()));
    setSettleModalOpen(true);
  };

  const handleConfirmSettleDue = async () => {
    if (!settlingItem) return;
    try {
      await settleMaintenanceDue({
        id: settlingItem.id,
        paymentMode: settlePaymentMode,
        paymentDate: new Date(settleDate).toISOString()
      }).unwrap();
      setSnackbar({
        open: true,
        message: `Bill of ₹${settlingItem.amount} settled successfully! ${settlePaymentMode === 'Cash' ? 'Deducted from Cash Book.' : ''}`,
        severity: 'success'
      });
      setSettleModalOpen(false);
      setSettlingItem(null);
      refetch();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.data?.message || 'Failed to settle dues', severity: 'error' });
    }
  };

  const handleSave = async () => {
    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) {
      setSnackbar({ open: true, message: 'Please enter a valid positive amount', severity: 'error' });
      return;
    }
    if (!formData.machineId) {
      setSnackbar({ open: true, message: 'Please select a CNC machine', severity: 'error' });
      return;
    }
    if (!formData.workDescription.trim()) {
      setSnackbar({ open: true, message: 'Please enter work description', severity: 'error' });
      return;
    }

    try {
      const payload: any = {
        machineId: formData.machineId,
        category: formData.category,
        workDescription: formData.workDescription,
        partsReplaced: formData.partsReplaced,
        vendorName: formData.vendorName,
        technicianName: formData.technicianName,
        billNumber: formData.billNumber,
        billPhoto: formData.billPhoto,
        amount: num,
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        serviceDate: new Date(formData.serviceDate).toISOString(),
        notes: formData.notes
      };

      if (editingId) {
        await updateMaintenance({ id: editingId, ...payload }).unwrap();
        setSnackbar({ open: true, message: 'Maintenance record updated successfully!', severity: 'success' });
      } else {
        await createMaintenance(payload).unwrap();
        setSnackbar({
          open: true,
          message: formData.paymentStatus === 'Paid' && formData.paymentMode === 'Cash'
            ? 'Maintenance saved & automatically logged OUT in Cash Book!'
            : 'Maintenance record saved successfully!',
          severity: 'success'
        });
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.data?.message || 'Failed to save maintenance record', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this maintenance record? If it was paid via cash, the cash book entry will also be adjusted.')) {
      try {
        await deleteMaintenance(id).unwrap();
        setSnackbar({ open: true, message: 'Maintenance record deleted successfully.', severity: 'success' });
        refetch();
      } catch (err: any) {
        setSnackbar({ open: true, message: err?.data?.message || 'Failed to delete record', severity: 'error' });
      }
    }
  };

  // Gallery File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const uploadData = new FormData();
    uploadData.append('files', file);

    try {
      const res = await uploadFiles(uploadData).unwrap();
      if (res?.urls && res.urls.length > 0) {
        setFormData(prev => ({ ...prev, billPhoto: res.urls[0] }));
        setSnackbar({ open: true, message: 'Bill photo uploaded successfully', severity: 'success' });
      }
    } catch (err) {
      console.error('File upload error', err);
      setSnackbar({ open: true, message: 'Failed to upload photo', severity: 'error' });
    }
  };

  // Camera Handler
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check camera permissions.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `maintenance_bill_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const uploadData = new FormData();
            uploadData.append('files', file);
            try {
              const res = await uploadFiles(uploadData).unwrap();
              if (res?.urls && res.urls.length > 0) {
                setFormData(prev => ({ ...prev, billPhoto: res.urls[0] }));
                setSnackbar({ open: true, message: 'Photo captured and saved!', severity: 'success' });
              }
            } catch (e) {
              console.error('Error uploading captured photo', e);
            }
          }
        }, 'image/jpeg', 0.85);
      }
      stopCamera();
    }
  };

  const triggerDownload = (url: string, filename = 'bill-photo.jpg') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
            Machine Maintenance &amp; Workshop
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500, mt: 0.3 }}>
            CNC machinery logs, blade replacements, workshop invoices &amp; automatic Cash Book sync
          </Typography>
        </Box>

        {/* Action Button: Add Record in Unnati Arts Brand Gold/Bronze */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAdd}
            sx={{
              bgcolor: '#C28E5C',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2.5,
              py: 0.9,
              fontSize: '0.88rem',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#A06E3B', boxShadow: 'none' }
            }}
          >
            Add Maintenance Bill
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Maintenance Expense */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Machine Expense
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                  ₹{(stats.totalExpense || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                  Total {stats.totalCount || 0} service records
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#F1F5F9', color: '#0F172A', width: 40, height: 40, borderRadius: 2 }}>
                <BuildCircleRoundedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        {/* Total Paid */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: '1px solid #DCFCE7',
              bgcolor: '#F0FDF4'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Paid (Settled)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803D', mt: 0.5 }}>
                  ₹{(stats.totalPaid || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#16A34A', mt: 0.5, display: 'block' }}>
                  Cleared via Cash &amp; Bank
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#DCFCE7', color: '#16A34A', width: 40, height: 40, borderRadius: 2 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        {/* Total Due */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: stats.totalDue > 0 ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
              bgcolor: stats.totalDue > 0 ? '#FEF2F2' : '#FFFFFF'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: stats.totalDue > 0 ? '#DC2626' : '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pending Payment (Due)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: stats.totalDue > 0 ? '#DC2626' : '#0F172A', mt: 0.5 }}>
                  ₹{(stats.totalDue || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" sx={{ color: stats.totalDue > 0 ? '#DC2626' : '#64748B', mt: 0.5, display: 'block' }}>
                  {stats.dueCount || 0} unpaid workshop bills
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: stats.totalDue > 0 ? '#FEE2E2' : '#F1F5F9', color: stats.totalDue > 0 ? '#DC2626' : '#64748B', width: 40, height: 40, borderRadius: 2 }}>
                <WarningAmberRoundedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        {/* Monitored Machines */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Monitored CNC Equipment
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                  {machines.length} Machines
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                  CNC, Waterjet &amp; Cutters
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#FFFDF5', color: '#C28E5C', border: '1px solid #F1E5D1', width: 40, height: 40, borderRadius: 2 }}>
                <PrecisionManufacturingRoundedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Control Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          bgcolor: '#FFFFFF'
        }}
      >
        {/* Machine Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Machine</InputLabel>
          <Select
            value={selectedMachine}
            label="Machine"
            onChange={(e) => setSelectedMachine(e.target.value)}
          >
            <MenuItem value="all">All CNC Machines</MenuItem>
            {machines.map((m: any) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name} {m.type ? `(${m.type})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            label="Status"
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="Paid">Paid Only</MenuItem>
            <MenuItem value="Due">Pending Payment (Due)</MenuItem>
          </Select>
        </FormControl>

        {/* Category Filter */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {CNC_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Search Field */}
        <TextField
          size="small"
          placeholder="Search machine, work, vendor, bill no..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: '#94A3B8' }} />
                </InputAdornment>
              )
            }
          }}
        />

        {(selectedMachine !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all' || searchQuery) && (
          <Button
            size="small"
            onClick={() => {
              setSelectedMachine('all');
              setSelectedStatus('all');
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            sx={{ color: '#64748B', textTransform: 'none' }}
          >
            Clear Filters
          </Button>
        )}
      </Paper>

      {/* Maintenance Records Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Box sx={{ p: 2, px: 2.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PrecisionManufacturingRoundedIcon sx={{ color: '#C28E5C', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Maintenance Logs &amp; Workshop Bills ({filteredList.length})
            </Typography>
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700, color: '#475569', fontSize: '0.82rem' } }}>
                <TableCell>#</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Machine</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Work Description &amp; Parts</TableCell>
                <TableCell>Vendor / Technician</TableCell>
                <TableCell>Bill No.</TableCell>
                <TableCell align="center">Bill Photo</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Payment Mode</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: '#64748B' }}>
                    Loading maintenance records...
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                      <BuildCircleRoundedIcon sx={{ fontSize: 44, color: '#CBD5E1' }} />
                      <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600 }}>
                        No maintenance records found
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        Click '+ Add Maintenance Bill' to log workshop repairs, blade change, or spindle service.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((m: any, index: number) => {
                  const isPaid = m.paymentStatus === 'Paid';
                  const dateStr = m.serviceDate ? new Date(m.serviceDate).toLocaleDateString('en-GB') : '-';
                  return (
                    <TableRow
                      key={m.id}
                      hover
                      sx={{
                        '&:hover': { bgcolor: '#F8FAFC' },
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <TableCell sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.82rem' }}>
                        {index + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                        {dateStr}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          {m.machine?.name || 'Machine'}
                        </Typography>
                        {m.machine?.type && (
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                            {m.machine.type}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={m.category}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.74rem',
                            bgcolor: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #E2E8F0'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', fontSize: '0.84rem' }}>
                          {m.workDescription}
                        </Typography>
                        {m.partsReplaced && (
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.3 }}>
                            Parts: {m.partsReplaced}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.84rem' }}>
                          {m.vendorName || '-'}
                        </Typography>
                        {m.technicianName && (
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                            Tech: {m.technicianName}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.84rem' }}>
                        {m.billNumber || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {m.billPhoto ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Box
                              component="img"
                              src={m.billPhoto}
                              alt="Bill"
                              onClick={() => setPreviewPhoto(m.billPhoto)}
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: 1.5,
                                objectFit: 'cover',
                                cursor: 'pointer',
                                border: '1px solid #CBD5E1',
                                '&:hover': { transform: 'scale(1.08)' },
                                transition: 'transform 0.15s ease'
                              }}
                            />
                            <Tooltip title="Download Photo">
                              <IconButton
                                size="small"
                                onClick={() => triggerDownload(m.billPhoto, `Bill_${m.billNumber || 'photo'}.jpg`)}
                                sx={{ color: '#64748B' }}
                              >
                                <DownloadRoundedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
                            None
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        ₹{(m.amount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={isPaid ? 'Paid' : 'Pending Payment'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            bgcolor: isPaid ? '#DCFCE7' : '#FEE2E2',
                            color: isPaid ? '#15803D' : '#DC2626',
                            border: `1px solid ${isPaid ? '#86EFAC' : '#FCA5A5'}`
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {isPaid ? (
                          <Chip
                            label={m.paymentMode === 'Cash' ? 'Cash' : 'Bank'}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              borderColor: m.paymentMode === 'Cash' ? '#F59E0B' : '#3B82F6',
                              color: m.paymentMode === 'Cash' ? '#B45309' : '#1D4ED8'
                            }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {!isPaid && (
                            <Tooltip title="Settle Pending Bill">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleOpenSettleDue(m)}
                                sx={{
                                  fontSize: '0.7rem',
                                  py: 0.2,
                                  px: 1,
                                  minWidth: 0,
                                  textTransform: 'none',
                                  bgcolor: '#16A34A',
                                  boxShadow: 'none',
                                  '&:hover': { bgcolor: '#15803D', boxShadow: 'none' }
                                }}
                              >
                                Settle
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit Record">
                            <IconButton size="small" onClick={() => handleOpenEdit(m)} sx={{ color: '#64748B' }}>
                              <EditRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Record">
                            <IconButton size="small" onClick={() => handleDelete(m.id)} sx={{ color: '#EF4444' }}>
                              <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 🌟 Simple, Clean, Native Unnati Arts Add / Edit Maintenance Dialog 🌟 */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
            }
          }
        }}
      >
        {/* Clean Dialog Title matching CRM / Work Orders exactly */}
        <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
              {editingId ? 'Edit Maintenance Record' : 'Record Machine Maintenance'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Fill in machine details, service work, parts and bill to log maintenance.
            </Typography>
          </Box>
          <IconButton onClick={() => setModalOpen(false)} size="small" sx={{ color: '#94A3B8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Section 1: Machine & Service Details */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                1. Machine &amp; Service Details
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="machine-select-label">Select CNC Machine *</InputLabel>
                    <Select
                      labelId="machine-select-label"
                      label="Select CNC Machine *"
                      value={formData.machineId}
                      onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                    >
                      {machines.map((m: any) => (
                        <MenuItem key={m.id} value={m.id}>
                          {m.name} {m.type ? `(${m.type})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="cat-select-label">Maintenance Category *</InputLabel>
                    <Select
                      labelId="cat-select-label"
                      label="Maintenance Category *"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CNC_CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Service Date *"
                    type="date"
                    fullWidth
                    size="small"
                    value={formData.serviceDate}
                    onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Bill / Invoice Number"
                    fullWidth
                    size="small"
                    placeholder="e.g. INV-9021"
                    value={formData.billNumber}
                    onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section 2: Work Scope & Replacement Parts */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                2. Work Description &amp; Replaced Parts
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Work Description / Problem Resolved *"
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    placeholder="Describe the maintenance, repair or service performed on this machine..."
                    value={formData.workDescription}
                    onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Parts Replaced / Materials (Optional)"
                    fullWidth
                    size="small"
                    placeholder="e.g. 10mm Diamond Router Bit, Water Slurry Pump Seal, Lubricant..."
                    value={formData.partsReplaced}
                    onChange={(e) => setFormData({ ...formData, partsReplaced: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section 3: Vendor & Payment Details */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                3. Vendor &amp; Payment Details
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Vendor / Workshop Name"
                    fullWidth
                    size="small"
                    placeholder="e.g. Apex Machine Tools"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Technician Name"
                    fullWidth
                    size="small"
                    placeholder="e.g. Rakesh Sharma"
                    value={formData.technicianName}
                    onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Bill Amount (₹) *"
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="status-label">Payment Status *</InputLabel>
                    <Select
                      labelId="status-label"
                      value={formData.paymentStatus}
                      label="Payment Status *"
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'Paid' | 'Due' })}
                    >
                      <MenuItem value="Paid">Paid</MenuItem>
                      <MenuItem value="Due">Pending Payment (Due)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  {formData.paymentStatus === 'Paid' ? (
                    <FormControl fullWidth size="small">
                      <InputLabel id="mode-label">Payment Mode</InputLabel>
                      <Select
                        labelId="mode-label"
                        value={formData.paymentMode}
                        label="Payment Mode"
                        onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as 'Cash' | 'Bank' })}
                      >
                        <MenuItem value="Cash">Cash</MenuItem>
                        <MenuItem value="Bank">Bank / UPI</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField fullWidth size="small" disabled label="Payment Mode" value="Pending Due" />
                  )}
                </Grid>
              </Grid>

              {/* 2-Way Cash Book Sync Notice */}
              {formData.paymentStatus === 'Paid' && formData.paymentMode === 'Cash' && (
                <Alert severity="info" sx={{ mt: 2, py: 0.5, borderRadius: 2 }}>
                  Automatic Sync: Saving this bill will log a <strong>Cash OUT (-)</strong> entry of ₹{formData.amount || '0'} in the <strong>Cash Book</strong>.
                </Alert>
              )}
            </Box>

            {/* Section 4: Bill Photo (Voucher Verification) */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                4. Bill Photo (Voucher Verification)
              </Typography>

              {/* Photo Thumbnail */}
              {formData.billPhoto && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                  <Box
                    sx={{
                      position: 'relative',
                      width: 84,
                      height: 84,
                      border: '1.5px solid #CBD5E1',
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                    }}
                  >
                    <img src={formData.billPhoto} alt="Bill" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <IconButton
                      size="small"
                      onClick={() => setFormData({ ...formData, billPhoto: '' })}
                      sx={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        bgcolor: 'rgba(0, 0, 0, 0.65)',
                        color: '#FFF',
                        p: 0.3,
                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.9)' }
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                    <IconButton
                      component="a"
                      href={formData.billPhoto}
                      download="maintenance_bill.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      title="Download Bill Photo"
                      sx={{
                        position: 'absolute',
                        bottom: 3,
                        right: 3,
                        bgcolor: 'rgba(0, 0, 0, 0.65)',
                        color: '#FFF',
                        p: 0.3,
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.9)' }
                      }}
                    >
                      <DownloadRoundedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* Upload & Camera Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={isUploading}
                  sx={{
                    height: 72,
                    flex: 1,
                    border: '1.5px dashed #CBD5E1',
                    bgcolor: '#F8FAFC',
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '0.82rem',
                    color: '#475569',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textTransform: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#C89F5A',
                      bgcolor: '#FFFDF5',
                      color: '#B38B36'
                    }
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 24, mb: 0.5, color: '#C89F5A' }} />
                  {isUploading ? 'Uploading Photo...' : 'Upload Bill Photo'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                </Button>

                <Button
                  variant="outlined"
                  disabled={isUploading}
                  onClick={startCamera}
                  sx={{
                    height: 72,
                    flex: 1,
                    border: '1.5px dashed #CBD5E1',
                    bgcolor: '#F8FAFC',
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '0.82rem',
                    color: '#475569',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textTransform: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#C89F5A',
                      bgcolor: '#FFFDF5',
                      color: '#B38B36'
                    }
                  }}
                >
                  <CameraAltIcon sx={{ fontSize: 24, mb: 0.5, color: '#C89F5A' }} />
                  Take Live Photo
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        {/* Clean Dialog Actions */}
        <DialogActions sx={{ p: 2.5, bgcolor: '#FFFFFF' }}>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isCreating || isUpdating}
            sx={{
              bgcolor: '#C28E5C',
              color: '#FFFFFF',
              fontWeight: 700,
              px: 3.5,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#A06E3B', boxShadow: 'none' }
            }}
          >
            {editingId ? 'Save Changes' : 'Save Maintenance Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settle Due Dialog */}
      <Dialog
        open={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
          Settle Pending Invoice
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
              Machine: <strong>{settlingItem?.machine?.name}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
              Vendor: <strong>{settlingItem?.vendorName || '-'}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
              Bill No: <strong>{settlingItem?.billNumber || '-'}</strong>
            </Typography>
            <Typography variant="h6" sx={{ color: '#DC2626', fontWeight: 800, mt: 1 }}>
              Amount Due: ₹{(settlingItem?.amount || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Payment Mode</InputLabel>
            <Select
              value={settlePaymentMode}
              label="Payment Mode"
              onChange={(e) => setSettlePaymentMode(e.target.value as 'Cash' | 'Bank')}
            >
              <MenuItem value="Cash">Physical Cash (Cash Book)</MenuItem>
              <MenuItem value="Bank">Bank / UPI Transfer</MenuItem>
            </Select>
          </FormControl>

          {settlePaymentMode === 'Cash' && (
            <Alert severity="info" sx={{ py: 0.5, borderRadius: 2 }}>
              ₹{(settlingItem?.amount || 0).toLocaleString('en-IN')} will be automatically deducted from the <strong>Cash Book</strong>.
            </Alert>
          )}

          <TextField
            fullWidth
            type="date"
            label="Payment Date"
            value={settleDate}
            onChange={(e) => setSettleDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSettleModalOpen(false)} sx={{ color: '#64748B', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSettleDue}
            disabled={isSettling}
            sx={{
              bgcolor: '#C28E5C',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#A06E3B', boxShadow: 'none' }
            }}
          >
            Confirm &amp; Settle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Live Camera Dialog */}
      <Dialog
        open={isCameraOpen}
        onClose={stopCamera}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, overflow: 'hidden' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Capture Bill Photo
          </Typography>
          <IconButton onClick={stopCamera} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            component="video"
            ref={videoRef}
            autoPlay
            playsInline
            sx={{
              width: '100%',
              maxHeight: 380,
              borderRadius: 2,
              bgcolor: '#000000',
              objectFit: 'cover'
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={capturePhoto}
            sx={{
              bgcolor: '#C28E5C',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 4,
              py: 1,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#A06E3B', boxShadow: 'none' }
            }}
          >
            Snap &amp; Save Photo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Preview & Download Modal */}
      <Dialog
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, overflow: 'hidden' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Bill / Receipt Preview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {previewPhoto && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => triggerDownload(previewPhoto, 'maintenance-bill.jpg')}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Download Photo
              </Button>
            )}
            <IconButton onClick={() => setPreviewPhoto(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: '#F8FAFC' }}>
          {previewPhoto && (
            <Box
              component="img"
              src={previewPhoto}
              alt="Full Preview"
              sx={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2.5, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Maintenance;
