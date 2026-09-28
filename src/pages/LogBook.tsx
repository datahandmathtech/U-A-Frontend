import React, { useState, useMemo, useRef } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, IconButton, Chip, Dialog, DialogTitle, DialogContent, 
  Button, Grid, TextField, Tooltip, Snackbar, Alert,
  DialogActions, MenuItem as MuiMenuItem, Select, FormControl, InputAdornment,
  CircularProgress
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloseIcon from '@mui/icons-material/Close';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import SearchIcon from '@mui/icons-material/Search';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { 
  useGetMachineLogsQuery, 
  useEditMachineLogMutation,
  useDeleteMachineLogMutation,
  useGetMachinesQuery,
  useGetDailyMachineLogsQuery,
  useMachineClockInMutation,
  useMachineClockOutMutation,
  useGetProjectsQuery,
  useGetStaffListQuery
} from '../store/apiSlice';
import { getOptimizedUrl, getFullQualityUrl } from '../utils/cloudinary';

const LogPhotoUploadBox = ({
  label,
  previewUrl,
  onImageSelected,
  onClear
}: {
  label: string;
  previewUrl: string;
  onImageSelected: (dataUrl: string) => void;
  onClear: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        onImageSelected(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <Box
        onClick={() => fileInputRef.current?.click()}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: { xs: 95, sm: 110 },
          border: '2px dashed',
          borderColor: previewUrl ? '#10B981' : '#CBD5E1',
          borderRadius: 2.5,
          bgcolor: previewUrl ? '#ECFDF5' : '#F8FAFC',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: previewUrl ? '#D1FAE5' : '#F1F5F9',
            borderColor: previewUrl ? '#059669' : '#94A3B8'
          }
        }}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                bgcolor: '#10B981',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 13 }} />
            </Box>
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
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                py: 0.2,
                bgcolor: 'rgba(15, 23, 42, 0.75)',
                color: '#FFFFFF',
                fontSize: '0.62rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.3
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: 10 }} /> Change
            </Box>
          </>
        ) : (
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 0.5
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: 18, color: '#64748B' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: '0.65rem' }}>
              UPLOAD
            </Typography>
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontWeight: 700, color: '#334155', fontSize: '0.72rem' }}>
        {label}
      </Typography>
    </Box>
  );
};

