import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, TextField,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Tooltip, Snackbar, Alert, Divider,
  Radio, RadioGroup, FormControlLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { usePackBoxesMutation, useDeleteProductionLogMutation } from '../../store/apiSlice';

interface PackingWorkspaceProps {
  projectId: string;
  projectName: string;
  slab: any;
  slabs?: any[];
  productionLogs: any[];
  onRefresh: () => void;
}

const parsePieceArea = (sizeStr?: any): number => {
  if (!sizeStr || typeof sizeStr !== 'string') return 2.08;
  const sqftMatch = sizeStr.match(/([\d\.]+)\s*Sq\.?Ft/i);
  if (sqftMatch) return parseFloat(sqftMatch[1]);
  const lMatch = sizeStr.match(/([\d\.]+)\s*L/i);
  const wMatch = sizeStr.match(/([\d\.]+)\s*W/i);
  if (lMatch && wMatch) {
    const l = parseFloat(lMatch[1]);
    const w = parseFloat(wMatch[1]);
    const sLower = sizeStr.toLowerCase();
    const sWithoutThick = sLower.split('|')[0].replace(/\s*x\s*\d+\s*mm/gi, '');
    if (sWithoutThick.includes('mm')) return Number(((l * w) / 92903.04).toFixed(2));
    if (sWithoutThick.includes('feet') || sWithoutThick.includes('ft')) return Number((l * w).toFixed(2));
    return Number(((l * w) / 144).toFixed(2));
  }
  return 2.08;
};

