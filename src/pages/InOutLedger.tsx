import React, { useState } from 'react';
import { Box, Typography, Paper, Card, CardContent, Chip, CircularProgress, Grid, CardMedia, Dialog, Button, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select, OutlinedInput, Checkbox, ListItemText, Snackbar, Alert, IconButton, FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import VendorsList from './VendorsList';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import OutputIcon from '@mui/icons-material/Output';
import InputIcon from '@mui/icons-material/Input';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { useGetActiveOutLogsQuery, useGetPendingApprovalsQuery, useGetApprovedLogsQuery, useApproveMaterialLogMutation, useGetProjectsQuery, useGetSlabsQuery, useDeleteProductionLogMutation, useCreateMaterialLogMutation, useGetVendorsQuery } from '../store/apiSlice';

const InOutLedger: React.FC = () => {
  const { data: activeOutLogsData, isLoading: outLogsLoading, refetch } = useGetActiveOutLogsQuery(undefined);
  const { data: pendingLogs, isLoading: pendingLoading } = useGetPendingApprovalsQuery(undefined);
  const { data: approvedLogsData, isLoading: approvedLoading } = useGetApprovedLogsQuery(undefined);
  const { data: projects } = useGetProjectsQuery();
  const [approveLog, { isLoading: isApproving }] = useApproveMaterialLogMutation();
  const [deleteProductionLog] = useDeleteProductionLogMutation();

  const { data: vendorsData } = useGetVendorsQuery({});
  const [createMaterialLog] = useCreateMaterialLogMutation();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ vendorId: '', transactionType: 'OUT', stage: 'Production', quantity: '', vehicleNumber: '' });
  
  const handleManualEntrySubmit = async () => {
    try {
      await createMaterialLog({
        ...manualForm,
        quantityProduced: Number(manualForm.quantity),
        assigneeType: 'vendor'
      }).unwrap();
      setToast({ open: true, message: 'Log created successfully', severity: 'success' });
      setManualEntryOpen(false);
      setManualForm({ vendorId: '', transactionType: 'OUT', stage: 'Production', quantity: '', vehicleNumber: '' });
      refetch();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Failed to create log', severity: 'error' });
    }
  };

  const activeOutLogs = (activeOutLogsData || []).filter((log: any) => !!log.transactionType);
  const pendingMaterialLogs = (pendingLogs || []).filter((log: any) => !!log.transactionType);
  const completedMaterialLogs = (approvedLogsData || []).filter((log: any) => !!log.transactionType);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [projectSplits, setProjectSplits] = useState<{projectId: string, qty: number, productId?: string, productName?: string, slabId?: string, pieceIds?: string[], stage?: string, directEntry?: boolean}>([{projectId: '', qty: 0, directEntry: false}]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success'|'error' });
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const today = new Date();
  const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const currentFY = `FY ${currentYear}-${currentYear + 1}`;
  const currentMonthStr = `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedFY, setSelectedFY] = useState<string>(currentFY);

  const activeProjectId = projectSplits[0]?.projectId;
  const { data: slabs } = useGetSlabsQuery(activeProjectId, { skip: !activeProjectId });

  const handleApproveClick = (log: any) => {
    setSelectedLog(log);
    setProjectSplits([{ projectId: log.projectId || '', qty: log.quantityProduced || 0, productId: log.productId || '', productName: log.productName || '', slabId: log.slabId || '', pieceIds: log.pieceIds || [] }]);
    setApprovalDialogOpen(true);
  };

  const handleRejectClick = async (logId: string) => {
    try {
      await approveLog({ id: logId, data: { approvalStatus: 'rejected' } }).unwrap();
      setToast({ open: true, message: 'Log Rejected successfully', severity: 'success' });
      refetch();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Failed to reject', severity: 'error' });
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      try {
        await deleteProductionLog(logId).unwrap();
        setToast({ open: true, message: 'Log deleted successfully', severity: 'success' });
      } catch (err: any) {
        setToast({ open: true, message: err?.data?.message || 'Failed to delete log', severity: 'error' });
      }
    }
  };

  const submitApproval = async () => {
    try {
      const validSplits = projectSplits.filter(s => s.projectId && s.qty > 0);
      const totalSplitQty = validSplits.reduce((acc, split) => acc + (Number(split.qty) || 0), 0);
      const hasPieces = validSplits.some(s => s.pieceIds && s.pieceIds.length > 0);
      
      if (!hasPieces && totalSplitQty > selectedLog.quantityProduced) {
        setToast({ open: true, message: `Total split item count (${totalSplitQty}) cannot exceed original item count (${selectedLog.quantityProduced}).`, severity: 'error' });
        return;
      }
      if (validSplits.length === 0) {
        setToast({ open: true, message: 'Please select at least one project and enter item count.', severity: 'error' });
        return;
      }

      await approveLog({ 
        id: selectedLog.id, 
        data: { 
          approvalStatus: 'approved', 
          splits: validSplits
        } 
      }).unwrap();
      
      setApprovalDialogOpen(false);
      setProjectSplits([{projectId: '', qty: 0}]);
      setToast({ open: true, message: 'Approval saved successfully', severity: 'success' });
      refetch();
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Approval failed', severity: 'error' });
    }
  };

  if (outLogsLoading || pendingLoading || approvedLoading) return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;

  // Consolidate logs
  const allLogsMap = new Map();
  [...pendingMaterialLogs, ...completedMaterialLogs].forEach((log: any) => {
    allLogsMap.set(log.id, log);
  });
  const allLogs = Array.from(allLogsMap.values())
    .filter((log: any) => log.assigneeType === 'vendor' || !!log.vendorId) // Only vendor IN/OUT
    .filter((log: any) => {
      const d = new Date(log.createdAt);
      const logFYStart = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      return `FY ${logFYStart}-${logFYStart + 1}` === selectedFY;
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group by Month
  const groupedByMonth = allLogs.reduce((acc: any, log: any) => {
    const d = new Date(log.createdAt);
    const monthStr = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
    if (!acc[monthStr]) acc[monthStr] = [];
    acc[monthStr].push(log);
    return acc;
  }, {});

  const selectedFYStartYear = parseInt(selectedFY.split(' ')[1].split('-')[0]);
  const fyMonths = [
    { label: 'April', year: selectedFYStartYear },
    { label: 'May', year: selectedFYStartYear },
    { label: 'June', year: selectedFYStartYear },
    { label: 'July', year: selectedFYStartYear },
    { label: 'August', year: selectedFYStartYear },
    { label: 'September', year: selectedFYStartYear },
    { label: 'October', year: selectedFYStartYear },
    { label: 'November', year: selectedFYStartYear },
    { label: 'December', year: selectedFYStartYear },
    { label: 'January', year: selectedFYStartYear + 1 },
    { label: 'February', year: selectedFYStartYear + 1 },
    { label: 'March', year: selectedFYStartYear + 1 }
  ];

  const fyOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `FY ${y}-${y + 1}`;
  });

  const renderUnifiedLogGrid = (logsToRender: any[]) => (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', borderRadius: 2 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>DATE</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>QTY</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>STAGE</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>VEHICLE NO.</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>VENDOR/STAFF</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>TYPE</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>STATUS</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>ACTIONS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logsToRender.map((log: any) => (
            <TableRow key={log.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: '#fdfdfd' }, transition: '0.2s', borderBottom: '1px solid #f0f0f0' }}>
              <TableCell sx={{ color: '#888', fontWeight: 500, borderBottom: 'none' }}>
                {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </TableCell>
              
              <TableCell sx={{ fontWeight: '900', fontSize: '1rem', color: '#222', borderBottom: 'none' }}>
                {log.quantityProduced}
              </TableCell>
              
              <TableCell sx={{ fontWeight: 'bold', color: '#444', borderBottom: 'none' }}>
                {log.stage}
              </TableCell>
              
              <TableCell sx={{ fontWeight: 'bold', color: '#111', borderBottom: 'none' }}>
                {log.vehicleNumber || '—'}
              </TableCell>
              
              <TableCell sx={{ color: '#666', fontWeight: 600, borderBottom: 'none' }}>
                {log.vendorName || log.worker?.name || '—'}
              </TableCell>
              
              <TableCell sx={{ borderBottom: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: log.transactionType === 'OUT' ? '#ed6c02' : '#0288d1', fontWeight: '800', fontSize: '0.9rem' }}>
                  {log.transactionType === 'OUT' ? <OutputIcon fontSize="small" /> : <InputIcon fontSize="small" />}
                  {log.transactionType === 'OUT' ? 'OUT' : 'IN'}
                </Box>
              </TableCell>

              <TableCell sx={{ borderBottom: 'none' }}>
                <IconButton onClick={() => setPreviewPhoto(log.photoUrl || log.startPhotos?.machine || 'no-photo')} size="small" color="primary">
                  <VisibilityIcon />
                </IconButton>
              </TableCell>

              <TableCell sx={{ borderBottom: 'none' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {log.approvalStatus === 'pending' && (
                    <Button variant="contained" color="success" size="small" onClick={() => handleApproveClick(log)} sx={{ minWidth: 0, p: 0.5 }}>
                      <CheckCircleIcon fontSize="small" />
                    </Button>
                  )}
                  <IconButton onClick={() => {}} size="small" color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteLog(log.id)} size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <FolderSpecialIcon fontSize="large" color="primary" /> In/Out Ledger
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ ml: 6 }}>Track material sent to vendors and stock returned after processing</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setManualEntryOpen(true)}>
            + Manual Entry
          </Button>
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: '#fff' }}>
            <Select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}>
              {fyOptions.map(fy => (
                <MenuItem key={fy} value={fy}>{fy}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: '#fff' }}>
            <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} displayEmpty>
              <MenuItem value="All">All Months</MenuItem>
              {fyMonths.map(m => (
                <MenuItem key={`${m.label} ${m.year}`} value={`${m.label} ${m.year}`}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, val) => setCurrentTab(val)}>
          <Tab label="Purchase / In-Out History" sx={{ fontWeight: 'bold' }} />
          <Tab label="Vendors / Suppliers" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {currentTab === 1 && (
        <VendorsList hideHeader={true} selectedMonth={selectedMonth} selectedFY={selectedFY} />
      )}

      {currentTab === 0 && (
        <Box>
          {allLogs.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
              <FolderSpecialIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="textSecondary">No material logs found for this financial year.</Typography>
            </Paper>
          ) : (
            <Box>
              {(selectedMonth === 'All' ? fyMonths : fyMonths.filter(m => `${m.label} ${m.year}` === selectedMonth))
                .map(m => {
                  const monthKey = `${m.label} ${m.year}`;
                  const logs = groupedByMonth[monthKey];
                  if (!logs || logs.length === 0) return null;
                  return (
                    <Box key={monthKey} sx={{ mb: 5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#333', borderBottom: '2px solid #eee', pb: 1 }}>
                        {monthKey}
                      </Typography>
                      {renderUnifiedLogGrid(logs)}
                    </Box>
                  );
                })}
            </Box>
          )}
        </Box>
      )}

      {/* Approval Dialog */}
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
          {projectSplits.map((split, idx) => {
            const projectProducts = split.projectId ? (projects?.find((p: any) => p.id === split.projectId)?.products || []) : [];
            const projectSlabs = split.projectId ? (slabs?.filter((s: any) => s.projectId === split.projectId) || []) : [];
            return (
              <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4, p: 2, border: '1px solid #eee', borderRadius: 2 }}>


                <TextField select label="Assign Project" fullWidth size="small" value={split.projectId} onChange={(e) => {
                  const newSplits = [...projectSplits];
                  newSplits[idx].projectId = e.target.value;
                  const proj = projects?.find((p: any) => p.id === e.target.value);
                  const defaultSlabProd = proj?.products?.find((p: any) => p.category.toLowerCase() === 'slab');
                  if (defaultSlabProd) {
                    newSplits[idx].productId = defaultSlabProd.id;
                    newSplits[idx].productName = defaultSlabProd.category;
                    const matchedSlabs = slabs ? slabs.filter((s: any) => s.projectId === e.target.value && s.name.startsWith(defaultSlabProd.category)) : [];
                    if (matchedSlabs.length === 1) {
                      newSplits[idx].slabId = matchedSlabs[0].id;
                    } else {
                      newSplits[idx].slabId = '';
                    }
                  } else {
                    newSplits[idx].productId = '';
                    newSplits[idx].productName = '';
                    newSplits[idx].slabId = '';
                  }
                  newSplits[idx].pieceIds = [];
                  setProjectSplits(newSplits);
                }}>
                  <MenuItem value="" disabled>Select Project</MenuItem>
                  {projects?.map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>{p.projectId} - {p.clientName}</MenuItem>
                  ))}
                </TextField>

                <TextField label="Quantity to Apply" type="number" fullWidth size="small" value={split.qty || ''} onChange={(e) => {
                  const newSplits = [...projectSplits];
                  newSplits[idx].qty = Number(e.target.value);
                  setProjectSplits(newSplits);
                }} />


                    {(() => {
                      const matchedSlabs = split.projectId ? projectSlabs.filter((s: any) => !split.productName || s.name.startsWith(split.productName)) : [];
                      return matchedSlabs.length > 1 && (
                        <TextField select label="Select Slab (Optional)" fullWidth size="small" value={split.slabId || ''} onChange={(e) => {
                          const newSplits = [...projectSplits];
                          newSplits[idx].slabId = e.target.value;
                          newSplits[idx].pieceIds = [];
                          setProjectSplits(newSplits);
                        }}>
                          <MenuItem value="">-- Clear Selection --</MenuItem>
                          {matchedSlabs.map((s: any) => (
                            <MenuItem key={s.id} value={s.id}>Slab: {s.name} {s.size ? `(${s.size})` : ''}</MenuItem>
                          ))}
                        </TextField>
                      );
                    })()}

                    {split.slabId && slabs && (
                      <FormControl fullWidth size="small">
                        <InputLabel>Select Piece(s)</InputLabel>
                        <Select multiple value={split.pieceIds || []} onChange={(e) => {
                          const val = e.target.value as string[];
                          const newSplits = [...projectSplits];
                          newSplits[idx].pieceIds = val;
                          newSplits[idx].qty = val.length > 0 ? val.length : newSplits[idx].qty;
                          setProjectSplits(newSplits);
                        }} input={<OutlinedInput label="Select Piece(s)" />} renderValue={(selected: any) => {
                          if (!selected || selected.length === 0) return <em>Select Pieces</em>;
                          const slab = slabs.find((s: any) => s.id === split.slabId);
                          return selected.map((id: string) => {
                            const piece = slab?.pieces?.find((p: any) => p.id === id);
                            return piece ? (piece.productName || `Piece ${piece.pieceNumber}`) : id;
                          }).join(', ');
                        }}>
                          {slabs.find((s: any) => s.id === split.slabId)?.pieces?.map((p: any) => (
                            <MenuItem key={p.id} value={p.id}>
                              <Checkbox checked={(split.pieceIds || []).indexOf(p.id) > -1} />
                              <ListItemText primary={`${p.productName || 'Piece ' + p.pieceNumber} - ${p.stage}`} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}


                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton color="error" onClick={() => {
                    const newSplits = projectSplits.filter((_, i) => i !== idx);
                    setProjectSplits(newSplits);
                  }} disabled={projectSplits.length === 1}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
          
          <Button startIcon={<AddIcon />} onClick={() => setProjectSplits([...projectSplits, { projectId: '', qty: 0 }])}>
            Add Project Split
          </Button>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="success" onClick={submitApproval} disabled={!projectSplits.some(s => s.projectId && s.qty > 0) || isApproving}>
            {isApproving ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!previewPhoto} onClose={() => setPreviewPhoto(null)} maxWidth="lg" fullWidth PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } } as any}>
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 2 }} onClick={() => setPreviewPhoto(null)}>
          {previewPhoto ? <img src={previewPhoto} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} /> : null}
        </Box>
      </Dialog>

      <Dialog open={manualEntryOpen} onClose={() => setManualEntryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manual IN/OUT Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Vendor</InputLabel>
              <Select label="Vendor" value={manualForm.vendorId} onChange={(e) => setManualForm({...manualForm, vendorId: e.target.value})}>
                {vendorsData?.map((v: any) => (
                  <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={manualForm.transactionType} onChange={(e) => setManualForm({...manualForm, transactionType: e.target.value})}>
                <MenuItem value="OUT">OUT (Sent to Vendor)</MenuItem>
                <MenuItem value="IN">IN (Received from Vendor)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Stage</InputLabel>
              <Select label="Stage" value={manualForm.stage} onChange={(e) => setManualForm({...manualForm, stage: e.target.value})}>
                <MenuItem value="Production">Production</MenuItem>
                <MenuItem value="Polishing">Polishing</MenuItem>
                <MenuItem value="Packing">Packing</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Quantity" type="number" value={manualForm.quantity} onChange={(e) => setManualForm({...manualForm, quantity: e.target.value})} fullWidth />
            <TextField size="small" label="Vehicle No (Optional)" value={manualForm.vehicleNumber} onChange={(e) => setManualForm({...manualForm, vehicleNumber: e.target.value})} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualEntryOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleManualEntrySubmit} disabled={!manualForm.vendorId || !manualForm.quantity}>Submit Entry</Button>
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

export default InOutLedger;
