import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, CardMedia, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert, Snackbar, IconButton, Checkbox, ListItemText, FormControl, InputLabel, Select, OutlinedInput, FormControlLabel, Autocomplete, Tooltip, Table, TableHead, TableRow, TableCell, TableBody, Divider, Accordion, AccordionSummary, AccordionDetails, RadioGroup, Radio } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getOptimizedUrl, getFullQualityUrl } from '../utils/cloudinary';
import { useGetPendingApprovalsQuery, useApproveMaterialLogMutation, useGetProjectsQuery, useGetApprovedLogsQuery, useGetSlabsQuery, useDeleteProductionLogMutation, useEditProductionLogMutation, useGetMachineLogsQuery, useDeleteMachineLogMutation, useEditMachineLogMutation, useApproveMachineLogMutation, useRejectMachineLogMutation, useGetActiveOutLogsQuery, useManualApprovePiecesMutation } from '../store/apiSlice';
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
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import LayersIcon from '@mui/icons-material/Layers';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SearchIcon from '@mui/icons-material/Search';

const Approvals: React.FC = () => {
  const { data: pendingLogs, isLoading, refetch: refetchPending } = useGetPendingApprovalsQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true
  });
  const { data: approvedLogs, refetch: refetchApproved } = useGetApprovedLogsQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true
  });
  const { data: projects } = useGetProjectsQuery();
  const { data: machineLogs } = useGetMachineLogsQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true
  });
  const { data: activeOutLogs } = useGetActiveOutLogsQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true
  });
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
  const [rejectTargetLog, setRejectTargetLog] = useState<any>(null);
  const [rejectMode, setRejectMode] = useState<'all' | 'partial'>('all');
  const [partialRejectQty, setPartialRejectQty] = useState<number>(1);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectPhoto, setRejectPhoto] = useState<string | null>(null);

  // Rejection state inside the Approval dialog for remaining pieces
  const [rejectRemaining, setRejectRemaining] = useState(false);
  const [rejectRemainingRemarks, setRejectRemainingRemarks] = useState('');
  const [rejectRemainingPhoto, setRejectRemainingPhoto] = useState<string | null>(null);

  const activeProjectId = editHistoryDialogOpen ? editingHistoryLog?.projectId : detailsDialogOpen ? detailsLog?.projectId : projectSplits[0]?.projectId;
  const { data: slabs } = useGetSlabsQuery(activeProjectId, { skip: !activeProjectId });
  
  // Manual Approval State
  const [manualApprovePieces, { isLoading: isManualApproving }] = useManualApprovePiecesMutation();
  const [manualApprovalOpen, setManualApprovalOpen] = useState(false);
  const [manualProjectId, setManualProjectId] = useState<string>('');
  const [manualStage, setManualStage] = useState<string>('Production');
  const [manualRemarks, setManualRemarks] = useState<string>('');
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [pieceSearchQuery, setPieceSearchQuery] = useState<string>('');

  const { data: manualProjectSlabs, isLoading: isManualSlabsLoading, refetch: refetchManualSlabs } = useGetSlabsQuery(manualProjectId, { skip: !manualProjectId });

  const handleBulkManualApprove = async () => {
    if (selectedPieceIds.length === 0) {
      setToast({ open: true, message: 'Please select at least one piece to approve', severity: 'error' });
      return;
    }
    try {
      await manualApprovePieces({
        projectId: manualProjectId,
        pieceIds: selectedPieceIds,
        stage: manualStage,
        remarks: manualRemarks || `Manual Direct Approval for ${manualStage}`
      }).unwrap();

      setToast({ open: true, message: `Successfully approved ${selectedPieceIds.length} piece(s) for ${manualStage}!`, severity: 'success' });
      setSelectedPieceIds([]);
      if (refetchManualSlabs) refetchManualSlabs();
      refetchApproved();
      refetchPending();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || err?.message || 'Manual approval failed', severity: 'error' });
    }
  };

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success'|'error' });

  const handleApproveClick = async (log: any) => {
    setSelectedLog(log);
    setProjectSplits([{ projectId: log.projectId || '', qty: log.quantityProduced || 0, productId: log.productId || '', productName: log.productName || '', slabId: log.slabId || '', pieceIds: log.pieceIds || [] }]);
    setRejectRemaining(false);
    setRejectRemainingRemarks('');
    setRejectRemainingPhoto(null);
    setApprovalDialogOpen(true);
  };

  const handleRejectClick = (log: any) => {
    const logObj = typeof log === 'object' && log !== null ? log : (pendingLogs || []).find((l: any) => l.id === log);
    setRejectLogId(logObj?.id || log);
    setRejectTargetLog(logObj);
    setRejectMode('all');
    setPartialRejectQty(1);
    setRejectReason('');
    setRejectPhoto(null);
    setRejectDialogOpen(true);
  };

  const handlePhotoUploadHelper = (setter: (val: string | null) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setter(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRejectPhotoUpload = () => handlePhotoUploadHelper(setRejectPhoto);

  const submitReject = async () => {
    if (!rejectLogId) return;
    try {
      const targetLog = rejectTargetLog || (pendingLogs || []).find((l: any) => l.id === rejectLogId);
      const totalQty = Number(targetLog?.quantityProduced) || 1;
      const isPartial = rejectMode === 'partial' && partialRejectQty < totalQty && partialRejectQty > 0;
      const finalRejectQty = isPartial ? partialRejectQty : totalQty;

      let rejectedProductName = targetLog?.productName;
      let rejectedPieceIds = Array.isArray(targetLog?.pieceIds) ? targetLog.pieceIds : [];

      if (isPartial) {
        const baseName = (targetLog?.productName || '').split(' - ')[0].trim();
        if (rejectedPieceIds.length > 0) {
          const targetSlab = slabs?.find((s: any) => s.id === targetLog?.slabId);
          const chosenIds = rejectedPieceIds.slice(0, finalRejectQty);
          const pieceNames = chosenIds.map((id: string) => {
            const piece = targetSlab?.pieces?.find((p: any) => p.id === id);
            return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id.substring(0, 4);
          });
          rejectedProductName = targetSlab ? `${targetSlab.name} - ${pieceNames.join(', ')}` : `${baseName || 'Piece'} - ${pieceNames.join(', ')}`;
          rejectedPieceIds = chosenIds;
        } else {
          rejectedProductName = baseName ? `${baseName} (${finalRejectQty} Pcs)` : `Rejected (${finalRejectQty} Pcs)`;
        }
      }

      await approveLog({ 
        id: rejectLogId, 
        data: { 
          approvalStatus: 'rejected_admin', 
          rejectedQty: finalRejectQty,
          remarks: rejectReason,
          rejectionPhoto: rejectPhoto,
          productName: rejectedProductName,
          pieceIds: rejectedPieceIds,
          startPhotos: {
            ...(targetLog?.startPhotos || {}),
            rejectionPhoto: rejectPhoto
          }
        } 
      }).unwrap();
      
      setToast({ 
        open: true, 
        message: isPartial 
          ? `Rejected ${finalRejectQty} of ${totalQty} pieces. Remaining ${totalQty - finalRejectQty} stay pending.` 
          : 'Log rejected successfully and sent to Manager Dashboard.', 
        severity: 'success' 
      });
      refetchPending();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Failed to reject', severity: 'error' });
    } finally {
      setRejectDialogOpen(false);
      setRejectLogId(null);
      setRejectTargetLog(null);
      setRejectReason('');
      setRejectPhoto(null);
    }
  };

  const handleDeletePendingLog = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this pending log?")) {
      try {
        if (id.includes('-start')) {
          await deleteMachineLog(id.replace('-start', '')).unwrap();
        } else {
          await deleteProductionLog(id).unwrap();
        }
        setToast({ open: true, message: 'Pending log deleted permanently', severity: 'success' });
        refetchPending();
      } catch (err) {
        setToast({ open: true, message: err?.data?.message || 'Failed to delete log', severity: 'error' });
      }
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
      const expectedQty = Number(selectedLog.quantityProduced) || 0;
      const remainingQty = expectedQty - totalSplitQty;

      if (remainingQty < 0) {
        setToast({ open: true, message: `Total assigned items (${totalSplitQty}) cannot exceed reported items (${expectedQty}).`, severity: 'error' });
        return;
      }

      if (remainingQty > 0 && rejectRemaining && !rejectRemainingRemarks.trim()) {
        setToast({ open: true, message: 'Please enter remarks explaining the rejection reason for the remaining pieces.', severity: 'error' });
        return;
      }

      const payload: any = {
        approvalStatus: 'approved',
        splits: validSplits
      };

      if (remainingQty > 0 && rejectRemaining) {
        const allAssignedPieceIds = validSplits.flatMap(s => s.pieceIds || []);
        const originalPieceIds = Array.isArray(selectedLog?.pieceIds) ? selectedLog.pieceIds : [];
        const remainingPieceIds = originalPieceIds.filter((id: string) => !allAssignedPieceIds.includes(id)).slice(0, remainingQty);
        
        let rejectedProductName = '';
        const baseName = (selectedLog?.productName || '').split(' - ')[0].trim();
        if (remainingPieceIds.length > 0) {
          const targetSlab = slabs?.find((s: any) => s.id === validSplits[0]?.slabId || s.id === selectedLog?.slabId);
          const pieceNames = remainingPieceIds.map((id: string) => {
            const piece = targetSlab?.pieces?.find((p: any) => p.id === id);
            return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id.substring(0, 4);
          });
          rejectedProductName = targetSlab ? `${targetSlab.name} - ${pieceNames.join(', ')}` : `${baseName || 'Piece'} - ${pieceNames.join(', ')}`;
        } else {
          rejectedProductName = baseName ? `${baseName} (${remainingQty} Pcs)` : `Rejected (${remainingQty} Pcs)`;
        }

        payload.rejectedPieces = {
          qty: remainingQty,
          remarks: rejectRemainingRemarks,
          rejectionPhoto: rejectRemainingPhoto,
          pieceIds: remainingPieceIds,
          productName: rejectedProductName
        };
      }

      await approveLog({ 
        id: selectedLog.id, 
        data: payload 
      }).unwrap();
      
      refetchApproved();
      setApprovalDialogOpen(false);
      setProjectSplits([{projectId: '', qty: 0}]);
      setRejectRemaining(false);
      setRejectRemainingRemarks('');
      setRejectRemainingPhoto(null);
      setToast({ 
        open: true, 
        message: remainingQty > 0 && rejectRemaining 
          ? `Approved ${totalSplitQty} pcs & Rejected ${remainingQty} pcs (sent to Manager for rework).` 
          : 'Approval saved successfully', 
        severity: 'success' 
      });
      refetchPending();
    } catch (err: any) {
      console.error("Approval submit error:", err);
      setToast({ open: true, message: err?.data?.message || err?.message || 'Approval failed', severity: 'error' });
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

  if (isLoading && !pendingLogs) return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PendingActionsIcon fontSize="large" color="warning" />
          Pending Approvals
        </Typography>

        <Button
          variant="contained"
          startIcon={<FlashOnIcon />}
          onClick={() => {
            setManualApprovalOpen(true);
            if (!manualProjectId && projects && projects.length > 0) {
              setManualProjectId(projects[0].id);
            }
          }}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 800,
            fontSize: '0.95rem',
            px: 2.5,
            py: 1,
            bgcolor: '#059669',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
            '&:hover': { bgcolor: '#047857' }
          }}
        >
          ⚡ Manual Approval
        </Button>
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
                      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        {log.id && (
                          <Chip 
                            label={`#${log.id.slice(-6).toUpperCase()}`}
                            size="small"
                            sx={{ fontWeight: 'bold', fontSize: '0.7rem', bgcolor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}
                          />
                        )}
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
                        {log.remarks && (
                          <Box sx={{ mb: 2, bgcolor: '#FFFBEB', p: 1, borderRadius: 1, border: '1px solid #FEF3C7' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#B45309' }}>Remarks:</Typography>
                            <Typography variant="body2" sx={{ color: '#92400E', whiteSpace: 'pre-wrap' }}>{log.remarks}</Typography>
                          </Box>
                        )}
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

                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                          <Button variant="contained" color="success" sx={{ flex: 1, fontWeight: 'bold' }} onClick={() => handleApproveClick(log)} startIcon={<CheckCircleIcon />}>
                            Approve
                          </Button>
                          <Button variant="outlined" color="error" sx={{ flex: 1, fontWeight: 'bold' }} onClick={() => handleRejectClick(log.id)} startIcon={<CancelIcon />}>
                            Reject
                          </Button>
                          <Tooltip title="Delete Permanently">
                            <IconButton 
                              color="error" 
                              sx={{ border: '1px solid #FFCDD2', bgcolor: '#FFEBEE', borderRadius: 2, '&:hover': { bgcolor: '#FFCDD2' } }} 
                              onClick={() => handleDeletePendingLog(log.id)}
                            >
                              <DeleteIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
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



      {/* Approval Dialog — Multi Project Selection */}
      <Dialog 
        open={approvalDialogOpen} 
        onClose={() => setApprovalDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 0.5 } } }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              {selectedLog?.stage?.startsWith('Polishing') ? 'Approval Polish Log' 
                : selectedLog?.stage?.startsWith('Packing') ? 'Approval Packing Log' 
                : selectedLog?.stage?.startsWith('Dispatch') ? 'Approval Dispatch Log' 
                : selectedLog?.stage?.startsWith('Production') ? 'Approval Production Log'
                : 'Approve Material Log'}
            </Typography>
            {selectedLog?.id && (
              <Chip 
                label={`ID: #${selectedLog.id.slice(-6).toUpperCase()}`}
                size="small" 
                sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 800, fontSize: '0.72rem', border: '1px solid #CBD5E1' }} 
              />
            )}
          </Box>
          {selectedLog && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip 
                label={`Stage: ${selectedLog.stage}`} 
                size="small" 
                sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, fontSize: '0.72rem', height: 22, border: '1px solid #DBEAFE' }} 
              />
              <Chip 
                label={`Item(s): ${selectedLog.quantityProduced || 1} Pcs`} 
                size="small" 
                sx={{ bgcolor: '#F0FDF4', color: '#166534', fontWeight: 700, fontSize: '0.72rem', height: 22, border: '1px solid #BBF7D0' }} 
              />
            </Box>
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
                  const cleanLogStage = (selectedLog?.stage || '').split(' - ')[0].replace(' Work', '').trim();

                  const isPieceEligible = (p: any, slab: any) => {
                    const reqStages = slab.requiredStages || ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'];
                    const hasProd = reqStages.includes('Production');
                    const hasPoli = reqStages.some((s: string) => s.startsWith('Polishing') || s === 'Polishing');
                    const hasPack = reqStages.includes('Packing');
                    const hasDisp = reqStages.includes('Dispatch');

                    // 1. Is this stage required for this slab?
                    let isStageRequired = false;
                    if (cleanLogStage === 'Production') isStageRequired = hasProd;
                    else if (cleanLogStage === 'Polishing') isStageRequired = hasPoli;
                    else if (cleanLogStage === 'Packing') isStageRequired = hasPack;
                    else if (cleanLogStage === 'Dispatch') isStageRequired = hasDisp;
                    else isStageRequired = true;

                    if (!isStageRequired) return false;

                    // 2. What is the preceding required stage for this slab?
                    let precedingStage: string | null = null;
                    if (cleanLogStage === 'Polishing') {
                      precedingStage = hasProd ? 'Production' : null;
                    } else if (cleanLogStage === 'Packing') {
                      if (hasPoli) precedingStage = 'Polishing';
                      else if (hasProd) precedingStage = 'Production';
                    } else if (cleanLogStage === 'Dispatch') {
                      if (hasPack) precedingStage = 'Packing';
                      else if (hasPoli) precedingStage = 'Polishing';
                      else if (hasProd) precedingStage = 'Production';
                    }

                    // Helper to check if a piece has completed a specific stage
                    const isDoneInStage = (piece: any, stageName: string) => {
                      if (!piece) return false;
                      const norm = stageName.split(' - ')[0].replace(' Work', '').trim();

                      if (piece.logs && piece.logs.length > 0) {
                        const hasLog = piece.logs.some((l: any) => {
                          const ls = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
                          return (ls === norm || l.stage?.startsWith(norm)) && (l.status === 'completed' || l.status === 'approved');
                        });
                        if (hasLog) return true;
                      }

                      const pStage = (piece.stage || 'Production').split(' - ')[0].replace(' Work', '').trim();
                      const ORDER = ['Production', 'Polishing', 'Packing', 'Dispatch'];
                      const pIdx = ORDER.indexOf(pStage);
                      const sIdx = ORDER.indexOf(norm);
                      if (pIdx > sIdx) return true;
                      if (pIdx === sIdx && (piece.status === 'completed' || piece.status === 'approved')) return true;

                      return false;
                    };

                    // Current stage must NOT be completed
                    if (isDoneInStage(p, cleanLogStage)) return false;

                    // Preceding stage MUST be completed
                    if (precedingStage && !isDoneInStage(p, precedingStage)) return false;

                    return true;
                  };

                  // Filter slabs for this project:
                  // Only include slabs that require this stage AND have at least 1 eligible piece (or pending slab)
                  const projectSlabs = slabs ? slabs.filter((s: any) => {
                    if (s.projectId !== split.projectId) return false;

                    const reqStages = s.requiredStages || ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'];
                    if (cleanLogStage === 'Production' && !reqStages.includes('Production')) return false;
                    if (cleanLogStage === 'Polishing' && !reqStages.some((rs: string) => rs.startsWith('Polishing') || rs === 'Polishing')) return false;
                    if (cleanLogStage === 'Packing' && !reqStages.includes('Packing')) return false;
                    if (cleanLogStage === 'Dispatch' && !reqStages.includes('Dispatch')) return false;

                    if (s.pieces && s.pieces.length > 0) {
                      const eligible = s.pieces.filter((p: any) => isPieceEligible(p, s));
                      return eligible.length > 0;
                    }

                    if (cleanLogStage === 'Production') return s.status !== 'completed';
                    return true;
                  }) : [];

                  if (projectSlabs.length === 0) {
                    return (
                      <Box sx={{ p: 1.5, bgcolor: '#FFF8E1', borderRadius: 2, border: '1px dashed #FFE082' }}>
                        <Typography variant="body2" color="#B26A00" fontWeight={500}>
                          Notice: No pending pieces found for stage <strong>{selectedLog?.stage || 'this stage'}</strong> under this project. (All items are either not required, already completed, or waiting for prior stages).
                        </Typography>
                      </Box>
                    );
                  }

                  const currentSlab = projectSlabs.find((s: any) => s.id === split.slabId) || (projectSlabs.length === 1 ? projectSlabs[0] : null);
                  if (projectSlabs.length === 1 && !split.slabId) {
                    split.slabId = projectSlabs[0].id;
                    split.productName = projectSlabs[0].name;
                  }

                  const eligiblePiecesForSlab = currentSlab?.pieces ? currentSlab.pieces.filter((p: any) => isPieceEligible(p, currentSlab)) : [];
                  
                  return (
                    <>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Autocomplete
                          fullWidth
                          size="small"
                          options={projectSlabs}
                          getOptionLabel={(option: any) => {
                            const pendingCount = (option.pieces && option.pieces.length > 0)
                              ? option.pieces.filter((p: any) => isPieceEligible(p, option)).length
                              : 1;
                            return `${option.name} (${pendingCount} Pc${pendingCount > 1 ? 's' : ''} Pending)`;
                          }}
                          value={projectSlabs.find((s: any) => s.id === split.slabId) || null}
                          onChange={(e, newValue: any) => {
                            const newSplits = [...projectSplits];
                            if (newValue) {
                              newSplits[idx].slabId = newValue.id;
                              newSplits[idx].productName = newValue.name;
                              const pending = (newValue.pieces && newValue.pieces.length > 0)
                                ? newValue.pieces.filter((p: any) => isPieceEligible(p, newValue)).length
                                : 1;
                              const totalAssignedOther = newSplits.reduce((acc, s, i) => i === idx ? acc : acc + (Number(s.qty) || 0), 0);
                              const remainingExpected = Math.max(1, (Number(selectedLog?.quantityProduced) || 1) - totalAssignedOther);
                              newSplits[idx].qty = Math.min(pending, remainingExpected);
                            } else {
                              newSplits[idx].slabId = '';
                              newSplits[idx].productName = '';
                              newSplits[idx].qty = 0;
                            }
                            newSplits[idx].pieceIds = [];
                            setProjectSplits(newSplits);
                          }}
                          renderOption={(props, option: any) => {
                            const { key, ...restProps } = props as any;
                            const pending = (option.pieces && option.pieces.length > 0)
                              ? option.pieces.filter((p: any) => isPieceEligible(p, option)).length
                              : 1;
                            return (
                              <li key={key} {...restProps}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.5 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{option.name}</Typography>
                                    {option.size && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{option.size}</Typography>}
                                  </Box>
                                  <Chip 
                                    label={`${pending} Pc${pending > 1 ? 's' : ''} Pending`} 
                                    size="small" 
                                    sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 800, fontSize: '0.72rem' }} 
                                  />
                                </Box>
                              </li>
                            );
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

                        {/* Quantity Input */}
                        <TextField
                          size="small"
                          label="Qty (Pcs) *"
                          type="number"
                          value={split.qty || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const newSplits = [...projectSplits];
                            newSplits[idx].qty = val;
                            setProjectSplits(newSplits);
                          }}
                          sx={{ width: 130, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Box>
                      
                      {/* Pieces Dropdown */}
                      {split.slabId && eligiblePiecesForSlab.length > 0 && (() => {
                        const allEligibleIds = eligiblePiecesForSlab.map((p: any) => p.id);
                        const isAllSelected = allEligibleIds.length > 0 && allEligibleIds.every((id: string) => (split.pieceIds || []).includes(id));
                        const isIndeterminate = (split.pieceIds || []).length > 0 && !isAllSelected;

                        const updateSelectedPieces = (newPieceIds: string[]) => {
                          const newSplits = [...projectSplits];
                          newSplits[idx].pieceIds = newPieceIds;
                          newSplits[idx].qty = newPieceIds.length > 0 ? newPieceIds.length : newSplits[idx].qty;
                          
                          const slab = projectSlabs.find((s: any) => s.id === newSplits[idx].slabId);
                          if (newPieceIds.length > 0) {
                            const pieceNames = newPieceIds.map((id: string) => {
                              const piece = slab?.pieces?.find((p: any) => p.id === id);
                              return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id.substring(0, 4);
                            });
                            newSplits[idx].productName = slab ? `${slab.name} - ${pieceNames.join(', ')}` : pieceNames.join(', ');
                          } else {
                            newSplits[idx].productName = slab?.name || '';
                          }

                          setProjectSplits(newSplits);
                        };

                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                Piece Selection ({(split.pieceIds || []).length} / {eligiblePiecesForSlab.length} selected)
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => updateSelectedPieces(isAllSelected ? [] : allEligibleIds)}
                                sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem', borderRadius: 1.5, fontWeight: 'bold', borderColor: '#ed6c02', color: '#ed6c02', '&:hover': { bgcolor: '#FFF3E0' } }}
                              >
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                              </Button>
                            </Box>
                            <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                              <InputLabel id={`select-piece-label-${idx}`}>Select Piece(s) (Optional)</InputLabel>
                              <Select
                                labelId={`select-piece-label-${idx}`}
                                multiple
                                value={split.pieceIds || []}
                                onChange={(e) => {
                                  const val = e.target.value as string[];
                                  if (val.includes('__SELECT_ALL__')) {
                                    updateSelectedPieces(isAllSelected ? [] : allEligibleIds);
                                  } else {
                                    updateSelectedPieces(val);
                                  }
                                }}
                                input={<OutlinedInput label="Select Piece(s) (Optional)" />}
                                renderValue={(selected: any) => {
                                  const filtered = (selected || []).filter((id: string) => id !== '__SELECT_ALL__');
                                  if (filtered.length === 0) return <em>Select Pieces</em>;
                                  const slab = projectSlabs.find((s: any) => s.id === split.slabId);
                                  return filtered.map((id: string) => {
                                    const piece = slab?.pieces?.find((p: any) => p.id === id);
                                    return piece ? `${(piece.productName || `Piece ${piece.pieceNumber}`).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${piece.size ? `(${piece.size.replace(/ x (\d+MM)/i, ' | $1')})` : ''}` : id;
                                  }).join(', ');
                                }}
                              >
                                <MenuItem value="__SELECT_ALL__" sx={{ bgcolor: '#FFF8E1', borderBottom: '1px solid #FFE082', fontWeight: 'bold' }}>
                                  <Checkbox 
                                    checked={isAllSelected}
                                    indeterminate={isIndeterminate}
                                    sx={{ color: '#ed6c02', '&.Mui-checked': { color: '#ed6c02' }, '&.MuiCheckbox-indeterminate': { color: '#ed6c02' } }}
                                  />
                                  <ListItemText 
                                    primary={`Select All (${eligiblePiecesForSlab.length} Pieces)`}
                                    primaryTypographyProps={{ fontWeight: 'bold', color: '#e65100' }}
                                  />
                                </MenuItem>
                                {eligiblePiecesForSlab.map((p: any) => (
                                  <MenuItem key={p.id} value={p.id}>
                                    <Checkbox checked={(split.pieceIds || []).indexOf(p.id) > -1} />
                                    <ListItemText 
                                      primary={`${(p.productName || 'Piece ' + p.pieceNumber).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${p.size ? `(${p.size.replace(/ x (\\d+MM)/i, ' | $1')})` : ''}`} 
                                      secondary={`Stage: ${p.stage || 'Production'} • ${p.status === 'completed' ? 'Ready for next stage' : 'In Progress'}`}
                                      sx={{ color: '#ed6c02', fontWeight: 'bold' }} 
                                    />
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                        );
                      })()}
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

          {/* Partial / Remaining Piece Rejection Section */}
          {(() => {
            const totalSplitQty = projectSplits.reduce((acc, s) => acc + (Number(s.qty) || 0), 0);
            const expectedQty = Number(selectedLog?.quantityProduced) || 0;
            const remainingQty = expectedQty - totalSplitQty;

            if (remainingQty > 0) {
              return (
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF1F2', border: '1.5px dashed #FDA4AF', borderRadius: 3, mt: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReportProblemIcon sx={{ color: '#E11D48', fontSize: 22 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#9F1239' }}>
                        Remaining Unassigned: {remainingQty} Piece(s)
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          checked={rejectRemaining} 
                          onChange={(e) => setRejectRemaining(e.target.checked)}
                          sx={{ color: '#E11D48', '&.Mui-checked': { color: '#E11D48' } }} 
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#BE123C' }}>
                          Reject Remaining {remainingQty} Pcs (Send for Rework)
                        </Typography>
                      }
                    />
                  </Box>

                  {rejectRemaining ? (
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#9F1239', fontWeight: 600 }}>
                        These {remainingQty} rejected piece(s) will automatically move to the Manager App under "Admin Rejected Tasks" with your remarks and defect photograph.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label="Rejection Reason / Defect Remarks *"
                        placeholder="e.g. Dimensions mismatch / surface scratch / chipped edge..."
                        value={rejectRemainingRemarks}
                        onChange={(e) => setRejectRemainingRemarks(e.target.value)}
                        sx={{ bgcolor: '#FFFFFF', borderRadius: 2 }}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<PhotoCameraIcon />}
                          onClick={() => handlePhotoUploadHelper(setRejectRemainingPhoto)}
                          sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                        >
                          {rejectRemainingPhoto ? 'Change Defect Photo' : 'Capture / Upload Defect Photo'}
                        </Button>
                        {rejectRemainingPhoto && (
                          <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <img src={rejectRemainingPhoto} alt="Defect" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #E11D48' }} />
                            <IconButton
                              size="small"
                              onClick={() => setRejectRemainingPhoto(null)}
                              sx={{ position: 'absolute', top: -6, right: -6, bgcolor: '#E11D48', color: '#FFF', width: 18, height: 18, '&:hover': { bgcolor: '#9F1239' } }}
                            >
                              <CloseIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                      Note: If not marked for rejection, the remaining {remainingQty} pcs will stay in the Pending queue for future project assignment.
                    </Typography>
                  )}
                </Paper>
              );
            }
            return null;
          })()}
          </>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setApprovalDialogOpen(false)} color="inherit">Cancel</Button>
            {(() => {
              const totalSplitQty = projectSplits.reduce((acc, s) => acc + (Number(s.qty) || 0), 0);
              const expectedQty = Number(selectedLog?.quantityProduced) || 0;
              const remainingQty = expectedQty - totalSplitQty;

              return (
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={submitApproval}
                  disabled={!projectSplits.some(s => s.projectId && s.qty > 0) || (remainingQty > 0 && rejectRemaining && !rejectRemainingRemarks.trim()) || isApproving}
                  sx={{ fontWeight: 'bold' }}
                >
                  {isApproving 
                    ? 'Processing...' 
                    : remainingQty > 0 && rejectRemaining 
                    ? `Approve (${totalSplitQty} Pcs) & Reject (${remainingQty} Pcs)` 
                    : remainingQty > 0 
                    ? `Approve Partial (${totalSplitQty} Pcs)` 
                    : 'Confirm Approval'}
                </Button>
              );
            })()}
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

              {editingHistoryLog.slabId && slabs && slabs.find((s: any) => s.id === editingHistoryLog.slabId)?.pieces?.length > 0 && (() => {
                const targetSlab = slabs.find((s: any) => s.id === editingHistoryLog.slabId);
                const eligiblePieces = targetSlab?.pieces?.filter((p: any) => {
                  const stages = ['Production', 'Polishing', 'Packing', 'Dispatch'];
                  const logStage = (editingHistoryLog?.stage || '').replace(' Work', '').trim();
                  const pStage = (p.stage || 'Production').replace(' Work', '').trim();
                  const pStageIdx = stages.indexOf(pStage);
                  const logStageIdx = stages.indexOf(logStage);
                  if (logStageIdx === -1) return true;
                  if (pStageIdx > logStageIdx) return false;
                  if (pStageIdx === logStageIdx && p.status === 'completed' && !(editingHistoryLog.pieceIds || []).includes(p.id)) return false;
                  return true;
                }) || [];

                const allPieceIds = eligiblePieces.map((p: any) => p.id);
                const isAllSelected = allPieceIds.length > 0 && allPieceIds.every((id: string) => (editingHistoryLog.pieceIds || []).includes(id));
                const isIndeterminate = (editingHistoryLog.pieceIds || []).length > 0 && !isAllSelected;

                const updateHistoryPieces = (newPieceIds: string[]) => {
                  let newProductName = editingHistoryLog.productName;
                  if (newPieceIds.length > 0) {
                    const pieceNames = newPieceIds.map((id: string) => {
                      const piece = targetSlab?.pieces?.find((p: any) => p.id === id);
                      return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id.substring(0, 4);
                    });
                    newProductName = targetSlab ? `${targetSlab.name} - ${pieceNames.join(', ')}` : pieceNames.join(', ');
                  } else {
                    newProductName = targetSlab?.name || '';
                  }
                  setEditingHistoryLog({ 
                    ...editingHistoryLog, 
                    pieceIds: newPieceIds, 
                    quantityProduced: newPieceIds.length > 0 ? newPieceIds.length : editingHistoryLog.quantityProduced,
                    productName: newProductName
                  });
                };

                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        Piece Selection ({(editingHistoryLog.pieceIds || []).length} / {eligiblePieces.length} selected)
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => updateHistoryPieces(isAllSelected ? [] : allPieceIds)}
                        sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem', borderRadius: 1.5, fontWeight: 'bold', borderColor: '#ed6c02', color: '#ed6c02', '&:hover': { bgcolor: '#FFF3E0' } }}
                      >
                        {isAllSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </Box>
                    <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                      <InputLabel id={`edit-select-piece-label`}>Select Piece(s) (Optional)</InputLabel>
                      <Select
                        labelId={`edit-select-piece-label`}
                        multiple
                        value={editingHistoryLog.pieceIds || []}
                        onChange={(e) => {
                          const val = e.target.value as string[];
                          if (val.includes('__SELECT_ALL__')) {
                            updateHistoryPieces(isAllSelected ? [] : allPieceIds);
                          } else {
                            updateHistoryPieces(val);
                          }
                        }}
                        input={<OutlinedInput label="Select Piece(s) (Optional)" />}
                        renderValue={(selected: any) => {
                          const filtered = (selected || []).filter((id: string) => id !== '__SELECT_ALL__');
                          if (filtered.length === 0) return <em>Select Pieces</em>;
                          const slab = slabs.find((s: any) => s.id === editingHistoryLog.slabId);
                          return filtered.map((id: string) => {
                            const piece = slab?.pieces?.find((p: any) => p.id === id);
                            return piece ? `${(piece.productName || `Piece ${piece.pieceNumber}`).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${piece.size ? `(${piece.size.replace(/ x (\d+MM)/i, ' | $1')})` : ''}` : id;
                          }).join(', ');
                        }}
                      >
                        <MenuItem value="__SELECT_ALL__" sx={{ bgcolor: '#FFF8E1', borderBottom: '1px solid #FFE082', fontWeight: 'bold' }}>
                          <Checkbox 
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            sx={{ color: '#ed6c02', '&.Mui-checked': { color: '#ed6c02' }, '&.MuiCheckbox-indeterminate': { color: '#ed6c02' } }}
                          />
                          <ListItemText 
                            primary={`Select All (${eligiblePieces.length} Pieces)`}
                            primaryTypographyProps={{ fontWeight: 'bold', color: '#e65100' }}
                          />
                        </MenuItem>
                        {eligiblePieces.map((p: any) => (
                          <MenuItem key={p.id} value={p.id}>
                            <Checkbox checked={(editingHistoryLog.pieceIds || []).indexOf(p.id) > -1} />
                            <ListItemText primary={`${(p.productName || 'Piece ' + p.pieceNumber).replace(' (Cut Piece)', '').replace(' (Full Slab)', '')} ${p.size ? `(${p.size.replace(/ x (\\d+MM)/i, ' | $1')})` : ''}`} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                );
              })()}

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
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelIcon color="error" />
          Reject Item / Piece Log
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Please enter the reason for rejecting this work. Rejected items immediately reflect in the Manager App under "Admin Rejected Tasks" with your remarks and photo for rework.
          </Typography>

          {rejectTargetLog && Number(rejectTargetLog.quantityProduced) > 1 && (
            <Box sx={{ mb: 2.5, p: 2, bgcolor: '#FEF2F2', borderRadius: 2.5, border: '1px solid #FECDD3' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991B1B', mb: 1 }}>
                Total Reported Items: {rejectTargetLog.quantityProduced} Pieces
              </Typography>
              <RadioGroup
                row
                value={rejectMode}
                onChange={(e) => {
                  const mode = e.target.value as 'all' | 'partial';
                  setRejectMode(mode);
                  if (mode === 'partial' && partialRejectQty >= Number(rejectTargetLog.quantityProduced)) {
                    setPartialRejectQty(1);
                  }
                }}
              >
                <FormControlLabel 
                  value="all" 
                  control={<Radio color="error" />} 
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Reject All ({rejectTargetLog.quantityProduced} Pcs)</Typography>} 
                />
                <FormControlLabel 
                  value="partial" 
                  control={<Radio color="error" />} 
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Reject Specific Quantity</Typography>} 
                />
              </RadioGroup>

              {rejectMode === 'partial' && (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    type="number"
                    label="Quantity to Reject"
                    value={partialRejectQty}
                    onChange={(e) => {
                      const maxVal = Number(rejectTargetLog.quantityProduced) - 1;
                      const val = Math.max(1, Math.min(maxVal, Number(e.target.value) || 1));
                      setPartialRejectQty(val);
                    }}
                    inputProps={{ min: 1, max: Number(rejectTargetLog.quantityProduced) - 1 }}
                    sx={{ width: 160, bgcolor: '#FFFFFF', borderRadius: 2 }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                    {Number(rejectTargetLog.quantityProduced) - partialRejectQty} Pcs will remain in pending queue for approval.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            label="Rejection Reason / Defect Remarks *"
            placeholder="Explain why this piece/work is rejected so the manager/worker can redo it properly..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ p: 2, border: '2px dashed #FCA5A5', borderRadius: 3, bgcolor: '#FEF2F2', textAlign: 'center' }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<PhotoCameraIcon />}
              onClick={() => handlePhotoUploadHelper(setRejectPhoto)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
            >
              {rejectPhoto ? 'Change Defect Photo' : 'Upload / Capture Defect Photo'}
            </Button>
            {rejectPhoto && (
              <Box sx={{ mt: 2, position: 'relative', display: 'inline-block' }}>
                <img src={rejectPhoto} alt="Rejection Photo" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, border: '2px solid #DC2626' }} />
                <IconButton
                  size="small"
                  onClick={() => setRejectPhoto(null)}
                  sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#DC2626', color: '#FFF', '&:hover': { bgcolor: '#991B1B' } }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setRejectDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={submitReject} variant="contained" color="error" disabled={!rejectReason.trim()} sx={{ fontWeight: 'bold' }}>
            {rejectMode === 'partial' && rejectTargetLog && Number(rejectTargetLog.quantityProduced) > 1
              ? `Reject ${partialRejectQty} Piece(s)`
              : 'Reject Log'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MANUAL DIRECT APPROVAL MODAL */}
      <Dialog 
        open={manualApprovalOpen} 
        onClose={() => setManualApprovalOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', bgcolor: '#F8FAFC' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: '#ECFDF5', color: '#059669', borderRadius: 2.5, display: 'flex' }}>
              <FlashOnIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                Manual Direct Approval
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                Select Active Work Order project, pick slabs & pieces, and approve them directly.
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setManualApprovalOpen(false)} size="small" sx={{ bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          {/* STEP 1: PROJECT SELECTION & STAGE CONFIG */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FolderSpecialIcon sx={{ fontSize: 18, color: '#059669' }} /> Select Active Project *
              </Typography>
              <Autocomplete
                options={projects || []}
                getOptionLabel={(p: any) => `${p.name || 'Unnamed'} ${p.projectId ? `(${p.projectId})` : ''} - ${p.clientName || 'Client'}`}
                value={(projects || []).find((p: any) => p.id === manualProjectId) || null}
                onChange={(_, newValue: any) => {
                  setManualProjectId(newValue ? newValue.id : '');
                  setSelectedPieceIds([]);
                }}
                renderOption={(props: any, option: any) => {
                  const { key, ...restProps } = props;
                  return (
                    <li key={key} {...restProps}>
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>{option.name || 'Unnamed Project'}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>Client: {option.clientName || 'N/A'} {option.projectId ? `• ID: ${option.projectId}` : ''}</Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    size="small" 
                    placeholder="Search project by name or ID..."
                    sx={{ bgcolor: '#FFFFFF', borderRadius: 2 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AssignmentTurnedInIcon sx={{ fontSize: 18, color: '#0284C7' }} /> Target Approval Stage *
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={manualStage}
                  onChange={(e) => setManualStage(e.target.value)}
                  sx={{ bgcolor: '#FFFFFF', borderRadius: 2, fontWeight: 700 }}
                >
                  <MenuItem value="Production">⚙️ Production Work</MenuItem>
                  <MenuItem value="Polishing">✨ Polishing Work</MenuItem>
                  <MenuItem value="Packing">📦 Packing Work</MenuItem>
                  <MenuItem value="Dispatch">🚚 Dispatch Ready</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* STEP 2: SEARCH & SELECTION CONTROLS */}
          {manualProjectId && (
            <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <TextField
                  size="small"
                  placeholder="Search pieces/sub-pieces by name or serial..."
                  value={pieceSearchQuery}
                  onChange={(e) => setPieceSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: '#94A3B8', mr: 1, fontSize: 20 }} />
                  }}
                  sx={{ width: { xs: '100%', sm: 300 }, bgcolor: '#FFFFFF', borderRadius: 2 }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  {(() => {
                    const allPieces = (manualProjectSlabs || []).flatMap((s: any) => s.pieces || []);
                    const allPieceIds = allPieces.map((p: any) => p.id);
                    const isAllSelected = allPieceIds.length > 0 && allPieceIds.every((id: string) => selectedPieceIds.includes(id));
                    
                    return (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DoneAllIcon />}
                          onClick={() => {
                            if (isAllSelected) {
                              setSelectedPieceIds([]);
                            } else {
                              setSelectedPieceIds(allPieceIds);
                            }
                          }}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#334155' }}
                        >
                          {isAllSelected ? 'Deselect All' : `Select All (${allPieceIds.length})`}
                        </Button>
                        <Chip 
                          label={`Selected: ${selectedPieceIds.length} / ${allPieceIds.length} Pieces`} 
                          color={selectedPieceIds.length > 0 ? 'success' : 'default'}
                          sx={{ fontWeight: 800, borderRadius: 2 }}
                        />
                      </>
                    );
                  })()}
                </Box>
              </Box>
            </Paper>
          )}

          {/* STEP 3: HIERARCHICAL SLABS & PIECES VIEW */}
          {!manualProjectId ? (
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 4, border: '2px dashed #E2E8F0' }}>
              <FolderSpecialIcon sx={{ fontSize: 50, color: '#94A3B8', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#475569' }}>Please select a Project above</Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                Choose an active work order to view its Slabs, Pieces, and Sub-pieces for approval.
              </Typography>
            </Paper>
          ) : isManualSlabsLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
              <CircularProgress size={40} sx={{ color: '#059669' }} />
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 700 }}>Loading project slabs & pieces...</Typography>
            </Box>
          ) : !manualProjectSlabs || manualProjectSlabs.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#FEF3C7', borderRadius: 3, border: '1px solid #FCD34D' }}>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#92400E' }}>No Slabs Found for this Project</Typography>
              <Typography variant="caption" sx={{ color: '#78350F' }}>
                Please create slabs and pieces under this project in Active Work Orders before running manual approvals.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {manualProjectSlabs.map((slab: any) => {
                const slabPieces = (slab.pieces || []).filter((p: any) => {
                  if (!pieceSearchQuery.trim()) return true;
                  const query = pieceSearchQuery.toLowerCase();
                  return (
                    (p.productName && p.productName.toLowerCase().includes(query)) ||
                    (p.pieceNumber && String(p.pieceNumber).includes(query)) ||
                    (slab.name && slab.name.toLowerCase().includes(query))
                  );
                });

                const slabPieceIds = (slab.pieces || []).map((p: any) => p.id);
                const isSlabAllSelected = slabPieceIds.length > 0 && slabPieceIds.every((id: string) => selectedPieceIds.includes(id));
                const isSlabPartiallySelected = slabPieceIds.some((id: string) => selectedPieceIds.includes(id)) && !isSlabAllSelected;

                return (
                  <Paper 
                    key={slab.id} 
                    elevation={0} 
                    sx={{ 
                      borderRadius: 3.5, 
                      border: '1px solid #E2E8F0', 
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Slab Header Bar */}
                    <Box sx={{ p: 2, bgcolor: '#F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid #E2E8F0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Checkbox
                          size="small"
                          checked={isSlabAllSelected}
                          indeterminate={isSlabPartiallySelected}
                          onChange={() => {
                            if (isSlabAllSelected) {
                              setSelectedPieceIds(prev => prev.filter(id => !slabPieceIds.includes(id)));
                            } else {
                              setSelectedPieceIds(prev => Array.from(new Set([...prev, ...slabPieceIds])));
                            }
                          }}
                          sx={{ p: 0.5, color: '#059669', '&.Mui-checked': { color: '#059669' } }}
                        />
                        <LayersIcon sx={{ color: '#B38B36', fontSize: 22 }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {slab.name || 'Unnamed Slab'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                            Size: {slab.size || 'Standard'} • Stages: {(slab.requiredStages || ['Production', 'Polishing', 'Packing', 'Dispatch']).join(' → ')}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Chip 
                          size="small" 
                          label={`${slab.pieces?.length || 0} Total Pieces`} 
                          sx={{ bgcolor: '#FFFFFF', fontWeight: 800, border: '1px solid #CBD5E1' }} 
                        />
                        <Button
                          size="small"
                          onClick={() => {
                            if (isSlabAllSelected) {
                              setSelectedPieceIds(prev => prev.filter(id => !slabPieceIds.includes(id)));
                            } else {
                              setSelectedPieceIds(prev => Array.from(new Set([...prev, ...slabPieceIds])));
                            }
                          }}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', color: '#059669' }}
                        >
                          {isSlabAllSelected ? 'Deselect Slab' : 'Select Slab Pieces'}
                        </Button>
                      </Box>
                    </Box>

                    {/* Pieces Table */}
                    {slabPieces.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          No pieces found matching filter under this slab.
                        </Typography>
                      </Box>
                    ) : (
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                          <TableRow>
                            <TableCell sx={{ width: 50, py: 1 }} align="center">Select</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1 }}>Piece / Sub-Piece Name</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1 }}>Piece #</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1 }}>Dimensions / Size</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1 }}>Current Stage</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {slabPieces.map((piece: any, pIdx: number) => {
                            const isSelected = selectedPieceIds.includes(piece.id);
                            return (
                              <TableRow 
                                key={piece.id || pIdx} 
                                hover 
                                onClick={() => {
                                  setSelectedPieceIds(prev => 
                                    prev.includes(piece.id) 
                                      ? prev.filter(id => id !== piece.id) 
                                      : [...prev, piece.id]
                                  );
                                }}
                                sx={{ 
                                  cursor: 'pointer',
                                  bgcolor: isSelected ? '#ECFDF5' : (pIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA')
                                }}
                              >
                                <TableCell align="center" sx={{ py: 1 }}>
                                  <Checkbox
                                    size="small"
                                    checked={isSelected}
                                    sx={{ p: 0, color: '#059669', '&.Mui-checked': { color: '#059669' } }}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                                    {piece.productName || `Piece ${piece.pieceNumber}`}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <Chip size="small" label={`#${piece.pieceNumber}`} sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                                    {piece.size || 'Standard'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <Chip 
                                    size="small" 
                                    label={piece.stage || 'Production'} 
                                    sx={{ 
                                      fontWeight: 700, 
                                      fontSize: '0.7rem',
                                      bgcolor: piece.stage === 'Dispatch' ? '#EFF6FF' : piece.stage === 'Packing' ? '#FDF4FF' : '#F0FDF4',
                                      color: piece.stage === 'Dispatch' ? '#1D4ED8' : piece.stage === 'Packing' ? '#9333EA' : '#15803D'
                                    }} 
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <Chip 
                                    size="small" 
                                    label={piece.status === 'completed' ? 'Completed' : 'Pending'} 
                                    color={piece.status === 'completed' ? 'success' : 'warning'}
                                    variant={piece.status === 'completed' ? 'filled' : 'outlined'}
                                    sx={{ fontWeight: 800, fontSize: '0.68rem' }} 
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}

          {/* STEP 4: REMARKS */}
          {manualProjectId && (
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Admin Approval Remarks (Optional)"
                placeholder="e.g. Manually checked and approved by Admin for Production..."
                value={manualRemarks}
                onChange={(e) => setManualRemarks(e.target.value)}
                sx={{ bgcolor: '#FFFFFF', borderRadius: 2 }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #F1F5F9', bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={() => setManualApprovalOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>
            Close
          </Button>

          <Button
            variant="contained"
            color="success"
            disabled={selectedPieceIds.length === 0 || isManualApproving || !manualProjectId}
            startIcon={isManualApproving ? <CircularProgress size={18} color="inherit" /> : <DoneAllIcon />}
            onClick={handleBulkManualApprove}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              px: 3,
              py: 1,
              bgcolor: '#059669',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            {isManualApproving ? 'Approving...' : `Approve Selected (${selectedPieceIds.length} Pieces) → ${manualStage}`}
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
