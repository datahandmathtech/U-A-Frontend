import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, TextField, 
  Switch, FormControlLabel, Breadcrumbs, Link, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup, Tooltip, FormControl, Select, MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { 
  useGetProjectByIdQuery, 
  useGetSlabsQuery,
  useGetProjectProductionLogsQuery,
  useGetMachineLogsQuery,
  useAddPiecesMutation,
  useUpdatePieceMutation,
  useDeletePieceMutation,
  useGetProjectMaterialsQuery
} from '../store/apiSlice';

const StageDetails = () => {
  const { id: projectId, slabId, stageName } = useParams();
  const navigate = useNavigate();
  
  const { data: project } = useGetProjectByIdQuery(projectId as string, { skip: !projectId });
  const { data: slabs, refetch: refetchSlabs } = useGetSlabsQuery(projectId as string, { skip: !projectId });
  const { data: productionLogs } = useGetProjectProductionLogsQuery(projectId as string, { skip: !projectId });
  const { data: machineLogs } = useGetMachineLogsQuery();
  const { data: projectMaterials } = useGetProjectMaterialsQuery(projectId as string, { skip: !projectId });

  const [addPieces] = useAddPiecesMutation();
  const [updatePiece] = useUpdatePieceMutation();
  const [deletePiece] = useDeletePieceMutation();

  const slab = slabs?.find((s: any) => s.id === slabId);
  const stageFormatted = stageName ? stageName.charAt(0).toUpperCase() + stageName.slice(1) : '';
  
  // Filter production logs for this project & slab that represent Machine Work
  const logs = productionLogs?.filter((log: any) => 
    log.stage === 'Production Work' && 
    (log.productName === slab?.name || log.slabId === slab?.id) && 
    log.approvalStatus === 'approved'
  ) || [];

  const [cutPiecesOption, setCutPiecesOption] = useState<'yes' | 'no' | null>(null);
  const [piecesData, setPiecesData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const renderPhoto = (url?: string, label?: string) => {
    if (!url) return <span style={{ color: '#ccc', fontSize: '0.75rem', marginRight: 4 }}>-</span>;
    return (
      <Tooltip title={label || "View Photo"}>
        <img 
          src={url} 
          alt={label} 
          onClick={() => setPreviewPhotoUrl(url)}
          style={{ width: 36, height: 36, borderRadius: 4, cursor: 'pointer', objectFit: 'cover', border: '1px solid #ddd', marginRight: 4 }} 
        />
      </Tooltip>
    );
  };

  const render3Photos = (machine?: string, unit?: string, software?: string) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {renderPhoto(machine, 'Machine')}
      {renderPhoto(unit, 'Unit')}
      {renderPhoto(software, 'Software')}
    </Box>
  );

  const handleRemovePiece = (index: number) => {
    const newData = piecesData.filter((_, i) => i !== index);
    setPiecesData(newData);
  };

  const handlePieceChange = (index: number, field: string, value: number | string) => {
    const newData = [...piecesData];
    newData[index] = { ...newData[index], [field]: value };
    setPiecesData(newData);
  };

  const handleSavePieces = async () => {
    setIsSaving(true);
    try {
      const formattedPieces = piecesData.map(p => ({
        name: p.name,
        size: p.t ? `${p.l}L x ${p.w}W | ${p.t}MM` : `${p.l}L x ${p.w}W`,
        length: p.l,
        width: p.w,
      }));
      await addPieces({ 
        slabId: slab.id, 
        data: { 
          count: piecesData.length, 
          piecesArray: formattedPieces
        } 
      }).unwrap();

      refetchSlabs();
      setPiecesData([]);
      setCutPiecesOption(null);
    } catch (error) {
      console.error(error);
      alert('Failed to save pieces');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessSingleFullSlab = async () => {
    setIsSaving(true);
    try {
      const existingPieces = slab.pieces || [];
      let maxNum = 0;
      if (existingPieces.length > 0) {
        maxNum = Math.max(...existingPieces.map((p: any) => p.pieceNumber || 0));
      }
      
      let parsedL = 0;
      let parsedW = 0;
      if (slab.size) {
        const lMatch = slab.size.match(/(\d+(?:\.\d+)?)L/);
        const wMatch = slab.size.match(/(\d+(?:\.\d+)?)W/);
        if (lMatch) parsedL = parseFloat(lMatch[1]);
        if (wMatch) parsedW = parseFloat(wMatch[1]);
      }

      const formattedPieces = [{
        name: `${slab.name}.${maxNum + 1} (Full Slab)`,
        size: slab.size || 'Full Slab',
        length: parsedL,
        width: parsedW,
      }];
      
      await addPieces({ 
        slabId: slab.id, 
        data: { 
          count: 1, 
          piecesArray: formattedPieces
        } 
      }).unwrap();

      refetchSlabs();
      setCutPiecesOption(null);
    } catch (error) {
      console.error(error);
      alert('Failed to process slab');
    } finally {
      setIsSaving(false);
    }
  };

  const [editingPiece, setEditingPiece] = useState<any>(null);
  const [viewPiece, setViewPiece] = useState<any>(null);

  const handleDeletePiece = async (pieceId: string) => {
    if (window.confirm('Are you sure you want to delete this tracked item?')) {
      try {
        await deletePiece(pieceId).unwrap();
        refetchSlabs();
      } catch (err) {
        console.error(err);
        alert('Failed to delete item');
      }
    }
  };

  const handleEditPieceSave = async () => {
    if (!editingPiece) return;
    try {
      const { id, ...data } = editingPiece;
      await updatePiece({ id, data }).unwrap();
      refetchSlabs();
      setEditingPiece(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update item');
    }
  };

  if (!slab) return <Typography sx={{ p: 3 }}>Loading...</Typography>;

  const matchedProductForUI = project?.quotations?.[0]?.products?.find((p: any) => p.category === slab?.name);
  const qtyToProcess = matchedProductForUI?.qty ? Number(matchedProductForUI.qty) : 1;

  const renderTableRows = () => {
    if (!slab.pieces || slab.pieces.length === 0) {
      return (
        <TableRow key="empty">
          <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
            No products (slabs) found under production.
          </TableCell>
        </TableRow>
      );
    }

    return slab.pieces.map((p: any) => {
      // Find production log associated with this piece
      let pLog = logs.find((log: any) => log.pieceIds?.includes(p.id));
      
      if (!pLog && logs.length > 0) {
          // Fallback: pick an unassigned machine log for manual pieces if any exists (to satisfy 1 log = 1 piece if they matched it manually)
          pLog = logs.find((log: any) => !log.pieceIds || log.pieceIds.length === 0);
      }

      // Find original machine log via parentLogId
      const mLog = pLog?.parentLogId ? machineLogs?.find((m: any) => m.id === pLog.parentLogId) : null;
      const mName = mLog?.machine?.name || pLog?.machine?.name || '-';
      
      const startDate = mLog?.startTime ? new Date(mLog.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + new Date(mLog.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
      const endDate = mLog?.endTime ? new Date(mLog.endTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + new Date(mLog.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
      
      // Polishing/Packing/Dispatch Logs Extraction
      const pieceProductionLogs = productionLogs?.filter((l: any) => l.pieceIds?.includes(p.id)) || [];
      const stageLogs = pieceProductionLogs.filter((l: any) => l.stage === stageFormatted || l.stage === `${stageFormatted} Work`);
      const outLog = stageLogs.find((l: any) => l.transactionType === 'OUT' && l.approvalStatus === 'approved');
      const inLog = stageLogs.find((l: any) => l.transactionType === 'IN' && l.approvalStatus === 'approved');

      const formatDateTime = (dateString?: string) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} | ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      };
      
      const outDate = formatDateTime(outLog?.createdAt);
      const inDate = formatDateTime(inLog?.createdAt);
      
      const getSinglePhoto = (log: any) => log?.startPhotos?.machine || log?.startPhotos?.unit || log?.startPhotos?.software || undefined;

      return (
        <TableRow key={p.id} hover>
          {stageFormatted === 'Production' && <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography fontWeight="bold">{mName}</Typography></TableCell>}
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 200 }}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontWeight="bold" color="secondary.main">{p.productName || p.pieceNumber}</Typography>
                {(p.productName || '').includes('(Full Slab)') && <Chip size="small" label="Full Slab" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />}
                {(p.productName || '').includes('(Cut Piece)') && <Chip size="small" label="Cut Piece" color="secondary" sx={{ height: 20, fontSize: '0.7rem' }} />}
             </Box>
          </TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.size ? p.size.replace(/ x (\d+MM)/i, ' | $1').replace(/ × (\d+MM)/i, ' | $1') : 'N/A'}</TableCell>
          {stageFormatted === 'Production' && (
            <>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{startDate}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{endDate}</TableCell>
            </>
          )}
          {['Polishing', 'Packing'].includes(stageFormatted) && (
            <>
              <TableCell sx={{ whiteSpace: 'nowrap', color: '#2e7d32', fontWeight: 'bold' }}>{inDate}</TableCell>
            </>
          )}
          {stageFormatted === 'Dispatch' && (
            <>
              <TableCell sx={{ whiteSpace: 'nowrap', color: '#d32f2f', fontWeight: 'bold' }}>{outDate}</TableCell>
            </>
          )}
          <TableCell sx={{ whiteSpace: 'nowrap' }}>
            {(() => {
              const stages = ['Production', 'Polishing', 'Packing', 'Dispatch'];
              const pieceIdx = stages.indexOf(p.stage || 'Production');
              const viewIdx = stages.indexOf(stageFormatted);
              
              let displayStatus = 'pending';
              if (pieceIdx > viewIdx) displayStatus = 'completed';
              else if (pieceIdx === viewIdx) displayStatus = p.status;
              
              return (
                <Chip 
                   label={displayStatus === 'completed' ? 'Completed' : displayStatus === 'pending' ? 'Not Started' : 'Under Process'} 
                   size="small" 
                   sx={{ 
                     fontWeight: 'bold', 
                     px: 1,
                     borderRadius: 2,
                     ...(displayStatus === 'completed' ? { bgcolor: '#E8F5E9', color: '#2E7D32' } : 
                         displayStatus === 'pending' ? { bgcolor: '#F5F5F5', color: '#616161' } : 
                         { bgcolor: '#FFF8E1', color: '#F57F17' })
                   }}
                />
              );
            })()}
          </TableCell>
          <TableCell align="right">
             <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
               <Tooltip title="View Logs & History">
                 <IconButton sx={{ color: 'info.main' }} size="small" onClick={() => setViewPiece(p)}>
                   <VisibilityIcon fontSize="small" />
                 </IconButton>
               </Tooltip>
               <IconButton color="primary" size="small" onClick={() => setEditingPiece(p)}><EditIcon fontSize="small" /></IconButton>
               <IconButton color="error" size="small" onClick={() => handleDeletePiece(p.id)}><DeleteIcon fontSize="small" /></IconButton>
             </Box>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Box sx={{ p: 4, maxWidth: '100%', margin: '0 auto' }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" fontWeight="900" color="#222">
                {stageFormatted} Details
              </Typography>
              {slab.size && <Chip label={slab.size} size="medium" sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5' }} />}
            </Box>
            <Breadcrumbs sx={{ mt: 1 }}>
              <Link color="inherit" sx={{ cursor: 'pointer' }} onClick={() => navigate('/projects')}>Projects</Link>
              <Link color="inherit" sx={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${projectId}`)}>{project?.name}</Link>
              <Typography color="text.primary">{slab.name}</Typography>
            </Breadcrumbs>
          </Box>
        </Box>
        {stageFormatted === 'Production' && (
          <Tooltip title="Do you want to cut this slab into pieces?" arrow placement="left">
            <ToggleButtonGroup
              color="primary"
              value={cutPiecesOption}
              exclusive
              onChange={(e, val) => {
                if (val !== null) {
                  setCutPiecesOption(val);
                } else {
                  setCutPiecesOption(null);
                }
              }}
              sx={{ bgcolor: 'white' }}
            >
              <ToggleButton value="yes" sx={{ px: 4, fontWeight: 'bold' }}>YES</ToggleButton>
              <ToggleButton value="no" sx={{ px: 4, fontWeight: 'bold' }}>NO</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        )}
      </Box>



      {cutPiecesOption === 'no' && stageFormatted === 'Production' && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px dashed #ccc', bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary">Process Normal (Full Slab)</Typography>
              <Typography variant="body2" color="text.secondary">This will create exactly 1 full-size piece and add it to the tracking items below.</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" color="inherit" onClick={() => setCutPiecesOption(null)}>Cancel</Button>
              <Button variant="contained" color="primary" size="large" onClick={handleProcessSingleFullSlab} disabled={isSaving}>
                {isSaving ? 'Processing...' : 'Save Normal Entry'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {cutPiecesOption === 'yes' && stageFormatted === 'Production' && (
        <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1px solid #E0E0E0', bgcolor: '#FFFDF5' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" color="#B38B36">Generate Custom Pieces</Typography>
            <Button color="inherit" onClick={() => { setCutPiecesOption(null); setPiecesData([]); }}>Cancel</Button>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>Add rows manually to create custom pieces. They will be added to your tracking list.</Typography>

          <Box>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 2 }}>
              <Table size="small">
                  <TableHead sx={{ bgcolor: '#F5F5F5' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Piece Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Length (L)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Width (W)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Thickness (MM)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total Area (L x W)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {piecesData.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField 
                            size="small" 
                            value={p.name}
                            onChange={(e) => handlePieceChange(idx, 'name', e.target.value)}
                            fullWidth
                            sx={{ bgcolor: 'white' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField 
                            size="small" type="number" 
                            value={p.l === 0 ? '' : p.l}
                            onChange={(e) => handlePieceChange(idx, 'l', Number(e.target.value))}
                            sx={{ bgcolor: 'white' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField 
                            size="small" type="number" 
                            value={p.w === 0 ? '' : p.w}
                            onChange={(e) => handlePieceChange(idx, 'w', Number(e.target.value))}
                            sx={{ bgcolor: 'white' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField 
                            size="small" type="number" 
                            value={p.t === 0 ? '' : p.t}
                            onChange={(e) => handlePieceChange(idx, 't', Number(e.target.value))}
                            sx={{ bgcolor: 'white' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="bold" color="primary">
                            {(p.l * p.w).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleRemovePiece(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button variant="outlined" color="primary" onClick={() => {
                    const existingPieces = slab.pieces || [];
                    let maxNum = 0;
                    if (existingPieces.length > 0) {
                      maxNum = Math.max(...existingPieces.map((p: any) => p.pieceNumber || 0));
                    }
                    
                    const lastPieceNum = piecesData[piecesData.length - 1]?.pieceNumber || maxNum;
                    setPiecesData([...piecesData, { 
                      pieceNumber: lastPieceNum + 1,
                      name: `${slab.name}.${lastPieceNum + 1} (Cut Piece)`,
                      l: 0, w: 0 
                    }]);
                  }}>
                    + Add 1 Piece
                  </Button>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, pl: 3, borderLeft: '1px solid #E0E0E0' }}>
                    <Typography variant="body2" color="text.secondary">Or add multiple:</Typography>
                    <TextField 
                      size="small" 
                      type="number" 
                      placeholder="Qty" 
                      id="bulk-add-qty"
                      sx={{ width: 70, bgcolor: 'white' }}
                    />
                    <Button variant="contained" color="primary" onClick={() => {
                      const qtyInput = document.getElementById('bulk-add-qty') as HTMLInputElement;
                      const count = parseInt(qtyInput?.value || '0');
                      if (count > 0) {
                        const existingPieces = slab.pieces || [];
                        let maxNum = 0;
                        if (existingPieces.length > 0) {
                          maxNum = Math.max(...existingPieces.map((p: any) => p.pieceNumber || 0));
                        }
                        const lastPieceNum = piecesData[piecesData.length - 1]?.pieceNumber || maxNum;
                        
                        const newPieces = Array.from({ length: count }).map((_, idx) => ({
                          pieceNumber: lastPieceNum + idx + 1,
                          name: `${slab.name}.${lastPieceNum + idx + 1} (Cut Piece)`,
                          l: 0, w: 0
                        }));
                        setPiecesData([...piecesData, ...newPieces]);
                        qtyInput.value = '';
                      }
                    }}>Add</Button>
                  </Box>
                </Box>
                <Button variant="contained" color="success" size="large" onClick={() => {
                  handleSavePieces();
                  setCutPiecesOption(null);
                }} disabled={isSaving || piecesData.length === 0}>
                  {isSaving ? 'Saving...' : 'Save Pieces'}
                </Button>
              </Box>
            </Box>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 0, mt: 4, borderRadius: 4, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
        <Box sx={{ p: 3, bgcolor: '#FAFAFA', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">{stageFormatted} Tracking Table</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField size="small" placeholder="Search Machine or Product..." sx={{ bgcolor: 'white', width: 250 }} />
          </Box>
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {stageFormatted === 'Production' && <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Machine Name</TableCell>}
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Size (L x W)</TableCell>
                {stageFormatted === 'Production' && (
                  <>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Start Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>End Time</TableCell>
                  </>
                )}
                {stageFormatted === 'Polishing' && (
                  <>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Completed Date</TableCell>
                  </>
                )}
                {stageFormatted === 'Packing' && (
                  <>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Completed Date</TableCell>
                  </>
                )}
                {stageFormatted === 'Dispatch' && (
                  <>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Dispatch Date</TableCell>
                  </>
                )}

                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F5F5F5', color: '#333', whiteSpace: 'nowrap', py: 2 }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {renderTableRows()}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!editingPiece} onClose={() => setEditingPiece(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Tracking Item</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
          <TextField 
            label="Item Name" 
            value={editingPiece?.productName || editingPiece?.pieceNumber || ''} 
            onChange={e => setEditingPiece({ ...editingPiece, productName: e.target.value })} 
            fullWidth 
          />
          <TextField 
            label="Size (e.g. 20L x 10W)" 
            value={editingPiece?.size || ''} 
            onChange={e => setEditingPiece({ ...editingPiece, size: e.target.value })} 
            fullWidth 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setEditingPiece(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditPieceSave}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* View Piece History Dialog */}
      <Dialog open={!!viewPiece} onClose={() => setViewPiece(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityIcon color="primary" /> Timeline & History: {viewPiece?.productName || viewPiece?.pieceNumber}
        </DialogTitle>
        <DialogContent dividers>
          {(() => {
            const pieceProductionLogs = productionLogs?.filter((l: any) => l.pieceIds?.includes(viewPiece?.id)) || [];
            
            const linkedMachineLogIds = pieceProductionLogs
              .filter((l: any) => l.stage === 'Production Work' && l.parentLogId)
              .map((l: any) => l.parentLogId);

            const pieceMachineLogs = machineLogs?.filter((l: any) => 
              l.productId === viewPiece?.id || linkedMachineLogIds.includes(l.id)
            ) || [];
            
            // Format pieceMachineLogs to match the table structure (these represent Machine Start)
            const formattedMachineLogs = pieceMachineLogs.map((ml: any) => ({
              ...ml,
              id: `${ml.id}-start`,
              stage: 'Production Work',
              displayType: 'Machine Start',
              transactionType: null,
              vendorName: null,
              worker: ml.operator,
              startTime: ml.startTime,
              createdAt: ml.createdAt,
              startPhotos: {
                machine: ml.machinePhotoUrl,
                unit: ml.unitPhotoUrl,
                software: ml.softwarePhotoUrl
              }
            }));

            // Format pieceProductionLogs (IN/OUT logs)
            const formattedProductionLogs = pieceProductionLogs.map((l: any) => {
              if (l.stage === 'Production Work') {
                const parentMl = machineLogs?.find((ml: any) => ml.id === l.parentLogId);
                return {
                  ...l,
                  displayType: 'Machine End',
                  startPhotos: {
                    machine: parentMl?.endMachinePhotoUrl || l.startPhotos?.machine,
                    unit: parentMl?.endUnitPhotoUrl || l.startPhotos?.unit,
                    software: parentMl?.endSoftwarePhotoUrl || l.startPhotos?.software
                  }
                };
              }
              return {
                ...l,
                displayType: l.transactionType === 'OUT' ? 'Material OUT' : 'Material IN'
              };
            });

            // Combine and filter by the current stage view
            let combinedLogs = [...formattedProductionLogs, ...formattedMachineLogs].filter((log: any) => {
              if (stageFormatted === 'Production') {
                return log.stage === 'Production Work' || log.stage === 'Production Work (Machine)' || log.stage === 'Production';
              }
              return log.stage === stageFormatted || log.stage === `${stageFormatted} Work`;
            });

            // Sort by date ascending (oldest first, so we see start then end)
            combinedLogs.sort((a: any, b: any) => {
              const dateA = new Date(a.startTime || a.createdAt).getTime();
              const dateB = new Date(b.startTime || b.createdAt).getTime();
              return dateA - dateB;
            });

            if (combinedLogs.length === 0) {
              return (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No logs or tracking history found for this item.</Typography>
                </Box>
              );
            }

            return (
              <Box sx={{ position: 'relative', ml: 2, borderLeft: '2px solid #e0e0e0', pl: 4, display: 'flex', flexDirection: 'column', gap: 4, py: 2 }}>
                {combinedLogs.map((log: any, i: number) => {
                  const isOut = log.displayType === 'Material OUT' || log.displayType === 'Machine Start';
                  return (
                  <Box key={i} sx={{ position: 'relative' }}>
                    <Box sx={{ 
                      position: 'absolute', 
                      left: -43, 
                      top: 20, 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      bgcolor: isOut ? '#ed6c02' : '#0288d1',
                      border: '3px solid #fff',
                      boxShadow: '0 0 0 2px ' + (isOut ? '#ed6c02' : '#0288d1')
                    }} />
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 3, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                      border: '1px solid #f0f0f0',
                      bgcolor: '#fff',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-2px)' }
                    }}>
                      <Box>
                         <Typography variant="caption" sx={{ color: '#888', fontWeight: 700, display: 'block', mb: 1, letterSpacing: 0.5 }}>
                           {new Date(log.startTime || log.createdAt).toLocaleString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                         </Typography>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                           <Typography variant="h6" fontWeight="900" sx={{ color: isOut ? '#ed6c02' : '#0288d1' }}>
                             {log.displayType}
                           </Typography>
                           {log.approvalStatus === 'approved' && <Chip size="small" label="Approved" color="success" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 'bold' }} />}
                           {log.approvalStatus === 'pending' && <Chip size="small" label="Pending" color="warning" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 'bold' }} />}
                         </Box>
                         <Typography variant="subtitle1" color="text.primary" fontWeight="bold">
                           {log.stage}
                         </Typography>
                         <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                           Worker/Vendor: <Typography component="span" fontWeight="bold" color="secondary.main">{typeof log.worker === 'object' ? log.worker?.name : log.worker || log.vendorName || 'Unknown'}</Typography>
                         </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {(log.startPhotos?.machine || log.machinePhotoUrl) && (
                          <Box onClick={() => setPreviewPhotoUrl(log.startPhotos?.machine || log.machinePhotoUrl)} sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { opacity: 0.8, transform: 'scale(1.05)' }}}>
                             <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#666', mb: 0.5, fontWeight: 'bold' }}>Machine</Typography>
                             <img src={log.startPhotos?.machine || log.machinePhotoUrl} alt="Machine" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid #eee' }} />
                          </Box>
                        )}
                        {(log.startPhotos?.unit || log.unitPhotoUrl) && (
                          <Box onClick={() => setPreviewPhotoUrl(log.startPhotos?.unit || log.unitPhotoUrl)} sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { opacity: 0.8, transform: 'scale(1.05)' }}}>
                             <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#666', mb: 0.5, fontWeight: 'bold' }}>Unit</Typography>
                             <img src={log.startPhotos?.unit || log.unitPhotoUrl} alt="Unit" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid #eee' }} />
                          </Box>
                        )}
                        {(log.startPhotos?.software || log.softwarePhotoUrl) && (
                          <Box onClick={() => setPreviewPhotoUrl(log.startPhotos?.software || log.softwarePhotoUrl)} sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { opacity: 0.8, transform: 'scale(1.05)' }}}>
                             <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#666', mb: 0.5, fontWeight: 'bold' }}>Software</Typography>
                             <img src={log.startPhotos?.software || log.softwarePhotoUrl} alt="Software" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid #eee' }} />
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                  );
                })}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setViewPiece(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Photo Preview Dialog */}
      <Dialog open={!!previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Photo Preview
          <IconButton onClick={() => setPreviewPhotoUrl(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 3, bgcolor: '#f5f5f5' }}>
          {previewPhotoUrl && (
            <img src={previewPhotoUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StageDetails;
