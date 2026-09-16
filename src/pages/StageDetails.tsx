import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, TextField, 
  Switch, FormControlLabel, Breadcrumbs, Link, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup, Tooltip, FormControl, Select, MenuItem, Grid, LinearProgress, InputAdornment, Avatar, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import SearchIcon from '@mui/icons-material/Search';
import CircleIcon from '@mui/icons-material/Circle';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { 
  useGetProjectByIdQuery, 
  useGetSlabsQuery,
  useGetProjectProductionLogsQuery,
  useGetMachineLogsQuery,
  useAddPiecesMutation,
  useUpdatePieceMutation,
  useDeletePieceMutation,
  useGetProjectMaterialsQuery,
  useDeleteProductionLogMutation
} from '../store/apiSlice';

const StageDetails = () => {
  const { id: projectId, slabId, stageName } = useParams();
  const navigate = useNavigate();
  
  const { data: project } = useGetProjectByIdQuery(projectId as string, { skip: !projectId });
  const { data: slabs, refetch: refetchSlabs } = useGetSlabsQuery(projectId as string, { skip: !projectId });
  const { data: productionLogs, refetch: refetchProductionLogs } = useGetProjectProductionLogsQuery(projectId as string, { skip: !projectId });
  const { data: machineLogs } = useGetMachineLogsQuery();
  const { data: projectMaterials } = useGetProjectMaterialsQuery(projectId as string, { skip: !projectId });

  const [addPieces] = useAddPiecesMutation();
  const [updatePiece] = useUpdatePieceMutation();
  const [deletePiece] = useDeletePieceMutation();
  const [deleteProductionLog] = useDeleteProductionLogMutation();

  const slab = slabs?.find((s: any) => s.id === slabId);
  const stageFormatted = stageName ? stageName.charAt(0).toUpperCase() + stageName.slice(1) : '';
  
  const matchedProduct = project?.quotations?.[0]?.products?.find((p: any) => slab?.name?.startsWith(p.category));
  const rawUnit = matchedProduct?.unit || (slab?.size?.toLowerCase().includes('mm') ? 'mm' : 'inch');
  
  const unitDisplayName = rawUnit.toLowerCase() === 'inch' || rawUnit.toLowerCase() === 'inches' ? 'Inches' 
    : rawUnit.toLowerCase() === 'feet' || rawUnit.toLowerCase() === 'ft' ? 'Feet' 
    : rawUnit.toLowerCase() === 'sq_ft' || rawUnit.toLowerCase() === 'sqft' ? 'Sq.Ft' 
    : rawUnit.toLowerCase() === 'mm' ? 'MM' 
    : (rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1));

  let dimU = rawUnit;
  if (rawUnit.toLowerCase().startsWith('piece') || rawUnit.toLowerCase() === 'pcs') {
    dimU = matchedProduct?.dimensionUnit || 'inch';
  }
  const dimensionUnitName = dimU.toLowerCase() === 'inch' || dimU.toLowerCase() === 'inches' ? 'Inches' 
    : dimU.toLowerCase() === 'feet' || dimU.toLowerCase() === 'ft' ? 'Feet' 
    : dimU.toLowerCase() === 'sq_ft' || dimU.toLowerCase() === 'sqft' ? 'Sq.Ft' 
    : dimU.toLowerCase() === 'mm' ? 'MM' 
    : (dimU.charAt(0).toUpperCase() + dimU.slice(1));

  const combinedUnitDisplay = rawUnit.toLowerCase().startsWith('piece') || rawUnit.toLowerCase() === 'pcs' 
    ? `Pieces -> ${dimensionUnitName}` 
    : unitDisplayName;

  const calculateAreaFromSize = (sizeStr: string, unitStr: string, productContext?: any) => {
    if (!sizeStr) return 0;
    
    // Override unit if explicit in size string (e.g. "10L x 10W (inch)")
    let overrideUnit = unitStr;
    const sizeLower = sizeStr.toLowerCase();
    if (sizeLower.includes('(inch)')) overrideUnit = 'inch';
    else if (sizeLower.includes('(mm)')) overrideUnit = 'mm';
    else if (sizeLower.includes('(sq.ft)') || sizeLower.includes('(sq_ft)')) overrideUnit = 'sq_ft';
    
    // Explicit Area override?
    const explicitSqFtMatch = sizeStr.match(/([\d\.]+)\s*Sq\.?Ft/i);
    if (explicitSqFtMatch) return Number(parseFloat(explicitSqFtMatch[1]).toFixed(2));

    const lMatch = sizeStr.match(/([\d\.]+)\s*L/i);
    const wMatch = sizeStr.match(/([\d\.]+)\s*W/i);
    
    let l = 0, w = 0;
    if (lMatch && wMatch) {
      l = parseFloat(lMatch[1]);
      w = parseFloat(wMatch[1]);
    } else if (productContext) {
      l = productContext.length || 0;
      w = productContext.width || 0;
    } else {
      return 0;
    }

    const u = (overrideUnit || '').toLowerCase().trim();
    let sqft = 0;
    if (u === 'pieces' || u === 'piece' || u === 'pcs') {
      const dimU = (productContext?.dimensionUnit || 'inch').toLowerCase();
      if (dimU === 'inch') sqft = ((l * w) / 144);
      else if (dimU === 'mm') sqft = ((l * w) / 92903.04);
      else if (dimU === 'sq_ft') sqft = l * w;
      else sqft = 1;
    } else if (u === 'mm') {
      sqft = ((l * w) / 92903.04);
    } else {
      sqft = u.includes('inch') ? ((l * w) / 144) : (l * w);
    }
    return Number(sqft.toFixed(2));
  };

  // Filter production logs for this project & slab that represent Machine Work or vendor job work
  const logs = productionLogs?.filter((log: any) => 
    (log.stage === 'Production Work' || log.stage === 'Production') && 
    (log.productName === slab?.name || log.slabId === slab?.id) && 
    log.approvalStatus === 'approved'
  ) || [];

  const [cutPiecesOption, setCutPiecesOption] = useState<'yes' | 'no' | null>(null);
  const [piecesData, setPiecesData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    setPiecesData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const handleSavePieces = async () => {
    setIsSaving(true);
    
    // --- SIZE VALIDATION ---
    let slabArea = calculateAreaFromSize(slab.size, rawUnit, matchedProduct);

    if (slabArea > 0) {
      let existingArea = 0;
      (slab.pieces || []).forEach((p: any) => {
        if (p.size) {
           existingArea += calculateAreaFromSize(p.size, (p as any).unit || rawUnit, matchedProduct);
        } else if (p.length && p.width) {
           existingArea += calculateAreaFromSize(`${p.length}L x ${p.width}W`, (p as any).unit || rawUnit, matchedProduct);
        }
      });

      const newArea = piecesData.reduce((sum, p) => sum + calculateAreaFromSize(`${p.l}L x ${p.w}W`, p.unit || rawUnit, matchedProduct), 0);
      
      // Round to 2 decimal places to avoid floating point precision issues
      const totalArea = Math.round((existingArea + newArea) * 100) / 100;
      const roundedSlabArea = Math.round(slabArea * 100) / 100;

      if (totalArea > roundedSlabArea) {
        alert(`Total size exceeds allowed slab limit!\nAllowed: ${roundedSlabArea.toFixed(2)} Sq.Ft\nYou are making: ${totalArea.toFixed(2)} Sq.Ft\nPlease reduce: ${(totalArea - roundedSlabArea).toFixed(2)} Sq.Ft`);
        setIsSaving(false);
        return;
      }
    }
    // --- END VALIDATION ---

    try {
      const formattedPieces = piecesData.map(p => {
        const base = p.baseName !== undefined ? p.baseName : (p.name ? p.name.substring(0, p.name.lastIndexOf('.')) || p.name : slab.name);
        const finalName = p.pieceNumber ? `${base}.${p.pieceNumber}` : (p.name || base);
        
        const pieceUnit = p.unit || rawUnit;
        let suffix = '';
        if (pieceUnit === 'inch') suffix = ' (inch)';
        if (pieceUnit === 'mm') suffix = ' (mm)';
        if (pieceUnit === 'sq_ft') suffix = ' (sq_ft)';

        return {
          name: finalName,
          pieceNumber: (p.pieceNumber && !isNaN(Number(p.pieceNumber))) ? Number(p.pieceNumber) : undefined,
          size: p.t ? `${p.l}L x ${p.w}W | ${p.t}MM${suffix}` : `${p.l}L x ${p.w}W${suffix}`,
          length: p.l,
          width: p.w,
          thickness: p.t
        };
      });
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
    
    // --- SIZE VALIDATION ---
    let slabArea = 0;
    if (slab.size) {
      const lMatch = slab.size.match(/(\d+(?:\.\d+)?)L/i);
      const wMatch = slab.size.match(/(\d+(?:\.\d+)?)W/i);
      if (lMatch && wMatch) slabArea = parseFloat(lMatch[1]) * parseFloat(wMatch[1]);
    }
    
    if (slabArea > 0) {
      let otherPiecesArea = 0;
      (slab.pieces || []).forEach((p: any) => {
        if (p.id !== editingPiece.id && p.size) {
           const lMatch = p.size.match(/(\d+(?:\.\d+)?)L/i);
           const wMatch = p.size.match(/(\d+(?:\.\d+)?)W/i);
           if (lMatch && wMatch) {
             otherPiecesArea += parseFloat(lMatch[1]) * parseFloat(wMatch[1]);
           }
        }
      });
      
      let newArea = 0;
      if (editingPiece.size) {
         const lMatch = editingPiece.size.match(/(\d+(?:\.\d+)?)L/i);
         const wMatch = editingPiece.size.match(/(\d+(?:\.\d+)?)W/i);
         if (lMatch && wMatch) newArea = parseFloat(lMatch[1]) * parseFloat(wMatch[1]);
      }
      
      const totalArea = Math.round((otherPiecesArea + newArea) * 100) / 100;
      const roundedSlabArea = Math.round(slabArea * 100) / 100;

      if (totalArea > roundedSlabArea) {
         alert(`Cannot update piece. Total size exceeds original slab size.\nSlab Size: ${roundedSlabArea.toFixed(2)}\nOther Pieces Size: ${otherPiecesArea.toFixed(2)}\nThis Piece Size: ${newArea.toFixed(2)}\nRemaining: ${(roundedSlabArea - otherPiecesArea).toFixed(2)}`);
         return;
      }
    }
    // --- END VALIDATION ---

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
    const piecesList = slab.pieces || [];
    const filteredPieces = piecesList.filter((p: any) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = String(p.productName || (p.pieceNumber ? `Piece ${p.pieceNumber}` : '')).toLowerCase();
      const mName = (logs.find((l: any) => l.pieceIds?.includes(p.id))?.machine?.name || '').toLowerCase();
      const vendor = String(p.vendorName || '').toLowerCase();
      const size = String(p.size || '').toLowerCase();
      return pName.includes(q) || mName.includes(q) || vendor.includes(q) || size.includes(q);
    });

    if (filteredPieces.length === 0) {
      return (
        <TableRow key="empty">
          <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94A3B8' }}>
            <LayersRoundedIcon sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
              {searchQuery ? 'No matching pieces found' : 'No products (slabs) found under production.'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              {searchQuery ? 'Try clearing the search query.' : 'Use the "Break Slab" option above to generate tracked pieces.'}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return filteredPieces.map((p: any, idx: number) => {
      // Find production log associated with this piece
      let pLog = logs.find((log: any) => log.pieceIds?.includes(p.id) || (!log.pieceIds?.length && (log.slabId === p.id || log.productId === p.id)));
      
      if (!pLog && logs.length > 0) {
          // Fallback: pick an unassigned machine log for manual pieces if any exists (to satisfy 1 log = 1 piece if they matched it manually)
          pLog = logs.find((log: any) => !log.pieceIds || log.pieceIds.length === 0);
      }

      // Find original machine log via parentLogId
      const mLog = pLog?.parentLogId ? machineLogs?.find((m: any) => m.id === pLog.parentLogId) : null;
      const mName = mLog?.machine?.name || pLog?.machine?.name || '';
      const vendorName = pLog?.vendorName || '';
      
      const startDate = mLog?.startTime ? new Date(mLog.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + new Date(mLog.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
      const endDate = mLog?.endTime ? new Date(mLog.endTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + new Date(mLog.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
      
      // Polishing/Packing/Dispatch Logs Extraction
      const pieceProductionLogs = productionLogs?.filter((l: any) => l.pieceIds?.includes(p.id) || (!l.pieceIds?.length && (l.slabId === p.id || l.productId === p.id))) || [];
      const stageLogs = pieceProductionLogs.filter((l: any) => l.stage === stageFormatted || l.stage === `${stageFormatted} Work`);
      const outLog = stageLogs.find((l: any) => l.transactionType === 'OUT' && l.approvalStatus === 'approved');
      const inLog = stageLogs.find((l: any) => l.transactionType === 'IN' && l.approvalStatus === 'approved');

      const formatDateTime = (dateString?: string) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} | ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      };
      
      const outDate = formatDateTime(outLog?.createdAt);
      const inDate = formatDateTime(inLog?.createdAt);

      const stages = ['Production', 'Polishing', 'Packing', 'Dispatch'];
      const pieceIdx = stages.indexOf(p.stage || 'Production');
      const viewIdx = stages.indexOf(stageFormatted);
      
      let displayStatus = 'pending';
      if (pieceIdx > viewIdx) displayStatus = 'completed';
      else if (pieceIdx === viewIdx) displayStatus = p.status;

      return (
        <TableRow key={p.id} sx={{ bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#FBFBFB', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background-color 0.15s ease' }}>
          {stageFormatted === 'Production' && (
            <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
              {mName ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.75, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>{mName}</Typography>
                </Box>
              ) : vendorName ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.75, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>{vendorName}</Typography>
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>Unassigned</Typography>
              )}
            </TableCell>
          )}
          <TableCell sx={{ py: 1.5, minWidth: 160 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>
                {String(p.productName || (p.pieceNumber ? `Piece ${p.pieceNumber}` : '')).replace(' (Cut Piece)', '').replace(' (Full Slab)', '').replace('(Cut Piece)', '').replace('(Full Slab)', '').trim()}
              </Typography>
              {p.pieceNumber && !p.isVirtualPiece && (
                <Chip 
                  label={`Piece #${p.pieceNumber}`} 
                  size="small" 
                  sx={{ 
                    mt: 0.5, 
                    bgcolor: '#EFF6FF', 
                    color: '#1D4ED8', 
                    fontWeight: 700, 
                    fontSize: '0.7rem', 
                    height: 20, 
                    borderRadius: 1, 
                    border: '1px solid #DBEAFE' 
                  }} 
                />
              )}
            </Box>
          </TableCell>
          <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
            {stageFormatted === 'Polishing' ? (
              (() => {
                const polishLog = pieceProductionLogs.find((l: any) => (l.stage?.startsWith('Polishing') || l.stage === 'Polishing') && (l.approvalStatus === 'approved' || l.approvalStatus === 'completed'));
                const isVendor = !!(polishLog?.vendorName || p.vendorName || (vendorName && !pLog?.machine));
                const vendorLabel = polishLog?.vendorName || p.vendorName || vendorName;
                const workerLabel = polishLog?.workerName || polishLog?.worker?.name || p.workerName || (displayStatus === 'completed' ? 'Abhay 1' : '—');
                const approvalId = polishLog?.id ? `#${polishLog.id.slice(-6).toUpperCase()}` : (displayStatus === 'completed' ? '#AP-PLSH' : null);

                if (isVendor && vendorLabel) {
                  return (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                        {vendorLabel}
                      </Typography>
                      <Chip label="Job Work" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#FFF7ED', color: '#EA580C', border: '1px solid #FFEDD5' }} />
                    </Box>
                  );
                }

                return workerLabel !== '—' ? (
                  <Box sx={{ display: 'inline-flex', flexDirection: 'column', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                      {workerLabel}
                    </Typography>
                    {approvalId && (
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem' }}>
                        ID: {approvalId}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>—</Typography>
                );
              })()
            ) : (
              p.sourceMaterial?.inventory ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 1.5, px: 1.25, py: 0.5 }}>
                  <LayersRoundedIcon sx={{ fontSize: 15, color: '#0284C7' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284C7', fontSize: '0.82rem' }}>
                    {String(p.vendorName || p.size || '-').replace(/ x (\d+MM)/i, ' | $1').replace(/ × (\d+MM)/i, ' | $1')}
                  </Typography>
                </Box>
              ) : vendorName ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.25, py: 0.5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.82rem' }}>Job Work</Typography>
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>—</Typography>
              )
            )}
          </TableCell>
          <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
            {p.size ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5, px: 1.25, py: 0.5 }}>
                  <StraightenRoundedIcon sx={{ fontSize: 15, color: '#64748B' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {String(p.size).replace(/ x (\d+MM)/i, ' | $1').replace(/ Ã— (\d+MM)/i, ' | $1')}
                  </Typography>
                </Box>
                <Chip 
                  label={dimensionUnitName} 
                  size="small" 
                  sx={{ 
                    bgcolor: '#F1F5F9', 
                    color: '#475569', 
                    fontWeight: 700, 
                    fontSize: '0.7rem', 
                    height: 20, 
                    borderRadius: 1, 
                    border: '1px solid #CBD5E1' 
                  }} 
                />
                {matchedProduct && (
                  <Chip 
                    label={`${calculateAreaFromSize(p.size as string, (p as any).unit || rawUnit, matchedProduct)} Sq.Ft`}
                    size="small" 
                    sx={{ 
                      bgcolor: '#EFF6FF', 
                      color: '#1D4ED8', 
                      fontWeight: 700, 
                      fontSize: '0.7rem',
                      height: 20,
                      borderRadius: 1,
                      border: '1px solid #BFDBFE'
                    }} 
                  />
                )}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>Standard</Typography>
            )}
          </TableCell>
          {stageFormatted === 'Production' && (
            <>
              <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                <Typography variant="body2" sx={{ fontSize: '0.82rem', color: startDate !== '-' ? '#334155' : '#94A3B8', fontWeight: startDate !== '-' ? 600 : 400 }}>
                  {startDate}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                <Typography variant="body2" sx={{ fontSize: '0.82rem', color: endDate !== '-' ? '#334155' : '#94A3B8', fontWeight: endDate !== '-' ? 600 : 400 }}>
                  {endDate}
                </Typography>
              </TableCell>
            </>
          )}
          {['Polishing', 'Packing'].includes(stageFormatted) && (
            <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
              <Typography variant="body2" sx={{ fontSize: '0.82rem', color: inDate !== '-' ? '#059669' : '#94A3B8', fontWeight: inDate !== '-' ? 700 : 400 }}>
                {inDate}
              </Typography>
            </TableCell>
          )}
          {stageFormatted === 'Dispatch' && (
            <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
              <Typography variant="body2" sx={{ fontSize: '0.82rem', color: outDate !== '-' ? '#DC2626' : '#94A3B8', fontWeight: outDate !== '-' ? 700 : 400 }}>
                {outDate}
              </Typography>
            </TableCell>
          )}
          <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
            <Chip 
              icon={displayStatus === 'completed' ? <CheckCircleRoundedIcon sx={{ fontSize: '14px !important', color: '#059669 !important' }} /> : displayStatus === 'pending' ? <CircleIcon sx={{ fontSize: '8px !important', color: '#94A3B8 !important' }} /> : <CircleIcon sx={{ fontSize: '10px !important', color: '#D97706 !important' }} />}
              label={displayStatus === 'completed' ? 'Completed' : displayStatus === 'pending' ? 'Not Started' : 'Under Process'} 
              size="small" 
              sx={{ 
                fontWeight: 800, 
                fontSize: '0.72rem',
                height: 24,
                px: 0.5,
                borderRadius: 1.5,
                ...(displayStatus === 'completed' ? { bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' } : 
                    displayStatus === 'pending' ? { bgcolor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' } : 
                    { bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' })
              }}
            />
          </TableCell>
          <TableCell align="right" sx={{ py: 2, whiteSpace: 'nowrap' }}>
            <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
              <Tooltip title="View Timeline & Photos">
                <IconButton 
                  size="small" 
                  onClick={() => setViewPiece(p)}
                  sx={{ color: '#0284C7', bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', '&:hover': { bgcolor: '#E0F2FE' } }}
                >
                  <VisibilityIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit Piece Spec">
                <IconButton 
                  size="small" 
                  onClick={() => setEditingPiece(p)}
                  sx={{ color: '#475569', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', '&:hover': { bgcolor: '#F1F5F9' } }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Piece">
                <IconButton 
                  size="small" 
                  onClick={() => handleDeletePiece(p.id)}
                  sx={{ color: '#DC2626', bgcolor: '#FEF2F2', border: '1px solid #FECACA', '&:hover': { bgcolor: '#FEE2E2' } }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </TableCell>
        </TableRow>
      );
    });
  };

  const BASE_STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];
  const stageIdx = BASE_STAGES.indexOf(stageFormatted);
  
  const totalPieces = slab.pieces?.length || 0;
  
  let completedPieces = 0;
  if (stageFormatted === 'Dispatch') {
    const directDispatchLogs = productionLogs?.filter((l: any) =>
      (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') && l.approvalStatus === 'approved' &&
      (l.slabId === slab?.id || l.productName === slab?.name || l.productId === slab?.id || (l.pieceIds && l.pieceIds.some((pid: string) => slab.pieces?.some((p: any) => p.id === pid))))
    ) || [];
    const directQty = directDispatchLogs.reduce((sum: number, l: any) => sum + (l.quantityProduced || 0), 0);

    const packedLogs = productionLogs?.filter((l: any) => 
      (l.stage === 'Packing' || l.stage === 'Packing Work') && l.approvalStatus === 'approved' && 
      (l.slabId === slab?.id || l.productName === slab?.name || l.productId === slab?.id)
    ) || [];
    const allDispatchLogs = productionLogs?.filter((l: any) => (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') && l.approvalStatus === 'approved') || [];
    
    const dispatchedPackedLogs = packedLogs.filter((pLog: any) => 
       allDispatchLogs.some((d: any) => d.boxCode && pLog.boxCode && d.boxCode.includes(pLog.boxCode))
    );
    const packedDispatchedQty = dispatchedPackedLogs.reduce((sum: number, l: any) => sum + (l.quantityProduced || 0), 0);

    const pieceCompletedCount = (slab.pieces || []).filter((p: any) => {
      const pStage = (p.stage || 'Production').split(' - ')[0].replace(' Work', '');
      return pStage === 'Dispatch' && p.status === 'completed';
    }).length;

    completedPieces = Math.max(directQty, packedDispatchedQty, pieceCompletedCount);
  } else if (stageFormatted === 'Packing') {
    const directLogsQty = productionLogs
      ?.filter((l: any) => (l.stage === 'Packing' || l.stage === 'Packing Work') && l.approvalStatus === 'approved' && (l.slabId === slab?.id || l.productName === slab?.name || l.productId === slab?.id || (l.pieceIds && l.pieceIds.some((pid: string) => slab.pieces?.some((p: any) => p.id === pid)))))
      .reduce((sum: number, l: any) => sum + (l.quantityProduced || 0), 0) || 0;

    const pieceCompletedCount = (slab.pieces || []).filter((p: any) => {
      const normalizedPieceStage = (p.stage || 'Production').split(' - ')[0].replace(' Work', '');
      const hasCompletedLog = p.logs && p.logs.some((l: any) => {
        const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
        return (lStage === 'Packing' || lStage.startsWith('Packing')) && (l.status === 'completed' || l.status === 'approved');
      });
      return hasCompletedLog || (normalizedPieceStage === 'Packing' && p.status === 'completed');
    }).length;

    completedPieces = Math.max(directLogsQty, pieceCompletedCount);
  } else {
    completedPieces = (slab.pieces || []).filter((p: any) => {
      const normalizedPieceStage = (p.stage || 'Production').split(' - ')[0].replace(' Work', '');
      const hasCompletedLog = p.logs && p.logs.some((l: any) => {
        const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
        return (lStage === stageFormatted || lStage.startsWith(stageFormatted)) && (l.status === 'completed' || l.status === 'approved');
      });
      return hasCompletedLog || (normalizedPieceStage === stageFormatted && p.status === 'completed');
    }).length;
  }
  
  const pendingPieces = Math.max(0, totalPieces - completedPieces);
  const progressPercent = totalPieces > 0 ? Math.min(100, Math.round((completedPieces / totalPieces) * 100)) : 0;

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 }, maxWidth: '100%', width: '100%', margin: '0 auto' }}>
      {/* HEADER & NAVIGATION BREADCRUMBS */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
        <IconButton 
          onClick={() => navigate(-1)} 
          size="small"
          sx={{ 
            bgcolor: '#FFFFFF', 
            border: '1px solid #CBD5E1', 
            color: '#1E293B',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' } 
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Breadcrumbs sx={{ '& .MuiBreadcrumbs-separator': { color: '#94A3B8' } }}>
          <Link color="inherit" sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#64748B', '&:hover': { color: '#0284C7' } }} onClick={() => navigate('/projects')}>Projects</Link>
          <Link color="inherit" sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#64748B', '&:hover': { color: '#0284C7' } }} onClick={() => navigate(`/projects/${projectId}`)}>{project?.name || 'Project'}</Link>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>{slab.name}</Typography>
        </Breadcrumbs>
      </Box>

      {/* DASHBOARD UNIFIED BANNER */}
      <Paper elevation={0} sx={{ 
        mb: 4, 
        borderRadius: 4, 
        bgcolor: '#FFFFFF', 
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {/* Top Section: Title & Spec Info */}
        <Box sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', textTransform: 'capitalize' }}>
                {slab.name} - {stageFormatted} Workspace
              </Typography>
            </Box>
            
            {slab.size && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.5 }}>
                    <StraightenRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      Spec: {slab.size}
                    </Typography>
                  </Box>
                  <Chip label={combinedUnitDisplay} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '0.75rem', height: 28, borderRadius: 1.5 }} />
                  {matchedProduct && (
                    <Chip label={`${calculateAreaFromSize(slab?.size as string, rawUnit, matchedProduct)} Sq.Ft`} size="small" sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, fontSize: '0.75rem', height: 28, border: '1px solid #BFDBFE', borderRadius: 1.5 }} />
                  )}
                </Box>
            )}
          </Box>
          
          {/* Break Slab Spec Toggle */}
          {stageFormatted === 'Production' && (
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#F8FAFC', p: 0.75, pr: { xs: 0.75, sm: 1.5 }, borderRadius: 2.5, border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
               <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155', ml: 1 }}>Break into pieces?</Typography>
               <ToggleButtonGroup
                  value={cutPiecesOption}
                  exclusive
                  onChange={(e, val) => setCutPiecesOption(val !== null ? val : null)}
                  sx={{ 
                    bgcolor: '#FFFFFF', 
                    p: 0.5,
                    borderRadius: 2,
                    border: '1px solid #E2E8F0',
                    '& .MuiToggleButton-root': { 
                      py: 0.4, 
                      px: 2, 
                      fontWeight: 800, 
                      fontSize: '0.75rem',
                      border: 'none',
                      borderRadius: 1.5,
                      color: '#64748B',
                      transition: 'all 0.15s ease'
                    },
                    '& .MuiToggleButton-root:hover': { bgcolor: '#F1F5F9' },
                    '& .MuiToggleButton-root[value="yes"].Mui-selected': { bgcolor: '#059669', color: '#FFFFFF !important', boxShadow: '0 2px 6px rgba(5,150,105,0.3)' },
                    '& .MuiToggleButton-root[value="no"].Mui-selected': { bgcolor: '#1E293B', color: '#FFFFFF !important', boxShadow: '0 2px 6px rgba(30,41,59,0.3)' }
                  }}
                >
                  <ToggleButton value="yes">YES</ToggleButton>
                  <ToggleButton value="no">NO</ToggleButton>
                </ToggleButtonGroup>
             </Box>
          )}
        </Box>

        {/* Bottom Section: KPIs and Progress */}
        <Box sx={{ bgcolor: '#F8FAFC', p: { xs: 2, sm: 3 } }}>
           <Grid container spacing={4} sx={{ alignItems: 'center' }}>
             {/* Left side: The 3 stats */}
             <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, justifyContent: { xs: 'space-between', md: 'flex-start' }, flexWrap: 'wrap' }}>
                   {/* Stat 1 */}
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#DBEAFE', color: '#1D4ED8' }}>
                        <ViewModuleIcon sx={{ fontSize: 24 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{totalPieces}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mt: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Total Pieces</Typography>
                      </Box>
                   </Box>
                   
                   <Divider orientation="vertical" flexItem sx={{ borderColor: '#E2E8F0', display: { xs: 'none', sm: 'block' } }} />

                   {/* Stat 2 */}
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#D1FAE5', color: '#059669' }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 24 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#059669', lineHeight: 1 }}>{completedPieces}</Typography>
                        <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, mt: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Completed</Typography>
                      </Box>
                   </Box>

                   <Divider orientation="vertical" flexItem sx={{ borderColor: '#E2E8F0', display: { xs: 'none', sm: 'block' } }} />

                   {/* Stat 3 */}
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#FEF3C7', color: '#D97706' }}>
                        <PendingActionsIcon sx={{ fontSize: 24 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#D97706', lineHeight: 1 }}>{pendingPieces}</Typography>
                        <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 700, mt: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Pending</Typography>
                      </Box>
                   </Box>
                </Box>
             </Grid>
             
             {/* Right side: Progress Bar */}
             <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ bgcolor: '#FFFFFF', p: 2, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', letterSpacing: '0.5px' }}>STAGE PROGRESS</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}>{progressPercent}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={progressPercent} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4, 
                      bgcolor: '#F1F5F9',
                      '& .MuiLinearProgress-bar': { bgcolor: '#059669', borderRadius: 4 } 
                    }} 
                  />
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mt: 1, display: 'block', textAlign: 'right', fontSize: '0.65rem' }}>
                    {completedPieces} of {totalPieces} Pieces Finished
                  </Typography>
                </Box>
             </Grid>
           </Grid>
        </Box>
      </Paper>

      {/* PROCESS FULL SLAB PROMPT */}
      {cutPiecesOption === 'no' && stageFormatted === 'Production' && (
        <Paper elevation={0} sx={{ p: 3.5, mb: 4, borderRadius: 3.5, border: '2px dashed #CBD5E1', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                Process Single Full Slab
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                This creates exactly 1 full-size piece corresponding to the slab specification and moves it into the tracking queue.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" onClick={() => setCutPiecesOption(null)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#64748B' }}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleProcessSingleFullSlab} 
                disabled={isSaving}
                sx={{ 
                  borderRadius: 2.5, 
                  bgcolor: '#1E293B', 
                  color: '#FFFFFF', 
                  fontWeight: 800, 
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { bgcolor: '#0F172A' } 
                }}
              >
                {isSaving ? 'Processing...' : 'Confirm Full Slab Entry'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* GENERATE CUSTOM PIECES MATRIX */}
      {cutPiecesOption === 'yes' && stageFormatted === 'Production' && (
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, mb: 4, borderRadius: 4, border: '1px solid #FDE68A', bgcolor: '#FFFDF5', boxShadow: '0 4px 20px rgba(217, 119, 6, 0.04)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeRoundedIcon sx={{ color: '#D97706', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#92400E' }}>
                  Generate Custom Sub-Pieces Matrix
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#78350F', mt: 0.5 }}>
                Configure individual cut dimensions and serial numbers. The system validates total area against the original slab.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button size="small" onClick={() => { setCutPiecesOption(null); setPiecesData([]); }} sx={{ color: '#78350F', fontWeight: 700, textTransform: 'none' }}>
                Close Generator
              </Button>
            </Box>
          </Box>

          <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5, width: '25%' }}>Piece Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5, width: '12%' }}>Serial No</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Length (L)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Width (W)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Thickness (MM)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Area (Sq.Ft)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {piecesData.map((p, idx) => (
                  <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                    <TableCell sx={{ py: 1.25 }}>
                      <TextField 
                        size="small" 
                        value={p.baseName !== undefined ? p.baseName : (p.name ? p.name.substring(0, p.name.lastIndexOf('.')) || p.name : slab.name)}
                        onChange={(e) => {
                          const newBase = e.target.value;
                          handlePieceChange(idx, 'baseName', newBase);
                          handlePieceChange(idx, 'name', `${newBase}.${p.pieceNumber}`);
                        }}
                        fullWidth
                        placeholder="Piece Name"
                        slotProps={{ input: { sx: { borderRadius: 1.5, bgcolor: '#FFFFFF' } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <TextField 
                        size="small" 
                        type="text" 
                        value={p.pieceNumber !== undefined ? p.pieceNumber : ''}
                        onChange={(e) => {
                          const newNum = e.target.value;
                          handlePieceChange(idx, 'pieceNumber', newNum);
                          const base = p.baseName !== undefined ? p.baseName : (p.name ? p.name.substring(0, p.name.lastIndexOf('.')) || p.name : slab.name);
                          handlePieceChange(idx, 'name', `${base}.${newNum}`);
                        }}
                        sx={{ width: 85 }}
                        placeholder="e.g. 1"
                        slotProps={{ input: { sx: { borderRadius: 1.5, bgcolor: '#FFFFFF' } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Select
                        size="small"
                        value={p.unit || rawUnit}
                        onChange={(e) => handlePieceChange(idx, 'unit', e.target.value)}
                        sx={{ bgcolor: '#FFF', height: 36, minWidth: 80, '& .MuiSelect-select': { py: 0.5, fontSize: '0.8rem', fontWeight: 700 } }}
                      >
                        <MenuItem value="inch">Inches</MenuItem>
                        <MenuItem value="mm">MM</MenuItem>
                        <MenuItem value="sq_ft">Sq.Ft</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <TextField 
                        size="small" type="number" 
                        value={p.l === 0 ? '' : p.l}
                        onChange={(e) => handlePieceChange(idx, 'l', Number(e.target.value))}
                        slotProps={{ input: { sx: { borderRadius: 1.5, bgcolor: '#FFFFFF' } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <TextField 
                        size="small" type="number" 
                        value={p.w === 0 ? '' : p.w}
                        onChange={(e) => handlePieceChange(idx, 'w', Number(e.target.value))}
                        slotProps={{ input: { sx: { borderRadius: 1.5, bgcolor: '#FFFFFF' } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <TextField 
                        size="small" type="number" 
                        value={p.t === 0 ? '' : p.t}
                        onChange={(e) => handlePieceChange(idx, 't', Number(e.target.value))}
                        slotProps={{ input: { sx: { borderRadius: 1.5, bgcolor: '#FFFFFF' } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Chip 
                        label={`${calculateAreaFromSize(`${p.l}L x ${p.w}W`, p.unit || rawUnit, matchedProduct)} Sq.Ft`} 
                        size="small" 
                        sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 800, fontSize: '0.72rem' }} 
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.25 }}>
                      <IconButton size="small" onClick={() => handleRemovePiece(idx)} sx={{ color: '#DC2626', '&:hover': { bgcolor: '#FEE2E2' } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Matrix Actions Toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={() => {
                  const existingPieces = slab.pieces || [];
                  let maxNum = 0;
                  if (existingPieces.length > 0) {
                    maxNum = Math.max(...existingPieces.map((p: any) => p.pieceNumber || 0));
                  }
                  let lastPieceNum = parseInt(piecesData[piecesData.length - 1]?.pieceNumber as any);
                  if (isNaN(lastPieceNum)) lastPieceNum = maxNum;
                  
                  const nextNum = lastPieceNum + 1;
                  const lastUnit = piecesData.length > 0 ? piecesData[piecesData.length - 1].unit : undefined;
                  setPiecesData([...piecesData, { 
                    pieceNumber: nextNum,
                    baseName: slab.name,
                    name: `${slab.name}.${nextNum}`,
                    l: 0, w: 0, t: 0, unit: lastUnit
                  }]);
                }}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#1E293B', bgcolor: '#FFFFFF' }}
              >
                + Add 1 Piece
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2, borderLeft: '1px solid #E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>Bulk Quantity:</Typography>
                <TextField 
                  size="small" 
                  type="number" 
                  placeholder="Qty" 
                  id="bulk-add-qty"
                  sx={{ width: 70, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => {
                    const qtyInput = document.getElementById('bulk-add-qty') as HTMLInputElement;
                    const count = parseInt(qtyInput?.value || '0');
                    if (count > 0) {
                      const existingPieces = slab.pieces || [];
                      let maxNum = 0;
                      if (existingPieces.length > 0) {
                        maxNum = Math.max(...existingPieces.map((p: any) => p.pieceNumber || 0));
                      }
                      let lastPieceNum = parseInt(piecesData[piecesData.length - 1]?.pieceNumber as any);
                      if (isNaN(lastPieceNum)) lastPieceNum = maxNum;
                      
                      const lastUnit = piecesData.length > 0 ? piecesData[piecesData.length - 1].unit : undefined;
                      const newPieces = Array.from({ length: count }).map((_, idx) => {
                        const nextNum = lastPieceNum + idx + 1;
                        return {
                          pieceNumber: nextNum,
                          baseName: slab.name,
                          name: `${slab.name}.${nextNum}`,
                          l: 0, w: 0, t: 0, unit: lastUnit
                        };
                      });
                      setPiecesData([...piecesData, ...newPieces]);
                      qtyInput.value = '';
                    }
                  }}
                  sx={{ borderRadius: 1.5, bgcolor: '#1E293B', color: '#FFFFFF', fontWeight: 700, textTransform: 'none' }}
                >
                  Generate
                </Button>
              </Box>

              <Button 
                variant="outlined" 
                startIcon={<ContentCopyRoundedIcon />}
                onClick={() => {
                  if (piecesData.length > 1) {
                    const firstPiece = piecesData[0];
                    const newData = piecesData.map((p, i) => i === 0 ? p : { ...p, l: firstPiece.l, w: firstPiece.w, t: firstPiece.t, unit: firstPiece.unit });
                    setPiecesData(newData);
                  }
                }}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#1E293B', bgcolor: '#FFFFFF' }}
              >
                Copy Row 1 Size to All
              </Button>
            </Box>

            <Button 
              variant="contained" 
              onClick={() => {
                handleSavePieces();
                setCutPiecesOption(null);
              }} 
              disabled={isSaving || piecesData.length === 0}
              sx={{ 
                borderRadius: 2.5, 
                bgcolor: '#059669', 
                color: '#FFFFFF', 
                fontWeight: 800, 
                textTransform: 'none',
                px: 3.5,
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                '&:hover': { bgcolor: '#047857' }
              }}
            >
              {isSaving ? 'Saving...' : 'Save Pieces to Table'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* MAIN TRACKING TABLE PAPER */}
      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)' }}>
        {/* Table Header Bar */}
        <Box sx={{ p: 2.5, px: 3, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', fontSize: '1.1rem' }}>
              {stageFormatted} Tracking Table
            </Typography>
            <Chip 
              label={`${totalPieces} Tracked Items`} 
              size="small" 
              sx={{ bgcolor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 700, fontSize: '0.72rem' }} 
            />
          </Box>

          <TextField 
            size="small" 
            placeholder="Search piece, machine, or size..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, bgcolor: '#FFFFFF', fontSize: '0.85rem' }
              }
            }}
            sx={{ width: { xs: '100%', sm: 280 } }}
          />
        </Box>

        {/* Packing & Dispatch: Log-based table */}
        {(stageFormatted === 'Packing' || stageFormatted === 'Dispatch') ? (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    Date & Time
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    Logged By
                  </TableCell>
                  {(stageFormatted === 'Packing' || stageFormatted === 'Dispatch') && (
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                      Box Number
                    </TableCell>
                  )}
                  {(stageFormatted === 'Packing' || stageFormatted === 'Dispatch') && (
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                      Box Code
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    Pieces Count
                  </TableCell>
                  {(stageFormatted === 'Packing' || stageFormatted === 'Dispatch') && (
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                      Box Spec / Size
                    </TableCell>
                  )}
                  {stageFormatted === 'Dispatch' && (
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                      Vehicle Number
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    Photo
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }} align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  let displayLogs: any[] = [];
                  
                  if (stageFormatted === 'Dispatch') {
                    const packedLogs = productionLogs?.filter((l: any) =>
                      (l.stage === 'Packing' || l.stage === 'Packing Work') &&
                      (l.approvalStatus === 'approved' || l.approvalStatus === 'completed') &&
                      (l.slabId === slab?.id || l.productName === slab?.name || l.productId === slab?.id)
                    ) || [];
                    
                    const dispatchLogs = productionLogs?.filter((l: any) =>
                      (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') &&
                      (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
                    ) || [];

                    const matchedDispatchIds = new Set<string>();

                    const packedDisplay = packedLogs.map((pLog: any) => {
                      const dLog = dispatchLogs.find((d: any) => d.boxCode && pLog.boxCode && d.boxCode.includes(pLog.boxCode));
                      if (dLog) matchedDispatchIds.add(dLog.id);
                      return {
                        id: pLog.id,
                        workerName: dLog?.workerName || dLog?.worker?.name || pLog.workerName || pLog.worker?.name,
                        vendorName: dLog?.vendorName || pLog.vendorName,
                        isDispatched: !!dLog,
                        dispatchLogId: dLog?.id,
                        createdAt: dLog ? dLog.createdAt : pLog.createdAt,
                        boxCode: pLog.boxCode,
                        vehicleNumber: dLog ? dLog.vehicleNumber : null,
                        quantityProduced: pLog.quantityProduced,
                        photo: dLog ? (dLog.startPhotos?.machine || dLog.startPhotos?.unit || dLog.startPhotos?.software || dLog.startPhotos?.endPhoto) : null,
                        logToDelete: dLog?.id || pLog.id
                      };
                    });

                    // Direct dispatch logs (logged directly at Dispatch stage without prior Packing log, or when Packing was skipped)
                    const directLogs = dispatchLogs.filter((dLog: any) => {
                      if (matchedDispatchIds.has(dLog.id)) return false;
                      const matchesSlab = dLog.slabId === slab?.id || dLog.productName === slab?.name || dLog.productId === slab?.id || (dLog.pieceIds && dLog.pieceIds.some((pid: string) => slab.pieces?.some((p: any) => p.id === pid)));
                      return matchesSlab;
                    }).map((dLog: any) => ({
                      id: dLog.id,
                      workerName: dLog.workerName || dLog.worker?.name,
                      vendorName: dLog.vendorName,
                      isDispatched: true,
                      dispatchLogId: dLog.id,
                      createdAt: dLog.createdAt,
                      boxCode: dLog.boxCode || 'DIRECT DISPATCH|DIRECT|-',
                      vehicleNumber: dLog.vehicleNumber || '-',
                      quantityProduced: dLog.quantityProduced,
                      photo: dLog.startPhotos?.machine || dLog.startPhotos?.unit || dLog.startPhotos?.software || dLog.startPhotos?.endPhoto,
                      logToDelete: dLog.id
                    }));

                    displayLogs = [...packedDisplay, ...directLogs];
                  } else {
                    displayLogs = productionLogs?.filter((l: any) =>
                      l.stage === stageFormatted &&
                      (l.approvalStatus === 'approved' || l.approvalStatus === 'completed') &&
                      (l.slabId === slab?.id || l.productName === slab?.name || l.productId === slab?.id)
                    ) || [];
                  }

                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    displayLogs = displayLogs.filter((l: any) => 
                      String(l.boxCode || '').toLowerCase().includes(q) ||
                      String(l.vehicleNumber || '').toLowerCase().includes(q)
                    );
                  }

                  if (displayLogs.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={stageFormatted === 'Dispatch' ? 9 : 8} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                          <Inventory2RoundedIcon sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                            {searchQuery ? 'No matching logs found' : 'No stage entries recorded yet.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return displayLogs.map((log: any, idx: number) => {
                    const logDate = new Date(log.createdAt);
                    const formattedDate = `${logDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} | ${logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                    const photo = stageFormatted === 'Dispatch' ? log.photo : (log.startPhotos?.machine || log.startPhotos?.unit || log.startPhotos?.software || log.startPhotos?.endPhoto);
                    
                    const isDirect = log.boxCode?.toUpperCase().includes('DIRECT DISPATCH') || (stageFormatted === 'Dispatch' && !log.boxCode);
                    const boxPart0 = isDirect ? 'DIRECT DISPATCH' : (log.boxCode?.split('|')[0] || '-');
                    const boxPart1 = isDirect ? '-' : (log.boxCode?.split('|')[1] || '-');
                    const boxPart2 = isDirect ? '-' : (log.boxCode?.split('|')[2] || '-');

                    return (
                      <TableRow key={log.id} sx={{ bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#FBFBFB', '&:hover': { bgcolor: '#F8FAFC' }, opacity: stageFormatted === 'Dispatch' && !log.isDispatched ? 0.7 : 1 }}>
                        <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {stageFormatted === 'Dispatch' && !log.isDispatched ? '-' : formattedDate}
                          </Typography>
                        </TableCell>
                        
                        {/* Logged By */}
                        <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                          {(() => {
                            const logger = log.workerName || log.worker?.name || log.vendorName || 'Abhay 1';
                            const approvalId = log.id ? `#${log.id.slice(-6).toUpperCase()}` : null;
                            return (
                              <Box sx={{ display: 'inline-flex', flexDirection: 'column', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                                  {logger}
                                </Typography>
                                {approvalId && (
                                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem' }}>
                                    ID: {approvalId}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })()}
                        </TableCell>

                        {(stageFormatted === 'Packing' || stageFormatted === 'Dispatch') && (
                          <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                            {isDirect ? (
                              <Chip label="DIRECT DISPATCH" size="small" sx={{ fontWeight: 800, bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', height: 22 }} />
                            ) : (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 1.5, px: 1, py: 0.3 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534' }}>
                                  {boxPart0}
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                        )}
                        {(stageFormatted === 'Packing' || stageFormatted === 'Dispatch') && (
                          <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                              {boxPart1}
                            </Typography>
                          </TableCell>
                        )}
                        
                        <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                          <Chip 
                            label={`${log.quantityProduced || log.pieceIds?.length || 0} Pieces`} 
                            size="small" 
                            sx={{ fontWeight: 700, bgcolor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #DBEAFE', height: 22 }} 
                          />
                        </TableCell>
                        
                        {(stageFormatted === 'Packing' || stageFormatted === 'Dispatch') && (
                          <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.82rem', fontWeight: 500 }}>
                              {boxPart2}
                            </Typography>
                          </TableCell>
                        )}

                        {stageFormatted === 'Dispatch' && (
                          <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                            {log.isDispatched ? (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 1.5, px: 1, py: 0.4 }}>
                                <DirectionsCarRoundedIcon sx={{ fontSize: 16, color: '#1D4ED8' }} />
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#1D4ED8' }}>
                                  {log.vehicleNumber || '-'}
                                </Typography>
                              </Box>
                            ) : (
                              <Chip label="Awaiting Truck" size="small" sx={{ bgcolor: '#FFFBEB', color: '#D97706', fontSize: '0.7rem', height: 20 }} />
                            )}
                          </TableCell>
                        )}
                        
                        <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                          {photo ? (
                            <Box 
                              onClick={() => setPreviewPhotoUrl(photo)} 
                              sx={{ 
                                width: 44, 
                                height: 44, 
                                borderRadius: 2, 
                                overflow: 'hidden', 
                                border: '1px solid #E2E8F0', 
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                '&:hover': { transform: 'scale(1.08)', borderColor: '#0284C7' } 
                              }}
                            >
                              <img src={photo} alt="Entry Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#CBD5E1' }}>No Photo</Typography>
                          )}
                        </TableCell>
                        
                        <TableCell align="right" sx={{ py: 2, whiteSpace: 'nowrap' }}>
                          {!(stageFormatted === 'Dispatch' && !log.isDispatched) ? (
                            <IconButton 
                              size="small" 
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this log entry?')) {
                                  try {
                                    const idToDelete = stageFormatted === 'Dispatch' ? log.logToDelete : log.id;
                                    await deleteProductionLog(idToDelete).unwrap();
                                    refetchProductionLogs();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              sx={{ color: '#DC2626', bgcolor: '#FEF2F2', border: '1px solid #FECACA', '&:hover': { bgcolor: '#FEE2E2' } }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#CBD5E1' }}>â€”</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          /* Production & Polishing: Piece-based table */
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader sx={{ minWidth: 950 }}>
              <TableHead>
                <TableRow>
                  {stageFormatted === 'Production' && (
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                      Machine / Workstation
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    Product / Piece Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    {stageFormatted === 'Polishing' ? 'Logged By' : 'Used Raw Block'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    Actual Dimensions
                  </TableCell>
                  {stageFormatted === 'Production' && (
                    <>
                      <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                        Start Time
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                        End Time
                      </TableCell>
                    </>
                  )}
                  {stageFormatted === 'Polishing' && (
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                      Completed Date
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }}>
                    Live Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.75, whiteSpace: 'nowrap' }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renderTableRows()}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* EDIT TRACKING PIECE DIALOG */}
      <Dialog 
        open={!!editingPiece} 
        onClose={() => setEditingPiece(null)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B' }}>Edit Piece Specification</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          <TextField 
            label="Product / Piece Name" 
            value={editingPiece?.productName || editingPiece?.pieceNumber || ''} 
            onChange={e => setEditingPiece({ ...editingPiece, productName: e.target.value })} 
            fullWidth 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
          <TextField 
            label="Size Spec (e.g. 20L x 10W | 18MM)" 
            value={editingPiece?.size || ''} 
            onChange={e => setEditingPiece({ ...editingPiece, size: e.target.value })} 
            fullWidth 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setEditingPiece(null)} sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleEditPieceSave}
            sx={{ 
              borderRadius: 2, 
              bgcolor: '#1E293B', 
              color: '#FFFFFF', 
              fontWeight: 800, 
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#0F172A' }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW PIECE TIMELINE & HISTORY DIALOG */}
      <Dialog 
        open={!!viewPiece} 
        onClose={() => setViewPiece(null)} 
        maxWidth="lg" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '1.2rem' }}>
          <VisibilityIcon sx={{ color: '#0284C7' }} /> 
          Timeline & Audit Trail: {viewPiece?.productName || viewPiece?.pieceNumber}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3.5, bgcolor: '#FAFAFA' }}>
          {(() => {
            const pieceProductionLogs = productionLogs?.filter((l: any) => l.pieceIds?.includes(viewPiece?.id) || (!l.pieceIds?.length && (l.slabId === viewPiece?.id || l.productId === viewPiece?.id))) || [];
            
            const linkedMachineLogIds = pieceProductionLogs
              .filter((l: any) => l.stage === 'Production Work' && l.parentLogId)
              .map((l: any) => l.parentLogId);

            const pieceMachineLogs = machineLogs?.filter((l: any) => 
              l.productId === viewPiece?.id || linkedMachineLogIds.includes(l.id)
            ) || [];
            
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

            let combinedLogs = [...formattedProductionLogs, ...formattedMachineLogs].filter((log: any) => {
              if (stageFormatted === 'Production') {
                return log.stage === 'Production Work' || log.stage === 'Production Work (Machine)' || log.stage === 'Production';
              }
              return log.stage === stageFormatted || log.stage === `${stageFormatted} Work`;
            });

            combinedLogs.sort((a: any, b: any) => {
              const dateA = new Date(a.startTime || a.createdAt).getTime();
              const dateB = new Date(b.startTime || b.createdAt).getTime();
              return dateA - dateB;
            });

            if (combinedLogs.length === 0) {
              return (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <ScheduleRoundedIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1.5, display: 'block', mx: 'auto' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                    No audit logs or tracking history found for this item.
                  </Typography>
                </Box>
              );
            }

            return (
              <Box sx={{ position: 'relative', ml: 2, borderLeft: '2px solid #E2E8F0', pl: 4, display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
                {combinedLogs.map((log: any, i: number) => {
                  const isOut = log.displayType === 'Material OUT' || log.displayType === 'Machine Start';
                  return (
                    <Box key={i} sx={{ position: 'relative' }}>
                      <Box sx={{ 
                        position: 'absolute', 
                        left: -41, 
                        top: 20, 
                        width: 16, 
                        height: 16, 
                        borderRadius: '50%', 
                        bgcolor: isOut ? '#D97706' : '#0284C7',
                        border: '3px solid #FFFFFF',
                        boxShadow: '0 0 0 2px ' + (isOut ? '#FDE68A' : '#BAE6FD')
                      }} />
                      <Paper sx={{ 
                        p: 3, 
                        borderRadius: 3.5, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                        border: '1px solid #E2E8F0',
                        bgcolor: '#FFFFFF',
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box>
                           <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800, display: 'block', mb: 0.75, letterSpacing: '0.5px' }}>
                             {new Date(log.startTime || log.createdAt).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                           </Typography>
                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                             <Typography variant="h6" sx={{ fontWeight: 800, color: isOut ? '#D97706' : '#0284C7' }}>
                               {log.displayType}
                             </Typography>
                             {log.approvalStatus === 'approved' && <Chip size="small" label="Approved" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 800, fontSize: '0.7rem', height: 22, border: '1px solid #A7F3D0' }} />}
                             {log.approvalStatus === 'pending' && <Chip size="small" label="Pending" sx={{ bgcolor: '#FFFBEB', color: '#D97706', fontWeight: 800, fontSize: '0.7rem', height: 22, border: '1px solid #FDE68A' }} />}
                           </Box>
                           <Typography variant="subtitle2" sx={{ color: '#1E293B', fontWeight: 700 }}>
                             {log.stage}
                           </Typography>
                           <Typography variant="body2" sx={{ color: '#64748B', mt: 0.75 }}>
                             Worker / Vendor: <strong style={{ color: '#1E293B' }}>{typeof log.worker === 'object' ? log.worker?.name : log.worker || log.vendorName || 'Unknown'}</strong>
                           </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                          {(log.startPhotos?.machine || log.machinePhotoUrl) && (
                            <Box onClick={() => setPreviewPhotoUrl(log.startPhotos?.machine || log.machinePhotoUrl)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover': { transform: 'scale(1.05)' }}}>
                               <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748B', mb: 0.5, fontWeight: 700 }}>Machine</Typography>
                               <img src={log.startPhotos?.machine || log.machinePhotoUrl} alt="Machine" style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0' }} />
                            </Box>
                          )}
                          {(log.startPhotos?.unit || log.unitPhotoUrl) && (
                            <Box onClick={() => setPreviewPhotoUrl(log.startPhotos?.unit || log.unitPhotoUrl)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover': { transform: 'scale(1.05)' }}}>
                               <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748B', mb: 0.5, fontWeight: 700 }}>Unit</Typography>
                               <img src={log.startPhotos?.unit || log.unitPhotoUrl} alt="Unit" style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0' }} />
                            </Box>
                          )}
                          {(log.startPhotos?.software || log.softwarePhotoUrl) && (
                            <Box onClick={() => setPreviewPhotoUrl(log.startPhotos?.software || log.softwarePhotoUrl)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover': { transform: 'scale(1.05)' }}}>
                               <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748B', mb: 0.5, fontWeight: 700 }}>Software</Typography>
                               <img src={log.startPhotos?.software || log.softwarePhotoUrl} alt="Software" style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0' }} />
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
          <Button onClick={() => setViewPiece(null)} sx={{ borderRadius: 2, color: '#1E293B', fontWeight: 700, textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* PHOTO PREVIEW DIALOG */}
      <Dialog 
        open={!!previewPhotoUrl} 
        onClose={() => setPreviewPhotoUrl(null)} 
        maxWidth="md" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, overflow: 'hidden' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#1E293B' }}>
          Photo Preview
          <IconButton onClick={() => setPreviewPhotoUrl(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 3, bgcolor: '#F8FAFC' }}>
          {previewPhotoUrl && (
            <img src={previewPhotoUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StageDetails;
