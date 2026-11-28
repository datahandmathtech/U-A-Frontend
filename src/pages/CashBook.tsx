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
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';

// Icons
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded';

import {
  useGetCashBookQuery,
  useCreateCashTransactionMutation,
  useUpdateCashTransactionMutation,
  useDeleteCashTransactionMutation,
  useUploadFilesMutation
} from '../store/apiSlice';

const IN_CATEGORIES = [
  'Client Advance / Payment',
  'Bank Withdrawal (Bank ➔ Cash)',
  'Owner / Capital Addition',
  'Scrap / Waste Cash Sale',
  'Other Cash Receipt'
];

const OUT_CATEGORIES = [
  'Machine Maintenance & Parts',
  'Factory Consumables',
  'Labor / Staff Advance / Wage',
  'Tea & Pantry / Snacks',
  'Transportation / Tempo / Freight',
  'Electricity & Factory Utilities',
  'Vendor Cash Payment',
  'Cash Deposit to Bank (Cash ➔ Bank)',
  'Emergency Factory Expense',
  'Miscellaneous Expense'
];

const formatDateTimeLocal = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const CashBook: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentFY = currentMonth >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

  // Filters
  const [selectedFY, setSelectedFY] = useState<string>(currentFY);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: cashData, isLoading, refetch } = useGetCashBookQuery({
    month: selectedMonth,
    year: selectedFY ? parseInt(selectedFY.split('-')[0], 10) : undefined,
    category: selectedCategory || undefined,
    type: selectedType || undefined
  });

  const [createTx, { isLoading: isCreating }] = useCreateCashTransactionMutation();
  const [updateTx, { isLoading: isUpdating }] = useUpdateCashTransactionMutation();
  const [deleteTx] = useDeleteCashTransactionMutation();
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'IN',
    amount: '',
    category: IN_CATEGORIES[0],
    description: '',
    paidToReceivedFrom: '',
    voucherNumber: '',
    receiptPhoto: '',
    date: formatDateTimeLocal()
  });

  // Camera capture
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const summary = cashData?.summary || {
    totalIn: 0,
    totalOut: 0,
    currentBalance: 0,
    periodIn: 0,
    periodOut: 0,
    transactionCount: 0
  };

  const transactions = cashData?.transactions || [];

  // Filter by search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter((t: any) =>
      (t.paidToReceivedFrom && t.paidToReceivedFrom.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.voucherNumber && t.voucherNumber.toLowerCase().includes(q))
    );
  }, [transactions, searchQuery]);

  const handleOpenAdd = (type: 'IN' | 'OUT') => {
    setEditingId(null);
    setFormData({
      type,
      amount: '',
      category: type === 'IN' ? IN_CATEGORIES[0] : OUT_CATEGORIES[0],
      description: '',
      paidToReceivedFrom: '',
      voucherNumber: '',
      receiptPhoto: '',
      date: formatDateTimeLocal()
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (tx: any) => {
    setEditingId(tx.id);
    setFormData({
      type: tx.type,
      amount: String(tx.amount),
      category: tx.category,
      description: tx.description || '',
      paidToReceivedFrom: tx.paidToReceivedFrom || '',
      voucherNumber: tx.voucherNumber || '',
      receiptPhoto: tx.receiptPhoto || '',
      date: formatDateTimeLocal(new Date(tx.date))
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) {
      setSnackbar({ open: true, message: 'Please enter a valid positive amount', severity: 'error' });
      return;
    }
    if (!formData.category) {
      setSnackbar({ open: true, message: 'Please select a category', severity: 'error' });
      return;
    }

    try {
      if (editingId) {
        await updateTx({
          id: editingId,
          ...formData,
          amount: num,
          date: new Date(formData.date).toISOString()
        }).unwrap();
        setSnackbar({ open: true, message: 'Cash entry updated successfully!', severity: 'success' });
      } else {
        await createTx({
          ...formData,
          amount: num,
          date: new Date(formData.date).toISOString()
        }).unwrap();
        setSnackbar({
          open: true,
          message: formData.type === 'IN' ? 'Cash IN added to balance!' : 'Cash OUT recorded successfully!',
          severity: 'success'
        });
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.data?.message || 'Failed to save cash transaction', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this cash entry? The cash balance will be automatically adjusted.')) {
      try {
        await deleteTx(id).unwrap();
        setSnackbar({ open: true, message: 'Entry deleted and cash balance adjusted.', severity: 'success' });
        refetch();
      } catch (err: any) {
        setSnackbar({ open: true, message: err?.data?.message || 'Failed to delete transaction', severity: 'error' });
      }
    }
  };

  // Camera handlers
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
            const file = new File([blob], `cash_receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const uploadData = new FormData();
            uploadData.append('files', file);
            try {
              const res = await uploadFiles(uploadData).unwrap();
              if (res?.urls && res.urls.length > 0) {
                setFormData(prev => ({ ...prev, receiptPhoto: res.urls[0] }));
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

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                bgcolor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.2)'
              }}
            >
              <AccountBalanceWalletRoundedIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                Cash Book (Cash in Hand)
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                Live cash balance tracking, client receipts, machine maintenance, factory expenses &amp; 2-way sync
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons: Add Cash IN (+) and Add Cash OUT (-) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => handleOpenAdd('IN')}
            sx={{
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 2.5,
              px: 2.5,
              py: 1,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)' }
            }}
          >
            Cash IN (+)
          </Button>

          <Button
            variant="contained"
            startIcon={<RemoveRoundedIcon />}
            onClick={() => handleOpenAdd('OUT')}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 2.5,
              px: 2.5,
              py: 1,
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' }
            }}
          >
            Cash OUT (-)
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Card 1: Current Cash in Hand */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: summary.currentBalance >= 0 ? '2px solid #86EFAC' : '2px solid #FCA5A5',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Current Cash in Hand
              </Typography>
              <Avatar sx={{ bgcolor: summary.currentBalance >= 0 ? '#DCFCE7' : '#FEE2E2', color: summary.currentBalance >= 0 ? '#16A34A' : '#DC2626', width: 36, height: 36 }}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: summary.currentBalance >= 0 ? '#166534' : '#991B1B', mb: 0.5 }}>
              ₹{summary.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              Physical cash available right now
            </Typography>
          </Card>
        </Grid>

        {/* Card 2: Total Cash IN */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Cash IN (+)
              </Typography>
              <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 36, height: 36, border: '1px solid #A7F3D0' }}>
                <ArrowDownwardRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#059669', mb: 0.5 }}>
              +₹{summary.totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              Client advances, bank withdrawals &amp; receipts
            </Typography>
          </Card>
        </Grid>

        {/* Card 3: Total Cash OUT */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Cash OUT (-)
              </Typography>
              <Avatar sx={{ bgcolor: '#FEF2F2', color: '#DC2626', width: 36, height: 36, border: '1px solid #FECACA' }}>
                <ArrowUpwardRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#DC2626', mb: 0.5 }}>
              -₹{summary.totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              Machine maintenance, factory expenses &amp; advances
            </Typography>
          </Card>
        </Grid>

        {/* Card 4: Total Entries */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Transactions
              </Typography>
              <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 36, height: 36, border: '1px solid #BFDBFE' }}>
                <ReceiptLongRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1E293B', mb: 0.5 }}>
              {summary.transactionCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              Audited physical cash entries
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by party, notes, voucher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                    </InputAdornment>
                  )
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC' } }}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedType}
                label="Type"
                onChange={(e) => setSelectedType(e.target.value)}
                sx={{ borderRadius: 2.5, bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="">All (IN &amp; OUT)</MenuItem>
                <MenuItem value="IN">Cash IN (+)</MenuItem>
                <MenuItem value="OUT">Cash OUT (-)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ borderRadius: 2.5, bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem disabled sx={{ fontWeight: 800, color: '#16A34A' }}>--- INFLOW CATEGORIES ---</MenuItem>
                {IN_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                <MenuItem disabled sx={{ fontWeight: 800, color: '#DC2626' }}>--- OUTFLOW CATEGORIES ---</MenuItem>
                {OUT_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Financial Year</InputLabel>
              <Select
                value={selectedFY}
                label="Financial Year"
                onChange={(e) => setSelectedFY(e.target.value)}
                sx={{ borderRadius: 2.5, bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="2026-2027">FY 2026-2027</MenuItem>
                <MenuItem value="2025-2026">FY 2025-2026</MenuItem>
                <MenuItem value="2024-2025">FY 2024-2025</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(e.target.value as any)}
                sx={{ borderRadius: 2.5, bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="">All Months</MenuItem>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                  <MenuItem key={m} value={idx}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Cash Book Ledger Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          overflowX: 'auto'
        }}
      >
        <Table sx={{ minWidth: 850 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Date &amp; Time
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Type
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Category
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Party / Person
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Particulars / Notes
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Cash IN (+)
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#DC2626', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Cash OUT (-)
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Running Balance
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Voucher / Proof
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#64748B' }}>
                  Loading Cash Book ledger...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#64748B' }}>
                  <AccountBalanceWalletRoundedIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569' }}>
                    No cash transactions found
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Click &quot;Cash IN (+)&quot; or &quot;Cash OUT (-)&quot; to record your first entry.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx: any) => {
                const isIN = tx.type === 'IN';
                return (
                  <TableRow
                    key={tx.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: '#F8FAFC' },
                      borderBottom: '1px solid #F1F5F9'
                    }}
                  >
                    <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#1E293B' }}>
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        icon={isIN ? <ArrowDownwardRoundedIcon sx={{ fontSize: 14 }} /> : <ArrowUpwardRoundedIcon sx={{ fontSize: 14 }} />}
                        label={isIN ? 'CASH IN' : 'CASH OUT'}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          bgcolor: isIN ? '#DCFCE7' : '#FEE2E2',
                          color: isIN ? '#166534' : '#991B1B',
                          border: isIN ? '1px solid #86EFAC' : '1px solid #FCA5A5',
                          borderRadius: 1.5
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={tx.category}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          bgcolor: '#F1F5F9',
                          color: '#334155',
                          borderRadius: 1.5
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                        {tx.paidToReceivedFrom || '—'}
                      </Typography>
                      {tx.sourceModule && tx.sourceModule !== 'manual' && (
                        <Chip
                          label={`Synced: ${tx.sourceModule}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#EFF6FF', color: '#1D4ED8', borderRadius: 1 }}
                        />
                      )}
                    </TableCell>

                    <TableCell sx={{ py: 1.5, maxWidth: 220 }}>
                      <Typography sx={{ fontSize: '0.84rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {tx.description || '—'}
                      </Typography>
                      {tx.voucherNumber && (
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                          Voucher: {tx.voucherNumber}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.5 }}>
                      {isIN ? (
                        <Typography sx={{ fontWeight: 900, fontSize: '0.9rem', color: '#16A34A' }}>
                          +₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      ) : (
                        <span style={{ color: '#CBD5E1' }}>-</span>
                      )}
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.5 }}>
                      {!isIN ? (
                        <Typography sx={{ fontWeight: 900, fontSize: '0.9rem', color: '#DC2626' }}>
                          -₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      ) : (
                        <span style={{ color: '#CBD5E1' }}>-</span>
                      )}
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                        ₹{Number(tx.runningBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {tx.receiptPhoto ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            component="img"
                            src={tx.receiptPhoto}
                            alt="Receipt"
                            onClick={() => setPreviewPhoto(tx.receiptPhoto)}
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1.5,
                              objectFit: 'cover',
                              border: '1.5px solid #CBD5E1',
                              cursor: 'pointer',
                              '&:hover': { transform: 'scale(1.08)' },
                              transition: 'transform 0.15s ease'
                            }}
                          />
                          <IconButton
                            component="a"
                            href={tx.receiptPhoto}
                            download="cash_voucher.jpg"
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            title="Download Proof"
                            sx={{ color: '#64748B', p: 0.4 }}
                          >
                            <DownloadRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#CBD5E1' }}>None</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(tx)}
                          sx={{ color: '#2563EB', '&:hover': { bgcolor: '#EFF6FF' } }}
                          title="Edit Entry"
                        >
                          <EditRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(tx.id)}
                          sx={{ color: '#DC2626', '&:hover': { bgcolor: '#FEF2F2' } }}
                          title="Delete Entry"
                        >
                          <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Cash Transaction Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }
          }
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, bgcolor: formData.type === 'IN' ? '#15803D' : '#B91C1C', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>
              {formData.type === 'IN' ? <ArrowDownwardRoundedIcon /> : <ArrowUpwardRoundedIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                {editingId ? 'Edit Cash Entry' : formData.type === 'IN' ? 'Cash IN' : 'Cash OUT'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {formData.type === 'IN' ? 'Record incoming cash payment or receipt' : 'Record outgoing cash expense or payment'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setModalOpen(false)} sx={{ color: '#FFFFFF' }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Toggle Type */}
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 1 }}>
              Entry Type *
            </Typography>
            <ToggleButtonGroup
              value={formData.type}
              exclusive
              onChange={(_e, val) => {
                if (val) {
                  setFormData({
                    ...formData,
                    type: val,
                    category: val === 'IN' ? IN_CATEGORIES[0] : OUT_CATEGORIES[0]
                  });
                }
              }}
              fullWidth
            >
              <ToggleButton
                value="IN"
                sx={{
                  fontWeight: 800,
                  py: 1,
                  color: '#166534',
                  '&.Mui-selected': { bgcolor: '#DCFCE7', color: '#166534' }
                }}
              >
                + CASH IN
              </ToggleButton>
              <ToggleButton
                value="OUT"
                sx={{
                  fontWeight: 800,
                  py: 1,
                  color: '#991B1B',
                  '&.Mui-selected': { bgcolor: '#FEE2E2', color: '#991B1B' }
                }}
              >
                - CASH OUT
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Amount & Date */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 0.5 }}>
                Amount (₹) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                placeholder="e.g. 5000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    sx: { borderRadius: 2.5, fontWeight: 800, fontSize: '1.05rem' }
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 0.5 }}>
                Date &amp; Time *
              </Typography>
              <TextField
                type="datetime-local"
                fullWidth
                size="small"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
              />
            </Grid>
          </Grid>

          {/* Category */}
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 0.5 }}>
              Category *
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              slotProps={{ select: { sx: { borderRadius: 2.5 } } }}
            >
              {(formData.type === 'IN' ? IN_CATEGORIES : OUT_CATEGORIES).map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Party / Received From or Paid To */}
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 0.5 }}>
              {formData.type === 'IN' ? 'Received From (Client / Party / Source) *' : 'Paid To (Vendor / Person / Staff / Purpose) *'}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={formData.type === 'IN' ? 'e.g. Rahul Gupta, Axis Bank ATM, Owner' : 'e.g. CNC Spindle Mechanic, Dipesh Auto, Staff Advance'}
              value={formData.paidToReceivedFrom}
              onChange={(e) => setFormData({ ...formData, paidToReceivedFrom: e.target.value })}
              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
            />
          </Box>

          {/* Voucher / Bill No & Description */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 0.5 }}>
                Voucher / Bill No. (Optional)
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. VCH-102"
                value={formData.voucherNumber}
                onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 7 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 0.5 }}>
                Description / Remarks
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Add notes, purpose, items..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
              />
            </Grid>
          </Grid>

          {/* Verification Photo: Both Upload (Gallery) & Click (Camera) */}
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', mb: 0.8 }}>
              Voucher / Bill Photo (Optional Proof)
            </Typography>

            {formData.receiptPhoto && (
              <Box sx={{ position: 'relative', width: 100, height: 90, borderRadius: 2, overflow: 'hidden', mb: 1.5, border: '1.5px solid #CBD5E1' }}>
                <img src={formData.receiptPhoto} alt="Voucher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton
                  size="small"
                  onClick={() => setFormData({ ...formData, receiptPhoto: '' })}
                  sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.65)', color: '#FFFFFF', p: 0.3 }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadRoundedIcon />}
                disabled={isUploading}
                sx={{
                  flex: 1,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  borderColor: '#CBD5E1',
                  color: '#475569'
                }}
              >
                {isUploading ? 'Uploading...' : 'Upload Photo (Gallery)'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const data = new FormData();
                      data.append('files', e.target.files[0]);
                      try {
                        const res = await uploadFiles(data).unwrap();
                        if (res?.urls && res.urls.length > 0) {
                          setFormData(prev => ({ ...prev, receiptPhoto: res.urls[0] }));
                        }
                      } catch (err) {
                        console.error('Failed to upload voucher photo', err);
                      }
                    }
                  }}
                />
              </Button>

              <Button
                variant="outlined"
                startIcon={<PhotoCameraRoundedIcon />}
                onClick={startCamera}
                disabled={isUploading}
                sx={{
                  flex: 1,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  borderColor: '#CBD5E1',
                  color: '#475569'
                }}
              >
                Click Photo (Camera)
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC' }}>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isCreating || isUpdating}
            sx={{
              bgcolor: formData.type === 'IN' ? '#16A34A' : '#DC2626',
              color: '#FFFFFF',
              fontWeight: 800,
              px: 3,
              borderRadius: 2.5,
              textTransform: 'none',
              '&:hover': { bgcolor: formData.type === 'IN' ? '#15803D' : '#B91C1C' }
            }}
          >
            {editingId ? 'Save Changes' : formData.type === 'IN' ? 'Confirm Cash IN' : 'Confirm Cash OUT'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Camera Capture Dialog */}
      <Dialog open={isCameraOpen} onClose={stopCamera} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          Take Voucher Photo
          <IconButton onClick={stopCamera}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#000', textAlign: 'center', position: 'relative' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '60vh' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<PhotoCameraRoundedIcon />}
            onClick={capturePhoto}
            sx={{ bgcolor: '#16A34A', color: '#FFF', fontWeight: 800, px: 4, borderRadius: 3 }}
          >
            Capture Photo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen Photo Preview Dialog with Download Button */}
      <Dialog
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }
          }
        }}
      >
        <Box sx={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
          <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 1, zIndex: 10 }}>
            <IconButton
              component="a"
              href={previewPhoto || ''}
              download="cash_voucher_proof.jpg"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: '#FFFFFF', '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' } }}
              title="Download Photo"
            >
              <DownloadRoundedIcon />
            </IconButton>
            <IconButton
              onClick={() => setPreviewPhoto(null)}
              sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: '#FFFFFF', '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' } }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          {previewPhoto && (
            <Box
              component="img"
              src={previewPhoto}
              alt="Cash Voucher"
              sx={{
                width: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                bgcolor: '#0F172A'
              }}
            />
          )}
        </Box>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2, fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CashBook;
