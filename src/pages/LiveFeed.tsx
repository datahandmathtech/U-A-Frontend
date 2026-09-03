import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, IconButton, Chip, Dialog, DialogContent, Avatar, CircularProgress, DialogTitle } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GroupsIcon from '@mui/icons-material/Groups';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useGetLiveFeedQuery, useGetProjectsQuery, useApproveMachineLogMutation, useRejectMachineLogMutation, useGetMachinesQuery, useGetProjectByIdQuery } from '../store/apiSlice';
import { getOptimizedUrl, getFullQualityUrl } from '../utils/cloudinary';
import { TextField, MenuItem, Button } from '@mui/material';

const SummaryCard = ({ icon: Icon, value, label, colorHint, bgHint, gradient }: any) => (
  <Paper sx={{ 
    p: 3, 
    borderRadius: 5, 
    display: 'flex', 
    alignItems: 'center', 
    gap: 3,
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.04)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <Box sx={{ 
      p: 2, 
      borderRadius: 4, 
      background: gradient || bgHint || 'primary.light', 
      color: colorHint || 'primary.main', 
      display: 'flex',
      boxShadow: gradient ? '0 8px 16px rgba(0,0,0,0.15)' : 'none'
    }}>
      <Icon fontSize="large" />
    </Box>
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1, mb: 0.5, color: '#111' }}>{value}</Typography>
      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Typography>
    </Box>
    <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.03, transform: 'scale(3)' }}>
      <Icon />
    </Box>
  </Paper>
);

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

  const { data: machines, isLoading: machinesLoading } = useGetMachinesQuery();
  const { data: liveFeedData, isLoading: liveFeedLoading, refetch } = useGetLiveFeedQuery(formatYMD(selectedDate));
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

  if (machinesLoading || liveFeedLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const activeLogs = liveFeedData?.filter((log: any) => log.status === 'active') || [];
  const activeStaffCount = new Set(activeLogs.filter((l:any) => l.operatorId).map((log: any) => log.operatorId)).size;
  const activeMachinesCount = new Set(activeLogs.filter((l:any) => l.machineId).map((log: any) => log.machineId)).size;

  return (
    <Box sx={{ minHeight: '100vh', p: 2, bgcolor: '#f4f7f6' }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, color: '#1a1a1a' }}>Factory Live Feed</Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mt: 0.5 }}>Real-time status of all machine operations.</Typography>
        </Box>
        
        {/* Custom Date Picker */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: '#1E232E', 
          color: '#FFF', 
          borderRadius: 8, 
          p: 0.5,
          width: 'fit-content',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <IconButton onClick={handlePrevDay} sx={{ color: '#FFF', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }, borderRadius: 6, width: 40, height: 40 }}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5, px: 4, cursor: 'pointer' }}>
            <Typography sx={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: 1 }}>
              {formatDMY(selectedDate)}
            </Typography>
            <CalendarTodayIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
            
            {/* Hidden Native Date Input for Calendar Popover */}
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

          <IconButton onClick={handleNextDay} sx={{ color: '#FFF', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }, borderRadius: 6, width: 40, height: 40 }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Grid of Cards */}
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#444' }}>{formatDMY(selectedDate) === formatDMY(new Date()) ? "Today's Status" : "Status for " + formatDMY(selectedDate)}</Typography>
      <Grid container spacing={3}>
        {(!machines || machines.length === 0) ? (
          <Grid size={{ xs: 12 }}><Typography align="center" color="textSecondary" sx={{ py: 8 }}>No machines found in the factory.</Typography></Grid>
        ) : (
          machines?.map((machine: any) => {
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
                  elevation={log ? 2 : 0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    border: '1px solid',
                    borderColor: !log ? 'grey.300' : (isCompleted ? 'primary.light' : (isPending ? 'warning.light' : 'success.light')),
                    bgcolor: !log ? 'grey.50' : '#fff',
                    cursor: log ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': log ? { 
                      transform: 'translateY(-2px)', 
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      borderColor: isCompleted ? 'primary.main' : (isPending ? 'warning.main' : 'success.main')
                    } : {}
                  }}
                >
                  <Box sx={{ 
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, 
                    bgcolor: !log ? 'grey.300' : (isCompleted ? 'primary.main' : (isPending ? 'warning.main' : 'success.main'))
                  }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, pl: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: !log ? 'grey.400' : (isCompleted ? 'primary.light' : 'success.light'), 
                        color: !log ? '#fff' : (isCompleted ? 'primary.dark' : 'success.dark'), 
                        width: 48, height: 48
                      }}>
                        <PrecisionManufacturingIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: !log ? 'text.secondary' : 'text.primary' }}>
                          {machine.name}
                        </Typography>
                        {log?.project && (
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'medium' }}>
                            {log.project.clientName || 'General'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Chip 
                      label={!log ? 'IDLE' : (isCompleted ? 'COMPLETED' : (isPending ? 'PENDING' : 'ACTIVE'))} 
                      size="small" 
                      color={!log ? 'default' : (isCompleted ? 'primary' : (isPending ? 'warning' : 'success'))}
                      sx={{ fontWeight: 'bold', borderRadius: 1 }} 
                    />
                  </Box>

                  <Box sx={{ pl: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 3 }}>
                    <Box>
                      {log?.project ? (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {log.project.projectId}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {log.project.name}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="textSecondary">No active project</Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      {log ? (
                        <>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: isCompleted ? 'primary.main' : 'success.main' }}>
                            Started: {new Date(log.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Typography>
                          {isCompleted && log.endTime && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                              Ended: {new Date(log.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" color="textDisabled">--:--</Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Detailed Modal (Matches functional requirements but with standard theme) */}
      <Dialog 
        open={Boolean(selectedLog)} 
        onClose={() => setSelectedLog(null)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        {selectedLog && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontWeight: 'bold' }}>
                  {selectedLog.operator?.name?.charAt(0) || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{selectedLog.operator?.name || 'Unknown'}</Typography>
                  <Typography variant="body2" color="textSecondary">Staff ID: {selectedLog.operator?.staffId || '-'}</Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setSelectedLog(null)}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 2 }}>
              {/* Inner Box */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                
                {/* Header Row: Shift & Machine */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Chip label="LOG #1" color="primary" variant="outlined" sx={{ fontWeight: 'bold', borderRadius: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PrecisionManufacturingIcon color="warning" /> {selectedLog.machine?.name}
                    </Typography>
                  </Box>
                  <Chip 
                    label={selectedLog.status === 'completed' ? 'COMPLETED' : selectedLog.approvalStatus === 'pending' ? 'PENDING APPROVAL' : 'ON DUTY'} 
                    color={selectedLog.status === 'completed' ? 'default' : selectedLog.approvalStatus === 'pending' ? 'warning' : 'success'} 
                    sx={{ fontWeight: 'bold', borderRadius: 1 }} 
                  />
                </Box>

                <Grid container spacing={3}>
                  {/* PUNCH IN PANEL */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, letterSpacing: 1, mb: 2 }}>
                        → PUNCH IN
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: -1 }}>
                        {new Date(selectedLog.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Typography>
                      
                      {selectedLog.approvalStatus === 'pending' ? (
                        <Box sx={{ mb: 4, mt: 2 }}>
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
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 }, mb: selectedProject ? 2 : 0 }}
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
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
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
                        <Box sx={{ mb: 4 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                            Project: {selectedLog.project?.name || selectedLog.project?.projectId || 'N/A'}
                          </Typography>
                          {selectedLog.productName && (
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                              Product: {selectedLog.productName}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* 3 Photos side-by-side */}
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {[
                          { url: selectedLog.machinePhotoUrl, label: 'MACHINE' },
                          { url: selectedLog.unitPhotoUrl, label: 'STONE/UNIT' },
                          { url: selectedLog.softwarePhotoUrl, label: 'SOFTWARE' }
                        ].map((photo, i) => (
                          <Box key={i} sx={{ textAlign: 'center' }}>
                            <Box 
                              onClick={() => photo.url && setPreviewPhoto(photo.url)}
                              sx={{ 
                                width: 80, height: 80, borderRadius: 3, mb: 1, overflow: 'hidden', 
                                bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: photo.url ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                '&:hover': photo.url ? { transform: 'scale(1.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}
                              }}>
                              {photo.url ? (
                                <img src={getOptimizedUrl(photo.url)} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Typography variant="caption" color="textSecondary">No Image</Typography>
                              )}
                            </Box>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 1 }}>
                              {photo.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* PUNCH OUT PANEL */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, letterSpacing: 1, mb: 2 }}>
                        <CancelIcon fontSize="small" /> PUNCH OUT / ACTION
                      </Typography>
                      
                      {selectedLog.status === 'completed' ? (
                        <>
                          <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: -1 }}>
                            {new Date(selectedLog.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                            "{selectedLog.remarks || 'No remarks provided'}"
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            {[
                              { url: selectedLog.endMachinePhotoUrl, label: 'END MACHINE' },
                              { url: selectedLog.endUnitPhotoUrl, label: 'END STONE' },
                              { url: selectedLog.endSoftwarePhotoUrl, label: 'END SOFT.' }
                            ].map((photo, i) => (
                              <Box key={i} sx={{ textAlign: 'center' }}>
                                <Box 
                                  onClick={() => photo.url && setPreviewPhoto(photo.url)}
                                  sx={{ 
                                    width: 80, height: 80, borderRadius: 3, mb: 1, overflow: 'hidden', 
                                    bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: photo.url ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    '&:hover': photo.url ? { transform: 'scale(1.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}
                                  }}>
                                  {photo.url ? (
                                    <img src={getOptimizedUrl(photo.url)} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <Typography variant="caption" color="textSecondary">No Image</Typography>
                                  )}
                                </Box>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 1 }}>
                                  {photo.label}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          {selectedLog.approvalStatus === 'pending' ? (
                            <>
                              <Button 
                                variant="contained" 
                                color="success" 
                                fullWidth 
                                disabled={!selectedProject || !selectedProduct || isApproving}
                                startIcon={isApproving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
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
                                sx={{ mb: 1, py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
                              >
                                Approve & Assign
                              </Button>
                              <Button 
                                variant="outlined" 
                                color="error" 
                                fullWidth 
                                disabled={isRejecting}
                                startIcon={isRejecting ? <CircularProgress size={20} color="inherit" /> : <CancelIcon />}
                                onClick={async () => {
                                  await rejectLog(selectedLog.id);
                                  refetch();
                                  setSelectedLog(null);
                                }}
                                sx={{ py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
                              >
                                Reject & Cancel Log
                              </Button>
                            </>
                          ) : (
                            <>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main' }} />
                              <Typography variant="body1" sx={{ color: 'warning.dark', fontWeight: 'bold', letterSpacing: 1 }}>IN PROGRESS</Typography>
                            </>
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

      {/* Photo Preview Fullscreen Dialog */}
      <Dialog open={Boolean(previewPhoto)} onClose={() => setPreviewPhoto(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}>
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <IconButton 
            onClick={() => setPreviewPhoto(null)} 
            sx={{ position: 'absolute', top: -40, right: -40, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
          >
            <CloseIcon fontSize="large" />
          </IconButton>
          {previewPhoto && <img src={getFullQualityUrl(previewPhoto)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }} />}
        </Box>
      </Dialog>
    </Box>
  );
};

export default LiveFeed;
