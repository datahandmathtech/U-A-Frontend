import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, TableFooter, Button, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Autocomplete, Alert, Chip, Select, MenuItem, FormControl, InputLabel 
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { useDeductInventoryMutation, useUpdateInventoryLogMutation, useDeleteInventoryLogMutation, useGetAllSlabNamesQuery, useGetItemLogsQuery, useGetProjectHierarchyQuery } from '../store/apiSlice';

const ItemLedger = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const { data: itemLogsData, isLoading, refetch } = useGetItemLogsQuery(itemId || '', { skip: !itemId });

  // Safely extract logs & inventory whether backend returns { item, logs } or [ ...logs ]
  const logs: any[] = Array.isArray(itemLogsData) 
    ? itemLogsData 
    : (itemLogsData?.logs && Array.isArray(itemLogsData.logs) ? itemLogsData.logs : []);

  const inventory: any = (!Array.isArray(itemLogsData) && itemLogsData?.item)
    ? itemLogsData.item 
    : (logs.length > 0 && logs[0]?.inventory ? logs[0].inventory : null);

  const parsePieceDimensions = (sizeStr: string, unitHint?: string) => {
    if (!sizeStr) return { l: 0, w: 0, t: 0, sqft: 0, lFeet: 0, wFeet: 0, lInch: 0, wInch: 0, lMM: 0, wMM: 0, isFt: false, isMM: false, unit: 'inch' };
    
    const normalizedUnitHint = (unitHint || '').toLowerCase().trim();
    const isFtHint = normalizedUnitHint === 'sq_ft' || normalizedUnitHint === 'sqft' || normalizedUnitHint === 'sq. ft' || normalizedUnitHint === 'feet' || normalizedUnitHint === 'ft' || normalizedUnitHint.includes('ft') || normalizedUnitHint.includes('sq');
    const isMMHint = normalizedUnitHint === 'mm';
    const isInchHint = normalizedUnitHint === 'inch' || normalizedUnitHint === 'inches' || normalizedUnitHint === 'in';

    const isFt = isFtHint || /\b(?:ft|feet)\b/i.test(sizeStr);
    const isMM = isMMHint || /\b(?:mm)\b/i.test(sizeStr.replace(/\|\s*\d+\s*MM/i, '')) || sizeStr.toLowerCase().includes('(mm)');
    
    // Extract thickness (e.g. | 12MM)
    const tMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*MM/i);
    const t = tMatch ? parseFloat(tMatch[1]) : 0;
    
    const sizePart = sizeStr.split('|')[0].trim();
    const parts = sizePart.split(/\s*[xX×]\s*/);
    let l = 0, w = 0;
    if (parts.length >= 2) {
      const lMatch = parts[0].match(/(\d+(?:\.\d+)?)/);
      const wMatch = parts[1].match(/(\d+(?:\.\d+)?)/);
      l = lMatch ? parseFloat(lMatch[1]) : 0;
      w = wMatch ? parseFloat(wMatch[1]) : 0;
    } else {
      const lMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*L/i);
      const wMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*W/i);
      l = lMatch ? parseFloat(lMatch[1]) : 0;
      w = wMatch ? parseFloat(wMatch[1]) : 0;
    }

    // If dimensions are large (> 500), they are MM (e.g. 7898 x 6589)
    const effectiveIsMM = isMM || (l > 500 && w > 500);
    const effectiveIsFt = !effectiveIsMM && (isFt || (!isInchHint && isFtHint));

    let lFeet = 0, wFeet = 0, lInch = 0, wInch = 0, lMM = 0, wMM = 0, sqft = 0, unit = 'inch';

    if (effectiveIsMM) {
      unit = 'mm';
      lMM = l;
      wMM = w;
      lInch = l / 25.4;
      wInch = w / 25.4;
      lFeet = l / 304.8;
      wFeet = w / 304.8;
      sqft = (l * w) / 92903.04;
    } else if (effectiveIsFt) {
      unit = 'feet';
      lFeet = l;
      wFeet = w;
      lInch = l * 12;
      wInch = w * 12;
      lMM = l * 304.8;
      wMM = w * 304.8;
      sqft = l * w;
    } else {
      unit = 'inch';
      lInch = l;
      wInch = w;
      lFeet = l / 12;
      wFeet = w / 12;
      lMM = l * 25.4;
      wMM = w * 25.4;
      sqft = (l * w) / 144;
    }

    return { l, w, t, sqft, lFeet, wFeet, lInch, wInch, lMM, wMM, isFt: effectiveIsFt, isMM: effectiveIsMM, unit };
  };

  const [openDeduct, setOpenDeduct] = useState(false);
  const [deductForm, setDeductForm] = useState({ length: '', width: '', thickness: '', date: new Date().toISOString().substring(0,10), productName: '', unit: 'inch' });
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  
  const { data: allSlabNames = [] } = useGetAllSlabNamesQuery();
  const uniqueSlabNames = React.useMemo(() => Array.from(new Set(allSlabNames || [])), [allSlabNames]);
  const { data: projectHierarchy = [] } = useGetProjectHierarchyQuery();
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedSlab, setSelectedSlab] = useState<any>(null);
  const [selectedPiece, setSelectedPiece] = useState<any>(null);

  const [deductInventory] = useDeductInventoryMutation();
  const [updateLog] = useUpdateInventoryLogMutation();
  const [deleteLog] = useDeleteInventoryLogMutation();

  const [deductError, setDeductError] = useState('');
  const [openWastage, setOpenWastage] = useState(false);
  const [isWastageLoading, setIsWastageLoading] = useState(false);

  const autoProject = React.useMemo(() => {
    if (!projectHierarchy || projectHierarchy.length === 0) return null;
    
    // Check if inventory has explicit project relation from backend
    const relProject = inventory?.projectMaterials?.[0]?.project || inventory?.slabs?.[0]?.project;
    if (relProject) {
      const match = projectHierarchy.find((p: any) => p.id === relProject.id || p.name === relProject.name);
      if (match) return match;
    }

    // Check supplier string against project name, clientName, or projectId
    const sup = (inventory?.supplier || '').toLowerCase().trim();
    if (sup) {
      const match = projectHierarchy.find((p: any) => 
        (p.name && p.name.toLowerCase().trim() === sup) ||
        (p.clientName && p.clientName.toLowerCase().trim() === sup) ||
        (p.projectId && p.projectId.toLowerCase().trim() === sup)
      );
      if (match) return match;
    }

    // Check if any slab matches inventory item name
    const itemNm = (inventory?.itemName || '').toLowerCase().trim();
    if (itemNm) {
      const match = projectHierarchy.find((p: any) => 
        p.slabs?.some((s: any) => s.name && s.name.toLowerCase().trim() === itemNm)
      );
      if (match) return match;
    }

    return null;
  }, [inventory, projectHierarchy]);

  const activeProject = selectedProject || autoProject;

  // Auto-select slab if matching or only 1 slab in production
  React.useEffect(() => {
    if (activeProject && !selectedSlab && (activeProject.slabs || []).length > 0) {
      const prodSlabs = activeProject.slabs.filter((s: any) => s.hasProduction || (s.pieces || []).some((p: any) => p.hasProduction));
      const targetPool = prodSlabs.length > 0 ? prodSlabs : activeProject.slabs;
      const matchingSlab = targetPool.find((s: any) => s.name?.toLowerCase().trim() === (inventory?.itemName || '').toLowerCase().trim()) || (targetPool.length === 1 ? targetPool[0] : null);
      if (matchingSlab) {
        setSelectedSlab(matchingSlab);
      }
    }
  }, [activeProject, selectedSlab, inventory]);

  const handleDeductSubmit = async () => {
    try {
      setDeductError('');
      const len = Number(deductForm.length) || 0;
      const wid = Number(deductForm.width) || 0;
      let usedArea = 0;
      if (deductForm.unit === 'feet') {
        usedArea = len * wid;
      } else if (deductForm.unit === 'mm') {
        usedArea = (len * wid) / 92903.04;
      } else {
        usedArea = (len * wid) / 144;
      }
      
      if (usedArea <= 0) {
        setDeductError('Please enter valid length and width');
        return;
      }

      // Size check: Used size cannot be smaller than the required piece size ("kam se kabhi nahi banega")
      if (selectedPiece?.size) {
        const parsed = parsePieceDimensions(selectedPiece.size, selectedPiece.unit || selectedSlab?.unit);

        if (deductForm.unit === 'feet') {
          const minL = Number(parsed.lFeet.toFixed(2));
          const minW = Number(parsed.wFeet.toFixed(2));
          if (parsed.lFeet > 0 && len < (parsed.lFeet - 0.05)) {
            const msg = `Used Length (${len} ft) cannot be smaller than piece required length (${minL} ft / ${parsed.lInch.toFixed(1)}")! Larger or equal size is required.`;
            setDeductError(msg);
            alert(msg);
            return;
          }
          if (parsed.wFeet > 0 && wid < (parsed.wFeet - 0.05)) {
            const msg = `Used Width (${wid} ft) cannot be smaller than piece required width (${minW} ft / ${parsed.wInch.toFixed(1)}")! Larger or equal size is required.`;
            setDeductError(msg);
            alert(msg);
            return;
          }
        } else if (deductForm.unit === 'mm') {
          const minL = Math.round(parsed.lMM);
          const minW = Math.round(parsed.wMM);
          if (parsed.lMM > 0 && len < (minL - 2)) {
            const msg = `Used Length (${len} mm) cannot be smaller than piece required length (${minL} mm / ${parsed.lFeet.toFixed(2)} ft)! Larger or equal size is required.`;
            setDeductError(msg);
            alert(msg);
            return;
          }
          if (parsed.wMM > 0 && wid < (minW - 2)) {
            const msg = `Used Width (${wid} mm) cannot be smaller than piece required width (${minW} mm / ${parsed.wFeet.toFixed(2)} ft)! Larger or equal size is required.`;
            setDeductError(msg);
            alert(msg);
            return;
          }
        } else {
          const minL = Number(parsed.lInch.toFixed(2));
          const minW = Number(parsed.wInch.toFixed(2));
          if (parsed.lInch > 0 && len < (minL - 0.05)) {
            const msg = `Used Length (${len}") cannot be smaller than piece required length (${minL}" / ${parsed.lFeet.toFixed(2)} ft)! Larger or equal size is required.`;
            setDeductError(msg);
            alert(msg);
            return;
          }
          if (parsed.wInch > 0 && wid < (minW - 0.05)) {
            const msg = `Used Width (${wid}") cannot be smaller than piece required width (${minW}" / ${parsed.lFeet.toFixed(2)} ft)! Larger or equal size is required.`;
            setDeductError(msg);
            alert(msg);
            return;
          }
        }

        if (parsed.t > 0 && deductForm.thickness && Number(deductForm.thickness) < parsed.t) {
          const msg = `Used Thickness (${deductForm.thickness}MM) cannot be smaller than piece required thickness (${parsed.t}MM)! Larger or equal size is required.`;
          setDeductError(msg);
          alert(msg);
          return;
        }
      }

      if (usedArea > (inventory?.quantity || 0)) {
        const msg = `Not enough stock available! Remaining stock is only ${(inventory?.quantity || 0).toFixed(2)} Sq.Ft (Requested: ${usedArea.toFixed(2)} Sq.Ft)`;
        setDeductError(msg);
        return;
      }

      await deductInventory({
        inventoryId: itemId as string,
        usedQuantity: usedArea,
        wasteQuantity: 0,
        projectName: activeProject ? activeProject.name : deductForm.productName,
        projectId: activeProject?.id,
        slabId: selectedSlab?.id,
        pieceId: selectedPiece?.id,
        pieceName: selectedPiece?.productName || selectedPiece?.name || selectedSlab?.name || '',
        length: deductForm.length,
        width: deductForm.width,
        thickness: deductForm.thickness,
        unit: deductForm.unit,
        date: deductForm.date
      }).unwrap();
      setOpenDeduct(false);
      setSelectedProject(null);
      setSelectedSlab(null);
      setSelectedPiece(null);
      setDeductForm({ length: '', width: '', thickness: '', date: new Date().toISOString().substring(0,10), productName: '', unit: 'inch' });
      refetch();
    } catch (error: any) {
      console.error('Failed to deduct inventory:', error);
      setDeductError(error?.data?.message || error?.message || 'Failed to deduct stock');
    }
  };

  const handleWastageSubmit = async () => {
    try {
      setIsWastageLoading(true);
      const remainingStock = Number(inventory?.quantity) || 0;
      if (remainingStock <= 0) {
        setOpenWastage(false);
        setIsWastageLoading(false);
        return;
      }
      await deductInventory({
        inventoryId: itemId as string,
        usedQuantity: 0,
        wasteQuantity: remainingStock,
        projectName: 'Waste',
        date: new Date().toISOString().substring(0, 10)
      }).unwrap();
      setOpenWastage(false);
      refetch();
    } catch (error: any) {
      console.error('Failed to record wastage:', error);
    } finally {
      setIsWastageLoading(false);
    }
  };

  const handleEditClick = (log: any) => {
    let l = '', w = '', t = '', unit = 'inch';
    let cleanName = (log.remarks || '').replace('Project: ', '').trim();
    
    if (cleanName.toLowerCase().includes('mm x') || cleanName.toLowerCase().includes('mm ×')) {
      unit = 'mm';
    } else if (cleanName.toLowerCase().includes('ft x') || cleanName.toLowerCase().includes('ft ×') || cleanName.toLowerCase().includes('feet')) {
      unit = 'feet';
    } else {
      unit = 'inch';
    }

    const tMatch = cleanName.match(/(\d+(?:\.\d+)?)\s*MM/i);
    if (tMatch) t = tMatch[1];

    const matches = [...cleanName.matchAll(/\((\d+(?:\.\d+)?)\s*(?:mm|ft|in|L)?[xX×]\s*(\d+(?:\.\d+)?)\s*(?:mm|ft|in|W)?[^)]*\)/gi)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      l = lastMatch[1];
      w = lastMatch[2];
    } else {
      const parts = cleanName.split('|')[0].match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
      if (parts) {
        l = parts[1];
        w = parts[2];
      }
    }

    cleanName = cleanName.replace(/\s*\(\d+(?:\.\d+)?\s*(?:mm|ft|in|L)?[xX×]\s*\d+(?:\.\d+)?\s*(?:mm|ft|in|W)?[^)]*\)/gi, '').trim();

    setEditForm({ 
      id: log.id, 
      productName: cleanName,
      length: l || '', 
      width: w || '',
      thickness: t || '',
      unit: unit,
      date: new Date(log.createdAt).toISOString().substring(0,10) 
    });
    setOpenEdit(true);
  };

  const handleEditSubmit = async () => {
    try {
      const len = Number(editForm.length) || 0;
      const wid = Number(editForm.width) || 0;
      if (len <= 0 || wid <= 0) return;
      
      let usedArea = 0;
      if (editForm.unit === 'feet') {
        usedArea = len * wid;
      } else if (editForm.unit === 'mm') {
        usedArea = (len * wid) / 92903.04;
      } else {
        usedArea = (len * wid) / 144;
      }
      
      let cleanBaseName = (editForm.productName || '').replace(/\s*\(\d+(?:\.\d+)?\s*(?:mm|ft|in|L)?[xX×]\s*\d+(?:\.\d+)?\s*(?:mm|ft|in|W)?[^)]*\)/gi, '').trim();
      
      const t = editForm.thickness ? ` | ${editForm.thickness}MM` : '';
      let remarks = '';
      if (editForm.unit === 'feet') {
        remarks = `${cleanBaseName} (${len}ft x ${wid}ft${t} | ${usedArea.toFixed(2)} Sq.Ft)`;
      } else if (editForm.unit === 'mm') {
        const lFt = (len / 304.8).toFixed(2);
        const wFt = (wid / 304.8).toFixed(2);
        remarks = `${cleanBaseName} (${len}mm x ${wid}mm | ${lFt}ft x ${wFt}ft${t} | ${usedArea.toFixed(2)} Sq.Ft)`;
      } else {
        const lFt = (len / 12).toFixed(2);
        const wFt = (wid / 12).toFixed(2);
        remarks = `${cleanBaseName} (${len}" x ${wid}" | ${lFt}ft x ${wFt}ft${t} | ${usedArea.toFixed(2)} Sq.Ft)`;
      }
      
      await updateLog({
        id: editForm.id,
        data: {
          quantity: usedArea,
          remarks,
          date: editForm.date
        }
      }).unwrap();
      
      setOpenEdit(false);
      refetch();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this log? The quantity will be added back to the inventory.')) {
      try {
        await deleteLog(id).unwrap();
        refetch();
      } catch (error) {
        console.error(error);
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading ledger...</Typography>
      </Box>
    );
  }

  // Compute Balance dynamically: Initial stock addition (IN) is ALWAYS the starting baseline
  const sortedLogsAsc = Array.isArray(logs)
    ? [...logs].sort((a, b) => {
        const aIsInitial = a.remarks?.toLowerCase().includes('initial') || a.type === 'IN';
        const bIsInitial = b.remarks?.toLowerCase().includes('initial') || b.type === 'IN';
        if (aIsInitial && !bIsInitial) return -1;
        if (!aIsInitial && bIsInitial) return 1;
        const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        if (a.type === 'IN' && b.type !== 'IN') return -1;
        if (b.type === 'IN' && a.type !== 'IN') return 1;
        return 0;
      })
    : [];

  let runningBal = 0;
  const computedWithBalance = sortedLogsAsc.map(log => {
    const prev = runningBal;
    if (log.type === 'IN') {
      runningBal += Number(log.quantity);
    } else {
      runningBal -= Number(log.quantity);
    }
    return {
      ...log,
      previousBalance: prev,
      balance: runningBal
    };
  });

  // Display logs: Initial stock addition first (Row 1), followed by deductions in order
  const ledgerRows = [...computedWithBalance].sort((a, b) => {
    const aIsInitial = a.remarks?.toLowerCase().includes('initial') || a.type === 'IN';
    const bIsInitial = b.remarks?.toLowerCase().includes('initial') || b.type === 'IN';
    if (aIsInitial && !bIsInitial) return -1;
    if (!aIsInitial && bIsInitial) return 1;
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return 0;
  });

  // Calculations for Grand Total & Percentages
  const totalIn = Array.isArray(logs) 
    ? logs.filter((l: any) => l.type === 'IN').reduce((sum: number, l: any) => sum + Number(l.quantity), 0)
    : 0;

  const totalUsed = Array.isArray(logs)
    ? logs.filter((l: any) => l.type === 'OUT' && l.remarks !== 'Waste' && !l.remarks?.toLowerCase().includes('waste')).reduce((sum: number, l: any) => sum + Number(l.quantity), 0)
    : 0;

  const totalWaste = Array.isArray(logs)
    ? logs.filter((l: any) => l.type === 'OUT' && (l.remarks === 'Waste' || l.remarks?.toLowerCase().includes('waste'))).reduce((sum: number, l: any) => sum + Number(l.quantity), 0)
    : 0;

  const remBalance = inventory?.quantity ?? (totalIn - totalUsed - totalWaste);

  const usedPct = totalIn > 0 ? ((totalUsed / totalIn) * 100).toFixed(1) : '0.0';
  const wastePct = totalIn > 0 ? ((totalWaste / totalIn) * 100).toFixed(1) : '0.0';
  const balancePct = totalIn > 0 ? ((remBalance / totalIn) * 100).toFixed(1) : '0.0';

  return (
    <Box sx={{ p: 4, maxWidth: 1200, margin: '0 auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2, color: '#b8860b' }}>
        Back to Ledger
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>{inventory?.itemName} (Block {inventory?.blockNumber})</Typography>
          <Typography variant="subtitle1" color="text.secondary">Item Ledger Details</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            sx={{ fontWeight: 'bold', bgcolor: '#ed6c02', '&:hover': { bgcolor: '#e65100' } }}
            onClick={() => setOpenWastage(true)}
            disabled={(inventory?.quantity || 0) <= 0}
          >
            Wastage
          </Button>
          <Button variant="contained" color="error" onClick={() => setOpenDeduct(true)} sx={{ fontWeight: 'bold' }}>
            - Deduct Stock
          </Button>
        </Box>
      </Box>

      {/* Item Ledger Details / Grand Total Cards (3 Cards) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #2e7d32' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">Available / IN (+) First</Typography>
          <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ my: 0.5 }}>
            {totalIn.toFixed(2)} Sq.Ft
          </Typography>
          <Typography variant="caption" color="text.secondary">100% (Base)</Typography>
        </Paper>

        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">Total Used (Production)</Typography>
          <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ my: 0.5 }}>
            {totalUsed.toFixed(2)} Sq.Ft
          </Typography>
          <Typography variant="caption" fontWeight="bold" color="primary.main">{usedPct}%</Typography>
        </Paper>

        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #ed6c02' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">Total Wastage</Typography>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#ed6c02', my: 0.5 }}>
            {wastePct}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalWaste.toFixed(2)} Sq.Ft
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Project / Remarks</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'green' }}>Available / IN (+)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>OUT (-)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Balance</TableCell>
              <TableCell sx={{ fontWeight: 'bold', align: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ledgerRows.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No logs found.</TableCell></TableRow>
            ) : (
              ledgerRows.map((log: any) => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{log.remarks || '-'}</TableCell>
                  <TableCell sx={{ color: 'green', fontWeight: log.type === 'IN' ? 'bold' : 'normal' }}>
                    {log.type === 'IN' ? `+ ${log.quantity.toFixed(2)} Sq.Ft` : '-'}
                  </TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: log.type === 'OUT' ? 'bold' : 'normal' }}>
                    {log.type === 'OUT' ? `- ${log.quantity.toFixed(2)} Sq.Ft` : '-'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {log.balance.toFixed(2)} Sq.Ft
                  </TableCell>
                  <TableCell align="center">
                    {log.remarks === 'Initial stock addition' ? (
                      <Typography variant="caption" color="text.secondary">Initial</Typography>
                    ) : (
                      <>
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(log)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(log.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Grand Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555' }}>
                Used: {usedPct}% | Waste: {wastePct}%
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'green' }}>
                + {totalIn.toFixed(2)} Sq.Ft
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                - {(totalUsed + totalWaste).toFixed(2)} Sq.Ft
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {remBalance.toFixed(2)} Sq.Ft
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption" fontWeight="bold" sx={{ color: '#ed6c02' }}>
                  Waste: {wastePct}%
                </Typography>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      {/* Confirm Wastage Dialog */}
      <Dialog open={openWastage} onClose={() => setOpenWastage(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', color: '#e65100' }}>
          Confirm Wastage
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to mark the remaining stock as <strong>Wastage</strong>?
          </Typography>
          <Box sx={{ bgcolor: '#fafafa', p: 2, borderRadius: 2, border: '1px solid #eee' }}>
            <Typography variant="body2" color="text.secondary">
              Available to mark as Waste: <strong>{(inventory?.quantity || 0).toFixed(2)} {inventory?.unit || 'sq_ft'}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Initial Available / IN (+) First: <strong>{totalIn.toFixed(2)} {inventory?.unit || 'sq_ft'}</strong>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setOpenWastage(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            sx={{ bgcolor: '#ed6c02', '&:hover': { bgcolor: '#e65100' }, fontWeight: 'bold', px: 4 }}
            onClick={handleWastageSubmit}
            disabled={isWastageLoading}
          >
            {isWastageLoading ? 'Processing...' : 'OK'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deduct Stock Dialog */}
      <Dialog 
        open={openDeduct} 
        onClose={() => setOpenDeduct(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f8f9fa' }}>Deduct Stock for Block {inventory?.blockNumber}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2, fontWeight: 600 }}>
            Available Balance: <strong>{(inventory?.quantity || 0).toFixed(2)} Sq.Ft</strong>
          </Alert>
          {deductError && <Alert severity="error" sx={{ mb: 2 }}>{deductError}</Alert>}
          {(() => {
            const l = Number(deductForm.length) || 0;
            const w = Number(deductForm.width) || 0;
            const calcArea = deductForm.unit === 'feet' ? (l * w) : (l * w) / 144;
            if (l > 0 && w > 0 && calcArea > (inventory?.quantity || 0)) {
              return (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Entered area ({calcArea.toFixed(2)} Sq.Ft) exceeds available balance ({(inventory?.quantity || 0).toFixed(2)} Sq.Ft)!
                </Alert>
              );
            }
            return null;
          })()}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={deductForm.date}
              onChange={(e) => setDeductForm({ ...deductForm, date: e.target.value })}
            />

            {/* Project Indicator (Auto-detected from current ledger) */}
            {activeProject ? (
              <Box sx={{ p: 1.5, px: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="#166534" fontWeight="bold">
                  Project: <span style={{ fontSize: '1rem', color: '#15803D' }}>{activeProject.name}</span>
                </Typography>
                <Typography variant="caption" sx={{ bgcolor: '#DCFCE7', px: 1, py: 0.5, borderRadius: 1, color: '#166534', fontWeight: 'bold' }}>
                  {(() => {
                    const prodCount = (activeProject.slabs || []).filter((s: any) => s.hasProduction || (s.pieces || []).some((p: any) => p.hasProduction)).length;
                    return prodCount > 0 ? `${prodCount} Slabs in Production` : `${(activeProject.slabs || []).length} Slabs Available`;
                  })()}
                </Typography>
              </Box>
            ) : (
              <Autocomplete
                options={projectHierarchy}
                getOptionLabel={(option: any) => typeof option === 'string' ? option : option.name}
                value={selectedProject}
                onChange={(_, val: any) => {
                  setSelectedProject(val);
                  setSelectedSlab(null);
                  setSelectedPiece(null);
                  setDeductForm(prev => ({ ...prev, productName: val?.name || '' }));
                }}
                renderInput={(params) => <TextField {...params} label="Select Project" placeholder="Choose project..." />}
              />
            )}

            {/* 1. Select Slab / Stone (Pattar) */}
            {activeProject && (() => {
              const slabsWithPending = (activeProject.slabs || []).filter((s: any) => {
                const pendingCount = (s.pieces || []).filter((p: any) => !p.sourceMaterialId && (p.hasProduction !== false)).length;
                return pendingCount > 0;
              });

              return (
                <Autocomplete
                  options={slabsWithPending}
                  noOptionsText="No pending slabs/stones for this project!"
                  getOptionLabel={(option: any) => {
                    const pendingCount = (option.pieces || []).filter((p: any) => !p.sourceMaterialId && (p.hasProduction !== false)).length;
                    return `${option.name} ${option.size ? `(${option.size})` : ''} - ${pendingCount} Pieces Pending`;
                  }}
                  value={selectedSlab}
                  onChange={(_, val: any) => {
                    setSelectedSlab(val);
                    setSelectedPiece(null);
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Select Slab / Stone (Pattar)" 
                      placeholder="Choose slab / stone..." 
                      helperText={slabsWithPending.length > 0 ? `Pending Slabs: ${slabsWithPending.length} of ${(activeProject.slabs || []).length}` : 'All slabs/stones are completed!'}
                    />
                  )}
                />
              );
            })()}

            {/* 2. Select Piece (Pic) */}
            {selectedSlab && (() => {
              const piecesInProduction = (selectedSlab.pieces || []).filter((p: any) => !p.sourceMaterialId && (p.hasProduction !== false));
              const displayPieces = piecesInProduction.length > 0 ? piecesInProduction : (selectedSlab.pieces || []).filter((p: any) => !p.sourceMaterialId);
              return (
                <Autocomplete
                  options={displayPieces}
                  noOptionsText="No pending pieces in production for this slab!"
                  getOptionLabel={(option: any) => {
                    const parsed = parsePieceDimensions(option.size, option.unit || selectedSlab?.unit);
                    const unitLabel = parsed.isMM ? 'MM' : (parsed.isFt ? 'Feet' : 'Inches');
                    const sqFtText = parsed.sqft > 0 ? ` • ${unitLabel} • ${parsed.sqft.toFixed(2)} Sq.Ft` : '';
                    return `${option.productName || `Piece ${option.pieceNumber}`} ${option.size ? `(${option.size})` : ''}${sqFtText}`;
                  }}
                  value={selectedPiece}
                  onChange={(_, val: any) => {
                    setSelectedPiece(val);
                    if (val?.size) {
                      const parsed = parsePieceDimensions(val.size, val.unit || selectedSlab?.unit);
                      setDeductForm(prev => ({
                        ...prev,
                        length: parsed.l ? String(parsed.l) : prev.length,
                        width: parsed.w ? String(parsed.w) : prev.width,
                        thickness: parsed.t ? String(parsed.t) : prev.thickness,
                        unit: parsed.unit || 'feet'
                      }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Select Piece (Pic)" 
                      placeholder="Choose specific piece..." 
                      helperText={displayPieces.length > 0 ? `Pending Pieces: ${displayPieces.length} of ${(selectedSlab.pieces || []).length}` : 'All pieces already deducted!'}
                    />
                  )}
                />
              );
            })()}

            {/* Display Original Size Banner with Converted Equivalents */}
            {(selectedPiece?.size || selectedSlab?.size) && (() => {
              const targetSize = selectedPiece?.size || selectedSlab?.size;
              const targetUnit = selectedPiece?.unit || selectedSlab?.unit;
              const parsed = parsePieceDimensions(targetSize, targetUnit);
              const unitBadge = parsed.isMM ? 'MM' : (parsed.isFt ? 'Feet' : 'Inches');
              return (
                <Paper sx={{ p: 2, bgcolor: '#FFFDF5', border: '1px solid #FDE68A', borderRadius: 2.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#B45309', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ORIGINAL SIZE IN PRODUCTION:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="h6" fontWeight="900" color="#78350F">
                      {selectedPiece?.productName || selectedSlab?.name || 'Piece'}: {targetSize}
                    </Typography>
                    <Chip label={unitBadge} size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 800, fontSize: '0.75rem' }} />
                    {parsed.sqft > 0 && (
                      <Chip label={`${parsed.sqft.toFixed(2)} Sq.Ft`} size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 900, fontSize: '0.75rem', border: '1px solid #A7F3D0' }} />
                    )}
                  </Box>
                  {parsed.l > 0 && parsed.w > 0 && (
                    <Box sx={{ mt: 1.5, pt: 1.2, borderTop: '1px dashed #FDE68A', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {parsed.isMM ? (
                        <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 700 }}>
                          📐 MM: <strong>{parsed.lMM} mm L × {parsed.wMM} mm W</strong>
                        </Typography>
                      ) : parsed.isFt ? (
                        <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700 }}>
                          📏 Feet: <strong>{parsed.lFeet.toFixed(2)} ft L × {parsed.wFeet.toFixed(2)} ft W</strong>
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 700 }}>
                          📐 Inches: <strong>{parsed.lInch.toFixed(1)}" L × {parsed.wInch.toFixed(1)}" W</strong>
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              );
            })()}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="deduct-unit-label">Unit</InputLabel>
                <Select
                  labelId="deduct-unit-label"
                  label="Unit"
                  value={deductForm.unit || 'inch'}
                  onChange={(e) => {
                    const newUnit = e.target.value;
                    const oldUnit = deductForm.unit || 'inch';
                    const currentL = Number(deductForm.length) || 0;
                    const currentW = Number(deductForm.width) || 0;
                    
                    if (currentL > 0 && currentW > 0) {
                      let baseFeetL = currentL;
                      let baseFeetW = currentW;
                      if (oldUnit === 'inch') {
                        baseFeetL = currentL / 12;
                        baseFeetW = currentW / 12;
                      } else if (oldUnit === 'mm') {
                        baseFeetL = currentL / 304.8;
                        baseFeetW = currentW / 304.8;
                      }

                      let newL = String(currentL);
                      let newW = String(currentW);
                      if (newUnit === 'feet') {
                        newL = baseFeetL.toFixed(2);
                        newW = baseFeetW.toFixed(2);
                      } else if (newUnit === 'inch') {
                        newL = (baseFeetL * 12).toFixed(1);
                        newW = (baseFeetW * 12).toFixed(1);
                      } else if (newUnit === 'mm') {
                        newL = String(Math.round(baseFeetL * 304.8));
                        newW = String(Math.round(baseFeetW * 304.8));
                      }

                      setDeductForm(prev => ({
                        ...prev,
                        unit: newUnit,
                        length: newL,
                        width: newW
                      }));
                    } else {
                      setDeductForm(prev => ({ ...prev, unit: newUnit }));
                    }
                  }}
                >
                  <MenuItem value="inch">Inches (in)</MenuItem>
                  <MenuItem value="feet">Feet (ft)</MenuItem>
                  <MenuItem value="mm">MM (mm)</MenuItem>
                </Select>
              </FormControl>
              <TextField 
                size="small"
                label={`Used Length (${deductForm.unit === 'feet' ? 'ft' : deductForm.unit === 'mm' ? 'mm' : 'in'})`} 
                type="number" 
                fullWidth 
                value={deductForm.length} 
                onChange={(e) => setDeductForm({ ...deductForm, length: e.target.value })} 
              />
              <TextField 
                size="small"
                label={`Used Width (${deductForm.unit === 'feet' ? 'ft' : deductForm.unit === 'mm' ? 'mm' : 'in'})`} 
                type="number" 
                fullWidth 
                value={deductForm.width} 
                onChange={(e) => setDeductForm({ ...deductForm, width: e.target.value })} 
              />
              <TextField 
                size="small"
                label="Thick (MM)" 
                type="number" 
                fullWidth 
                value={deductForm.thickness} 
                onChange={(e) => setDeductForm({ ...deductForm, thickness: e.target.value })} 
              />
            </Box>

            {(() => {
              const l = Number(deductForm.length) || 0;
              const w = Number(deductForm.width) || 0;
              if (l > 0 && w > 0) {
                let usedArea = 0;
                let primaryText = '';
                let equivText = '';
                
                if (deductForm.unit === 'feet') {
                  usedArea = l * w;
                  primaryText = `${l} ft × ${w} ft (Feet)`;
                } else if (deductForm.unit === 'mm') {
                  usedArea = (l * w) / 92903.04;
                  primaryText = `${l} mm × ${w} mm (MM)`;
                } else {
                  usedArea = (l * w) / 144;
                  primaryText = `${l}" × ${w}" (Inches)`;
                }

                return (
                  <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="body2" color="#64748B" fontWeight="600">
                      Deduction: <strong>{primaryText}</strong>
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="900" color="#059669">
                      {usedArea.toFixed(2)} Sq.Ft
                    </Typography>
                  </Box>
                );
              }
              return null;
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => {
            setOpenDeduct(false);
            setSelectedProject(null);
            setSelectedSlab(null);
            setSelectedPiece(null);
          }}>Cancel</Button>
          {(() => {
            const l = Number(deductForm.length) || 0;
            const w = Number(deductForm.width) || 0;
            let usedArea = 0;
            if (deductForm.unit === 'feet') usedArea = l * w;
            else if (deductForm.unit === 'mm') usedArea = (l * w) / 92903.04;
            else usedArea = (l * w) / 144;
            const isDisabled = !(l > 0 && w > 0) || (usedArea > (inventory?.quantity || 0));
            return (
              <Button 
                variant="contained" 
                color="error" 
                onClick={handleDeductSubmit} 
                disabled={isDisabled}
                sx={{ fontWeight: 800 }}
              >
                Confirm Deduction
              </Button>
            );
          })()}
        </DialogActions>
      </Dialog>

      {/* Edit Log Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f8f9fa' }}>Edit Deducted Stock</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={editForm?.date || ''}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
            <Autocomplete
              options={uniqueSlabNames}
              value={editForm?.productName || ''}
              onInputChange={(_, newInputValue) => {
                setEditForm({ ...editForm, productName: newInputValue });
              }}
              freeSolo
              renderInput={(params) => <TextField {...params} label="Project / Product Name" />}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="edit-unit-label">Unit</InputLabel>
                <Select
                  labelId="edit-unit-label"
                  label="Unit"
                  value={editForm?.unit || 'inch'}
                  onChange={(e) => {
                    const newUnit = e.target.value;
                    const oldUnit = editForm?.unit || 'inch';
                    const currentL = Number(editForm?.length) || 0;
                    const currentW = Number(editForm?.width) || 0;
                    
                    if (currentL > 0 && currentW > 0) {
                      let baseFeetL = currentL;
                      let baseFeetW = currentW;
                      if (oldUnit === 'inch') {
                        baseFeetL = currentL / 12;
                        baseFeetW = currentW / 12;
                      } else if (oldUnit === 'mm') {
                        baseFeetL = currentL / 304.8;
                        baseFeetW = currentW / 304.8;
                      }

                      let newL = String(currentL);
                      let newW = String(currentW);
                      if (newUnit === 'feet') {
                        newL = baseFeetL.toFixed(2);
                        newW = baseFeetW.toFixed(2);
                      } else if (newUnit === 'inch') {
                        newL = (baseFeetL * 12).toFixed(1);
                        newW = (baseFeetW * 12).toFixed(1);
                      } else if (newUnit === 'mm') {
                        newL = String(Math.round(baseFeetL * 304.8));
                        newW = String(Math.round(baseFeetW * 304.8));
                      }

                      setEditForm((prev: any) => ({
                        ...prev,
                        unit: newUnit,
                        length: newL,
                        width: newW
                      }));
                    } else {
                      setEditForm((prev: any) => ({ ...prev, unit: newUnit }));
                    }
                  }}
                >
                  <MenuItem value="inch">Inches (in)</MenuItem>
                  <MenuItem value="feet">Feet (ft)</MenuItem>
                  <MenuItem value="mm">MM (mm)</MenuItem>
                </Select>
              </FormControl>
              <TextField 
                size="small"
                label={`Length (${editForm?.unit === 'feet' ? 'ft' : editForm?.unit === 'mm' ? 'mm' : 'in'})`} 
                type="number" 
                fullWidth 
                value={editForm?.length || ''} 
                onChange={(e) => setEditForm({ ...editForm, length: e.target.value })} 
              />
              <TextField 
                size="small"
                label={`Width (${editForm?.unit === 'feet' ? 'ft' : editForm?.unit === 'mm' ? 'mm' : 'in'})`} 
                type="number" 
                fullWidth 
                value={editForm?.width || ''} 
                onChange={(e) => setEditForm({ ...editForm, width: e.target.value })} 
              />
              <TextField 
                size="small"
                label="Thick (MM)" 
                type="number" 
                fullWidth 
                value={editForm?.thickness || ''} 
                onChange={(e) => setEditForm({ ...editForm, thickness: e.target.value })} 
              />
            </Box>

            {(() => {
              const l = Number(editForm?.length) || 0;
              const w = Number(editForm?.width) || 0;
              if (l > 0 && w > 0) {
                let usedArea = 0;
                let primaryText = '';
                let equivText = '';
                
                if (editForm?.unit === 'feet') {
                  usedArea = l * w;
                  primaryText = `${l} ft × ${w} ft (Feet)`;
                } else if (editForm?.unit === 'mm') {
                  usedArea = (l * w) / 92903.04;
                  primaryText = `${l} mm × ${w} mm (MM)`;
                } else {
                  usedArea = (l * w) / 144;
                  primaryText = `${l}" × ${w}" (Inches)`;
                }

                return (
                  <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="body2" color="#64748B" fontWeight="600">
                      Total Used: <strong>{primaryText}</strong>
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="900" color="#1976d2">
                      {usedArea.toFixed(2)} Sq.Ft
                    </Typography>
                  </Box>
                );
              }
              return null;
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleEditSubmit} sx={{ fontWeight: 800 }}>
            Update Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ItemLedger;
