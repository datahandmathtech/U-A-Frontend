import React, { useState, useMemo } from 'react';
import { 
  Box, Typography, Grid, Paper, IconButton, Chip, Dialog, DialogContent, 
  Avatar, CircularProgress, DialogTitle, TextField, MenuItem, Button, Tooltip, Skeleton 
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
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
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

const formatTime = (dateStr: string | Date | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getDayRunDurationStr = (startTime: string | Date, endTime: string | Date | null, targetDate: Date) => {
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const logStart = new Date(startTime).getTime();
  const isTargetToday = formatDMY(targetDate) === formatDMY(new Date());
  const logEnd = endTime ? new Date(endTime).getTime() : (isTargetToday ? new Date().getTime() : dayEnd.getTime());

  // Clamp to the target day window
  const effectiveStart = Math.max(logStart, dayStart.getTime());
  const effectiveEnd = Math.min(logEnd, dayEnd.getTime());

  if (effectiveEnd <= effectiveStart) return '0h 00m';

  const diffMs = effectiveEnd - effectiveStart;
  if (diffMs >= 23 * 3600000 + 59 * 60000) return '24h 00m';

  const hrs = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hrs}h ${mins}m`;
};

const getTotalContinuousDurationStr = (startTime: string | Date | null, endTime: string | Date | null) => {
  if (!startTime) return '0h 00m';
  const startMs = new Date(startTime).getTime();
  const endMs = endTime ? new Date(endTime).getTime() : Date.now();
  const diffMs = Math.max(0, endMs - startMs);

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};

const LiveFeed: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<'running' | 'idle' | 'carry_forward' | 'completed'>('running');
  
  const handlePrevDay = () => {
    setSelectedDate(prev => new Date(prev.getTime() - 24*60*60*1000));
    setFilterType('running');
  };
  const handleNextDay = () => {
    setSelectedDate(prev => new Date(prev.getTime() + 24*60*60*1000));
    setFilterType('running');
  };
  const handleJumpToday = () => {
    setSelectedDate(new Date());
    setFilterType('running');
  };

  const dayStart = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const dayEnd = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [selectedDate]);

  const isToday = useMemo(() => formatDMY(selectedDate) === formatDMY(new Date()), [selectedDate]);

  const { data: liveFeedData, isLoading: liveFeedLoading, isFetching: liveFeedFetching, refetch } = useGetLiveFeedQuery(formatYMD(selectedDate), {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true
  });
  const { data: allMachinesList } = useGetMachinesQuery();
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

  const rawLogs = useMemo(() => liveFeedData || [], [liveFeedData]);

  // 1. RUNNING NOW (Current Date machines only):
  // - On Today: machines currently active right now that STARTED TODAY (not carry forward)
  const activeLogs = useMemo(() => {
    if (!isToday) return [];
    return rawLogs.filter((log: any) => {
      if (log.status !== 'active') return false;
      const startMs = new Date(log.startTime).getTime();
      const isCF = Boolean(log.isCarryForward) || Boolean(log.parentLogId) || startMs < dayStart.getTime();
      return !isCF && startMs >= dayStart.getTime();
    });
  }, [rawLogs, isToday, dayStart]);

  // 2. CARRY FORWARD (Started on previous dates, currently still running):
  const carryForwardLogs = useMemo(() => {
    return rawLogs.filter((log: any) => {
      if (log.status !== 'active') return false;
      const startMs = new Date(log.startTime).getTime();
      const isCF = Boolean(log.isCarryForward) || Boolean(log.parentLogId) || startMs < dayStart.getTime();
      return isCF;
    });
  }, [rawLogs, dayStart]);

  // 3. COMPLETED SHIFTS (Day-wise):
  // Shifts that were stopped/clocked-out (excludes auto midnight splits)
  const completedLogs = useMemo(() => {
    return rawLogs.filter((log: any) => {
      if (log.status !== 'completed') return false;
      if (!log.endTime) return false;
      const endMs = new Date(log.endTime).getTime();
      const isClosedToday = endMs >= dayStart.getTime() && endMs <= dayEnd.getTime();
      return isClosedToday && !log.remarks?.includes('Auto-closed at 12:00 AM midnight');
    });
  }, [rawLogs, dayStart, dayEnd]);

  // Operated machine IDs on this selected date
  const operatedMachineIds = useMemo(() => {
    return new Set(
      rawLogs
        .filter((l: any) => !l.remarks?.includes('Auto-closed at 12:00 AM midnight'))
        .map((l: any) => l.machineId)
        .filter(Boolean)
    );
  }, [rawLogs]);

  // 4. IDLE MACHINES (Day-wise):
  // Registered machines that did NOT run at all on this selected date
  const idleMachines = useMemo(() => {
    if (!allMachinesList) return [];
    return allMachinesList.filter((m: any) => !operatedMachineIds.has(m.id) && !operatedMachineIds.has(m._id));
  }, [allMachinesList, operatedMachineIds]);

  const displayedLogs = useMemo(() => {
    if (filterType === 'running') return activeLogs;
    if (filterType === 'carry_forward') return carryForwardLogs;
    if (filterType === 'completed') return completedLogs;
    return [];
  }, [filterType, activeLogs, carryForwardLogs, completedLogs]);

  const showIdleCards = filterType === 'idle';

  return (
    <Box sx={{ width: '100%', px: { xs: 0, sm: 0.5, md: 1 } }}>
      
      {/* 1. EXECUTIVE HEADER & CONTROLS */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              Factory Live Feed
            </Typography>
            <Chip 
              icon={<RadioButtonCheckedRoundedIcon sx={{ fontSize: '13px !important', color: '#10B981 !important' }} />}
              label={liveFeedFetching ? "Refreshing..." : (isToday ? "Active Monitoring" : "Archive View")} 
              size="small" 
              sx={{ 
                bgcolor: isToday ? '#ECFDF5' : '#F1F5F9', 
                color: isToday ? '#059669' : '#475569', 
                border: '1px solid',
                borderColor: isToday ? '#A7F3D0' : '#CBD5E1', 
                fontWeight: 800, 
                fontSize: '0.72rem',
                borderRadius: 1.5 
              }} 
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
            Live running machines, multi-day carry-forward jobs, idle machines, and operator shift proofs.
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
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(y, m - 1, d));
                    setFilterType('all');
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

      {/* 2. REFINED FILTER & STATUS TABS BAR */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { 
            key: 'running', 
            label: 'Running Now', 
            count: activeLogs.length,
            icon: <RadioButtonCheckedRoundedIcon sx={{ fontSize: 15 }} />,
            activeBg: '#ECFDF5',
            activeColor: '#065F46',
            activeBorder: '#10B981',
            badgeBg: '#10B981',
            badgeColor: '#FFFFFF',
            iconColor: '#059669'
          },
          { 
            key: 'carry_forward', 
            label: 'Carry Forward', 
            count: carryForwardLogs.length,
            icon: <AutorenewRoundedIcon sx={{ fontSize: 16 }} />,
            activeBg: '#FFFBEB',
            activeColor: '#92400E',
            activeBorder: '#F59E0B',
            badgeBg: '#F59E0B',
            badgeColor: '#FFFFFF',
            iconColor: '#D97706'
          },
          { 
            key: 'completed', 
            label: 'Completed Shifts', 
            count: completedLogs.length,
            icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
            activeBg: '#EFF6FF',
            activeColor: '#075985',
            activeBorder: '#0284C7',
            badgeBg: '#0284C7',
            badgeColor: '#FFFFFF',
            iconColor: '#0284C7'
          },
          { 
            key: 'idle', 
            label: 'Idle Machines', 
            count: idleMachines.length,
            icon: <PowerSettingsNewIcon sx={{ fontSize: 16 }} />,
            activeBg: '#F1F5F9',
            activeColor: '#334155',
            activeBorder: '#64748B',
            badgeBg: '#64748B',
            badgeColor: '#FFFFFF',
            iconColor: '#64748B'
          },
        ].map((tab) => {
          const isSelected = filterType === tab.key;
          return (
            <Paper
              key={tab.key}
              elevation={0}
              onClick={() => setFilterType(tab.key as any)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                px: { xs: 1.5, sm: 2 },
                py: 1.2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: isSelected ? tab.activeBg : '#FFFFFF',
                color: isSelected ? tab.activeColor : '#475569',
                border: '1.5px solid',
                borderColor: isSelected ? tab.activeBorder : '#E2E8F0',
                boxShadow: isSelected ? '0 4px 14px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.02)',
                '&:hover': {
                  borderColor: isSelected ? tab.activeBorder : '#CBD5E1',
                  bgcolor: isSelected ? tab.activeBg : '#F8FAFC',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <Box sx={{ color: isSelected ? (tab.key === 'all' ? '#C89F5A' : tab.iconColor) : tab.iconColor, display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.8rem', sm: '0.88rem' }, letterSpacing: '-0.2px' }}>
                {tab.label}
              </Typography>
              <Box
                sx={{
                  bgcolor: isSelected ? tab.badgeBg : '#F1F5F9',
                  color: isSelected ? tab.badgeColor : '#64748B',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  px: 1,
                  py: 0.25,
                  borderRadius: 2,
                  minWidth: 20,
                  textAlign: 'center'
                }}
              >
                {liveFeedLoading ? '...' : tab.count}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* 3. MACHINE TELEMETRY GRID */}
      <Grid container spacing={2.5}>
        {liveFeedLoading ? (
          [1, 2, 3, 4, 5, 6].map((k) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={k}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3.5, border: '1px solid #E2E8F0', bgcolor: '#FAFAFA' }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="40%" height={18} />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
              </Paper>
            </Grid>
          ))
        ) : (displayedLogs.length === 0 && (!showIdleCards || idleMachines.length === 0)) ? (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3.5, bgcolor: '#FFFFFF', border: '1px dashed #CBD5E1' }}>
              <PrecisionManufacturingIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
                No machines found for this filter on {formatDMY(selectedDate)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, maxWidth: 500, mx: 'auto' }}>
                Try selecting "All Machines" or another date to view machine status.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          <>
            {/* 3A. OPERATED / RUNNING MACHINE LOGS */}
            {displayedLogs.map((log: any) => {
              const isCompleted = log.status === 'completed';
              const isPending = log.approvalStatus === 'pending';
              const isActive = log.status === 'active';
              const logStartMs = new Date(log.startTime).getTime();
              const isCarryForward = Boolean(log.isCarryForward) || Boolean(log.parentLogId) || logStartMs < dayStart.getTime();

              const durationLabel = isCarryForward ? 'TOTAL RUN' : (isCompleted ? 'TOTAL RUN' : 'TODAY RUN');
              const durationText = isCarryForward
                ? getTotalContinuousDurationStr(log.initialStartTime || log.startTime, null)
                : (isCompleted
                    ? getTotalContinuousDurationStr(log.initialStartTime || log.startTime, log.endTime)
                    : getDayRunDurationStr(log.startTime, log.endTime, selectedDate));

              const firstOnDateStr = formatDMY(log.initialStartTime || log.startTime);
              const firstOnTimeStr = formatTime(log.initialStartTime || log.startTime);
              const offDateStr = log.endTime ? formatDMY(log.endTime) : '';
              const offTimeStr = log.endTime ? formatTime(log.endTime) : '';
              const operatorName = log.operator?.name || log.initialOperator?.name || 'Assigned Staff';
              const machineName = log.machine?.name || 'Factory Machine';
              
              return (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={log.id}>
                  <Paper 
                    onClick={() => {
                      setSelectedLog(log);
                      if (log.projectId) setSelectedProject(log.projectId);
                      else setSelectedProject('');
                      setSelectedProduct(null);
                    }}
                    elevation={0}
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 3.5, 
                      border: '1px solid',
                      borderColor: isCarryForward ? '#FCD34D' : (isCompleted ? '#CBD5E1' : (isPending ? '#FDE68A' : '#86EFAC')),
                      bgcolor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: isActive ? '0 4px 16px rgba(16, 185, 129, 0.08)' : '0 2px 10px rgba(0,0,0,0.03)',
                      '&:hover': { 
                        transform: 'translateY(-3px)', 
                        boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
                        borderColor: '#C89F5A'
                      }
                    }}
                  >
                    {/* Left Edge Accent */}
                    <Box sx={{ 
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, 
                      bgcolor: isCarryForward ? '#D97706' : (isCompleted ? '#0284C7' : (isPending ? '#EA580C' : '#10B981'))
                    }} />

                    {/* Header Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, pl: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Avatar sx={{ 
                          bgcolor: isCarryForward ? '#FEF3C7' : (isCompleted ? '#EFF6FF' : (isPending ? '#FFFBEB' : '#ECFDF5')), 
                          color: isCarryForward ? '#B45309' : (isCompleted ? '#0284C7' : (isPending ? '#D97706' : '#059669')), 
                          width: 44, height: 44 
                        }}>
                          <PrecisionManufacturingIcon sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                            {machineName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                            {log.machine?.type || 'Factory Unit'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        {isCarryForward ? (
                          <Chip 
                            icon={<AutorenewRoundedIcon sx={{ fontSize: '13px !important', color: '#B45309 !important' }} />}
                            label="CARRY FORWARD" 
                            size="small" 
                            sx={{ 
                              fontWeight: 800, 
                              fontSize: '0.66rem',
                              borderRadius: 1.5,
                              bgcolor: '#FEF3C7',
                              color: '#B45309',
                              border: '1px solid #FCD34D',
                              height: 22
                            }} 
                          />
                        ) : (
                          <Chip 
                            label={isCompleted ? 'COMPLETED' : (isPending ? 'PENDING APPROVAL' : 'RUNNING NOW')} 
                            size="small" 
                            sx={{ 
                              fontWeight: 800, 
                              fontSize: '0.68rem',
                              borderRadius: 1.5,
                              bgcolor: isCompleted ? '#EFF6FF' : (isPending ? '#FFFBEB' : '#ECFDF5'),
                              color: isCompleted ? '#0284C7' : (isPending ? '#B45309' : '#059669'),
                              border: '1px solid',
                              borderColor: isCompleted ? '#BAE6FD' : (isPending ? '#FDE68A' : '#A7F3D0'),
                              height: 22
                            }} 
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Project & Product Row */}
                    <Box sx={{ pl: 1, py: 1.25, my: 1, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LayersRoundedIcon sx={{ fontSize: 15, color: '#B38B36' }} />
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem' }}>
                            {log.project?.projectId || log.project?.name || 'General Production'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {log.productName || log.project?.clientName || 'Standard Job Work'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', pr: 1 }}>
                        <Typography variant="caption" sx={{ color: isCarryForward ? '#B45309' : '#94A3B8', fontWeight: 800, fontSize: '0.68rem', display: 'block', textTransform: 'uppercase' }}>
                          {durationLabel}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: isCarryForward ? '#92400E' : '#0F172A', fontSize: '0.88rem' }}>
                          {durationText}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Shift Times & Proof Photos Row */}
                    <Box sx={{ pl: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                      <Box sx={{ flex: 1, pr: 1 }}>
                        {isCarryForward ? (
                          <>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#B45309', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.74rem' }}>
                              🟡 FIRST ON: {firstOnDateStr} ({firstOnTimeStr})
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mt: 0.3, fontSize: '0.73rem' }}>
                              👤 OPERATOR: {operatorName}
                            </Typography>
                          </>
                        ) : isCompleted ? (
                          <>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.72rem' }}>
                              🟢 ON: {firstOnDateStr} ({firstOnTimeStr})
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.72rem', mt: 0.2 }}>
                              🔴 OFF: {offDateStr} ({offTimeStr})
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mt: 0.2, fontSize: '0.72rem' }}>
                              👤 CLOSED BY: {operatorName}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.74rem' }}>
                              🟢 ON: {firstOnTimeStr} (Today)
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mt: 0.3, fontSize: '0.73rem' }}>
                              👤 OPERATOR: {operatorName}
                            </Typography>
                          </>
                        )}
                      </Box>

                      {/* Mini Photo Proof Thumbnails */}
                      <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                        {[log.machinePhotoUrl, log.unitPhotoUrl, log.softwarePhotoUrl, log.endMachinePhotoUrl].filter(Boolean).slice(0, 3).map((url, idx) => (
                          <Box 
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhoto(url);
                            }}
                            sx={{ 
                              width: 34, height: 34, borderRadius: 1.5, overflow: 'hidden', 
                              bgcolor: '#F1F5F9', border: '1px solid #E2E8F0',
                              cursor: 'pointer',
                              '&:hover': { transform: 'scale(1.1)', borderColor: '#C89F5A' }
                            }}
                          >
                            <img src={getOptimizedUrl(url)} alt="proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}

            {/* 3B. IDLE / OFF MACHINES */}
            {showIdleCards && idleMachines.map((machine: any) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={`idle-${machine.id}`}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2.5, 
                    borderRadius: 3.5, 
                    border: '1px solid #E2E8F0',
                    bgcolor: '#FFFFFF',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      borderColor: '#94A3B8',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  {/* Left Edge Accent */}
                  <Box sx={{ 
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, 
                    bgcolor: '#94A3B8'
                  }} />

                  {/* Header Row */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, pl: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: '#F1F5F9', color: '#64748B', width: 44, height: 44 }}>
                        <PrecisionManufacturingIcon sx={{ fontSize: 22 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem' }}>
                          {machine.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                          {machine.type || 'Factory Unit'}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip 
                      label="IDLE / OFF" 
                      size="small" 
                      sx={{ 
                        fontWeight: 800, 
                        fontSize: '0.68rem',
                        borderRadius: 1.5,
                        bgcolor: '#F1F5F9',
                        color: '#64748B',
                        border: '1px solid #CBD5E1',
                        height: 22
                      }} 
                    />
                  </Box>

                  {/* Status Row */}
                  <Box sx={{ pl: 1, py: 1.5, my: 1, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#64748B', fontSize: '0.82rem' }}>
                        ⚪ Standby / Offline
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                        No active shift on {formatDMY(selectedDate)}
                      </Typography>
                    </Box>
                    <Chip label="STANDBY" size="small" sx={{ bgcolor: '#E2E8F0', color: '#475569', fontWeight: 800, fontSize: '0.65rem' }} />
                  </Box>

                  {/* Footer Row */}
                  <Box sx={{ pl: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                      Ready for operator assignment
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                      0h 00m run
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </>
        )}
      </Grid>
      {/* 4. DETAILED INSPECTION & APPROVAL MODAL */}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                      {selectedLog.operator?.name || 'Operator Shift Details'}
                    </Typography>
                    {selectedLog.isCarryForward && (
                      <Chip 
                        icon={<AutorenewRoundedIcon sx={{ fontSize: '13px !important', color: '#B45309 !important' }} />}
                        label="CARRY FORWARD" 
                        size="small" 
                        sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.65rem', height: 20 }} 
                      />
                    )}
                  </Box>
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
              {selectedLog.isCarryForward && (
                <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#FFFDF5', borderRadius: 2.5, border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AutorenewRoundedIcon sx={{ color: '#B45309', fontSize: 24 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#92400E' }}>
                      Multi-Day Continuous Run (Carry Forward)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 500 }}>
                      This machine was left running across midnight (12:00 AM) and is automatically split into this day's log starting at 00:00:00 to keep daily running hours accurate.
                    </Typography>
                  </Box>
                </Paper>
              )}

              <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
                <Grid container spacing={2.5}>
                  {/* PUNCH IN PANEL */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: 3, height: '100%', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.75, letterSpacing: 0.5, mb: 1.5 }}>
                        🟢 SHIFT START (PUNCH IN)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: '#0F172A' }}>
                        {selectedLog.isCarryForward || new Date(selectedLog.startTime).getTime() < dayStart.getTime() ? '12:00 AM (CF)' : formatTime(selectedLog.startTime)}
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
                              <MenuItem key={p.id} value={p.id}>[{p.projectId || 'WO'}] {p.name}</MenuItem>
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
                            {selectedLog.endTime ? (new Date(selectedLog.endTime).getTime() > dayEnd.getTime() || selectedLog.remarks?.includes('Auto-closed') ? '12:00 AM (Split)' : formatTime(selectedLog.endTime)) : '-'}
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
                              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block', mt: 0.5 }}>
                                {selectedLog.isCarryForward 
                                  ? `Total continuous run: ${getTotalContinuousDurationStr(selectedLog.initialStartTime || selectedLog.startTime, null)} (Started ${formatDMY(selectedLog.initialStartTime || selectedLog.startTime)})`
                                  : `Running duration today: ${getDayRunDurationStr(selectedLog.startTime, selectedLog.endTime, selectedDate)}`
                                }
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

      {/* 5. PHOTO PREVIEW FULLSCREEN DIALOG WITH PROMINENT BACK BUTTON */}
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
            Back to Shift Details
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
    </Box>
  );
};

export default LiveFeed;
