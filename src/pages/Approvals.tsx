import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, CardMedia, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert, Snackbar, IconButton, Checkbox, ListItemText, FormControl, InputLabel, Select, OutlinedInput, FormControlLabel, Autocomplete } from '@mui/material';
import { getOptimizedUrl, getFullQualityUrl } from '../utils/cloudinary';
import { useGetPendingApprovalsQuery, useApproveMaterialLogMutation, useGetProjectsQuery, useGetApprovedLogsQuery, useGetSlabsQuery, useDeleteProductionLogMutation, useEditProductionLogMutation, useGetMachineLogsQuery, useDeleteMachineLogMutation, useEditMachineLogMutation, useApproveMachineLogMutation, useRejectMachineLogMutation, useGetActiveOutLogsQuery } from '../store/apiSlice';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OutputIcon from '@mui/icons-material/Output';
import InputIcon from '@mui/icons-material/Input';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';

const Approvals: React.FC = () => {
  const { data: pendingLogs, isLoading, refetch } = useGetPendingApprovalsQuery(undefined);
  const { data: approvedLogs, refetch: refetchApproved } = useGetApprovedLogsQuery(undefined);
  const { data: projects } = useGetProjectsQuery();
  const { data: machineLogs } = useGetMachineLogsQuery(undefined);
  const { data: activeOutLogs } = useGetActiveOutLogsQuery(undefined);
  const [projectSplits, setProjectSplits] = useState<{projectId: string, qty: number, productId?: string, productName?: string, slabId?: string, pieceIds?: string[], stage?: string, directEntry?: boolean}>([{projectId: '', qty: 0, directEntry: false}]);
  

  
  const [approveLog, { isLoading: isApproving }] = useApproveMaterialLogMutation();

  const [deleteProductionLog] = useDeleteProductionLogMutation();
  const [editProductionLog] = useEditProductionLogMutation();
  const [deleteMachineLog] = useDeleteMachineLogMutation();
  const [editMachineLog] = useEditMachineLogMutation();
  
  const [approveMachineLog] = useApproveMachineLogMutation();
  const [rejectMachineLog] = useRejectMachineLogMutation();

  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [editHistoryDialogOpen, setEditHistoryDialogOpen] = useState(false);
  const [editingHistoryLog, setEditingHistoryLog] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsLog, setDetailsLog] = useState<any>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectLogId, setRejectLogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const activeProjectId = editHistoryDialogOpen ? editingHistoryLog?.projectId : detailsDialogOpen ? detailsLog?.projectId : projectSplits[0]?.projectId;
  const { data: slabs } = useGetSlabsQuery(activeProjectId, { skip: !activeProjectId });
  
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success'|'error' });

  const handleApproveClick = async (log: any) => {
    setSelectedLog(log);
    setProjectSplits([{ projectId: log.projectId || '', qty: log.quantityProduced || 0, productId: log.productId || '', productName: log.productName || '', slabId: log.slabId || '', pieceIds: log.pieceIds || [] }]);
    setApprovalDialogOpen(true);
  };

  const handleRejectClick = (logId: string) => {
    setRejectLogId(logId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const submitReject = async () => {
    if (!rejectLogId) return;
    try {
      await approveLog({ id: rejectLogId, data: { approvalStatus: 'rejected_admin', remarks: rejectReason } }).unwrap();
      setToast({ open: true, message: 'Log Rejected successfully', severity: 'success' });
      refetch();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Failed to reject', severity: 'error' });
    } finally {
      setRejectDialogOpen(false);
      setRejectLogId(null);
    }
  };

  const submitApproval = async () => {
    try {
      const validSplits = projectSplits.filter(s => s.projectId && s.qty > 0);
      
      if (validSplits.length === 0) {
        setToast({ open: true, message: 'Please select at least one project and enter item count.', severity: 'error' });
        return;
      }

      if (validSplits.some(s => !s.slabId)) {
        setToast({ open: true, message: 'Please select a Product / Slab for all assignments so it appears in the pipeline.', severity: 'error' });
        return;
      }

      const totalSplitQty = validSplits.reduce((acc, split) => acc + (Number(split.qty) || 0), 0);
      const hasPieces = validSplits.some(s => s.pieceIds && s.pieceIds.length > 0);

      if (totalSplitQty !== selectedLog.quantityProduced) {
        setToast({ open: true, message: `Total assigned item count (${totalSplitQty}) must exactly match the reported item count (${selectedLog.quantityProduced}).`, severity: 'error' });
        return;
      }

      await approveLog({ 
        id: selectedLog.id, 
        data: { 
          approvalStatus: 'approved', 
          splits: validSplits
        } 
      }).unwrap();
      
      refetchApproved();
      setApprovalDialogOpen(false);
      setProjectSplits([{projectId: '', qty: 0}]);
      setToast({ open: true, message: 'Approval saved successfully', severity: 'success' });
      refetch();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Approval failed', severity: 'error' });
    }
  };

    const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);

  const handleDeleteHistoryLog = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      try {
        if (id.includes('-start')) {
          await deleteMachineLog(id.replace('-start', '')).unwrap();
        } else {
          await deleteProductionLog(id).unwrap();
        }
        setToast({ open: true, message: 'Log deleted successfully', severity: 'success' });
        refetchApproved();
      } catch (err) {
        setToast({ open: true, message: 'Failed to delete log', severity: 'error' });
      }
    }
  };

  const handleEditHistoryClick = (log: any) => {
    setEditingHistoryLog({ ...log });
    setEditHistoryDialogOpen(true);
  };

  const handleUpdateHistoryLog = async () => {
    try {
      if (editingHistoryLog.id && String(editingHistoryLog.id).includes('-start')) {
        await editMachineLog({
          id: String(editingHistoryLog.id).replace('-start', ''),
          data: { piecesProcessed: editingHistoryLog.quantityProduced }
        }).unwrap();
      } else {
        await editProductionLog({ 
          id: editingHistoryLog.id, 
          data: { 
            quantityProduced: editingHistoryLog.quantityProduced, 
            stage: editingHistoryLog.stage,
            projectId: editingHistoryLog.projectId,
            productId: editingHistoryLog.productId,
            productName: editingHistoryLog.productName,
            slabId: editingHistoryLog.slabId,
            pieceIds: editingHistoryLog.pieceIds
          } 
        }).unwrap();
      }
      setEditHistoryDialogOpen(false);
      setToast({ open: true, message: 'Log updated successfully', severity: 'success' });
      refetchApproved();
    } catch (err) {
      setToast({ open: true, message: 'Failed to update log', severity: 'error' });
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PendingActionsIcon fontSize="large" color="warning" />
          Pending Approvals
        </Typography>
      </Box>

      {(!pendingLogs) ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">Loading approvals...</Typography>
        </Paper>
      ) : (
        <Box>
          {(() => {
            const combinedPendingLogs = (() => {
              if (!pendingLogs) return [];
              return (pendingLogs || [])
                .filter((log: any) => {
                  if (log.stage === 'Material Tracking') return false;
                  // Vendor IN/OUT belongs to In/Out Ledger, not Approvals
                  if (log.vendorId || (log.vendorName && log.vendorName !== 'Unknown')) return false;
                  return true;
                })
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            })();

            const stages = [
              { name: 'Production Work', shortName: 'Production', matchStages: ['Production', 'Production Work'], color: '#E3F2FD', iconColor: 'primary', borderColor: '#BBDEFB' },
              { name: 'Polishing', shortName: 'Polishing', matchStages: ['Polishing'], color: '#FFF3E0', iconColor: 'warning', borderColor: '#FFE0B2' },
              { name: 'Packing', shortName: 'Packing', matchStages: ['Packing'], color: '#FCE4EC', iconColor: 'secondary', borderColor: '#F8BBD0' },
              { name: 'Dispatch', shortName: 'Dispatch', matchStages: ['Dispatch'], color: '#FFEBEE', iconColor: 'error', borderColor: '#FFCDD2' },
            ];

            const renderLogGrid = (logsToRender: any[]) => (
              <Grid container spacing={3}>
                {logsToRender.map((log: any) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={log.id}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', bgcolor: 'white' }}>
                      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                        {log.stage !== 'Packing' && log.stage !== 'Dispatch' && (
                          <Chip 
                            label={log.transactionType === 'OUT' ? 'MATERIAL OUT' : 'MATERIAL IN'} 
                            color={log.transactionType === 'OUT' ? 'warning' : 'info'} 
                            size="small" 
                            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} 
                            icon={log.transactionType === 'OUT' ? <OutputIcon /> : <InputIcon />}
                          />
                        )}
                      </Box>
                      <CardContent sx={{ pt: 4 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Stage: {log.stage}</span>
                          <span style={{ color: '#666' }}>Item(s): {log.quantityProduced}</span>
                        </Typography>
                        {log.vehicleNumber && (
                          <Typography variant="body2" sx={{ mb: 1, color: '#1976d2', fontWeight: 'bold' }}>
                            Vehicle No: {log.vehicleNumber}
                          </Typography>
                        )}
                        {(log.project || log.projectId) && (
                          <Box sx={{ mt: 2, mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Project:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {log.project ? `${log.project.projectId || log.project.name} ${log.project.clientName ? `(${log.project.clientName})` : ''}` : 'Unknown Project'}
                            </Typography>
                          </Box>
                        )}
                        
                        {(log.productName || log.machine) && (
                          <Box sx={{ mb: 1 }}>
                            {log.productName && (
                              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 'bold', mb: 0.5 }}>
                                Item: <span style={{ color: '#ed6c02' }}>{log.productName}</span>
                              </Typography>
                            )}
                            {log.machine && (
                              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                                Machine: <span style={{ color: '#0288d1' }}>{log.machine.name}</span>
                              </Typography>
                            )}
                          </Box>
                        )}

                        <Box sx={{ mt: 2, mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Worker/Vendor:</Typography>
                          {log.vendorName ? (
                            <Typography variant="body1" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>{log.vendorName} (Vendor)</Typography>
                          ) : (
                            <Typography variant="body1">{log.worker?.name || 'Unknown'}</Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
                          Submitted: {new Date(log.createdAt).toLocaleString()}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'auto', pb: 1 }}>
                          {log.startPhotos?.machine && (
                            <CardMedia 
                              component="img" 
                              image={log.startPhotos.machine} 
                              sx={{ width: 80, height: 80, borderRadius: 2, cursor: 'pointer', flexShrink: 0 }} 
                              onClick={() => setPreviewPhoto(log.startPhotos.machine)}
                            />
                          )}
                          {log.startPhotos?.unit && (
                            <CardMedia 
                              component="img" 
                              image={log.startPhotos.unit} 
                              sx={{ width: 80, height: 80, borderRadius: 2, cursor: 'pointer', flexShrink: 0 }} 
                              onClick={() => setPreviewPhoto(log.startPhotos.unit)}
                            />
                          )}
                          {log.startPhotos?.software && (
                            <CardMedia 
                              component="img" 
                              image={log.startPhotos.software} 
                              sx={{ width: 80, height: 80, borderRadius: 2, cursor: 'pointer', flexShrink: 0 }} 
                              onClick={() => setPreviewPhoto(log.startPhotos.software)}
                            />
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button variant="contained" color="success" fullWidth onClick={() => handleApproveClick(log)} startIcon={<CheckCircleIcon />}>
                            Approve
                          </Button>
                          <Button variant="outlined" color="error" fullWidth onClick={() => handleRejectClick(log.id)} startIcon={<CancelIcon />}>
                            Reject
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            );

            const summaryRow = (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                {stages.map((stageInfo, index) => {
                  const stageLogs = combinedPendingLogs.filter((log: any) => stageInfo.matchStages.includes(log.stage));
                  const isSelected = selectedStageFilter === stageInfo.name;
                  const count = stageLogs.length;
                  const inCount = stageLogs.filter((l: any) => l.transactionType === 'IN').length;
                  const outCount = stageLogs.filter((l: any) => l.transactionType === 'OUT').length;
                  const otherCount = count - inCount - outCount;

                  return (
                    <Box 
                      key={index} 
                      onClick={() => setSelectedStageFilter(isSelected ? null : stageInfo.name)}
                      sx={{ 
                        flex: '1 1 auto', 
                        minWidth: '140px',
                        py: 1.5,
                        px: 2, 
                        bgcolor: isSelected ? stageInfo.color : '#fff', 
                        borderRadius: 2, 
                        border: '1px solid', 
                        borderColor: isSelected ? `${stageInfo.iconColor}.main` : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        cursor: 'pointer',
                        boxShadow: isSelected ? `0 4px 12px ${stageInfo.color}` : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: stageInfo.color,
                          borderColor: `${stageInfo.iconColor}.main`
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: '1.2rem', color: isSelected ? `${stageInfo.iconColor}.main` : '#999' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: isSelected ? 800 : 600, color: isSelected ? '#222' : '#555' }}>
                          {stageInfo.shortName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {outCount > 0 && <Chip label={`OUT: ${outCount}`} size="small" sx={{ height: 20, fontWeight: 'bold', bgcolor: '#ed6c02', color: '#fff', fontSize: '0.65rem' }} />}
                        {inCount > 0 && <Chip label={`IN: ${inCount}`} size="small" sx={{ height: 20, fontWeight: 'bold', bgcolor: '#0288d1', color: '#fff', fontSize: '0.65rem' }} />}
                        {otherCount > 0 && <Chip label={otherCount} size="small" sx={{ height: 20, fontWeight: 'bold', bgcolor: `${stageInfo.iconColor}.main`, color: '#fff' }} />}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );

            // Detailed Logs Sections
            const detailedSections = stages.map((stageInfo, index) => {
              if (selectedStageFilter && selectedStageFilter !== stageInfo.name) return null;
              
              const stageLogs = combinedPendingLogs.filter((log: any) => stageInfo.matchStages.includes(log.stage));
              if (stageLogs.length === 0) return null;
              return (
                <Box key={`detail-${index}`} sx={{ mb: 4, p: 3, bgcolor: '#fdfdfd', borderRadius: 3, border: '1px solid #eee' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#333', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '2px solid #eee', pb: 1 }}>
                    <CheckCircleIcon color={stageInfo.iconColor as any} /> {stageInfo.name} Approvals
                  </Typography>
                  
                  {stageLogs.filter((l: any) => l.transactionType === 'OUT').length > 0 && (
                    <Box sx={{ mb: 4 }}>
                       <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#ed6c02', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><OutputIcon fontSize="small"/> Material OUT</Typography>
                       {renderLogGrid(stageLogs.filter((l: any) => l.transactionType === 'OUT'))}
                    </Box>
                  )}
                  {stageLogs.filter((l: any) => l.transactionType === 'IN').length > 0 && (
                    <Box sx={{ mb: 4 }}>
                       <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#0288d1', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><InputIcon fontSize="small"/> Material IN</Typography>
                       {renderLogGrid(stageLogs.filter((l: any) => l.transactionType === 'IN'))}
                    </Box>
                  )}
                  {stageLogs.filter((l: any) => l.transactionType !== 'OUT' && l.transactionType !== 'IN').length > 0 && (
                    <Box sx={{ mb: 4 }}>
                       <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#555', mb: 2 }}>Other Tasks</Typography>
                       {renderLogGrid(stageLogs.filter((l: any) => l.transactionType !== 'OUT' && l.transactionType !== 'IN'))}
                    </Box>
                  )}
                </Box>
              );
            });

            const allHandledStages = stages.flatMap(s => s.matchStages);
            const otherStageLogs = combinedPendingLogs.filter((log: any) => !allHandledStages.includes(log.stage));

            return (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Filter by stage:
                </Typography>
                {summaryRow}
                
                {(!selectedStageFilter || selectedStageFilter === 'Other') && otherStageLogs.length > 0 && (
                  <Box sx={{ mb: 4, p: 3, bgcolor: '#fdfdfd', borderRadius: 3, border: '1px solid #eee' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#333', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '2px solid #eee', pb: 1 }}>
                      <CheckCircleIcon color="action" /> Other Approvals
                    </Typography>
                    
                    {otherStageLogs.filter((l: any) => l.transactionType === 'OUT').length > 0 && (
                      <Box sx={{ mb: 4 }}>
                         <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#ed6c02', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><OutputIcon fontSize="small"/> Material OUT</Typography>
                         {renderLogGrid(otherStageLogs.filter((l: any) => l.transactionType === 'OUT'))}
                      </Box>
                    )}
                    {otherStageLogs.filter((l: any) => l.transactionType === 'IN').length > 0 && (
                      <Box sx={{ mb: 4 }}>
                         <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#0288d1', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><InputIcon fontSize="small"/> Material IN</Typography>
                         {renderLogGrid(otherStageLogs.filter((l: any) => l.transactionType === 'IN'))}
                      </Box>
                    )}
                    {otherStageLogs.filter((l: any) => l.transactionType !== 'OUT' && l.transactionType !== 'IN').length > 0 && (
                      <Box sx={{ mb: 4 }}>
                         <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#555', mb: 2 }}>Other Tasks</Typography>
                         {renderLogGrid(otherStageLogs.filter((l: any) => l.transactionType !== 'OUT' && l.transactionType !== 'IN'))}
                      </Box>
                    )}
                  </Box>
                )}

                {detailedSections.every(section => section === null) && otherStageLogs.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px dashed #ccc', bgcolor: '#fafafa', mb: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                      {selectedStageFilter ? `No pending approvals for ${selectedStageFilter}` : 'No Pending Approvals'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      All worker and manager tasks have been approved.
                    </Typography>
                  </Paper>
                ) : (
                  detailedSections
                )}
              </>
            );
          })()}
        </Box>
      )}

      {/* Recently Approved Section */}
      <Box sx={{ mt: 6, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" />
          Recently Approved (History)
        </Typography>
        <Typography variant="body2" color="textSecondary">
          These logs have been approved and moved to Production.
        </Typography>
      </Box>

      {(() => {
        const stages = [
          { name: 'Production Work', shortName: 'Production', matchStages: ['Production', 'Production Work'], color: '#E3F2FD', iconColor: 'primary', borderColor: '#BBDEFB' },
          { name: 'Material Tracking', shortName: 'Material', matchStages: ['Material Tracking'], color: '#E8F5E9', iconColor: 'success', borderColor: '#C8E6C9' },
          { name: 'Polishing', shortName: 'Polishing', matchStages: ['Polishing'], color: '#FFF3E0', iconColor: 'warning', borderColor: '#FFE0B2' },
          { name: 'Packing', shortName: 'Packing', matchStages: ['Packing'], color: '#FCE4EC', iconColor: 'secondary', borderColor: '#F8BBD0' },
          { name: 'Dispatch', shortName: 'Dispatch', matchStages: ['Dispatch'], color: '#FFEBEE', iconColor: 'error', borderColor: '#FFCDD2' },
        ];

        const renderHistoryTable = (logsToRender: any[]) => (
          <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #eee', mb: 4, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#FAFAFA' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', color: '#888', fontSize: '0.75rem', fontWeight: 800 }}>DATE APPROVED</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', color: '#888', fontSize: '0.75rem', fontWeight: 800 }}>QTY</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', color: '#888', fontSize: '0.75rem', fontWeight: 800 }}>ITEM / PRODUCT</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', color: '#888', fontSize: '0.75rem', fontWeight: 800 }}>PROJECT</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', color: '#888', fontSize: '0.75rem', fontWeight: 800 }}>WORKER</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', color: '#888', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {logsToRender.length ? logsToRender.map((log: any) => (
                    <tr key={log.id} style={{ transition: 'background 0.2s', cursor: 'default' }} onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fdfdfd')} onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', color: '#666', fontSize: '0.85rem' }}>
                        {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                        <Typography sx={{ fontWeight: 900, color: '#333' }}>{log.quantityProduced}</Typography>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', maxWidth: '250px' }}>
                        <Typography sx={{ fontWeight: 800, color: '#1976d2', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.productName || ''}>
                          {log.productName || '—'}
                        </Typography>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                        {log.project ? <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>{log.project.projectId || log.project.name}</Typography> : <span style={{ color: '#aaa' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                        <Typography sx={{ fontWeight: 600, color: log.vendorName ? 'secondary.main' : 'text.secondary', fontSize: '0.85rem' }}>
                          {log.vendorName ? `${log.vendorName} (Vendor)` : (log.worker?.name || '—')}
                        </Typography>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                        <IconButton size="small" color="info" onClick={() => { setDetailsLog(log); setDetailsDialogOpen(true); }} sx={{ opacity: 0.7, '&:hover': { opacity: 1, bgcolor: '#e1f5fe' } }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="primary" onClick={() => handleEditHistoryClick(log)} sx={{ opacity: 0.7, '&:hover': { opacity: 1, bgcolor: '#e3f2fd' } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteHistoryLog(log.id)} sx={{ opacity: 0.7, '&:hover': { opacity: 1, bgcolor: '#ffebee' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>No approved logs available in history.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Paper>
        );

        const allHandledStages = stages.flatMap(s => s.matchStages);
        
        // Format machine logs as OUT entries for Production Work
        const formattedMachineLogsMap = new Map();
        (machineLogs || []).forEach((ml: any) => {
          const workerName = typeof ml.operator === 'object' && ml.operator !== null ? ml.operator.name : ml.operator || 'Unknown';
          const projectObj = projects?.find((p: any) => p.id === ml.projectId);
          const key = `${ml.startTime || ml.createdAt}-${workerName}-${ml.projectId}`;
          if (!formattedMachineLogsMap.has(key)) {
            formattedMachineLogsMap.set(key, {
              ...ml,
              id: `${ml.id}-start`,
              stage: 'Production Work',
              transactionType: 'OUT',
              createdAt: ml.startTime || ml.createdAt,
              quantityProduced: ml.piecesProcessed || 1,
              worker: { name: workerName },
              project: projectObj || ml.project,
              productName: ml.pieceNumber || ml.productName || ml.slabId || '—',
              startPhotos: {
                machine: ml.machinePhotoUrl,
                unit: ml.unitPhotoUrl,
                software: ml.softwarePhotoUrl
              }
            });
          } else {
            const existing = formattedMachineLogsMap.get(key);
            existing.quantityProduced += (ml.piecesProcessed || 1);
          }
        });
        const formattedMachineLogs = Array.from(formattedMachineLogsMap.values());

        const combinedHistoryLogs = [...(approvedLogs || [])].sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const otherApprovedLogs = combinedHistoryLogs.filter((log: any) => !allHandledStages.includes(log.stage));

        return (
          <>
            {stages.map((stageInfo, idx) => {
              if (selectedStageFilter && selectedStageFilter !== stageInfo.name) return null;

              const stageLogs = combinedHistoryLogs.filter((log: any) => stageInfo.matchStages.includes(log.stage));
              if (stageLogs.length === 0) return null;
              
              return (
                <Box key={idx}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#4A4A4A', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color={stageInfo.iconColor as any} /> {stageInfo.name} History
                  </Typography>
                  {renderHistoryTable(stageLogs)}
                </Box>
              );
            })}

            {(!selectedStageFilter || selectedStageFilter === 'Other') && otherApprovedLogs.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#4A4A4A', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="action" /> Other Stage History
                </Typography>
                    {renderHistoryTable(otherApprovedLogs)}
                  </Box>
                )}
                </>
            );
          })()}

      {/* Approval Dialog — Multi Project Selection */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Approve Material Log
          {selectedLog && (
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Stage: {selectedLog.stage} • Item(s): {selectedLog.quantityProduced}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <>
            {selectedLog?.boxCode && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f3e5f5', borderRadius: 2, border: '1px solid #e1bee7' }}>
                <Typography variant="body2" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                  Packing Info (Box | Code | Size): {selectedLog.boxCode.replace(/\|/g, ' / ')}
                </Typography>
              </Box>
            )}
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Select one or more projects for this material. You can split the items across multiple projects.
            </Typography>
              {/* Project Assignment rows */}
              {projectSplits.map((split, idx) => {
                const selectedProjectObj = projects?.find((p: any) => p.id === split.projectId);
                const projectProducts = selectedProjectObj?.products || [];
                return (
                  <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, p: 2, bgcolor: '#F9F9F9', borderRadius: 2, border: '1px solid #eee' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField 
                        select
                        label="Select Project" 
                        fullWidth
                        size="small"
                        value={split.projectId} 
                        onChange={(e) => {
                          const newSplits = [...projectSplits];
                          newSplits[idx].projectId = e.target.value;
                          
                          newSplits[idx].productId = '';
                          newSplits[idx].productName = '';
                          newSplits[idx].slabId = '';
                          newSplits[idx].pieceIds = [];
                          
                          setProjectSplits(newSplits);
                        }} 
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    {projects?.map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>{p.projectId} – {p.name} ({p.clientName})</MenuItem>
                    ))}
                  </TextField>
                </Box>
                
                {/* Dynamically extract slabs for this project */}
                {(() => {
                  const projectSlabs = slabs ? slabs.filter((s: any) => {
                    if (s.projectId !== split.projectId) return false;
                    
                    // If slab has pieces, hide it if ALL pieces are already completed for this stage
                    if (s.pieces && s.pieces.length > 0) {
                      const eligiblePieces = s.pieces.filter((p: any) => {
                        const stages = ['Production', 'Polishing', 'Packing', 'Dispatch'];
                        const logStage = selectedLog?.stage?.replace(' Work', '') || '';
                        const pStageIdx = stages.indexOf(p.stage);
                        const logStageIdx = stages.indexOf(logStage);
                        
                        if (logStageIdx === -1) return true;
                        if (pStageIdx === logStageIdx && p.status === 'completed') return false;
                        if (pStageIdx > logStageIdx) return false;
                        if (pStageIdx < logStageIdx) {
                          if (pStageIdx === logStageIdx - 1 && p.status === 'completed') return true;
                          return false;
                        }
                        return true;
                      });
                      return eligiblePieces.length > 0;
                    }
                    
                    // Keep slabs that have no pieces yet
                    return true;
                  }) : [];
                  if (projectSlabs.length === 0) return null;
                  
                  return (
                    <>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Autocomplete
                          fullWidth
                          size="small"
                          options={projectSlabs}
                          getOptionLabel={(option: any) => `${option.name} (${option.pieces?.length || 0} Pieces)`}
                          value={projectSlabs.find((s: any) => s.id === split.slabId) || null}
                          onChange={(e, newValue: any) => {
                            const newSplits = [...projectSplits];
                            if (newValue) {
                              newSplits[idx].slabId = newValue.id;
                              newSplits[idx].productName = newValue.name;
                            } else {
                              newSplits[idx].slabId = '';
                              newSplits[idx].productName = '';
                            }
                            newSplits[idx].pieceIds = [];
                            setProjectSplits(newSplits);
                          }}
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              label="Search Product / Slab *" 
                              placeholder="Type name..."
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        />
                      </Box>
                      
                      {/* Pieces Dropdown */}
                      {split.slabId && selectedLog?.stage !== 'Packing' && selectedLog?.stage !== 'Dispatch' && projectSlabs.find((s: any) => s.id === split.slabId)?.pieces?.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                            <InputLabel id={`select-piece-label-${idx}`}>Select Piece(s) (Optional)</InputLabel>
                            <Select
                              labelId={`select-piece-label-${idx}`}
                              multiple
                              value={split.pieceIds || []}
                              onChange={(e) => {
                                const newSplits = [...projectSplits];
                                const val = e.target.value as string[];
                                newSplits[idx].pieceIds = val;
                                newSplits[idx].qty = val.length > 0 ? val.length : newSplits[idx].qty;
                                
                                const slab = projectSlabs.find((s: any) => s.id === newSplits[idx].slabId);
                                if (val.length > 0) {
                                  const pieceNames = val.map((id: string) => {
                                    const piece = slab?.pieces?.find((p: any) => p.id === id);
                                    return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id.substring(0, 4);
                                  });
                                  newSplits[idx].productName = slab ? `${slab.name} - ${pieceNames.join(', ')}` : pieceNames.join(', ');
                                } else {
                                  newSplits[idx].productName = slab?.name || '';
                                }

                                setProjectSplits(newSplits);
                              }}
                              input={<OutlinedInput label="Select Piece(s) (Optional)" />}
                              renderValue={(selected: any) => {
                                if (!selected || selected.length === 0) return <em>Select Pieces</em>;
                                const slab = projectSlabs.find((s: any) => s.id === split.slabId);
                                return selected.map((id: string) => {
                                  const piece = slab?.pieces?.find((p: any) => p.id === id);
                                  return piece ? `${(piece.productName || `Piece ${piece.pieceNumber}`).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${piece.size ? `(${piece.size.replace(/ x (\d+MM)/i, ' | $1')})` : ''}` : id;
                                }).join(', ');
                              }}
                            >
                              {projectSlabs
                                .find((s: any) => s.id === split.slabId)
                                ?.pieces?.filter((p: any) => {
                                  const stages = ['Production', 'Polishing', 'Packing', 'Dispatch'];
                                  const logStage = selectedLog?.stage?.replace(' Work', '') || '';
                                  const pStageIdx = stages.indexOf(p.stage);
                                  const logStageIdx = stages.indexOf(logStage);
                                  
                                  if (logStageIdx === -1) return true;
                                  if (pStageIdx === logStageIdx && p.status === 'completed') return false;
                                  if (pStageIdx > logStageIdx) return false;
                                  if (pStageIdx < logStageIdx) {
                                    if (pStageIdx === logStageIdx - 1 && p.status === 'completed') return true;
                                    return false;
                                  }
                                  return true;
                                })
                                .map((p: any) => (
                                <MenuItem key={p.id} value={p.id}>
                                  <Checkbox checked={(split.pieceIds || []).indexOf(p.id) > -1} />
                                  <ListItemText primary={`${(p.productName || 'Piece ' + p.pieceNumber).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${p.size ? `(${p.size.replace(/ x (\\d+MM)/i, ' | $1')})` : ''} - ${p.stage}`} sx={{ color: '#ed6c02', fontWeight: 'bold' }} />
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                      )}
                    </>
                  );
                })()}


                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <IconButton 
                    color="error" 
                    onClick={() => {
                      setProjectSplits(projectSplits.filter((_, i) => i !== idx));
                    }}
                    disabled={projectSplits.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
          
          <Button 
            startIcon={<AddIcon />} 
            onClick={() => setProjectSplits([...projectSplits, { projectId: '', qty: 0 }])}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Add Project Split
          </Button>
          </>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setApprovalDialogOpen(false)} color="inherit">Cancel</Button>
            <Button 
              variant="contained" 
              color="success" 
              onClick={submitApproval}
              disabled={!projectSplits.some(s => s.projectId && s.qty > 0) || isApproving}
              sx={{ fontWeight: 'bold' }}
            >
            {isApproving ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog (IN and OUT combined) */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Production Log Details
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {detailsLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Machine Log Details (OUT) */}
              {(() => {
                const ml = machineLogs?.find((m: any) => m.id === detailsLog.parentLogId);
                if (!ml) return null;
                const mStart = new Date(ml.startTime);
                const mEnd = ml.endTime ? new Date(ml.endTime) : new Date();
                const diffHrs = Math.floor((mEnd.getTime() - mStart.getTime()) / 3600000);
                const diffMins = Math.floor(((mEnd.getTime() - mStart.getTime()) % 3600000) / 60000);
                const workerName = typeof ml.operator === 'object' && ml.operator !== null ? ml.operator.name : ml.operator || 'Unknown';
                
                return (
                  <Card variant="outlined" sx={{ bgcolor: '#FFF8E1', borderColor: '#FFE082', borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: '#F57C00', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <OutputIcon fontSize="small" /> MACHINE WORK (OUT)
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Typography variant="caption" color="textSecondary">Operator</Typography>
                          <Typography variant="body2" fontWeight="bold">{workerName}</Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="caption" color="textSecondary">Time Taken</Typography>
                          <Typography variant="body2" fontWeight="bold">{diffHrs}h {diffMins}m</Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="caption" color="textSecondary">Punch In</Typography>
                          <Typography variant="body2" fontWeight="bold">{mStart.toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="caption" color="textSecondary">Punch Out</Typography>
                          <Typography variant="body2" fontWeight="bold">{ml.endTime ? mEnd.toLocaleString() : 'Active'}</Typography>
                        </Grid>
                      </Grid>

                      {/* Punch Out Photos Display */}
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 2 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>PUNCH OUT PHOTOS</Typography>
                        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                          {ml.endMachinePhotoUrl && (
                            <Box sx={{ position: 'relative', width: 80, height: 80, cursor: 'pointer', borderRadius: 2, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => setPreviewPhoto(ml.endMachinePhotoUrl)}>
                              <img src={getOptimizedUrl(ml.endMachinePhotoUrl)} alt="Machine Out" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                                <VisibilityIcon sx={{ color: 'white' }} />
                              </Box>
                              <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', py: 0.5 }}>Machine</Typography>
                            </Box>
                          )}
                          {ml.endUnitPhotoUrl && (
                            <Box sx={{ position: 'relative', width: 80, height: 80, cursor: 'pointer', borderRadius: 2, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => setPreviewPhoto(ml.endUnitPhotoUrl)}>
                              <img src={getOptimizedUrl(ml.endUnitPhotoUrl)} alt="Unit Out" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                                <VisibilityIcon sx={{ color: 'white' }} />
                              </Box>
                              <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', py: 0.5 }}>Unit</Typography>
                            </Box>
                          )}
                          {ml.endSoftwarePhotoUrl && (
                            <Box sx={{ position: 'relative', width: 80, height: 80, cursor: 'pointer', borderRadius: 2, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => setPreviewPhoto(ml.endSoftwarePhotoUrl)}>
                              <img src={getOptimizedUrl(ml.endSoftwarePhotoUrl)} alt="Software Out" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                                <VisibilityIcon sx={{ color: 'white' }} />
                              </Box>
                              <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', py: 0.5 }}>Software</Typography>
                            </Box>
                          )}
                          {!ml.endMachinePhotoUrl && !ml.endUnitPhotoUrl && !ml.endSoftwarePhotoUrl && (
                            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', p: 1 }}>No photos captured at Punch Out.</Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Approved Production Details (IN) */}
              <Card variant="outlined" sx={{ bgcolor: '#E1F5FE', borderColor: '#81D4FA', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ color: '#0288D1', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InputIcon fontSize="small" /> APPROVED PRODUCTION (IN)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <Typography variant="caption" color="textSecondary">Item / Product</Typography>
                      <Typography variant="body1" fontWeight="bold" color="primary.main">{detailsLog.productName || '—'}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="textSecondary">Quantity Approved</Typography>
                      <Typography variant="body2" fontWeight="bold">{detailsLog.quantityProduced}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="textSecondary">Date Approved</Typography>
                      <Typography variant="body2" fontWeight="bold">{new Date(detailsLog.createdAt).toLocaleString()}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="textSecondary">Stage</Typography>
                      <Typography variant="body2" fontWeight="bold">{detailsLog.stage}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="textSecondary">Vendor/Worker Assigned</Typography>
                      <Typography variant="body2" fontWeight="bold">{detailsLog.vendorName || detailsLog.worker?.name || '—'}</Typography>
                    </Grid>
                  </Grid>

                  {/* Punch In Photos Display */}
                  <Box sx={{ mt: 3, p: 1.5, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 2 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>PUNCH IN PHOTOS</Typography>
                    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                      {detailsLog.startPhotos?.machine && (
                        <Box sx={{ position: 'relative', width: 80, height: 80, cursor: 'pointer', borderRadius: 2, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => setPreviewPhoto(detailsLog.startPhotos.machine)}>
                          <img src={getOptimizedUrl(detailsLog.startPhotos.machine)} alt="Machine In" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                            <VisibilityIcon sx={{ color: 'white' }} />
                          </Box>
                          <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', py: 0.5 }}>Machine</Typography>
                        </Box>
                      )}
                      {detailsLog.startPhotos?.unit && (
                        <Box sx={{ position: 'relative', width: 80, height: 80, cursor: 'pointer', borderRadius: 2, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => setPreviewPhoto(detailsLog.startPhotos.unit)}>
                          <img src={getOptimizedUrl(detailsLog.startPhotos.unit)} alt="Unit In" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                            <VisibilityIcon sx={{ color: 'white' }} />
                          </Box>
                          <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', py: 0.5 }}>Unit</Typography>
                        </Box>
                      )}
                      {detailsLog.startPhotos?.software && (
                        <Box sx={{ position: 'relative', width: 80, height: 80, cursor: 'pointer', borderRadius: 2, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => setPreviewPhoto(detailsLog.startPhotos.software)}>
                          <img src={getOptimizedUrl(detailsLog.startPhotos.software)} alt="Software In" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                            <VisibilityIcon sx={{ color: 'white' }} />
                          </Box>
                          <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', py: 0.5 }}>Software</Typography>
                        </Box>
                      )}
                      {!detailsLog.startPhotos?.machine && !detailsLog.startPhotos?.unit && !detailsLog.startPhotos?.software && (
                        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', p: 1 }}>No photos captured at Punch In.</Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setDetailsDialogOpen(false)} variant="contained" color="inherit" sx={{ fontWeight: 'bold', borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit History Dialog */}
      <Dialog open={editHistoryDialogOpen} onClose={() => setEditHistoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Approved Log</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {editingHistoryLog && (
            <>
              <TextField
                select
                label="Assign Project (Optional)"
                fullWidth
                size="small"
                value={editingHistoryLog.projectId || ''}
                onChange={(e) => setEditingHistoryLog({ ...editingHistoryLog, projectId: e.target.value, productId: '', productName: '', slabId: '', pieceIds: [] })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="" disabled>Select Project</MenuItem>
                {projects?.map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>{p.projectId} - {p.clientName}</MenuItem>
                ))}
              </TextField>

              {(() => {
                const projectProducts = editingHistoryLog.projectId ? (projects?.find((p: any) => p.id === editingHistoryLog.projectId)?.products || []) : [];
                return editingHistoryLog.projectId && projectProducts.length > 0 && (
                  <TextField
                    select
                    label="Select Category (Optional)"
                    fullWidth
                    size="small"
                    value={editingHistoryLog.productId || ''}
                    onChange={(e) => {
                      const productName = projectProducts.find((p:any) => p.id === e.target.value)?.category || '';
                      setEditingHistoryLog({ ...editingHistoryLog, productId: e.target.value, productName });
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    <MenuItem value="">-- Clear Selection --</MenuItem>
                    {projectProducts.map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>Category: {p.category}</MenuItem>
                    ))}
                  </TextField>
                );
              })()}

              {(() => {
                const matchedSlabs = editingHistoryLog.projectId && slabs ? slabs.filter((s: any) => s.projectId === editingHistoryLog.projectId && (!editingHistoryLog.productName || s.name.startsWith(editingHistoryLog.productName))) : [];
                return matchedSlabs.length > 1 && (
                  <TextField 
                    select
                    label="Select Slab (Optional)" 
                    fullWidth
                    size="small"
                    value={editingHistoryLog.slabId || ''} 
                    onChange={(e) => {
                      const slab = slabs?.find((s: any) => s.id === e.target.value);
                      setEditingHistoryLog({ ...editingHistoryLog, slabId: e.target.value, pieceIds: [], productName: slab?.name || '' });
                    }} 
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    <MenuItem value="">-- Clear Selection --</MenuItem>
                    {matchedSlabs.map((s: any) => (
                      <MenuItem key={s.id} value={s.id}>
                        Slab: {s.name} ({s.pieces?.length || 0} pcs) {s.size && s.size.trim() !== '0L x 0W' ? `- ${s.size}` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              })()}

              {editingHistoryLog.slabId && slabs && slabs.find((s: any) => s.id === editingHistoryLog.slabId)?.pieces?.length > 0 && (
                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  <InputLabel id={`edit-select-piece-label`}>Select Piece(s) (Optional)</InputLabel>
                  <Select
                    labelId={`edit-select-piece-label`}
                    multiple
                    value={editingHistoryLog.pieceIds || []}
                    onChange={(e) => {
                      const val = e.target.value as string[];
                      
                      const slab = slabs?.find((s: any) => s.id === editingHistoryLog.slabId);
                      let newProductName = editingHistoryLog.productName;
                      if (val.length > 0) {
                        const pieceNames = val.map((id: string) => {
                          const piece = slab?.pieces?.find((p: any) => p.id === id);
                          return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id.substring(0, 4);
                        });
                        newProductName = slab ? `${slab.name} - ${pieceNames.join(', ')}` : pieceNames.join(', ');
                      } else {
                        newProductName = slab?.name || '';
                      }
                      
                      setEditingHistoryLog({ 
                        ...editingHistoryLog, 
                        pieceIds: val, 
                        quantityProduced: val.length > 0 ? val.length : editingHistoryLog.quantityProduced,
                        productName: newProductName
                      });
                    }}
                    input={<OutlinedInput label="Select Piece(s) (Optional)" />}
                    renderValue={(selected: any) => {
                      if (!selected || selected.length === 0) return <em>Select Pieces</em>;
                      const slab = slabs.find((s: any) => s.id === editingHistoryLog.slabId);
                      return selected.map((id: string) => {
                        const piece = slab?.pieces?.find((p: any) => p.id === id);
                        return piece ? `${(piece.productName || `Piece ${piece.pieceNumber}`).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${piece.size ? `(${piece.size.replace(/ x (\d+MM)/i, ' | $1')})` : ''}` : id;
                      }).join(', ');
                    }}
                  >
                    {slabs.find((s: any) => s.id === editingHistoryLog.slabId)?.pieces?.filter((p: any) => {
                          const stages = ['Production', 'Polishing', 'Packing', 'Dispatch'];
                          const logStage = editingHistoryLog?.stage?.replace(' Work', '') || '';
                          const pStageIdx = stages.indexOf(p.stage);
                          const logStageIdx = stages.indexOf(logStage);
                          if (pStageIdx > logStageIdx) return false;
                          if (pStageIdx === logStageIdx && p.status === 'completed') return false;
                          return true;
                        }).map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>
                        <Checkbox checked={(editingHistoryLog.pieceIds || []).indexOf(p.id) > -1} />
                        <ListItemText primary={`${(p.productName || 'Piece ' + p.pieceNumber).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${p.size ? `(${p.size.replace(/ x (\\d+MM)/i, ' | $1')})` : ''} - ${p.stage}`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                label="Stage"
                fullWidth
                size="small"
                value={editingHistoryLog.stage || ''}
                onChange={(e) => setEditingHistoryLog({ ...editingHistoryLog, stage: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Quantity"
                type="number"
                fullWidth
                size="small"
                value={editingHistoryLog.quantityProduced || 0}
                onChange={(e) => setEditingHistoryLog({ ...editingHistoryLog, quantityProduced: Number(e.target.value) })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditHistoryDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleUpdateHistoryLog}>Update Log</Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen Photo Preview Dialog */}
      <Dialog open={!!previewPhoto} onClose={() => setPreviewPhoto(null)} maxWidth="lg" fullWidth PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } } as any}>
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 2 }} onClick={() => setPreviewPhoto(null)}>
          {previewPhoto ? (
            <img src={getFullQualityUrl(previewPhoto)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          ) : null}
        </Box>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Reject Log</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Please enter the reason for rejecting this log. This will be visible to the worker/manager.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            label="Rejection Remarks"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setRejectDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={submitReject} variant="contained" color="error" disabled={!rejectReason.trim()}>
            Reject Log
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Approvals;
