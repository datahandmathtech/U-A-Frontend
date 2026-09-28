import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, TableFooter, Button, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Autocomplete, Alert, Chip, Select, MenuItem, FormControl, InputLabel,
  Avatar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
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
    
    // Thickness (e.g. | 60MM or | 20MM)
    const tMatch = sizeStr.match(/\|\s*(\d+(?:\.\d+)?)\s*MM/i);
    const t = tMatch ? parseFloat(tMatch[1]) : 0;
    
    const sizePart = sizeStr.split('|')[0].trim();
    // Remove parentheses like (inch), (mm), (sq_ft) before extracting numbers
    const cleanSize = sizePart.replace(/\([^)]+\)/g, '').trim();

    let l = 0, w = 0;
    const parts = cleanSize.split(/\s*[xX×]\s*/);
    if (parts.length >= 2) {
      const lMatch = parts[0].match(/(\d+(?:\.\d+)?)/);
      const wMatch = parts[1].match(/(\d+(?:\.\d+)?)/);
      l = lMatch ? parseFloat(lMatch[1]) : 0;
      w = wMatch ? parseFloat(wMatch[1]) : 0;
    } else {
      const lMatch = cleanSize.match(/(\d+(?:\.\d+)?)\s*L/i);
      const wMatch = cleanSize.match(/(\d+(?:\.\d+)?)\s*W/i);
      l = lMatch ? parseFloat(lMatch[1]) : 0;
      w = wMatch ? parseFloat(wMatch[1]) : 0;
    }

    const sizeLower = sizeStr.toLowerCase();
    
    // Explicit indicators in sizeStr:
    const hasExplicitInch = sizeLower.includes('(inch)') || sizeLower.includes('inch') || sizeLower.includes('inches') || sizeStr.includes('"');
    const hasExplicitFt = sizeLower.includes('(ft)') || sizeLower.includes('(sq_ft)') || sizeLower.includes('(sq.ft)') || sizeLower.includes('feet') || /\bft\b/i.test(sizeStr) || sizeStr.includes("'");
    const hasExplicitMM = sizeLower.includes('(mm)') || sizeLower.includes('mm') || /\bmm\b/i.test(sizeStr);

    let effectiveUnit: 'inch' | 'mm' | 'feet' = 'inch';

    // 1. Explicit unit in sizeStr takes HIGHEST PRIORITY
    if (hasExplicitInch) {
      effectiveUnit = 'inch';
    } else if (hasExplicitFt) {
      effectiveUnit = 'feet';
    } else if (hasExplicitMM) {
      effectiveUnit = 'mm';
    } else {
      // 2. Fall back to unitHint
      const hint = (unitHint || '').toLowerCase().trim();
      if (hint === 'mm') {
        effectiveUnit = 'mm';
      } else if (hint === 'feet' || hint === 'ft' || hint === 'sq_ft' || hint === 'sqft') {
        effectiveUnit = 'feet';
      } else if (hint === 'inch' || hint === 'inches') {
        effectiveUnit = 'inch';
      } else {
        // Heuristic: large numbers (> 120) are mm
        if (l > 120 || w > 120 || (l > 100 && w > 100)) {
          effectiveUnit = 'mm';
        } else {
          effectiveUnit = 'inch';
        }
      }
    }

    let lFeet = 0, wFeet = 0, lInch = 0, wInch = 0, lMM = 0, wMM = 0, sqft = 0;

    if (effectiveUnit === 'mm') {
      lMM = l;
      wMM = w;
      lInch = l / 25.4;
      wInch = w / 25.4;
      lFeet = l / 304.8;
      wFeet = w / 304.8;
      sqft = (l * w) / 92903.04;
    } else if (effectiveUnit === 'feet') {
      lFeet = l;
      wFeet = w;
      lInch = l * 12;
      wInch = w * 12;
      lMM = l * 304.8;
      wMM = w * 304.8;
      sqft = l * w;
    } else {
      // inch
      lInch = l;
      wInch = w;
      lFeet = l / 12;
      wFeet = w / 12;
      lMM = l * 25.4;
      wMM = w * 25.4;
      sqft = (l * w) / 144;
    }

    return { 
      l, w, t, 
      sqft, 
      lFeet, wFeet, lInch, wInch, lMM, wMM, 
      isFt: effectiveUnit === 'feet', 
      isMM: effectiveUnit === 'mm', 
      unit: effectiveUnit 
    };
  };

  const [openDeduct, setOpenDeduct] = useState(false);
  const [deductForm, setDeductForm] = useState({ length: '', width: '', thickness: '', date: new Date().toISOString().substring(0,10), productName: '', unit: 'inch' });
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  
  const { data: allSlabNames = [] } = useGetAllSlabNamesQuery();
  const uniqueSlabNames = React.useMemo(() => Array.from(new Set(allSlabNames || [])), [allSlabNames]);
  const { data: projectHierarchy = [] } = useGetProjectHierarchyQuery();
  const [selectedProject, setSelectedProject] = useState<any>(undefined);
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

  const isCompanyStock = inventory?.jobWorkType === 'company' || (inventory?.supplier || '').toLowerCase().includes('unnati');
  const activeProject = selectedProject !== undefined ? selectedProject : autoProject;

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
      setSelectedProject(undefined);
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

  const renderRemarksCell = (remarks: string) => {
    if (!remarks) return <Typography variant="body2" sx={{ color: '#94A3B8' }}>-</Typography>;

    // 1. Strip internal piece IDs like [Piece:...]
    const clean = remarks.replace(/\[Piece:[a-f0-9]+\]\s*/gi, '').trim();

    // 2. Initial inward stock
    if (clean.toLowerCase().includes('initial stock')) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Initial Inward" size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700, fontSize: '0.72rem', borderRadius: 1 }} />
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>Opening / Base Stock</Typography>
        </Box>
      );
    }

    // 3. Wastage
    if (clean.toLowerCase() === 'waste' || clean.toLowerCase().includes('wastage') || clean.toLowerCase().includes('stock marked as waste')) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Wastage / Scrap" size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.72rem', borderRadius: 1 }} />
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>{clean}</Typography>
        </Box>
      );
    }

    // 4. Try parsing Project Name, Piece Name, and Dimension blocks
    const firstParenIdx = clean.indexOf('(');
    if (firstParenIdx > 0) {
      const projectName = clean.substring(0, firstParenIdx).trim();
      const rest = clean.substring(firstParenIdx).trim();

      const rawSegments: string[] = [];
      let depth = 0;
      let currentSeg = '';
      for (let i = 0; i < rest.length; i++) {
        const ch = rest[i];
        if (ch === '(') {
          if (depth > 0) currentSeg += ch;
          depth++;
        } else if (ch === ')') {
          depth--;
          if (depth === 0) {
            if (currentSeg.trim()) rawSegments.push(currentSeg.trim());
            currentSeg = '';
          } else {
            currentSeg += ch;
          }
        } else {
          if (depth > 0) currentSeg += ch;
        }
      }

      const uniqueSegments: string[] = [];
      for (const seg of rawSegments) {
        const isDim = seg.toLowerCase().includes('sq.ft') || seg.toLowerCase().includes('sqft') || seg.includes('x') || seg.includes('×');
        if (isDim && uniqueSegments.some(s => s.toLowerCase().includes('sq.ft') || s.toLowerCase().includes('sqft'))) {
          continue;
        }
        if (!uniqueSegments.includes(seg)) {
          uniqueSegments.push(seg);
        }
      }

      const pieceName = uniqueSegments[0] || '';
      const dimensions = uniqueSegments.slice(1).join(' • ');

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {projectName && (
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.2px' }}>
              {projectName}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.8 }}>
            {pieceName && (
              <Chip 
                label={pieceName} 
                size="small" 
                sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, fontSize: '0.72rem', height: 22, borderRadius: 1 }} 
              />
            )}
            {dimensions && (
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                {dimensions}
              </Typography>
            )}
          </Box>
        </Box>
      );
    }

    return (
      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
        {clean}
      </Typography>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, margin: '0 auto' }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(-1)} 
        sx={{ mb: 2.5, color: '#475569', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#F1F5F9' } }}
      >
        Back to Ledger
      </Button>

      {/* Modern Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {inventory?.itemName || 'Material Item'}
            </Typography>
            {inventory?.blockNumber && inventory.blockNumber.trim() !== '' && (
              <Chip 
                label={`Block ${inventory.blockNumber}`} 
                size="small" 
                sx={{ 
                  bgcolor: '#FFFDF5', 
                  color: '#B38B36', 
                  border: '1px solid #C89F5A', 
                  fontWeight: 800, 
                  fontSize: '0.8rem', 
                  borderRadius: 1.5 
                }} 
              />
            )}
            {inventory?.supplier && (
              <Chip 
                label={`Supplier: ${inventory.supplier}`} 
                size="small" 
                variant="outlined"
                sx={{ color: '#64748B', borderColor: '#CBD5E1', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }} 
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
            Comprehensive Stock Ledger & Consumption History
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button 
            variant="contained" 
            sx={{ 
              fontWeight: 800, 
              bgcolor: '#F97316', 
              boxShadow: 'none',
              borderRadius: 2,
              px: 2.5,
              textTransform: 'none',
              '&:hover': { bgcolor: '#EA580C', boxShadow: 'none' } 
            }}
            onClick={() => setOpenWastage(true)}
            disabled={(inventory?.quantity || 0) <= 0}
          >
            Mark Wastage
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => setOpenDeduct(true)} 
            sx={{ 
              fontWeight: 800, 
              boxShadow: 'none',
              borderRadius: 2,
              px: 2.5,
              textTransform: 'none',
              '&:hover': { boxShadow: 'none' } 
            }}
          >
            - Deduct Stock
          </Button>
        </Box>
      </Box>

      {/* Modern 4 KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
        {/* Card 1: Total Inward */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 48, height: 48, borderRadius: 2.5 }}>
            <Inventory2RoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Inward
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', my: 0.2 }}>
              {totalIn.toFixed(2)} <Typography component="span" variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Sq.Ft</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, bgcolor: '#ECFDF5', px: 1, py: 0.2, borderRadius: 1 }}>
              100% Base Stock
            </Typography>
          </Box>
        </Paper>

        {/* Card 2: Production Used */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 48, height: 48, borderRadius: 2.5 }}>
            <LayersRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Production Used
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', my: 0.2 }}>
              {totalUsed.toFixed(2)} <Typography component="span" variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Sq.Ft</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700, bgcolor: '#EFF6FF', px: 1, py: 0.2, borderRadius: 1 }}>
              {usedPct}% Utilized
            </Typography>
          </Box>
        </Paper>

        {/* Card 3: Wastage */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Avatar sx={{ bgcolor: '#FFF7ED', color: '#EA580C', width: 48, height: 48, borderRadius: 2.5 }}>
            <DeleteSweepRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Wastage / Scrap
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', my: 0.2 }}>
              {totalWaste.toFixed(2)} <Typography component="span" variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Sq.Ft</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: '#EA580C', fontWeight: 700, bgcolor: '#FFF7ED', px: 1, py: 0.2, borderRadius: 1 }}>
              {wastePct}% Waste
            </Typography>
          </Box>
        </Paper>

        {/* Card 4: Remaining Balance */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Avatar sx={{ bgcolor: remBalance > 0 ? '#F0FDF4' : '#FEF2F2', color: remBalance > 0 ? '#16A34A' : '#DC2626', width: 48, height: 48, borderRadius: 2.5 }}>
            <CheckCircleRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Balance
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: remBalance > 0 ? '#16A34A' : '#DC2626', my: 0.2 }}>
              {remBalance.toFixed(2)} <Typography component="span" variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Sq.Ft</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              {balancePct}% Remaining
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Modern Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8 }}>Project / Remarks</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8 }}>Inward (+)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#DC2626', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8 }}>Outward (-)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#2563EB', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8 }}>Balance</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ledgerRows.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94A3B8' }}>No logs found for this item.</TableCell></TableRow>
            ) : (
              ledgerRows.map((log: any) => (
                <TableRow key={log.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap', py: 1.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 1.8 }}>
                    {renderRemarksCell(log.remarks)}
                  </TableCell>
                  <TableCell sx={{ color: '#16A34A', fontWeight: log.type === 'IN' ? 800 : 500, py: 1.8 }}>
                    {log.type === 'IN' ? `+ ${log.quantity.toFixed(2)} Sq.Ft` : '-'}
                  </TableCell>
                  <TableCell sx={{ color: '#DC2626', fontWeight: log.type === 'OUT' ? 800 : 500, py: 1.8 }}>
                    {log.type === 'OUT' ? `- ${log.quantity.toFixed(2)} Sq.Ft` : '-'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#0F172A', py: 1.8 }}>
                    {log.balance.toFixed(2)} Sq.Ft
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.8 }}>
                    {log.remarks === 'Initial stock addition' ? (
                      <Chip label="Initial" size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 600, fontSize: '0.7rem' }} />
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleEditClick(log)} sx={{ color: '#2563EB', '&:hover': { bgcolor: '#EFF6FF' } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(log.id)} sx={{ color: '#DC2626', '&:hover': { bgcolor: '#FEF2F2' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 900, color: '#0F172A', py: 2 }}>Grand Total</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#64748B', py: 2 }}>
                Used: <Typography component="span" sx={{ color: '#2563EB', fontWeight: 800 }}>{usedPct}%</Typography> | Waste: <Typography component="span" sx={{ color: '#EA580C', fontWeight: 800 }}>{wastePct}%</Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 900, color: '#16A34A', py: 2 }}>
                + {totalIn.toFixed(2)} Sq.Ft
              </TableCell>
              <TableCell sx={{ fontWeight: 900, color: '#DC2626', py: 2 }}>
                - {(totalUsed + totalWaste).toFixed(2)} Sq.Ft
              </TableCell>
              <TableCell sx={{ fontWeight: 900, color: remBalance > 0 ? '#16A34A' : '#DC2626', py: 2 }}>
                {remBalance.toFixed(2)} Sq.Ft
              </TableCell>
              <TableCell align="center" sx={{ py: 2 }}>
                <Chip label={`Waste: ${wastePct}%`} size="small" sx={{ bgcolor: '#FFF7ED', color: '#EA580C', fontWeight: 800, fontSize: '0.75rem' }} />
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
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#F8FAFC', color: '#0F172A', borderBottom: '1px solid #E2E8F0', py: 2 }}>
          {inventory?.blockNumber && inventory.blockNumber.trim() !== '' ? `Deduct Stock — Block ${inventory.blockNumber}` : `Deduct Stock — ${inventory?.itemName || 'Material'}`}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2, fontWeight: 600 }}>
            Available Balance: <strong>{(inventory?.quantity || 0).toFixed(2)} Sq.Ft</strong>
          </Alert>
          {deductError && <Alert severity="error" sx={{ mb: 2 }}>{deductError}</Alert>}
          {(() => {
            const l = Number(deductForm.length) || 0;
            const w = Number(deductForm.width) || 0;
            const calcArea = deductForm.unit === 'feet' 
              ? (l * w) 
              : deductForm.unit === 'mm' 
                ? ((l * w) / 92903.04) 
                : ((l * w) / 144);
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

            {/* Project Selection / Indicator */}
            {isCompanyStock ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Autocomplete
                  options={projectHierarchy || []}
                  getOptionLabel={(option: any) => {
                    if (typeof option === 'string') return option;
                    return `${option.name}${option.clientName ? ` (${option.clientName})` : ''}`;
                  }}
                  value={activeProject || null}
                  onChange={(_, val: any) => {
                    setSelectedProject(val || null);
                    setSelectedSlab(null);
                    setSelectedPiece(null);
                    setDeductForm(prev => ({ ...prev, productName: val?.name || '' }));
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Select Target Project (Unnati Stock)" 
                      placeholder="Choose project..." 
                      helperText={activeProject ? `Selected Project: ${activeProject.name}` : 'Select which project this Unnati stock is being deducted for'}
                    />
                  )}
                />
              </Box>
            ) : activeProject ? (
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
                options={projectHierarchy || []}
                getOptionLabel={(option: any) => typeof option === 'string' ? option : option.name}
                value={selectedProject || null}
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
                        unit: parsed.unit || (parsed.isMM ? 'mm' : (parsed.isFt ? 'feet' : 'inch'))
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