const formatDateTimeLocal = (d: Date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const LogBook = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  const handleOpenDetails = async (log: any) => {
    setSelectedLog(log);
    setLoadingEvidence(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/machine-logs/${log.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const full = await res.json();
        setSelectedLog((prev: any) => (prev && prev.id === log.id ? { ...prev, ...full } : prev));
      }
    } catch (err) {
      console.warn('Failed to load full photos:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<any>(null);

  const formattedDateParam = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  const { data: allLogs, isLoading, refetch: refetchAllLogs } = useGetMachineLogsQuery();
  const { data: machines } = useGetMachinesQuery();
  const { data: dailyLogs, refetch: refetchDailyLogs } = useGetDailyMachineLogsQuery(undefined, {
    pollingInterval: 10000,
    skipPollingIfUnfocused: true,
  });
  const { data: projectsData } = useGetProjectsQuery();
  const { data: staffList } = useGetStaffListQuery();
  const [machineClockIn, { isLoading: clockingIn }] = useMachineClockInMutation();
  const [machineClockOut, { isLoading: clockingOut }] = useMachineClockOutMutation();

  const [editMachineLog] = useEditMachineLogMutation();
  const [deleteMachineLog] = useDeleteMachineLogMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState<any>(null);
  const [editQty, setEditQty] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Manual Machine ON / OFF States
  const [startMachineDialogOpen, setStartMachineDialogOpen] = useState(false);
  const [startDateTime, setStartDateTime] = useState(formatDateTimeLocal());
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [startRemarks, setStartRemarks] = useState('');
  const [photos, setPhotos] = useState({ machine: '', unit: '', software: '' });

  const [endMachineDialogOpen, setEndMachineDialogOpen] = useState(false);
  const [endDateTime, setEndDateTime] = useState(formatDateTimeLocal());
  const [selectedEndLogId, setSelectedEndLogId] = useState('');
  const [endProjectId, setEndProjectId] = useState('');
  const [endProductId, setEndProductId] = useState('');
  const [endQuantity, setEndQuantity] = useState('');
  const [endRemarks, setEndRemarks] = useState('');
  const [endPhotos, setEndPhotos] = useState({ machine: '', unit: '', software: '' });

  // Deduplicate active logs by machine
  const activeLogsByMachine = useMemo(() => {
    if (!dailyLogs) return [];
    const map = new Map<string, any>();
    for (const log of dailyLogs) {
      if (log.status === 'active') {
        const mId = log.machineId || log.machine?.id || log.id;
        if (!map.has(mId) || new Date(log.startTime).getTime() > new Date(map.get(mId).startTime).getTime()) {
          map.set(mId, log);
        }
      }
    }
    return Array.from(map.values());
  }, [dailyLogs]);

  const activeMachineIds = useMemo(() => {
    return new Set(activeLogsByMachine.map((l: any) => l.machineId || l.machine?.id));
  }, [activeLogsByMachine]);

  const handleSelectEndLog = (logId: string) => {
    setSelectedEndLogId(logId);
    const foundLog = activeLogsByMachine.find((l: any) => l.id === logId);
    if (foundLog) {
      setEndProjectId(foundLog.projectId || '');
      setEndProductId(foundLog.productId || '');
    } else {
      setEndProjectId('');
      setEndProductId('');
    }
  };

  const selectedEndProjectObj = useMemo(() => {
    return projectsData?.find((p: any) => p.id === endProjectId);
  }, [projectsData, endProjectId]);

  const endProjectProducts = useMemo(() => {
    if (!selectedEndProjectObj) return [];
    return selectedEndProjectObj.quotations?.[0]?.products || selectedEndProjectObj.products || [];
  }, [selectedEndProjectObj]);

  const handleManualClockIn = async () => {
    try {
      if (!selectedMachine) {
        setSnackbar({ open: true, message: 'Please select a machine to turn ON.', severity: 'error' });
        return;
      }

      await machineClockIn({
        machineId: selectedMachine,
        startTime: startDateTime ? new Date(startDateTime).toISOString() : undefined,
        operatorId: selectedOperatorId || undefined,
        estimatedHours: estimatedHours || undefined,
        remarks: startRemarks || undefined,
        machinePhotoUrl: photos.machine || undefined,
        unitPhotoUrl: photos.unit || undefined,
        softwarePhotoUrl: photos.software || undefined,
      }).unwrap();

      setSnackbar({ open: true, message: 'Machine turned ON successfully!', severity: 'success' });
      setSelectedMachine('');
      setSelectedOperatorId('');
      setEstimatedHours('');
      setStartRemarks('');
      setPhotos({ machine: '', unit: '', software: '' });
      setStartMachineDialogOpen(false);
      refetchDailyLogs();
      refetchAllLogs();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.data?.message || 'Failed to turn machine ON.', severity: 'error' });
    }
  };

  const handleManualClockOut = async () => {
    try {
      if (!selectedEndLogId) {
        setSnackbar({ open: true, message: 'Please select an active machine to turn OFF.', severity: 'error' });
        return;
      }
      if (!endQuantity || isNaN(Number(endQuantity)) || Number(endQuantity) <= 0) {
        setSnackbar({ open: true, message: 'Please enter a valid quantity produced.', severity: 'error' });
        return;
      }

      let productName = '';
      if (endProductId && endProjectProducts.length > 0) {
        const prod = endProjectProducts.find((p: any) => p.id === endProductId);
        if (prod) productName = prod.name;
      }

      await machineClockOut({
        logId: selectedEndLogId,
        endTime: endDateTime ? new Date(endDateTime).toISOString() : undefined,
        projectId: endProjectId || undefined,
        productId: endProductId || undefined,
        productName: productName || undefined,
        quantityProduced: Number(endQuantity),
        remarks: endRemarks || undefined,
        endMachinePhotoUrl: endPhotos.machine || undefined,
        endUnitPhotoUrl: endPhotos.unit || undefined,
        endSoftwarePhotoUrl: endPhotos.software || undefined,
      }).unwrap();

      setSnackbar({ open: true, message: 'Machine turned OFF successfully!', severity: 'success' });
      setSelectedEndLogId('');
      setEndProjectId('');
      setEndProductId('');
      setEndQuantity('');
      setEndRemarks('');
      setEndPhotos({ machine: '', unit: '', software: '' });
      setEndMachineDialogOpen(false);
      refetchDailyLogs();
      refetchAllLogs();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.data?.message || 'Failed to turn machine OFF.', severity: 'error' });
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await deleteMachineLog(logToDelete.id).unwrap();
      setSnackbar({ open: true, message: 'Log deleted successfully.', severity: 'success' });
      setDeleteConfirmOpen(false);
      refetchAllLogs();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete log.', severity: 'error' });
    }
  };

  const handleEditSubmit = async () => {
    try {
      await editMachineLog({ id: logToEdit.id, data: { quantityProduced: editQty, remarks: editRemarks } }).unwrap();
      setSnackbar({ open: true, message: 'Log updated successfully.', severity: 'success' });
      setEditDialogOpen(false);
      refetchAllLogs();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update log.', severity: 'error' });
    }
  };

  const isLogCarryForward = (log: any) => Boolean(log?.isCarryForwardToday || log?.isCarryForward || log?.isMultiDay);

  // Machine Logs filtering with daily expansion for multi-day logs
  const logs = React.useMemo(() => {
    if (!allLogs) return [];
    
    // Safety deduplication: ensure only one active log per machine is processed
    const activeMachineSeen = new Set<string>();
    const sanitizedLogs: any[] = [];
    for (const rawLog of allLogs) {
      if (rawLog.status === 'active') {
        const mKey = (rawLog.machineId || rawLog.machine?.id || rawLog.machine?.name || rawLog.id)?.toString();
        if (activeMachineSeen.has(mKey)) continue;
        activeMachineSeen.add(mKey);
      }
      sanitizedLogs.push(rawLog);
    }

    // Expand multi-day logs into clean daily entries
    const expanded: any[] = [];
    
    for (const rawLog of sanitizedLogs) {
      const start = new Date(rawLog.startTime);
      const end = rawLog.endTime ? new Date(rawLog.endTime) : (rawLog.status === 'active' ? new Date() : new Date(rawLog.startTime));

      // Calculate calendar days spanned [startDay, endDay] in local time
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      while (cur.getTime() <= last.getTime()) {
        const isStartDay = (cur.getFullYear() === start.getFullYear() && cur.getMonth() === start.getMonth() && cur.getDate() === start.getDate());
        const isEndDay = (cur.getFullYear() === last.getFullYear() && cur.getMonth() === last.getMonth() && cur.getDate() === last.getDate());

        // Check if this specific day matches current view filter
        let matches = false;
        if (viewMode === 'day') {
          matches = (cur.getFullYear() === selectedDate.getFullYear() &&
                     cur.getMonth() === selectedDate.getMonth() &&
                     cur.getDate() === selectedDate.getDate());
        } else {
          matches = (cur.getMonth() === selectedMonth && cur.getFullYear() === selectedYear);
        }

        if (matches) {
          const dayStartMs = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0).getTime();
          const dayEndMs = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59, 999).getTime();

          const effStartMs = Math.max(start.getTime(), dayStartMs);
          const effEndMs = Math.min(end.getTime(), dayEndMs);
          const dayDurationMs = Math.max(0, effEndMs - effStartMs);

          // An entry on this day is Carry Forward ONLY IF it started before this day!
          // If it is the start day, it was DIRECTLY started on this day!
          const isCarryForwardToday = !isStartDay || (Boolean(rawLog.isCarryForward) && isStartDay && (rawLog.remarks?.includes('Carry Forward') || rawLog.parentLogId));

          expanded.push({
            ...rawLog,
            uniqueKey: `${rawLog.id}_${cur.getFullYear()}_${cur.getMonth() + 1}_${cur.getDate()}`,
            entryDate: new Date(cur),
            isCarryForwardToday,
            dayStartTime: isStartDay ? rawLog.startTime : new Date(dayStartMs).toISOString(),
            dayEndTime: isEndDay ? (rawLog.status === 'active' ? null : rawLog.endTime) : new Date(dayEndMs).toISOString(),
            isDayRunning: isEndDay && rawLog.status === 'active',
            dayDurationMs,
            isMultiDay: start.getTime() < dayStartMs || end.getTime() > dayEndMs,
            originalStartTime: rawLog.startTime,
            originalEndTime: rawLog.endTime
          });
        }

        // Advance to next day
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Sort expanded entries so highest quality records come first
    // (User output/remarks > completed > longest duration)
    expanded.sort((a, b) => {
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      if (dateB !== dateA) return dateB - dateA;

      const aRemarksScore = (a.remarks && !a.remarks.includes('Auto-closed') && a.remarks.includes('Out:')) ? 10 : 0;
      const bRemarksScore = (b.remarks && !b.remarks.includes('Auto-closed') && b.remarks.includes('Out:')) ? 10 : 0;
      if (bRemarksScore !== aRemarksScore) return bRemarksScore - aRemarksScore;

      const aCompleted = a.status === 'completed' ? 2 : (a.status === 'active' ? 1 : 0);
      const bCompleted = b.status === 'completed' ? 2 : (b.status === 'active' ? 1 : 0);
      if (bCompleted !== aCompleted) return bCompleted - aCompleted;

      return (b.dayDurationMs || 0) - (a.dayDurationMs || 0);
    });

    // Deduplicate expanded logs per (machine, calendarDay):
    // 1. A machine can only have ONE carry-forward row per calendar day.
    // 2. Duplicate start-time logs for the same machine on the same day are omitted.
    const deduped: any[] = [];
    const seenMachineDays = new Map<string, any[]>();

    for (const logItem of expanded) {
      const mId = (logItem.machineId || logItem.machine?.id || logItem.machine?.name || 'unknown').toString();
      const dayKey = `${mId}_${logItem.entryDate.getFullYear()}-${logItem.entryDate.getMonth()}-${logItem.entryDate.getDate()}`;

      if (!seenMachineDays.has(dayKey)) {
        seenMachineDays.set(dayKey, [logItem]);
        deduped.push(logItem);
      } else {
        const existingList = seenMachineDays.get(dayKey)!;

        // If this item is carry forward for today:
        if (logItem.isCarryForwardToday) {
          const hasExistingCF = existingList.some(e => e.isCarryForwardToday);
          if (hasExistingCF) {
            // Already kept the highest-quality CF for this machine on this day
            continue;
          }
        }

        // Check if there is an existing entry with the same dayStartTime (within 2 minutes)
        const itemStartTimeMs = new Date(logItem.dayStartTime).getTime();
        const duplicateStart = existingList.find(e => Math.abs(new Date(e.dayStartTime).getTime() - itemStartTimeMs) < 120000);
        if (duplicateStart) {
          continue; // duplicate session
        }

        // Legitimate separate session
        existingList.push(logItem);
        deduped.push(logItem);
      }
    }

    // Final sort: entryDate descending, then dayStartTime descending
    deduped.sort((a, b) => {
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.dayStartTime).getTime() - new Date(a.dayStartTime).getTime();
    });

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      return deduped.filter((log: any) => 
        (log.project?.clientName || '').toLowerCase().includes(lowerQ) ||
        (log.machine?.name || '').toLowerCase().includes(lowerQ) ||
        (log.operator?.name || '').toLowerCase().includes(lowerQ) ||
        (log.operator?.staffId || '').toLowerCase().includes(lowerQ) ||
        (log.project?.name || '').toLowerCase().includes(lowerQ) ||
        (log.status || '').toLowerCase().includes(lowerQ)
      );
    }
    return deduped;
  }, [allLogs, viewMode, selectedDate, selectedMonth, selectedYear, searchQuery]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = [2024, 2025, 2026, 2027, 2028];

  const formatDMY = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  };

  const handleDateChange = (dateVal: string) => {
    if (!dateVal) return;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      setSelectedDate(d);
      setSelectedMonth(d.getMonth());
      setSelectedYear(d.getFullYear());
      setViewMode('day');
    }
  };

  const handleMonthChange = (monthIdx: number) => {
    setSelectedMonth(monthIdx);
    setViewMode('month');
    const d = new Date(selectedDate);
    d.setMonth(monthIdx);
    setSelectedDate(d);
  };

  const handleYearChange = (yearVal: number) => {
    setSelectedYear(yearVal);
    setViewMode('month');
    const d = new Date(selectedDate);
    d.setFullYear(yearVal);
    setSelectedDate(d);
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', p: { xs: 2, md: 4 } }}>
      
      {/* Header Area */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: 'rgba(46, 125, 50, 0.1)', p: 1.5, borderRadius: 2, border: '1px solid rgba(46, 125, 50, 0.2)' }}>
            <CalendarTodayIcon sx={{ color: '#2E7D32' }} />
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1 }}>
              OPERATIONAL INSIGHTS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary' }}>
              Overall Log Book
            </Typography>
          </Box>
        </Box>

        {/* Filter Controls */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <TextField
            placeholder="Search Logs..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            sx={{ bgcolor: '#fff', width: { xs: '100%', sm: 180 }, '& .MuiOutlinedInput-root': { borderRadius: 8, '& fieldset': { borderColor: 'divider' } } }}
          />

          <Box sx={{ width: '1px', height: 28, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />

          {/* Date Input */}
          <Tooltip title="Pick a date for Single Day View">
            <TextField
              type="date"
              value={formattedDateParam}
              onChange={(e) => handleDateChange(e.target.value)}
              onClick={() => setViewMode('day')}
              size="small"
              sx={{ 
                bgcolor: viewMode === 'day' ? 'rgba(46, 125, 50, 0.08)' : '#fff', 
                width: 145,
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 8, 
                  fontWeight: viewMode === 'day' ? 700 : 500,
                  '& fieldset': { borderColor: viewMode === 'day' ? '#2E7D32' : 'divider', borderWidth: viewMode === 'day' ? 2 : 1 } 
                }
              }}
            />
          </Tooltip>

          {/* Month & Year Selects */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <FormControl size="small">
              <Select 
                value={selectedMonth} 
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                sx={{ 
                  borderRadius: 8, 
                  bgcolor: viewMode === 'month' ? 'rgba(245, 158, 11, 0.08)' : '#fff', 
                  minWidth: 80, 
                  fontWeight: viewMode === 'month' ? 700 : 500,
                  '& fieldset': { borderColor: viewMode === 'month' ? '#f59e0b' : 'divider', borderWidth: viewMode === 'month' ? 2 : 1 } 
                }}>
                {months.map((m, i) => <MuiMenuItem key={m} value={i}>{m}</MuiMenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select 
                value={selectedYear} 
                onChange={(e) => handleYearChange(Number(e.target.value))}
                sx={{ 
                  borderRadius: 8, 
                  bgcolor: viewMode === 'month' ? 'rgba(245, 158, 11, 0.08)' : '#fff', 
                  minWidth: 90, 
                  fontWeight: viewMode === 'month' ? 700 : 500,
                  '& fieldset': { borderColor: viewMode === 'month' ? '#f59e0b' : 'divider', borderWidth: viewMode === 'month' ? 2 : 1 } 
                }}>
                {years.map(y => <MuiMenuItem key={y} value={y}>{y}</MuiMenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* Single Dynamic Toggle Button */}
          <Button 
            variant={viewMode === 'month' ? "contained" : "outlined"} 
            onClick={() => setViewMode(prev => prev === 'month' ? 'day' : 'month')}
            startIcon={viewMode === 'month' ? <CalendarTodayIcon sx={{ fontSize: '15px !important' }} /> : <CalendarMonthIcon sx={{ fontSize: '15px !important' }} />}
            sx={{ 
              borderRadius: 8, 
              px: 2.5, 
              py: 0.8, 
              fontWeight: 800, 
              textTransform: 'none', 
              fontSize: '0.82rem',
              color: viewMode === 'month' ? '#fff' : '#f59e0b',
              bgcolor: viewMode === 'month' ? '#f59e0b' : '#fff', 
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              boxShadow: viewMode === 'month' ? '0 3px 10px rgba(245,158,11,0.3)' : 'none',
              '&:hover': { 
                bgcolor: viewMode === 'month' ? '#d97706' : 'rgba(245,158,11,0.08)', 
                borderColor: '#f59e0b',
                borderWidth: 1.5
              }
            }}>
            {viewMode === 'month' ? 'Day View' : 'Full Month'}
          </Button>

          <Box sx={{ width: '1px', height: 28, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />

          {/* Machine ON & OFF manual buttons */}
          <Button
            variant="contained"
            onClick={() => {
              setStartDateTime(formatDateTimeLocal());
              setStartMachineDialogOpen(true);
            }}
            startIcon={<PlayArrowIcon sx={{ fontSize: '18px !important' }} />}
            sx={{
              borderRadius: 8,
              px: 2.2,
              py: 0.8,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: '#FFFFFF',
              boxShadow: '0 3px 12px rgba(22, 163, 74, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
              }
            }}
          >
            Machine ON
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              setEndDateTime(formatDateTimeLocal());
              setEndMachineDialogOpen(true);
            }}
            startIcon={<StopIcon sx={{ fontSize: '18px !important' }} />}
            sx={{
              borderRadius: 8,
              px: 2.2,
              py: 0.8,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              boxShadow: '0 3px 12px rgba(220, 38, 38, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
              }
            }}
          >
            Machine OFF
          </Button>
        </Box>
      </Box>

      {/* Machine Log Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, bgcolor: '#FDFBF7', alignItems: 'center' }}>
          <Typography sx={{ color: 'text.primary', fontWeight: 'bold' }}>Machine Log</Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            {logs?.length || 0} records • {viewMode === 'day' ? `${formatDMY(selectedDate)} (Day View)` : `${months[selectedMonth]} ${selectedYear} (Full Month View)`}
          </Typography>
        </Box>
          <TableContainer>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>DATE</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>STAFF / OPERATOR</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>CLIENT</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>MACHINE</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>PUNCH IN</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>PUNCH OUT</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>QTY</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>EST. TIME</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>ACT. TIME</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>ACTION</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 5 }}>Loading logs...</TableCell></TableRow>
                ) : (!logs || logs.length === 0) ? (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 5 }}>No logs found for this {viewMode === 'day' ? 'date' : 'month'}.</TableCell></TableRow>
                ) : (
                  logs.map((log: any) => (
                    <TableRow key={log.uniqueKey || log.id} sx={{ '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.02)' } }}>
                      <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {formatDMY(new Date(log.entryDate || log.startTime))}
                      </TableCell>
                      {/* STAFF / OPERATOR */}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#1E293B' }}>
                          {log.operator?.name || '—'}
                        </Typography>
                        {log.operator?.staffId && (
                          <Typography sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748B' }}>
                            ID: {log.operator.staffId}
                          </Typography>
                        )}
                      </TableCell>
                      {/* CLIENT — separate bold row */}
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}>
                          {log.project?.clientName ? `${log.project.clientName} (${log.project.name})` : log.project?.name || 'Walk-in'}
                        </Typography>
                        {log.project?.projectId && (
                          <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'primary.main' }}>
                            {log.project.projectId}
                          </Typography>
                        )}
                      </TableCell>
                      {/* MACHINE — separate bold row */}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'nowrap' }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#5c4033', whiteSpace: 'nowrap' }}>
                            {log.machine?.name ? log.machine.name.replace(/Machine\s*/i, '').replace(/M\s*/i, '') : '—'}
                          </Typography>
                          {log.isCarryForwardToday && (
                            <Chip 
                              label="CARRY FORWARD" 
                              size="small" 
                              sx={{ 
                                bgcolor: '#FEF3C7', 
                                color: '#B45309', 
                                border: '1px solid #FCD34D',
                                fontWeight: 800, 
                                fontSize: '0.62rem', 
                                height: 18, 
                                borderRadius: 1 
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 130 }}>
                        <Box sx={{ color: log.isCarryForwardToday ? '#D97706' : '#2E7D32', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                          <ArrowOutwardIcon fontSize="small" /> {formatTime(log.dayStartTime || log.startTime)}
                          {log.isCarryForwardToday && (
                            <Chip 
                              label="CF" 
                              size="small" 
                              sx={{ 
                                bgcolor: '#FEF3C7', 
                                color: '#B45309', 
                                border: '1px solid #FCD34D', 
                                fontWeight: 800, 
                                fontSize: '0.62rem', 
                                height: 18, 
                                borderRadius: 1 
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 140 }}>
                        {log.isDayRunning ? (
                          <Chip label="RUNNING NOW" size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontWeight: 'bold', fontSize: '0.7rem' }} />
                        ) : log.dayEndTime ? (
                          <Box sx={{ color: '#1976D2', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                            <CallReceivedIcon fontSize="small" /> {formatTime(log.dayEndTime)}
                            {log.isMultiDay && (
                              <Chip 
                                label="SPLIT" 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#EDE9FE', 
                                  color: '#6D28D9', 
                                  border: '1px solid #DDD6FE', 
                                  fontWeight: 800, 
                                  fontSize: '0.62rem', 
                                  height: 18, 
                                  borderRadius: 1 
                                }} 
                              />
                            )}
                          </Box>
                        ) : (
                          <Chip label="RUNNING NOW" size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontWeight: 'bold', fontSize: '0.7rem' }} />
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>{log.quantityProduced || 0}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>PCS</Typography>
                      </TableCell>
                      
                      {/* EST. TIME */}
                      <TableCell sx={{ color: 'text.primary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {log.estimatedHours ? `${Number(log.estimatedHours).toFixed(1).replace('.0', '')}h` : '—'}
                      </TableCell>
                      
                      {/* ACT. TIME */}
                      <TableCell sx={{ color: 'text.primary', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 90 }}>
                        {(() => {
                          const durMs = log.dayDurationMs !== undefined ? log.dayDurationMs : Math.max(0, (log.endTime ? new Date(log.endTime).getTime() : Date.now()) - new Date(log.startTime).getTime());
                          const actHrs = Math.floor(durMs / (1000 * 60 * 60));
                          const actMins = Math.floor((durMs % (1000 * 60 * 60)) / (1000 * 60));
                          return `${actHrs}h ${actMins}m`;
                        })()}
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton onClick={() => handleOpenDetails(log)} size="small"
                              sx={{ color: 'primary.main', bgcolor: 'rgba(25,118,210,0.08)', borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(25,118,210,0.18)' } }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setLogToEdit(log); setEditQty(log.quantityProduced || ''); setEditRemarks(log.remarks || ''); setEditDialogOpen(true); }}
                              sx={{ color: '#ed6c02', bgcolor: 'rgba(237,108,2,0.08)', borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(237,108,2,0.18)' } }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => { setLogToDelete(log); setDeleteConfirmOpen(true); }}
                              sx={{ color: 'error.main', bgcolor: 'rgba(211,47,47,0.08)', borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(211,47,47,0.18)' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      {/* Machine Log Evidence Dialog */}
      <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} maxWidth="lg" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#FAFAFA', borderRadius: 4 } } }}>
        {selectedLog && (
          <>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, bgcolor: '#fff' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>Duty Evidence Report</Typography>
                  {isLogCarryForward(selectedLog) && (
                    <Chip label="CARRY FORWARD" size="small" sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {selectedLog.project?.clientName || 'Walk-in'} • {selectedLog.machine?.name} • {formatDMY(new Date(selectedLog.startTime))}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedLog(null)}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 4 }}>
              {isLogCarryForward(selectedLog) && (
                <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#FFFDF5', borderRadius: 2.5, border: '1px solid #FCD34D' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#92400E' }}>
                    🔄 Multi-Day Continuous Run (Carry Forward)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 500 }}>
                    This machine log was started on {formatDMY(new Date(selectedLog.startTime))} and is continuing across midnight.
                  </Typography>
                </Paper>
              )}
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={0} sx={{ bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)', borderRadius: 3, p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                      <Typography sx={{ color: '#2E7D32', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ArrowOutwardIcon fontSize="small" /> PUNCH-IN PROOF
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{formatTime(selectedLog.startTime)}</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3 }}>
                      {['machinePhotoUrl', 'unitPhotoUrl', 'softwarePhotoUrl'].map((key, i) => (
                        <Box 
                          key={key} 
                          onClick={() => selectedLog[key] && setPreviewPhoto(selectedLog[key])}
                          sx={{ 
                            height: 120, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden', position: 'relative',
                            cursor: selectedLog[key] ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            '&:hover': selectedLog[key] ? { transform: 'scale(1.03)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } : {}
                          }}>
                          {selectedLog[key] ? <img src={getOptimizedUrl(selectedLog[key])} alt={key} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled' }}>No Image</Box>}
                          <Chip label={i === 0 ? 'MACHINE' : i === 1 ? 'UNIT' : 'SOFTWARE'} size="small" sx={{ position: 'absolute', top: 5, left: 5, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', height: 20 }} />
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Staff / Operator</Typography>
                      <Typography sx={{ fontWeight: 800, color: '#1E293B' }}>{selectedLog.operator?.name || '—'} {selectedLog.operator?.staffId ? `(${selectedLog.operator.staffId})` : ''}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Client</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{selectedLog.project?.clientName || 'Walk-in'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Machine</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{selectedLog.machine?.name}</Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={0} sx={{ bgcolor: 'rgba(25, 118, 210, 0.05)', border: '1px solid rgba(25, 118, 210, 0.2)', borderRadius: 3, p: 3, opacity: selectedLog.endTime ? 1 : 0.6 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                      <Typography sx={{ color: '#1976D2', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CallReceivedIcon fontSize="small" /> PUNCH-OUT PROOF
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{formatTime(selectedLog.endTime)}</Typography>
                    </Box>
                    {selectedLog.endTime ? (
                      <>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3 }}>
                          {['endMachinePhotoUrl', 'endUnitPhotoUrl', 'endSoftwarePhotoUrl'].map((key, i) => (
                            <Box 
                              key={key} 
                              onClick={() => selectedLog[key] && setPreviewPhoto(selectedLog[key])}
                              sx={{ 
                                height: 120, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden', position: 'relative',
                                cursor: selectedLog[key] ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                '&:hover': selectedLog[key] ? { transform: 'scale(1.03)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } : {}
                              }}>
                              {selectedLog[key] ? <img src={getOptimizedUrl(selectedLog[key])} alt={key} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled' }}>No Image</Box>}
                              <Chip label={i === 0 ? 'MACHINE' : i === 1 ? 'UNIT' : 'SOFTWARE'} size="small" sx={{ position: 'absolute', top: 5, left: 5, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', height: 20 }} />
                            </Box>
                          ))}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Shift Run</Typography>
                          <Typography sx={{ fontWeight: 800 }}>{((new Date(selectedLog.endTime).getTime() - new Date(selectedLog.startTime).getTime()) / (1000 * 60 * 60)).toFixed(2)} hrs</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Quantity Produced</Typography>
                          <Typography sx={{ fontWeight: 800 }}>{selectedLog.quantityProduced || 0} PCS</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', mt: 2 }}>
                          <Typography sx={{ color: '#DC2626', fontWeight: 800, mb: 0.5 }}>Remarks</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#DC2626' }}>{selectedLog.remarks || 'No remarks.'}</Typography>
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ display: 'flex', height: 100, alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ color: '#ed6c02', fontWeight: 'bold' }}>STILL ON DUTY</Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this log? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteSubmit} sx={{ fontWeight: 'bold' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Log</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Quantity Produced" type="number" fullWidth value={editQty} onChange={(e) => setEditQty(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Remarks" fullWidth multiline rows={3} value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleEditSubmit} disabled={!editQty} sx={{ fontWeight: 'bold' }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Preview Fullscreen Dialog */}
      <Dialog 
        open={Boolean(previewPhoto)} 
        onClose={() => setPreviewPhoto(null)} 
        maxWidth="md" 
        fullWidth 
        slotProps={{ 
          backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.85)' } },
          paper: { sx: { bgcolor: '#0F172A', borderRadius: 3, overflow: 'hidden', p: 0, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' } } 
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '13px !important' }} />}
            onClick={() => setPreviewPhoto(null)}
            variant="contained"
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              color: '#FFF',
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.82rem',
              borderRadius: 2,
              px: 2,
              py: 0.7,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
            }}
          >
            Back to Evidence Report
          </Button>

          <IconButton 
            onClick={() => setPreviewPhoto(null)} 
            sx={{ color: '#FFF', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box 
          onClick={() => setPreviewPhoto(null)}
          sx={{ 
            p: 2, 
            textAlign: 'center', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            bgcolor: '#020617', 
            minHeight: 350,
            cursor: 'pointer' 
          }}
        >
          {previewPhoto && (
            <img 
              src={getFullQualityUrl(previewPhoto)} 
              alt="Photo Evidence Preview" 
              style={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: 8, objectFit: 'contain' }} 
            />
          )}
        </Box>
      </Dialog>

      {/* 1. START MACHINE DIALOG (MANUAL ON) */}
      <Dialog
        open={startMachineDialogOpen}
        onClose={() => setStartMachineDialogOpen(false)}
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
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.8, sm: 2.2 }, bgcolor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(22, 163, 74, 0.15)', border: '1px solid rgba(22, 163, 74, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayArrowIcon sx={{ color: '#4ADE80', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF', lineHeight: 1.2 }}>
                Manual Machine ON (Start Machine)
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.76rem' }}>
                Select machine &amp; operator to turn ON
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setStartMachineDialogOpen(false)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                1. Select Machine *
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
                {machines && machines.length > 0 ? (
                  machines.map((m: any) => {
                    const isRunning = activeMachineIds.has(m.id);
                    return (
                      <MuiMenuItem key={m.id} value={m.id} disabled={isRunning} sx={{ py: 0.8, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{m.name} {m.type ? `(${m.type})` : ''}</span>
                        {isRunning && <Chip size="small" label="RUNNING NOW" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#FEF3C7', color: '#B45309' }} />}
                      </MuiMenuItem>
                    );
                  })
                ) : (
                  <MuiMenuItem value="" disabled>No machines configured</MuiMenuItem>
                )}
              </TextField>
            </Box>

            <Box>
              <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                2. Machine ON Date &amp; Time *
              </Typography>
              <TextField
                type="datetime-local"
                fullWidth
                size="small"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                helperText="Set past date &amp; time if machine was turned ON previously"
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

            <Box>
              <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                3. Select Operator / Staff (Optional)
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
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
                <MuiMenuItem value="">Current Logged-in User</MuiMenuItem>
                {staffList?.map((s: any) => (
                  <MuiMenuItem key={s.id} value={s.id}>
                    {s.name} {s.staffId ? `(${s.staffId})` : ''} - {s.designation || s.role || 'Staff'}
                  </MuiMenuItem>
                ))}
              </TextField>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                  Estimated Time (in Hours)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 2.5"
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
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                  Remarks / Notes
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={startRemarks}
                  onChange={(e) => setStartRemarks(e.target.value)}
                  placeholder="Optional job remarks"
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
              </Grid>
            </Grid>

            {/* Photos */}
            <Box sx={{ pt: 0.5 }}>
              <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 0.5 }}>
                Workstation Photos (Optional)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, fontSize: '0.72rem' }}>
                Upload or capture photos of Machine, Stone/Unit, or CNC Software screen.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                <LogPhotoUploadBox
                  label="MACHINE"
                  previewUrl={photos.machine}
                  onImageSelected={(url) => setPhotos(prev => ({ ...prev, machine: url }))}
                  onClear={() => setPhotos(prev => ({ ...prev, machine: '' }))}
                />
                <LogPhotoUploadBox
                  label="STONE / UNIT"
                  previewUrl={photos.unit}
                  onImageSelected={(url) => setPhotos(prev => ({ ...prev, unit: url }))}
                  onClear={() => setPhotos(prev => ({ ...prev, unit: '' }))}
                />
                <LogPhotoUploadBox
                  label="SOFTWARE"
                  previewUrl={photos.software}
                  onImageSelected={(url) => setPhotos(prev => ({ ...prev, software: url }))}
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
            onClick={handleManualClockIn}
            disabled={!selectedMachine || clockingIn}
            startIcon={!clockingIn && <PlayArrowIcon sx={{ fontSize: 18 }} />}
            sx={{
              px: 3,
              py: 0.9,
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 16px -4px rgba(22, 163, 74, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
              }
            }}
          >
            {clockingIn ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                <span>Turning ON...</span>
              </Box>
            ) : (
              'Turn Machine ON'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. END MACHINE DIALOG (MANUAL OFF) */}
      <Dialog
        open={endMachineDialogOpen}
        onClose={() => setEndMachineDialogOpen(false)}
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
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.8, sm: 2.2 }, bgcolor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StopIcon sx={{ color: '#F87171', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF', lineHeight: 1.2 }}>
                Manual Machine OFF (Stop Machine)
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.76rem' }}>
                Turn OFF active machine &amp; log finished production
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setEndMachineDialogOpen(false)} sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                1. Select Active Running Machine *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedEndLogId}
                onChange={(e) => handleSelectEndLog(e.target.value)}
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
                {activeLogsByMachine.length > 0 ? (
                  activeLogsByMachine.map((log: any) => (
                    <MuiMenuItem key={log.id} value={log.id} sx={{ py: 0.8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          {log.machine?.name || 'Factory Machine'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Operator: {log.operator?.name || 'Assigned Staff'} • Started: {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </MuiMenuItem>
                  ))
                ) : (
                  <MuiMenuItem value="" disabled>No machines currently running</MuiMenuItem>
                )}
              </TextField>
            </Box>

            <Box>
              <Typography sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.6 }}>
                2. Machine OFF Date &amp; Time *
              </Typography>
              <TextField
                type="datetime-local"
                fullWidth
                size="small"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                helperText="Set past date &amp; time if machine was stopped previously"
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
                3. Pieces Processed / Quantity *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={endQuantity}
                onChange={(e) => setEndQuantity(e.target.value)}
                placeholder="e.g. 5 or 12"
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
                4. End Remarks / Notes
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                value={endRemarks}
                onChange={(e) => setEndRemarks(e.target.value)}
                placeholder="Notes on pieces completed, machine status, etc."
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

            {/* Photos */}
            <Box sx={{ pt: 0.5 }}>
              <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.82rem', mb: 0.5 }}>
                5. Closing Photos (Optional)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, fontSize: '0.72rem' }}>
                Upload or capture closing photos of machine, finished stones, or software.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                <LogPhotoUploadBox
                  label="END MACHINE"
                  previewUrl={endPhotos.machine}
                  onImageSelected={(url) => setEndPhotos(prev => ({ ...prev, machine: url }))}
                  onClear={() => setEndPhotos(prev => ({ ...prev, machine: '' }))}
                />
                <LogPhotoUploadBox
                  label="END STONE"
                  previewUrl={endPhotos.unit}
                  onImageSelected={(url) => setEndPhotos(prev => ({ ...prev, unit: url }))}
                  onClear={() => setEndPhotos(prev => ({ ...prev, unit: '' }))}
                />
                <LogPhotoUploadBox
                  label="END SOFT."
                  previewUrl={endPhotos.software}
                  onImageSelected={(url) => setEndPhotos(prev => ({ ...prev, software: url }))}
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
            onClick={handleManualClockOut}
            disabled={!selectedEndLogId || !endQuantity || clockingOut}
            startIcon={!clockingOut && <StopIcon sx={{ fontSize: 18 }} />}
            sx={{
              px: 3,
              py: 0.9,
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 16px -4px rgba(220, 38, 38, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
              }
            }}
          >
            {clockingOut ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                <span>Turning OFF...</span>
              </Box>
            ) : (
              'Turn Machine OFF'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LogBook;