const PackingWorkspace: React.FC<PackingWorkspaceProps> = ({
  projectId,
  projectName,
  slab,
  slabs = [],
  productionLogs,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [packBoxes, { isLoading: isPacking }] = usePackBoxesMutation();
  const [deleteProductionLog, { isLoading: isDeleting }] = useDeleteProductionLogMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [hasBoxSize, setHasBoxSize] = useState<'yes' | 'no'>('no');
  const [boxLength, setBoxLength] = useState('');
  const [boxWidth, setBoxWidth] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeQty, setRangeQty] = useState('');
  const [boxRemarks, setBoxRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewBox, setViewBox] = useState<any>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [collapsedSlabIds, setCollapsedSlabIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Build global sequential numbering (1..N) across all Main Stones (slabs) in the project
  const { slabGroups, allProjectPieces, rawPieces } = useMemo(() => {
    const groups: any[] = [];
    const allWithGlobal: any[] = [];
    const readyCombined: any[] = [];
    let globalCounter = 1;

    const sourceSlabs = (slabs && slabs.length > 0) ? slabs : (slab ? [slab] : []);

    sourceSlabs.forEach((s: any, sIdx: number) => {
      if (!Array.isArray(s.pieces) || s.pieces.length === 0) return;

      const reqStages = (s.requiredStages || ['Production']).filter((st: string) => st !== 'Polishing');
      const requiresProduction = reqStages.includes('Production') || reqStages.length === 0;
      const requiresPolishing = reqStages.some((st: string) => st.startsWith('Polishing'));
      const requiresBridgeCutting = reqStages.includes('Bridge Cutting');

      const checkPieceStageComplete = (p: any, stagePrefix: string) => {
        const hasPieceLog = p.logs && p.logs.some((l: any) =>
          l.stage?.startsWith(stagePrefix) &&
          (l.status === 'completed' || l.status === 'approved')
        );
        const hasProdLog = (productionLogs || []).some((l: any) =>
          l.approvalStatus === 'approved' &&
          l.stage?.startsWith(stagePrefix) &&
          Array.isArray(l.pieceIds) && l.pieceIds.includes(p.id)
        );
        const isDirectStageDone = (!p.logs || p.logs.length === 0) &&
          p.stage?.startsWith(stagePrefix) &&
          (p.status === 'completed' || p.status === 'approved');
        return Boolean(hasPieceLog || hasProdLog || isDirectStageDone);
      };

      const sortedPieces = [...s.pieces].sort((a: any, b: any) => (Number(a.pieceNumber) || 0) - (Number(b.pieceNumber) || 0));
      const groupPieces: any[] = [];
      const startGlobal = globalCounter;

      sortedPieces.forEach((p: any, pIdx: number) => {
        const isProdDone = !requiresProduction || checkPieceStageComplete(p, 'Production');
        const isBridgeDone = !requiresBridgeCutting || checkPieceStageComplete(p, 'Bridge Cutting');
        const isPolishDone = !requiresPolishing || checkPieceStageComplete(p, 'Polish');
        const isReadyForPacking = Boolean(isProdDone && isBridgeDone && isPolishDone);

        const gNum = globalCounter++;
        const localNum = p.pieceNumber || (pIdx + 1);
        const enrichedPiece = {
          ...p,
          slabId: s.id,
          slabName: s.name || `Main Stone ${sIdx + 1}`,
          slabSize: s.size || '',
          slabIndex: sIdx + 1,
          localPieceNumber: localNum,
          globalNumber: gNum,
          isReadyForPacking
        };

        groupPieces.push(enrichedPiece);
        allWithGlobal.push(enrichedPiece);
        if (isReadyForPacking) {
          readyCombined.push(enrichedPiece);
        }
      });

      const endGlobal = globalCounter - 1;
      groups.push({
        slabId: s.id,
        slabName: s.name || `Main Stone ${sIdx + 1}`,
        slabSize: s.size || '',
        slabIndex: sIdx + 1,
        startGlobal,
        endGlobal,
        pieces: groupPieces
      });
    });

    return {
      slabGroups: groups,
      allProjectPieces: allWithGlobal,
      rawPieces: readyCombined
    };
  }, [slab, slabs, productionLogs]);

  // All pieces of all slabs in the project are available in unified packing workspace
  const allPieces = useMemo(() => {
    return rawPieces;
  }, [rawPieces]);

  const totalSlabPiecesCount = allProjectPieces.length;

  // Derive packed boxes from production logs with stage Packing (only for existing pieces)
  const packedBoxes = useMemo(() => {
    if (allPieces.length === 0 && rawPieces.length === 0) return [];
    const existingPool = rawPieces.length > 0 ? rawPieces : allPieces;
    const logs = (productionLogs || []).filter((l: any) =>
      (l.stage === 'Packing' || l.stage === 'Packing Work') &&
      (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
    );

    // Deduplicate logs with exact same pieceIds or same boxCode to prevent duplicates
    const seenKey = new Set<string>();
    const dedupedLogs: any[] = [];
    for (const l of logs) {
      const pIds = (Array.isArray(l.pieceIds) ? l.pieceIds : []).slice().sort().join(',');
      const code = (l.boxCode || '').trim();
      const key = pIds ? `${code}_${pIds}` : (l.id || `${code}_${l.createdAt}`);
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      dedupedLogs.push(l);
    }

    const validBoxes = dedupedLogs
      .map((l: any, idx: number) => {
        const rawCode = l.boxCode || `Box ${idx + 1}`;
        const parts = rawCode.split('|').map((s: string) => s.trim());
        const bName = parts[0] || `Box ${idx + 1}`;
        const bSize = parts[1] || '';
        const pIds: string[] = Array.isArray(l.pieceIds) ? l.pieceIds : [];
        const boxPieces = existingPool.filter((p: any) => pIds.includes(p.id));
        if (boxPieces.length === 0) return null;
        const boxArea = boxPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || slab?.size), 0);
        const pieceCount = boxPieces.length;

        const rawRemarks = (l.remarks || '').trim();
        const isDefaultRemark = rawRemarks.startsWith(rawCode) || rawRemarks.startsWith(bName);

        return {
          logId: l.id,
          boxNumber: idx + 1,
          boxName: bName,
          boxSize: bSize,
          remarks: isDefaultRemark ? '' : rawRemarks,
          pieceIds: boxPieces.map((p: any) => p.id),
          pieces: boxPieces,
          pieceCount,
          area: boxArea.toFixed(2),
          packedOn: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(l.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Packed'
        };
      })
      .filter(Boolean);

    return validBoxes.map((b: any, i: number) => ({ ...b, boxNumber: i + 1 }));
  }, [productionLogs, slab, allPieces, rawPieces]);

  // Set of pieces already packed in a box
  const packedPieceIdMap = useMemo(() => {
    const map = new Map<string, string>(); // pieceId -> boxName
    packedBoxes.forEach((b: any) => {
      b.pieceIds.forEach((pid: string) => map.set(pid, b.boxName));
    });
    return map;
  }, [packedBoxes]);

  const totalPieces = allPieces.length;
  const packedPiecesCount = packedPieceIdMap.size;
  const pendingPiecesCount = Math.max(0, totalPieces - packedPiecesCount);
  const isPackagingCompleted = totalPieces > 0 && packedPiecesCount >= totalPieces;

  const totalPackedArea = useMemo(() => {
    return allPieces
      .filter((p: any) => packedPieceIdMap.has(p.id))
      .reduce((sum: number, p: any) => sum + parsePieceArea(p.size || slab?.size), 0)
      .toFixed(2);
  }, [allPieces, packedPieceIdMap, slab]);

  // Filtered pieces based on search
  const filteredPieces = useMemo(() => {
    if (!searchQuery.trim()) return allPieces;
    const q = searchQuery.toLowerCase().trim();
    return allPieces.filter((p: any) => {
      const gStr = `#${p.globalNumber}`;
      const gTag = `g#${p.globalNumber}`;
      const numStr = `#${p.pieceNumber}`;
      const name = (p.productName || '').toLowerCase();
      const sName = (p.slabName || '').toLowerCase();
      return gStr.includes(q) || gTag.includes(q) || numStr.includes(q) || name.includes(q) || sName.includes(q) || String(p.globalNumber).includes(q);
    });
  }, [allPieces, searchQuery]);

  // Filtered Main Stone groups for left grouped view
  const filteredSlabGroups = useMemo(() => {
    if (!searchQuery.trim()) return slabGroups;
    const q = searchQuery.toLowerCase().trim();
    return slabGroups.filter((g: any) => {
      if ((g.slabName || '').toLowerCase().includes(q)) return true;
      return g.pieces.some((p: any) => {
        const gStr = `#${p.globalNumber}`;
        const gTag = `g#${p.globalNumber}`;
        const name = (p.productName || '').toLowerCase();
        return gStr.includes(q) || gTag.includes(q) || name.includes(q) || String(p.globalNumber) === q || String(p.localPieceNumber) === q;
      });
    });
  }, [slabGroups, searchQuery]);

  const toggleCollapseSlabGroup = (slabId: string) => {
    setCollapsedSlabIds(prev => {
      const next = new Set(prev);
      if (next.has(slabId)) next.delete(slabId);
      else next.add(slabId);
      return next;
    });
  };

  // Export complete 1..N pieces list to Excel (Change 5)
  const handleExportAllPiecesExcel = () => {
    try {
      const XlsxLib: any = XLSX;
      const rows = allProjectPieces.map((p: any) => {
        const isPacked = packedPieceIdMap.has(p.id);
        const boxName = packedPieceIdMap.get(p.id) || '-';
        const areaSqFt = parsePieceArea(p.size || p.slabSize || slab?.size);
        return {
          'Global Piece #': `#${p.globalNumber}`,
          'Main Stone / Slab': p.slabName || '-',
          'Stone Sub-Piece #': `Piece #${p.localPieceNumber}`,
          'Piece Name': p.productName || `${p.slabName}.${p.localPieceNumber}`,
          'Dimensions / Size': p.size || p.slabSize || '-',
          'Area (Sq.Ft)': areaSqFt.toFixed(2),
          'Manufacturing Status': p.isReadyForPacking ? '100% Completed (Ready)' : 'Pending Stages',
          'Packing Status': isPacked ? 'PACKED' : (p.isReadyForPacking ? 'READY TO PACK' : 'PENDING'),
          'Assigned Box': boxName
        };
      });

      const wb = XlsxLib.utils.book_new();
      const ws = XlsxLib.utils.json_to_sheet(rows.length > 0 ? rows : [{ Notice: 'No pieces found' }]);
      ws['!cols'] = [
        { wch: 16 },
        { wch: 24 },
        { wch: 18 },
        { wch: 24 },
        { wch: 28 },
        { wch: 14 },
        { wch: 24 },
        { wch: 18 },
        { wch: 18 }
      ];
      XlsxLib.utils.book_append_sheet(wb, ws, 'All Pieces List');

      const wbout = XlsxLib.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cleanProj = (projectName || 'WorkOrder').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href = url;
      a.download = `Packing_Pieces_List_${cleanProj}_${allProjectPieces.length}Pcs.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({ open: true, message: `Exported ${allProjectPieces.length} pieces list to Excel!`, severity: 'success' });
    } catch (err) {
      console.error('Error exporting pieces list:', err);
      setToast({ open: true, message: 'Failed to export pieces list', severity: 'error' });
    }
  };

  // Toggle selection for unpacked piece
  const handleTogglePiece = (pieceId: string) => {
    if (packedPieceIdMap.has(pieceId)) {
      setToast({ open: true, message: `This piece is already packed in ${packedPieceIdMap.get(pieceId)}`, severity: 'error' });
      return;
    }
    const pieceObj = allProjectPieces.find((p: any) => p.id === pieceId);
    if (pieceObj && !pieceObj.isReadyForPacking) {
      setToast({ open: true, message: `Complete all stone stages (Production / Polishing) for ${pieceObj.slabName} #${pieceObj.localPieceNumber} first!`, severity: 'error' });
      return;
    }
    setSelectedPieceIds(prev => 
      prev.includes(pieceId) ? prev.filter(id => id !== pieceId) : [...prev, pieceId]
    );
  };

  // Open add box modal (Change 9: Always open modal directly and allow dynamic Piece Range / Count selection inside)
  const handleOpenAddBox = () => {
    setNewBoxName(`Box ${packedBoxes.length + 1}`);
    setHasBoxSize('no');
    setBoxLength('');
    setBoxWidth('');
    setBoxRemarks('');

    const unpackedReady = allPieces.filter((p: any) => !packedPieceIdMap.has(p.id));
    if (selectedPieceIds.length > 0) {
      const selObjs = allPieces.filter((p: any) => selectedPieceIds.includes(p.id));
      const globals = selObjs.map((p: any) => Number(p.globalNumber) || 0).filter(Boolean);
      if (globals.length > 0) {
        setRangeFrom(String(Math.min(...globals)));
        setRangeTo(String(Math.max(...globals)));
      } else {
        setRangeFrom('');
        setRangeTo('');
      }
      setRangeQty(String(selectedPieceIds.length));
    } else if (unpackedReady.length > 0) {
      setRangeFrom(String(unpackedReady[0].globalNumber));
      setRangeTo('');
      setRangeQty('');
    } else {
      setRangeFrom('');
      setRangeTo('');
      setRangeQty('');
    }

    setIsAddBoxOpen(true);
  };

  // Dynamic Range Selection inside Create Packing Box modal (e.g. From #1 To #50)
  const handleApplyPieceRange = (fromVal: string, toVal: string) => {
    setRangeFrom(fromVal);
    setRangeTo(toVal);
    const fNum = parseInt(fromVal, 10);
    const tNum = parseInt(toVal, 10);
    const unpackedReady = allPieces.filter((p: any) => !packedPieceIdMap.has(p.id));
    if (!isNaN(fNum) && !isNaN(tNum) && tNum >= fNum) {
      const matched = unpackedReady
        .filter((p: any) => p.globalNumber >= fNum && p.globalNumber <= tNum)
        .map((p: any) => p.id);
      setSelectedPieceIds(matched);
      setRangeQty(matched.length > 0 ? String(matched.length) : '');
    } else if (!isNaN(fNum) && !toVal.trim()) {
      const matched = unpackedReady
        .filter((p: any) => p.globalNumber === fNum)
        .map((p: any) => p.id);
      setSelectedPieceIds(matched);
      setRangeQty(matched.length > 0 ? String(matched.length) : '');
    } else if (!fromVal.trim() && !toVal.trim()) {
      setSelectedPieceIds([]);
      setRangeQty('');
    }
  };

  // Dynamic Count (Qty) Selection inside Create Packing Box modal (e.g. Enter 50 pieces -> auto-selects next 50 unpacked pieces)
  const handleApplyPieceCount = (qtyVal: string) => {
    setRangeQty(qtyVal);
    const count = parseInt(qtyVal, 10);
    const unpackedReady = allPieces.filter((p: any) => !packedPieceIdMap.has(p.id));
    if (isNaN(count) || count <= 0) {
      setSelectedPieceIds([]);
      setRangeTo('');
      return;
    }
    const fNum = parseInt(rangeFrom, 10);
    const pool = !isNaN(fNum)
      ? unpackedReady.filter((p: any) => p.globalNumber >= fNum)
      : unpackedReady;
    const picked = pool.slice(0, count);
    setSelectedPieceIds(picked.map((p: any) => p.id));
    if (picked.length > 0) {
      setRangeFrom(String(picked[0].globalNumber));
      setRangeTo(String(picked[picked.length - 1].globalNumber));
    }
  };

  const handleSelectAllUnpacked = () => {
    const unpacked = filteredPieces.filter((p: any) => !packedPieceIdMap.has(p.id)).map((p: any) => p.id);
    setSelectedPieceIds(unpacked);
  };

  const handleSelectBatch = (count: number) => {
    const unpacked = filteredPieces.filter((p: any) => !packedPieceIdMap.has(p.id) && !selectedPieceIds.includes(p.id)).slice(0, count).map((p: any) => p.id);
    setSelectedPieceIds(prev => [...prev, ...unpacked]);
  };

  // Create single box
  const handleSaveBox = async () => {
    if (isSubmitting || isPacking) return;
    const targetPieces = selectedPieceIds;

    if (targetPieces.length === 0) {
      setToast({ open: true, message: 'Please select a Piece Range (e.g. From #1 to #50) or Piece Count above to pack into the box', severity: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      const bName = newBoxName.trim() || `Box ${packedBoxes.length + 1}`;
      let bSize = 'Standard';
      if (hasBoxSize === 'yes') {
        const l = boxLength.trim();
        const w = boxWidth.trim();
        if (l && w) {
          bSize = `${l} x ${w}`;
        } else if (l) {
          bSize = `${l}`;
        }
      }

      await packBoxes({
        projectId,
        slabId: slab?.id,
        boxes: [{
          boxName: bName,
          boxSize: bSize,
          pieceIds: targetPieces,
          remarks: boxRemarks.trim() || undefined
        }]
      }).unwrap();

      setSelectedPieceIds([]);
      setBoxRemarks('');
      setIsAddBoxOpen(false);
      onRefresh();
      setToast({ open: true, message: `${bName} created with ${targetPieces.length} pieces!`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error packing box', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // One-click Auto Pack (groups all unpacked pieces into boxes of 4)
  const handleAutoPack = async () => {
    const unpacked = allPieces.filter((p: any) => !packedPieceIdMap.has(p.id));
    if (unpacked.length === 0) {
      setToast({ open: true, message: 'All pieces are already packed!', severity: 'success' });
      return;
    }

    const BATCH_SIZE = 4;
    const boxesToCreate = [];
    let startIdx = packedBoxes.length + 1;

    for (let i = 0; i < unpacked.length; i += BATCH_SIZE) {
      const batch = unpacked.slice(i, i + BATCH_SIZE);
      boxesToCreate.push({
        boxName: `Box ${startIdx++}`,
        pieceIds: batch.map((p: any) => p.id)
      });
    }

    try {
      await packBoxes({
        projectId,
        slabId: slab?.id,
        boxes: boxesToCreate
      }).unwrap();

      setSelectedPieceIds([]);
      onRefresh();
      setToast({ open: true, message: `Auto-packed ${boxesToCreate.length} box(es) successfully!`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error during auto pack', severity: 'error' });
    }
  };

  // Delete box and unpack pieces
  const handleDeleteBox = async (logId: string, boxName: string) => {
    if (!window.confirm(`Are you sure you want to unpack and delete ${boxName}?`)) return;
    try {
      await deleteProductionLog(logId).unwrap();
      onRefresh();
      setToast({ open: true, message: `${boxName} unpacked and deleted`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.data?.message || 'Error deleting box', severity: 'error' });
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', mx: 'auto', pb: 6, boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ fontWeight: 700 }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* HEADER & NAVIGATION BREADCRUMBS */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
        <IconButton 
          onClick={() => navigate(`/projects/${projectId}`)} 
          size="small"
          sx={{ 
            bgcolor: '#FFFFFF', 
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            '&:hover': { bgcolor: '#F8FAFC' }
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
          <Typography 
            component="span" 
            onClick={() => navigate('/projects')}
            sx={{ cursor: 'pointer', '&:hover': { color: '#0F172A', textDecoration: 'underline' } }}
          >
            Projects
          </Typography>
          <Typography component="span" sx={{ color: '#CBD5E1' }}>/</Typography>
          <Typography 
            component="span" 
            onClick={() => navigate(`/projects/${projectId}`)}
            sx={{ cursor: 'pointer', '&:hover': { color: '#0F172A', textDecoration: 'underline' } }}
          >
            {projectName || 'Project'}
          </Typography>
          <Typography component="span" sx={{ color: '#CBD5E1' }}>/</Typography>
          <Typography component="span" sx={{ color: '#0F172A', fontWeight: 700 }}>
            {slab?.name || 'Packing'}
          </Typography>
        </Box>
      </Box>

      {/* 1. TOP HEADER & METRICS (Screenshot 4) */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 4, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.3px', mb: 0.5 }}>
              Packing - {slab?.name || projectName}
            </Typography>
            {slab?.size && (
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                Spec: {slab.size}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', px: 2, py: 1, borderRadius: 2.5 }}>
              <Inventory2RoundedIcon sx={{ color: '#0284C7', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#0369A1', lineHeight: 1 }}>
                  {totalPieces} {totalSlabPiecesCount > totalPieces ? `/${totalSlabPiecesCount}` : ''}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', fontSize: '0.65rem' }}>Ready to Pack</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', px: 2, py: 1, borderRadius: 2.5 }}>
              <CheckCircleRoundedIcon sx={{ color: '#16A34A', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#166534', lineHeight: 1 }}>{packedPiecesCount}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', fontSize: '0.65rem' }}>Packed</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#FFFDF5', border: '1px solid #FDE68A', px: 2, py: 1, borderRadius: 2.5 }}>
              <LayersRoundedIcon sx={{ color: '#D97706', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#B45309', lineHeight: 1 }}>{pendingPiecesCount}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#D97706', textTransform: 'uppercase', fontSize: '0.65rem' }}>Pending</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* 2. MAIN 2-COLUMN VIEW (Pieces Grouped by Main Stone + Packing Boxes) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' }, gap: 2.5, mb: 3, width: '100%', minWidth: 0 }}>
        {/* LEFT COLUMN: PIECES GROUPED BY MAIN STONE (with Global #1..#N) */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 420 }}>
            {/* Pieces Header with Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory2RoundedIcon sx={{ color: '#0284C7', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Pieces Grouped by Main Stone ({allPieces.length} Ready / {allProjectPieces.length} Total)
                </Typography>
                {selectedPieceIds.length > 0 && (
                  <Chip
                    label={`${selectedPieceIds.length} Selected`}
                    size="small"
                    sx={{ bgcolor: '#0284C7', color: '#FFFFFF', fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                  />
                )}
              </Box>

              <TextField
                size="small"
                placeholder="Search main stone or #1, G#5..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2, bgcolor: '#F8FAFC', fontSize: '0.82rem' }
                  }
                }}
                sx={{ width: { xs: '100%', sm: 230 } }}
              />
            </Box>

            {/* Quick Batch Selection Bar */}
            <Box sx={{ mb: 2, p: 1.25, bgcolor: '#F8FAFC', borderRadius: 2.5, border: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                Batch Selection:
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSelectAllUnpacked}
                  sx={{ py: 0.35, px: 1.5, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none', borderColor: '#CBD5E1', color: '#334155', '&:hover': { bgcolor: '#F1F5F9' } }}
                >
                  Select All Ready
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSelectBatch(10)}
                  sx={{ py: 0.35, px: 1.2, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none', borderColor: '#CBD5E1', color: '#334155', '&:hover': { bgcolor: '#F1F5F9' } }}
                >
                  +10
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSelectBatch(20)}
                  sx={{ py: 0.35, px: 1.2, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none', borderColor: '#CBD5E1', color: '#334155', '&:hover': { bgcolor: '#F1F5F9' } }}
                >
                  +20
                </Button>
                {selectedPieceIds.length > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={() => setSelectedPieceIds([])}
                    sx={{ py: 0.35, px: 1.2, fontSize: '0.75rem', fontWeight: 800, textTransform: 'none' }}
                  >
                    Clear ({selectedPieceIds.length})
                  </Button>
                )}
              </Box>
            </Box>

            {/* Grouped Main Stones List */}
            {filteredSlabGroups.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: '#94A3B8' }}>
                <Inventory2RoundedIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                  No pieces found for packing
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {filteredSlabGroups.map((group: any) => {
                  const isCollapsed = collapsedSlabIds.has(group.slabId);
                  const packedInStone = group.pieces.filter((p: any) => packedPieceIdMap.has(p.id)).length;
                  const readyUnpackedInStone = group.pieces.filter((p: any) => p.isReadyForPacking && !packedPieceIdMap.has(p.id));
                  const isAllStonePacked = group.pieces.length > 0 && packedInStone === group.pieces.length;

                  return (
                    <Box
                      key={group.slabId}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        border: '1.5px solid',
                        borderColor: isAllStonePacked ? '#BBF7D0' : '#E2E8F0',
                        bgcolor: isAllStonePacked ? '#F8FFF9' : '#FFFFFF'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.25 }}>
                        {/* Left: Main Stone Title & Global Range */}
                        <Box
                          onClick={() => toggleCollapseSlabGroup(group.slabId)}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', minWidth: 150 }}
                        >
                          <IconButton size="small" sx={{ p: 0.25, color: '#64748B' }}>
                            {isCollapsed ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowUpIcon fontSize="small" />}
                          </IconButton>
                          <LayersRoundedIcon sx={{ color: isAllStonePacked ? '#16A34A' : '#64748B', fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                              {group.slabName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.7rem' }}>
                              Global #{group.startGlobal} – #{group.endGlobal}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Middle: Inline Sub-Piece Buttons (1, 2, 3, 4 with Global #) */}
                        <Collapse in={!isCollapsed} sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {group.pieces.map((p: any) => {
                              const isPacked = packedPieceIdMap.has(p.id);
                              const isSelected = selectedPieceIds.includes(p.id);
                              const isReady = p.isReadyForPacking;
                              const boxAssigned = packedPieceIdMap.get(p.id);

                              return (
                                <Tooltip
                                  key={p.id}
                                  title={
                                    isPacked
                                      ? `Global #${p.globalNumber} (${group.slabName} #${p.localPieceNumber}) • Packed in ${boxAssigned}`
                                      : isReady
                                      ? `Global #${p.globalNumber} (${group.slabName} #${p.localPieceNumber}) • ${parsePieceArea(p.size || group.slabSize).toFixed(2)} Sq.Ft — Click to select`
                                      : `Global #${p.globalNumber} (${group.slabName} #${p.localPieceNumber}) — Complete Production/Polishing first`
                                  }
                                >
                                  <Box
                                    onClick={() => handleTogglePiece(p.id)}
                                    sx={{
                                      px: 1.5,
                                      py: 0.75,
                                      minWidth: 74,
                                      borderRadius: 2,
                                      border: '1.5px solid',
                                      borderColor: isPacked
                                        ? '#86EFAC'
                                        : isSelected
                                        ? '#0284C7'
                                        : isReady
                                        ? '#BAE6FD'
                                        : '#E2E8F0',
                                      bgcolor: isPacked
                                        ? '#DCFCE7'
                                        : isSelected
                                        ? '#0284C7'
                                        : isReady
                                        ? '#F0F9FF'
                                        : '#F8FAFC',
                                      color: isPacked
                                        ? '#166534'
                                        : isSelected
                                        ? '#FFFFFF'
                                        : isReady
                                        ? '#0369A1'
                                        : '#94A3B8',
                                      cursor: isPacked ? 'default' : (isReady ? 'pointer' : 'not-allowed'),
                                      opacity: (!isReady && !isPacked) ? 0.65 : 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 0.6,
                                      transition: 'all 0.15s ease',
                                      '&:hover': {
                                        transform: (isReady && !isPacked) ? 'translateY(-1px)' : 'none'
                                      }
                                    }}
                                  >
                                    {isPacked ? (
                                      <CheckCircleRoundedIcon sx={{ fontSize: 15, color: '#16A34A' }} />
                                    ) : isReady ? (
                                      <Inventory2RoundedIcon sx={{ fontSize: 14, color: isSelected ? '#FFFFFF' : '#0284C7' }} />
                                    ) : (
                                      <LayersRoundedIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                                    )}
                                    <Box sx={{ textAlign: 'left', lineHeight: 1 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.78rem', display: 'block', lineHeight: 1.1 }}>
                                        #{p.globalNumber}
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.62rem', opacity: 0.85, display: 'block', lineHeight: 1 }}>
                                        {isPacked ? boxAssigned : `Piece ${p.localPieceNumber}`}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Box>
                        </Collapse>

                        {/* Right: Progress Chip & Select Stone action */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {readyUnpackedInStone.length > 0 && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => {
                                const ids = readyUnpackedInStone.map((p: any) => p.id);
                                const allSel = ids.every((id: string) => selectedPieceIds.includes(id));
                                if (allSel) {
                                  setSelectedPieceIds(prev => prev.filter(id => !ids.includes(id)));
                                } else {
                                  setSelectedPieceIds(prev => Array.from(new Set([...prev, ...ids])));
                                }
                              }}
                              sx={{ py: 0.2, px: 0.8, minWidth: 0, fontSize: '0.7rem', fontWeight: 800, textTransform: 'none', color: '#0284C7' }}
                            >
                              {readyUnpackedInStone.every((p: any) => selectedPieceIds.includes(p.id)) ? 'Deselect' : 'Select Stone'}
                            </Button>
                          )}
                          <Chip
                            label={`${packedInStone}/${group.pieces.length} Packed`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              bgcolor: isAllStonePacked ? '#DCFCE7' : (packedInStone > 0 ? '#FEF3C7' : '#F1F5F9'),
                              color: isAllStonePacked ? '#166534' : (packedInStone > 0 ? '#B45309' : '#64748B')
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>

        {/* RIGHT COLUMN: PACKING BOXES */}
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF', minHeight: 420 }}>
            {/* Packing Boxes Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory2RoundedIcon sx={{ color: '#059669', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Packing Boxes ({packedBoxes.length})
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddBox}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: '#0284C7',
                    color: '#0284C7',
                    fontSize: '0.78rem',
                    '&:hover': { bgcolor: '#F0F9FF' }
                  }}
                >
                  Add Box
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AutoAwesomeRoundedIcon />}
                  onClick={handleAutoPack}
                  disabled={isPacking || pendingPiecesCount === 0}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: 'none',
                    bgcolor: '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#047857' }
                  }}
                >
                  Auto Pack
                </Button>
              </Box>
            </Box>

            {/* List of Box Cards */}
            {packedBoxes.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: '#94A3B8' }}>
                <Inventory2RoundedIcon sx={{ fontSize: 48, color: '#E2E8F0', mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                  No packing boxes created yet
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                  Select pieces on the left and click "+ Add Box" or use "Auto Pack".
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {packedBoxes.map((b: any) => {
                  // Group pieces inside this box by Main Stone name for quick badge summary
                  const slabSummaryMap = new Map<string, string[]>();
                  (b.pieces || []).forEach((p: any) => {
                    const sName = p.slabName || 'Slab';
                    if (!slabSummaryMap.has(sName)) slabSummaryMap.set(sName, []);
                    slabSummaryMap.get(sName)!.push(`#${p.globalNumber || p.pieceNumber}`);
                  });
                  const slabSummaryText = Array.from(slabSummaryMap.entries())
                    .map(([sName, nums]) => `${sName}: ${nums.join(', ')}`)
                    .join(' • ');

                  return (
                    <Paper
                      key={b.logId}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: '1.5px solid #E2E8F0',
                        bgcolor: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        flexWrap: 'wrap',
                        transition: 'all 0.15s ease',
                        '&:hover': { bgcolor: '#FFFFFF', borderColor: '#CBD5E1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ p: 1, bgcolor: '#EFF6FF', color: '#0284C7', borderRadius: 2 }}>
                          <Inventory2RoundedIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                              {b.boxName}
                            </Typography>
                            {b.boxSize && (
                              <Chip
                                label={b.boxSize}
                                size="small"
                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569' }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                            {b.pieceCount} Pieces • {b.area} Sq.Ft
                          </Typography>
                          {slabSummaryText && (
                            <Chip
                              label={slabSummaryText}
                              size="small"
                              sx={{ mt: 0.5, height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#F1F5F9', color: '#334155' }}
                            />
                          )}
                          {b.remarks && (
                            <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 700, display: 'block', mt: 0.5 }}>
                              💬 Note: {b.remarks}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label="Packed"
                          size="small"
                          sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800, fontSize: '0.7rem', height: 24, borderRadius: 1.5 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => setViewBox(b)}
                          sx={{ color: '#0284C7', bgcolor: '#F0F9FF', '&:hover': { bgcolor: '#E0F2FE' } }}
                        >
                          <VisibilityRoundedIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteBox(b.logId, b.boxName)}
                          sx={{ color: '#DC2626', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* 3. PACKING PROGRESS CHART (MASTER CALENDAR VIEW OF MAIN STONE VS SUB-PIECE PACKING STATUS — Image 5 & Change 4/5) */}
      {slabGroups.length > 0 && (() => {
        const maxPiecesInAnyStone = Math.max(1, ...slabGroups.map((g: any) => g.pieces.length));
        const colCount = Math.min(12, maxPiecesInAnyStone);

        return (
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 3.5, border: '1.5px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: '#F0F9FF', color: '#0284C7', borderRadius: 2, display: 'flex' }}>
                  <CalendarMonthRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
                    Packing Progress Chart
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                    Master calendar view of main stone vs sub-piece packing status (Global #1 – #{allProjectPieces.length})
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1.5, py: 0.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534' }}>= Packed</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Inventory2RoundedIcon sx={{ fontSize: 16, color: '#0284C7' }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369A1' }}>= Ready to Pack</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LayersRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>= Pending</Typography>
                  </Box>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownloadRoundedIcon />}
                  onClick={handleExportAllPiecesExcel}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: 'none',
                    borderColor: '#059669',
                    color: '#059669',
                    px: 2,
                    py: 0.75,
                    '&:hover': { bgcolor: '#ECFDF5', borderColor: '#047857' }
                  }}
                >
                  Export Pieces List ({allProjectPieces.length})
                </Button>
              </Box>
            </Box>

            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', py: 1.5, minWidth: 170 }}>
                      Main Stone
                    </TableCell>
                    {Array.from({ length: colCount }, (_, i) => (
                      <TableCell key={i} align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', py: 1.5, minWidth: 110 }}>
                        Piece {i + 1}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', py: 1.5, minWidth: 110 }}>
                      Progress
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slabGroups.map((group: any) => {
                    const packedInStone = group.pieces.filter((p: any) => packedPieceIdMap.has(p.id)).length;
                    const isAllStonePacked = group.pieces.length > 0 && packedInStone === group.pieces.length;

                    return (
                      <TableRow key={group.slabId} hover>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <LayersRoundedIcon sx={{ color: isAllStonePacked ? '#16A34A' : '#64748B', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                                {group.slabName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.7rem' }}>
                                Global #{group.startGlobal} – #{group.endGlobal}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {Array.from({ length: colCount }, (_, colIdx) => {
                          const p = group.pieces[colIdx];
                          if (!p) {
                            return <TableCell key={colIdx} align="center" sx={{ py: 1, color: '#CBD5E1' }}>—</TableCell>;
                          }
                          const isPacked = packedPieceIdMap.has(p.id);
                          const isSelected = selectedPieceIds.includes(p.id);
                          const isReady = p.isReadyForPacking;
                          const boxName = packedPieceIdMap.get(p.id);

                          return (
                            <TableCell key={p.id} align="center" sx={{ py: 1, px: 0.75 }}>
                              <Box
                                onClick={() => handleTogglePiece(p.id)}
                                sx={{
                                  p: 0.85,
                                  borderRadius: 2,
                                  border: '1.5px solid',
                                  borderColor: isPacked
                                    ? '#86EFAC'
                                    : isSelected
                                    ? '#0284C7'
                                    : isReady
                                    ? '#BAE6FD'
                                    : '#E2E8F0',
                                  bgcolor: isPacked
                                    ? '#F0FDF4'
                                    : isSelected
                                    ? '#E0F2FE'
                                    : isReady
                                    ? '#F0F9FF'
                                    : '#F8FAFC',
                                  cursor: isPacked ? 'default' : (isReady ? 'pointer' : 'not-allowed'),
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  {isPacked ? (
                                    <CheckCircleRoundedIcon sx={{ fontSize: 15, color: '#16A34A' }} />
                                  ) : isReady ? (
                                    <Inventory2RoundedIcon sx={{ fontSize: 14, color: '#0284C7' }} />
                                  ) : (
                                    <LayersRoundedIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                                  )}
                                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.82rem' }}>
                                    {p.localPieceNumber}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: isPacked ? '#166534' : (isReady ? '#0369A1' : '#64748B'), fontSize: '0.68rem', display: 'block' }}>
                                  G#{p.globalNumber}{isPacked && boxName ? ` • ${boxName}` : ''}
                                </Typography>
                              </Box>
                            </TableCell>
                          );
                        })}

                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Chip
                            label={`${packedInStone}/${group.pieces.length} Packed`}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              bgcolor: isAllStonePacked ? '#DCFCE7' : (packedInStone > 0 ? '#FEF3C7' : '#F1F5F9'),
                              color: isAllStonePacked ? '#166534' : (packedInStone > 0 ? '#B45309' : '#64748B')
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        );
      })()}

      {/* 4. DOCKED BOTTOM BAR (Screenshot 4) */}
      <Paper
        elevation={4}
        sx={{
          position: 'sticky',
          bottom: 16,
          width: '100%',
          mt: 4,
          p: 2,
          px: 3,
          borderRadius: 3.5,
          border: '1.5px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          zIndex: 1000,
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ p: 0.6, bgcolor: isPackagingCompleted ? '#DCFCE7' : '#FEF3C7', color: isPackagingCompleted ? '#166534' : '#B45309', borderRadius: '50%', display: 'flex' }}>
            <CheckRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
            {isPackagingCompleted ? 'Packaging Completed' : 'Packing in Progress'}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#CBD5E1' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            Total Boxes: <strong style={{ color: '#0F172A' }}>{packedBoxes.length}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            Total Pieces: <strong style={{ color: '#0F172A' }}>{packedPiecesCount} / {totalPieces}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
            Total Area: <strong style={{ color: '#0F172A' }}>{totalPackedArea} Sq.Ft</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setSummaryOpen(true)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              borderColor: '#CBD5E1',
              color: '#334155',
              '&:hover': { bgcolor: '#F8FAFC' }
            }}
          >
            View Summary
          </Button>

          <Button
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => navigate(`/projects/${projectId}`)}
            sx={{
              bgcolor: isPackagingCompleted ? '#16A34A' : '#0284C7',
              color: '#FFFFFF',
              fontWeight: 800,
              borderRadius: 2.5,
              px: 3,
              py: 1,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: isPackagingCompleted ? '#15803D' : '#0369A1' }
            }}
          >
            Done
          </Button>
        </Box>
      </Paper>

      {/* CREATE BOX MODAL (Change 9: Dynamic Piece Range / Count Auto-Selector + Comment Box) */}
      <Dialog open={isAddBoxOpen} onClose={() => setIsAddBoxOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Create Packing Box
          <IconButton onClick={() => setIsAddBoxOpen(false)} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            required
            size="small"
            label="Box Name / Code *"
            value={newBoxName}
            onChange={(e) => setNewBoxName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />

          {/* Dynamic Piece Range & Count Selector (Change 9) */}
          <Box sx={{ p: 2, mb: 2.5, bgcolor: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0369A1' }}>
                Select Pieces by Range or Count (Auto-Select) *
              </Typography>
              <Chip
                label={`${pendingPiecesCount} Ready Unpacked Pieces`}
                size="small"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: '#E0F2FE', color: '#0369A1' }}
              />
            </Box>

            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={4}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label="From Piece #"
                  placeholder="e.g. 1"
                  value={rangeFrom}
                  onChange={(e) => handleApplyPieceRange(e.target.value, rangeTo)}
                  slotProps={{ input: { sx: { bgcolor: '#FFFFFF', borderRadius: 1.5, fontWeight: 800 } } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label="To Piece #"
                  placeholder="e.g. 50"
                  value={rangeTo}
                  onChange={(e) => handleApplyPieceRange(rangeFrom, e.target.value)}
                  slotProps={{ input: { sx: { bgcolor: '#FFFFFF', borderRadius: 1.5, fontWeight: 800 } } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label="Or Piece Count"
                  placeholder="e.g. 50"
                  value={rangeQty}
                  onChange={(e) => handleApplyPieceCount(e.target.value)}
                  slotProps={{ input: { sx: { bgcolor: '#FFFFFF', borderRadius: 1.5, fontWeight: 800 } } }}
                />
              </Grid>
            </Grid>

            {/* Quick Count Chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mr: 0.5 }}>
                Quick Pick:
              </Typography>
              {[5, 10, 25, 50].map((cnt) => (
                <Chip
                  key={cnt}
                  label={`Next ${cnt} Pcs`}
                  size="small"
                  onClick={() => handleApplyPieceCount(String(cnt))}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    bgcolor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    color: '#0284C7',
                    '&:hover': { bgcolor: '#E0F2FE' }
                  }}
                />
              ))}
              <Chip
                label={`All Ready (${pendingPiecesCount})`}
                size="small"
                onClick={() => handleApplyPieceCount(String(pendingPiecesCount))}
                sx={{
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  bgcolor: '#0284C7',
                  color: '#FFFFFF',
                  '&:hover': { bgcolor: '#0369A1' }
                }}
              />
            </Box>

            {/* Selected Pieces Preview */}
            <Box sx={{ mt: 1.5, pt: 1.25, borderTop: '1px dashed #BAE6FD' }}>
              {selectedPieceIds.length > 0 ? (
                <Typography variant="caption" sx={{ color: '#0F172A', fontWeight: 800, display: 'block' }}>
                  ✓ {selectedPieceIds.length} Piece(s) Auto-Selected{' '}
                  {rangeFrom && rangeTo ? `(Global #${rangeFrom} – #${rangeTo})` : ''}
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                  Enter a range (e.g. From #1 To #50) or Piece Count (e.g. 50) to auto-select pieces.
                </Typography>
              )}
            </Box>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
            Do you want to add Box Size? <Box component="span" sx={{ color: '#EF4444' }}>*</Box>
          </Typography>

          <RadioGroup
            row
            value={hasBoxSize}
            onChange={(e) => setHasBoxSize(e.target.value as 'yes' | 'no')}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="yes"
              control={<Radio size="small" sx={{ color: '#0284C7', '&.Mui-checked': { color: '#0284C7' } }} />}
              label={<Typography variant="body2" sx={{ fontWeight: 700, color: hasBoxSize === 'yes' ? '#0284C7' : '#475569' }}>Yes</Typography>}
              sx={{
                border: '1.5px solid',
                borderColor: hasBoxSize === 'yes' ? '#0284C7' : '#E2E8F0',
                bgcolor: hasBoxSize === 'yes' ? '#F0F9FF' : '#FFFFFF',
                borderRadius: 2.5,
                px: 2,
                py: 0.5,
                mr: 2
              }}
            />
            <FormControlLabel
              value="no"
              control={<Radio size="small" sx={{ color: '#0284C7', '&.Mui-checked': { color: '#0284C7' } }} />}
              label={<Typography variant="body2" sx={{ fontWeight: 700, color: hasBoxSize === 'no' ? '#0284C7' : '#475569' }}>No</Typography>}
              sx={{
                border: '1.5px solid',
                borderColor: hasBoxSize === 'no' ? '#0284C7' : '#E2E8F0',
                bgcolor: hasBoxSize === 'no' ? '#F0F9FF' : '#FFFFFF',
                borderRadius: 2.5,
                px: 2,
                py: 0.5
              }}
            />
          </RadioGroup>

          {hasBoxSize === 'yes' && (
            <Box sx={{ p: 2, bgcolor: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 2.5, mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', mb: 1.5, letterSpacing: '0.5px' }}>
                Box Size (L × W)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TextField
                  size="small"
                  label="Length (L) *"
                  placeholder="36"
                  value={boxLength}
                  onChange={(e) => setBoxLength(e.target.value)}
                  slotProps={{
                    input: {
                      sx: { bgcolor: '#FFFFFF', borderRadius: 1.5 }
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body1" sx={{ fontWeight: 800, color: '#64748B' }}>×</Typography>
                <TextField
                  size="small"
                  label="Width (W) *"
                  placeholder="24"
                  value={boxWidth}
                  onChange={(e) => setBoxWidth(e.target.value)}
                  slotProps={{
                    input: {
                      sx: { bgcolor: '#FFFFFF', borderRadius: 1.5 }
                    }
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
          )}

          {/* Comment / Remarks Box (Change 9) */}
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            label="Comment / Box Notes (Optional)"
            placeholder="e.g. Packed 50 pieces from Stone 1 to Stone 3, handle with care..."
            value={boxRemarks}
            onChange={(e) => setBoxRemarks(e.target.value)}
            sx={{ mb: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setIsAddBoxOpen(false)} color="inherit" sx={{ fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            onClick={handleSaveBox} 
            disabled={isPacking || isSubmitting || selectedPieceIds.length === 0}
            variant="contained" 
            sx={{ bgcolor: '#0284C7', fontWeight: 800, textTransform: 'none', px: 3, borderRadius: 2, '&:hover': { bgcolor: '#0369A1' } }}
          >
            {isPacking || isSubmitting ? 'Packing...' : `Pack Box (${selectedPieceIds.length} Pcs)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW BOX PIECES MODAL (Change 6: Show Connected Main Stone / Slab & Global # for each piece) */}
      <Dialog open={Boolean(viewBox)} onClose={() => setViewBox(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {viewBox?.boxName} - Packed Pieces
          <IconButton onClick={() => setViewBox(null)} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: viewBox?.remarks ? 1 : 2, display: 'block' }}>
            {viewBox?.boxSize ? `Box Size: ${viewBox.boxSize} • ` : ''}Total {viewBox?.pieceCount} Pieces • {viewBox?.area} Sq.Ft • {viewBox?.packedOn}
          </Typography>
          {viewBox?.remarks && (
            <Box sx={{ p: 1.25, mb: 2, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369A1', display: 'block' }}>
                💬 Box Comment / Note: {viewBox.remarks}
              </Typography>
            </Box>
          )}
          <Grid container spacing={1.5}>
            {(viewBox?.pieces || []).map((p: any) => {
              const pArea = parsePieceArea(p.size || p.slabSize || slab?.size);
              return (
                <Grid item xs={12} sm={6} key={p.id}>
                  <Box sx={{ p: 1.5, border: '1.5px solid #BBF7D0', bgcolor: '#F0FDF4', borderRadius: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Chip
                        label={`Global #${p.globalNumber || p.pieceNumber}`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 900, bgcolor: '#16A34A', color: '#FFFFFF' }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534' }}>
                        Sub-Piece #{p.localPieceNumber || p.pieceNumber}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.25 }}>
                      Main Stone: {p.slabName || slab?.name || 'Stone'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#334155', fontWeight: 700, display: 'block', mt: 0.25 }}>
                      Piece: {p.productName || `${p.slabName}.${p.localPieceNumber || p.pieceNumber}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mt: 0.25 }}>
                      {p.size || p.slabSize || `${pArea.toFixed(2)} Sq.Ft`}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewBox(null)} variant="outlined" sx={{ fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* VIEW PACKING SUMMARY MODAL */}
      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Packing Summary
          <IconButton onClick={() => setSummaryOpen(false)} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1 }}>
            {packedBoxes.map((b: any) => (
              <Box key={b.logId} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{b.boxName}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    {b.boxSize ? `Size: ${b.boxSize} • ` : ''}{b.pieceCount} Pieces • {b.area} Sq.Ft
                  </Typography>
                </Box>
                <Chip label="Packed" size="small" sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800 }} />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSummaryOpen(false)} variant="contained" sx={{ bgcolor: '#0284C7', fontWeight: 800 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PackingWorkspace;
