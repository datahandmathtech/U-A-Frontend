import React, { useState } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, IconButton, Chip, Dialog, DialogTitle, DialogContent, 
  Button, Grid, TextField, Tooltip, Snackbar, Alert,
  DialogActions, MenuItem as MuiMenuItem, Select, FormControl, InputAdornment
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
import { 
  useGetMachineLogsQuery, 
  useEditMachineLogMutation,
  useDeleteMachineLogMutation
} from '../store/apiSlice';
import { getOptimizedUrl, getFullQualityUrl } from '../utils/cloudinary';

const LogBook = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<any>(null);

  const formattedDateParam = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  const { data: allLogs, isLoading } = useGetMachineLogsQuery();
  const [editMachineLog] = useEditMachineLogMutation();
  const [deleteMachineLog] = useDeleteMachineLogMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState<any>(null);
  const [editQty, setEditQty] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  const handleDeleteSubmit = async () => {
    try {
      await deleteMachineLog(logToDelete.id).unwrap();
      setSnackbar({ open: true, message: 'Log deleted successfully.', severity: 'success' });
      setDeleteConfirmOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete log.', severity: 'error' });
    }
  };

  const handleEditSubmit = async () => {
    try {
      await editMachineLog({ id: logToEdit.id, data: { quantityProduced: editQty, remarks: editRemarks } }).unwrap();
      setSnackbar({ open: true, message: 'Log updated successfully.', severity: 'success' });
      setEditDialogOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update log.', severity: 'error' });
    }
  };

  // Machine Logs filtering
  const logs = React.useMemo(() => {
    if (!allLogs) return [];
    let filtered = allLogs;
    if (viewMode === 'day') {
      const targetDate = formattedDateParam;
      filtered = filtered.filter((log: any) => {
        const logDate = new Date(log.startTime);
        const logFormatted = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
        return logFormatted === targetDate;
      });
    } else {
      filtered = filtered.filter((log: any) => {
        const logDate = new Date(log.startTime);
        return logDate.getMonth() === selectedMonth && logDate.getFullYear() === selectedYear;
      });
    }
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter((log: any) => 
        (log.project?.clientName || '').toLowerCase().includes(lowerQ) ||
        (log.machine?.name || '').toLowerCase().includes(lowerQ) ||
        (log.project?.name || '').toLowerCase().includes(lowerQ) ||
        (log.status || '').toLowerCase().includes(lowerQ)
      );
    }
    return filtered;
  }, [allLogs, viewMode, selectedDate, selectedMonth, selectedYear, searchQuery, formattedDateParam]);

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
                    <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.02)' } }}>
                      <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {formatDMY(new Date(log.startTime))}
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
                          {log.isCarryForward && (
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
                        <Typography sx={{ color: log.isCarryForward ? '#D97706' : '#2E7D32', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
                          <ArrowOutwardIcon fontSize="small" /> {formatTime(log.startTime)}
                          {log.isCarryForward && (
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
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 140 }}>
                        {log.endTime ? (
                          <Typography sx={{ color: '#1976D2', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
                            <CallReceivedIcon fontSize="small" /> {formatTime(log.endTime)}
                            {log.remarks?.includes('Auto-closed') && (
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
                          </Typography>
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
                          const start = new Date(log.startTime).getTime();
                          const end = (log.endTime ? new Date(log.endTime) : new Date()).getTime();
                          const durationMs = Math.max(0, end - start);
                          const actHrs = Math.floor(durationMs / (1000 * 60 * 60));
                          const actMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                          return `${actHrs}h ${actMins}m`;
                        })()}
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton onClick={() => setSelectedLog(log)} size="small"
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
                  {selectedLog.isCarryForward && (
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
              {selectedLog.isCarryForward && (
                <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#FFFDF5', borderRadius: 2.5, border: '1px solid #FCD34D' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#92400E' }}>
                    🔄 Multi-Day Continuous Run (Carry Forward)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 500 }}>
                    This machine log was carried forward from the previous day across midnight (12:00 AM).
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

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LogBook;
