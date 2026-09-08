import React, { useState } from 'react';
import { 
  Box, Typography, Grid, Paper, IconButton, Chip, Dialog, DialogContent, 
  Avatar, CircularProgress, DialogTitle, TextField, MenuItem, Button, Tooltip 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GroupsIcon from '@mui/icons-material/Groups';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import { useGetLiveFeedQuery, useGetProjectsQuery, useApproveMachineLogMutation, useRejectMachineLogMutation, useGetMachinesQuery, useGetProjectByIdQuery } from '../store/apiSlice';
import { getOptimizedUrl, getFullQualityUrl } from '../utils/cloudinary';

const formatYMD = (date: Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDMY = (date: Date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const LiveFeed: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const handlePrevDay = () => setSelectedDate(prev => new Date(prev.getTime() - 24*60*60*1000));
  const handleNextDay = () => setSelectedDate(prev => new Date(prev.getTime() + 24*60*60*1000));
  const handleJumpToday = () => setSelectedDate(new Date());

  const { data: machines, isLoading: machinesLoading } = useGetMachinesQuery();
  const { data: liveFeedData, isLoading: liveFeedLoading, refetch } = useGetLiveFeedQuery(formatYMD(selectedDate), {
    pollingInterval: 20000,
    skipPollingIfUnfocused: true
  });
  const { data: projects } = useGetProjectsQuery();
  const [approveLog, { isLoading: isApproving }] = useApproveMachineLogMutation();
  const [rejectLog, { isLoading: isRejecting }] = useRejectMachineLogMutation();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const { data: fullProject, isLoading: isProjectLoading } = useGetProjectByIdQuery(selectedProject, { skip: !selectedProject });
  const currentProject = projects?.find((p: any) => p.id === selectedProject);
  const projectProducts = fullProject?.quotations?.[0]?.products || fullProject?.products || currentProject?.products || [];

  if (machinesLoading || liveFeedLoading) {
    return (
      <Box sx={{ display: 'flex', height: '60vh', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#C89F5A' }} />
      </Box>
    );
  }

  const activeLogs = liveFeedData?.filter((log: any) => log.status === 'active') || [];
  const pendingLogs = liveFeedData?.filter((log: any) => log.approvalStatus === 'pending') || [];
  const completedLogs = liveFeedData?.filter((log: any) => log.status === 'completed') || [];
  const activeStaffCount = new Set(activeLogs.filter((l:any) => l.operatorId).map((log: any) => log.operatorId)).size;
  const activeMachinesCount = new Set(activeLogs.filter((l:any) => l.machineId).map((log: any) => log.machineId)).size;
  const isToday = formatDMY(selectedDate) === formatDMY(new Date());

  return (
    <Box sx={{ width: '100%', px: { xs: 0, sm: 0.5, md: 1 } }}>
      
      {/* 1. EXECUTIVE HEADER & CONTROLS */}
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              Factory Live Feed
            </Typography>
            <Chip 
              icon={<RadioButtonCheckedRoundedIcon sx={{ fontSize: '13px !important', color: '#10B981 !important' }} />}
              label="Live Monitoring" 
              size="small" 
              sx={{ 
                bgcolor: '#ECFDF5', 
                color: '#059669', 
                border: '1px solid #A7F3D0', 
                fontWeight: 800, 
                fontSize: '0.72rem',
                borderRadius: 1.5 
              }} 
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
            Real-time machine telemetry, active operator duty shifts, and camera verification feeds.
          </Typography>
        </Box>
        
        {/* Luxury Date Stepper */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {!isToday && (
            <Button
              size="small"
              startIcon={<TodayRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={handleJumpToday}
              sx={{
                bgcolor: '#FFFDF5',
                color: '#B38B36',
                border: '1px solid #C89F5A',
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '0.8rem',
                px: 1.5,
                py: 0.6,
                '&:hover': { bgcolor: '#FFF4E5' }
              }}
            >
              Today
            </Button>
          )}

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: '#0F172A', 
            color: '#FFF', 
            borderRadius: 3, 
            p: 0.5,
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)'
          }}>
            <IconButton onClick={handlePrevDay} sx={{ color: '#FFF', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' }, borderRadius: 2.5, width: 34, height: 34 }}>
              <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
            </IconButton>
            
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, cursor: 'pointer' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: 0.5 }}>
                {formatDMY(selectedDate)}
              </Typography>
              <CalendarTodayIcon sx={{ fontSize: 15, color: '#C89F5A' }} />
              
              <input 
                type="date" 
                value={formatYMD(selectedDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
            </Box>

            <IconButton onClick={handleNextDay} sx={{ color: '#FFF', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' }, borderRadius: 2.5, width: 34, height: 34 }}>
              <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* 2. KPI SUMMARY METRIC CARDS */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 44, height: 44 }}>
              <PrecisionManufacturingIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Active Machines
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#059669', mt: 0.2 }}>
                {activeMachinesCount} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>/ {machines?.length || 0}</span>
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', width: 44, height: 44 }}>
              <GroupsIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Operators On Duty
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.2 }}>
                {activeStaffCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#FFFDF5', color: '#B38B36', width: 44, height: 44 }}>
              <AccessTimeIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Completed Shift Logs
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.2 }}>
                {completedLogs.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. MACHINE TELEMETRY GRID */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
          Machine Status Overview ({formatDMY(selectedDate)})
        </Typography>
        <Chip 
          label={`${machines?.length || 0} Total Units`} 
          size="small" 
          sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '0.75rem' }} 
        />
      </Box>

      <Grid container spacing={2.5}>
        {(!machines || machines.length === 0) ? (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3.5, bgcolor: '#FFFFFF', border: '1px dashed #CBD5E1' }}>
              <PrecisionManufacturingIcon sx={{ fontSize: 44, color: '#94A3B8', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
                No machines found in factory
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                Add machines under Machine Master to start tracking live operations.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          [...machines].sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((machine: any) => {
            const log = liveFeedData?.find((l: any) => l.machineId === machine.id);
            const isCompleted = log?.status === 'completed';
            const isPending = log?.approvalStatus === 'pending';
            const isActive = log?.status === 'active';
            
            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={machine.id}>
                <Paper 
                  onClick={() => {
                    if (log) {
                      setSelectedLog(log);
                      if (log.projectId) setSelectedProject(log.projectId);
                      else setSelectedProject('');
                      setSelectedProduct(null);
                    }
                  }}
                  elevation={0}
                  sx={{ 
                    p: 2.5, 
                    borderRadius: 3.5, 
                    border: '1px solid',
                    borderColor: !log ? '#E2E8F0' : (isCompleted ? '#CBD5E1' : (isPending ? '#FDE68A' : '#86EFAC')),
                    bgcolor: !log ? '#FAFAFA' : '#FFFFFF',
                    cursor: log ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: log ? '0 2px 10px rgba(0,0,0,0.03)' : 'none',
                    '&:hover': log ? { 
                      transform: 'translateY(-2px)', 
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      borderColor: '#C89F5A'
                    } : {}
                  }}
                >
                  {/* Left Edge Accent */}
                  <Box sx={{ 
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4.5, 
                    bgcolor: !log ? '#CBD5E1' : (isCompleted ? '#0284C7' : (isPending ? '#D97706' : '#10B981'))
                  }} />

                  {/* Header Row */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, pl: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: !log ? '#F1F5F9' : (isCompleted ? '#EFF6FF' : (isPending ? '#FFFBEB' : '#ECFDF5')), 
                        color: !log ? '#94A3B8' : (isCompleted ? '#0284C7' : (isPending ? '#D97706' : '#059669')), 
                        width: 44, height: 44 
                      }}>
                        <PrecisionManufacturingIcon sx={{ fontSize: 22 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: !log ? '#64748B' : '#0F172A', fontSize: '0.95rem' }}>
                          {machine.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                          {log?.operator?.name ? `Operator: ${log.operator.name}` : (machine.modelNumber || 'Factory Unit')}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip 
                      label={!log ? 'IDLE' : (isCompleted ? 'COMPLETED' : (isPending ? 'PENDING APPROVAL' : 'ACTIVE / RUNNING'))} 
                      size="small" 
                      sx={{ 
                        fontWeight: 800, 
                        fontSize: '0.7rem',
                        borderRadius: 1.5,
                        bgcolor: !log ? '#F1F5F9' : (isCompleted ? '#EFF6FF' : (isPending ? '#FFFBEB' : '#ECFDF5')),
                        color: !log ? '#64748B' : (isCompleted ? '#0284C7' : (isPending ? '#B45309' : '#059669')),
                        border: '1px solid',
                        borderColor: !log ? '#E2E8F0' : (isCompleted ? '#BAE6FD' : (isPending ? '#FDE68A' : '#A7F3D0'))
                      }} 
                    />
                  </Box>

                  {/* Body Details */}
                  <Box sx={{ pl: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 2.5, pt: 1.5, borderTop: '1px solid #F1F5F9' }}>
                    <Box>
                      {log?.project ? (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <LayersRoundedIcon sx={{ fontSize: 14, color: '#B38B36' }} />
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>
                              {log.project.projectId}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, display: 'block', mt: 0.2 }}>
                            {log.productName || log.project.name}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                          No active assignment
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      {log ? (
                        <>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', display: 'block' }}>
                            Start: {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          {isCompleted && log.endTime && (
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                              End: {new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#CBD5E1', fontWeight: 600 }}>Standby</Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* 4. DETAILED MODAL */}
      <Dialog 
        open={Boolean(selectedLog)} 
        onClose={() => setSelectedLog(null)} 
        maxWidth="md" 
        fullWidth 
        slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}
      >
        {selectedLog && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', pb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#0F172A', color: '#C89F5A', width: 44, height: 44, fontWeight: 800 }}>
                  {selectedLog.operator?.name?.charAt(0) || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    {selectedLog.operator?.name || 'Operator Shift Details'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                    Machine: {selectedLog.machine?.name} • Staff ID: {selectedLog.operator?.staffId || '-'}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setSelectedLog(null)} sx={{ color: '#64748B' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 1 }}>
              <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
                
                <Grid container spacing={2.5}>
                  {/* PUNCH IN PANEL */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: 3, height: '100%', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.75, letterSpacing: 0.5, mb: 1.5 }}>
                        🟢 SHIFT START (PUNCH IN)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: '#0F172A' }}>
                        {new Date(selectedLog.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      
                      {selectedLog.approvalStatus === 'pending' ? (
                        <Box sx={{ mb: 3, mt: 2 }}>
                          <TextField 
                            select
                            label="Assign Project / Work Order" 
                            fullWidth 
                            size="small"
                            value={selectedProject} 
                            onChange={(e) => {
                              setSelectedProject(e.target.value);
                              setSelectedProduct(null);
                            }} 
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, mb: selectedProject ? 1.5 : 0 }}
                          >
                            {projects?.filter((p: any) => ['shop_drawing', 'work_order', 'material_planning', 'production'].includes(p.status)).map((p: any) => (
                              <MenuItem key={p.id} value={p.id}>{p.projectId} - {p.name}</MenuItem>
                            ))}
                          </TextField>
                          
                          {selectedProject && (
                            <TextField 
                              select
                              label="Category / Product Name" 
                              fullWidth 
                              size="small"
                              value={selectedProduct?.id || ''} 
                              onChange={(e) => {
                                const prod = projectProducts.find((p: any) => p.id === e.target.value);
                                setSelectedProduct(prod || null);
                              }} 
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                              {isProjectLoading ? (
                                <MenuItem disabled value="">Loading Products...</MenuItem>
                              ) : projectProducts.length === 0 ? (
                                <MenuItem disabled value="">No Products Found in this Project</MenuItem>
                              ) : (
                                projectProducts.map((p: any) => (
                                  <MenuItem key={p.id} value={p.id}>{p.name} {p.category ? `(${p.category})` : ''}</MenuItem>
                                ))
                              )}
                            </TextField>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            Project: {selectedLog.project?.name || selectedLog.project?.projectId || 'N/A'}
                          </Typography>
                          {selectedLog.productName && (
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block' }}>
                              Product: {selectedLog.productName}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* 3 Photos side-by-side */}
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        {[
                          { url: selectedLog.machinePhotoUrl, label: 'MACHINE' },
                          { url: selectedLog.unitPhotoUrl, label: 'STONE/UNIT' },
                          { url: selectedLog.softwarePhotoUrl, label: 'SOFTWARE' }
                        ].map((photo, i) => (
                          <Box key={i} sx={{ textAlign: 'center' }}>
                            <Box 
                              onClick={() => photo.url && setPreviewPhoto(photo.url)}
                              sx={{ 
                                width: 72, height: 72, borderRadius: 2.5, mb: 0.75, overflow: 'hidden', 
                                bgcolor: '#F1F5F9', border: '1px solid #E2E8F0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: photo.url ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                '&:hover': photo.url ? { transform: 'scale(1.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}
                              }}>
                              {photo.url ? (
                                <img src={getOptimizedUrl(photo.url)} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>No Photo</Typography>
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.65rem', letterSpacing: 0.5 }}>
                              {photo.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* PUNCH OUT PANEL */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: 3, height: '100%', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.75, letterSpacing: 0.5, mb: 1.5 }}>
                        🛑 SHIFT END (PUNCH OUT)
                      </Typography>
                      
                      {selectedLog.status === 'completed' ? (
                        <>
                          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: '#0F172A' }}>
                            {new Date(selectedLog.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, fontStyle: 'italic', color: '#475569', border: '1px solid #E2E8F0' }}>
                            "{selectedLog.remarks || 'No remarks provided'}"
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            {[
                              { url: selectedLog.endMachinePhotoUrl, label: 'END MACHINE' },
                              { url: selectedLog.endUnitPhotoUrl, label: 'END STONE' },
                              { url: selectedLog.endSoftwarePhotoUrl, label: 'END SOFT.' }
                            ].map((photo, i) => (
                              <Box key={i} sx={{ textAlign: 'center' }}>
                                <Box 
                                  onClick={() => photo.url && setPreviewPhoto(photo.url)}
                                  sx={{ 
                                    width: 72, height: 72, borderRadius: 2.5, mb: 0.75, overflow: 'hidden', 
                                    bgcolor: '#F1F5F9', border: '1px solid #E2E8F0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: photo.url ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    '&:hover': photo.url ? { transform: 'scale(1.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}
                                  }}>
                                  {photo.url ? (
                                    <img src={getOptimizedUrl(photo.url)} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>No Photo</Typography>
                                  )}
                                </Box>
                                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.65rem', letterSpacing: 0.5 }}>
                                  {photo.label}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                          {selectedLog.approvalStatus === 'pending' ? (
                            <>
                              <Button 
                                variant="contained" 
                                fullWidth 
                                disabled={!selectedProject || !selectedProduct || isApproving}
                                startIcon={isApproving ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                                onClick={async () => {
                                  await approveLog({ 
                                    id: selectedLog.id, 
                                    projectId: selectedProject,
                                    productId: selectedProduct?.id,
                                    productName: selectedProduct?.name || selectedProduct?.category
                                  });
                                  refetch();
                                  setSelectedLog(null);
                                  setSelectedProject('');
                                  setSelectedProduct(null);
                                }}
                                sx={{ 
                                  py: 1.2, 
                                  borderRadius: 2.5, 
                                  fontWeight: 800, 
                                  textTransform: 'none',
                                  bgcolor: '#059669',
                                  color: '#FFFFFF',
                                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                                  '&:hover': { bgcolor: '#047857' }
                                }}
                              >
                                Approve & Assign Shift
                              </Button>
                              <Button 
                                variant="outlined" 
                                color="error" 
                                fullWidth 
                                disabled={isRejecting}
                                startIcon={isRejecting ? <CircularProgress size={18} color="inherit" /> : <CancelIcon />}
                                onClick={async () => {
                                  await rejectLog(selectedLog.id);
                                  refetch();
                                  setSelectedLog(null);
                                }}
                                sx={{ py: 1.2, borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
                              >
                                Reject Shift
                              </Button>
                            </>
                          ) : (
                            <Box sx={{ textAlign: 'center', p: 3 }}>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#10B981', mx: 'auto', mb: 1 }} />
                              <Typography variant="body2" sx={{ color: '#059669', fontWeight: 800, letterSpacing: 0.5 }}>
                                MACHINE CURRENTLY IN OPERATION
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>

              </Paper>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* 5. PHOTO PREVIEW FULLSCREEN DIALOG */}
      <Dialog 
        open={Boolean(previewPhoto)} 
        onClose={() => setPreviewPhoto(null)} 
        maxWidth="lg" 
        fullWidth 
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none' } } }}
      >
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <IconButton 
            onClick={() => setPreviewPhoto(null)} 
            sx={{ position: 'absolute', top: -40, right: -40, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
          >
            <CloseIcon fontSize="large" />
          </IconButton>
          {previewPhoto && (
            <img 
              src={getFullQualityUrl(previewPhoto)} 
              alt="Preview" 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }} 
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default LiveFeed;
