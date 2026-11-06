import * as XLSX from 'xlsx';

export interface ProductionExportParams {
  project: any;
  slabs: any[];
  machines?: any[];
  productionLogs?: any[];
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

export const exportProjectProductionExcel = ({
  project,
  slabs = [],
  machines = [],
  productionLogs = []
}: ProductionExportParams) => {
  const machineMap = new Map<string, string>();
  if (Array.isArray(machines)) {
    machines.forEach((m: any) => {
      const id = String(m.id || m._id || '');
      const label = m.name ? `${m.name}${m.model ? ` (${m.model})` : ''}` : 'Machine';
      if (id) machineMap.set(id, label);
    });
  }

  const formatDate = (val: any) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return '-';
    }
  };

  const formatTime = (val: any) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '-';
    }
  };

  // Flatten all pieces across slabs
  const allPieces: any[] = [];
  slabs.forEach((s: any) => {
    if (Array.isArray(s.pieces)) {
      s.pieces.forEach((p: any) => allPieces.push({ ...p, slabName: s.name, slabSize: s.size }));
    }
  });

  // ==========================================
  // SHEET 1: PIECES PRODUCED (Kitne piece bane & kya date ko bane)
  // Exactly 1 clean row per piece
  // ==========================================
  let pieceCounter = 1;
  const pieceRows: any[] = [];

  allPieces.forEach((piece: any) => {
    const pieceSize = piece.size || piece.slabSize || '-';
    const areaSqFt = parsePieceArea(pieceSize);

    // Find production log for this piece
    const prodLog = (piece.logs || []).find((l: any) => (l.stage || '').startsWith('Production')) ||
      (productionLogs || []).find((l: any) => 
        (l.stage === 'Production' || l.stage === 'Production Work') && 
        Array.isArray(l.pieceIds) && l.pieceIds.includes(piece.id)
      );

    const logDate = prodLog ? formatDate(prodLog.createdAt || prodLog.endTime) : (piece.createdAt ? formatDate(piece.createdAt) : '-');
    const logTime = prodLog ? formatTime(prodLog.createdAt || prodLog.endTime) : (piece.createdAt ? formatTime(piece.createdAt) : '-');

    let machine = '-';
    let operator = '-';
    if (prodLog) {
      if (prodLog.remarks?.includes('Manual') || prodLog.machineId === 'manual') {
        machine = 'Manual';
        operator = 'Manual';
      } else {
        machine = prodLog.machineId ? (machineMap.get(String(prodLog.machineId)) || 'Machine') : 'Manual';
        operator = prodLog.driverName || prodLog.operatorName || (prodLog.operatorId ? `ID: ${prodLog.operatorId}` : 'Manual');
      }
    }

    const isCompleted = piece.status === 'completed' || piece.status === 'approved' || Boolean(prodLog);

    pieceRows.push({
      'S.No': pieceCounter++,
      'Piece No': `Piece #${piece.pieceNumber || 1}`,
      'Slab / Product Name': piece.productName || piece.slabName || 'Stone Slab',
      'Size / Dimensions': pieceSize,
      'Area (Sq.Ft)': areaSqFt.toFixed(2),
      'Production Date': logDate,
      'Production Time': logTime,
      'Machine': machine,
      'Operator / Karigar': operator,
      'Status': isCompleted ? 'COMPLETED' : 'PENDING'
    });
  });

  // ==========================================
  // SHEET 2: PACKING SUMMARY (Boxes kitne pack hue)
  // ==========================================
  const packingLogs = (productionLogs || []).filter((l: any) =>
    (l.stage === 'Packing' || l.stage === 'Packing Work') &&
    (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
  );

  // Deduplicate packed boxes
  const seenBoxes = new Set<string>();
  const dedupedBoxLogs: any[] = [];
  for (const l of packingLogs) {
    const pIds = (Array.isArray(l.pieceIds) ? l.pieceIds : []).slice().sort().join(',');
    const code = (l.boxCode || '').trim();
    const key = pIds ? `${code}_${pIds}` : (l.id || `${code}_${l.createdAt}`);
    if (seenBoxes.has(key)) continue;
    seenBoxes.add(key);
    dedupedBoxLogs.push(l);
  }

  // Check which boxes have been dispatched
  const dispatchLogs = (productionLogs || []).filter((l: any) =>
    (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') &&
    (l.approvalStatus === 'approved' || l.approvalStatus === 'completed')
  );
  const dispatchedBoxNames = new Set(
    dispatchLogs.flatMap((l: any) => (l.boxCode || '').split(',').map((s: string) => s.trim()).filter(Boolean))
  );

  let boxCounter = 1;
  const boxRows = dedupedBoxLogs.map((l: any) => {
    const rawCode = l.boxCode || `Box ${boxCounter}`;
    const parts = rawCode.split('|').map((s: string) => s.trim());
    const bName = parts[0] || `Box ${boxCounter}`;
    const bSize = parts[1] || 'Standard';

    const pIds: string[] = Array.isArray(l.pieceIds) ? l.pieceIds : [];
    const boxPieces = allPieces.filter((p: any) => pIds.includes(p.id));
    const boxArea = boxPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || p.slabSize), 0);
    const pieceCount = l.quantityProduced || pIds.length || boxPieces.length || 0;
    const piecesList = boxPieces.map((p: any) => `#${p.pieceNumber}`).join(', ') || `${pieceCount} Pcs`;

    const isBoxDispatched = dispatchedBoxNames.has(bName) || dispatchLogs.some((dl: any) => Array.isArray(dl.pieceIds) && pIds.some((pid: string) => dl.pieceIds.includes(pid)));

    return {
      'S.No': boxCounter++,
      'Box No / Name': bName,
      'Box Size (L × W)': bSize,
      'Total Pieces': pieceCount,
      'Pieces Included': piecesList,
      'Total Area (Sq.Ft)': boxArea > 0 ? boxArea.toFixed(2) : (pieceCount * 2.08).toFixed(2),
      'Packed Date': formatDate(l.createdAt),
      'Packed Time': formatTime(l.createdAt),
      'Packing Status': isBoxDispatched ? 'DISPATCHED' : 'PACKED'
    };
  });

  // ==========================================
  // SHEET 3: DISPATCH DETAILS (Kab / kaise dispatch hue)
  // ==========================================
  let dispatchCounter = 1;
  const dispatchRows = dispatchLogs.map((l: any) => {
    const pIds: string[] = Array.isArray(l.pieceIds) ? l.pieceIds : [];
    const batchPieces = allPieces.filter((p: any) => pIds.includes(p.id));
    const batchArea = batchPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || p.slabSize), 0);
    const pieceCount = l.quantityProduced || pIds.length || batchPieces.length || 0;

    const driver = l.vendorName || l.driverName || l.remarks?.match(/Driver:\s*([^,\n|]+)/i)?.[1]?.trim() || (l.remarks?.includes('Manual') ? 'Manual' : '-');
    const lr = l.challanNumber || l.remarks?.match(/LR:\s*([^,\n|]+)/i)?.[1]?.trim() || '-';
    const vehicle = l.vehicleNumber || (l.remarks?.match(/Vehicle:\s*([^,\n|]+)/i)?.[1]?.trim()) || (l.remarks?.includes('Manual') ? 'Manual' : '-');
    const cleanRemarks = l.remarks?.startsWith('Vehicle:') ? '-' : (l.remarks || '-');

    return {
      'S.No': dispatchCounter++,
      'Vehicle Number': vehicle,
      'Driver Name': driver,
      'Transport / LR No': lr,
      'Boxes Dispatched': l.boxCode || '-',
      'Pieces Count': pieceCount,
      'Total Area (Sq.Ft)': batchArea > 0 ? batchArea.toFixed(2) : (pieceCount * 2.08).toFixed(2),
      'Dispatch Date': formatDate(l.startTime || l.createdAt),
      'Dispatch Time': formatTime(l.startTime || l.createdAt),
      'Remarks': cleanRemarks
    };
  });

  // ==========================================
  // SHEET 4: ORDER SUMMARY
  // ==========================================
  const totalPiecesCount = allPieces.length;
  const completedPiecesCount = allPieces.filter((p: any) => p.status === 'completed' || p.status === 'approved').length;
  const totalAreaManufactured = allPieces.reduce((sum: number, p: any) => sum + parsePieceArea(p.size || p.slabSize), 0).toFixed(2);
  const totalBoxesCount = dedupedBoxLogs.length;
  const totalDispatchedVehicles = Array.from(new Set(dispatchLogs.map((l: any) => l.vehicleNumber).filter(Boolean))).join(', ') || '-';

  const orderSummaryRows = [
    { 'Particulars': 'Work Order Code', 'Value': project?.projectCode || '-' },
    { 'Particulars': 'Project / Order Title', 'Value': project?.title || project?.name || '-' },
    { 'Particulars': 'Client Name', 'Value': project?.clientName || '-' },
    { 'Particulars': 'Total Slabs Tracked', 'Value': slabs.length },
    { 'Particulars': 'Total Pieces Planned', 'Value': totalPiecesCount },
    { 'Particulars': 'Pieces Completed', 'Value': completedPiecesCount },
    { 'Particulars': 'Total Manufacturing Area', 'Value': `${totalAreaManufactured} Sq.Ft` },
    { 'Particulars': 'Total Boxes Packed', 'Value': `${totalBoxesCount} Box(es)` },
    { 'Particulars': 'Dispatched Vehicle(s)', 'Value': totalDispatchedVehicles },
    { 'Particulars': 'Order Status', 'Value': (project?.status || 'In Production').toUpperCase() },
    { 'Particulars': 'Order Start Date', 'Value': formatDate(project?.startDate) },
    { 'Particulars': 'Report Generated Date', 'Value': `${formatDate(new Date())} at ${formatTime(new Date())}` }
  ];

  // ==========================================
  // WORKBOOK COMPILATION (Clean 4 Sheets)
  // ==========================================
  const workbook = XLSX.utils.book_new();

  // 1. Pieces Produced
  const wsPieces = XLSX.utils.json_to_sheet(pieceRows.length > 0 ? pieceRows : [{ 'Notice': 'No pieces produced yet' }]);
  wsPieces['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 14 }, // Piece No
    { wch: 26 }, // Slab / Product Name
    { wch: 28 }, // Size / Dimensions
    { wch: 14 }, // Area (Sq.Ft)
    { wch: 16 }, // Production Date
    { wch: 14 }, // Production Time
    { wch: 20 }, // Machine
    { wch: 22 }, // Operator / Karigar
    { wch: 14 }  // Status
  ];
  XLSX.utils.book_append_sheet(workbook, wsPieces, 'Pieces Produced');

  // 2. Boxes Packed
  const wsBoxes = XLSX.utils.json_to_sheet(boxRows.length > 0 ? boxRows : [{ 'Notice': 'No packing boxes created yet' }]);
  wsBoxes['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 18 }, // Box No / Name
    { wch: 22 }, // Box Size
    { wch: 14 }, // Total Pieces
    { wch: 24 }, // Pieces Included
    { wch: 18 }, // Total Area (Sq.Ft)
    { wch: 16 }, // Packed Date
    { wch: 14 }, // Packed Time
    { wch: 16 }  // Status
  ];
  XLSX.utils.book_append_sheet(workbook, wsBoxes, 'Boxes Packed');

  // 3. Dispatch Details
  const wsDispatch = XLSX.utils.json_to_sheet(dispatchRows.length > 0 ? dispatchRows : [{ 'Notice': 'No dispatch records created yet' }]);
  wsDispatch['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 18 }, // Vehicle Number
    { wch: 22 }, // Driver Name
    { wch: 20 }, // Transport / LR No
    { wch: 24 }, // Boxes Dispatched
    { wch: 14 }, // Pieces Count
    { wch: 18 }, // Total Area (Sq.Ft)
    { wch: 16 }, // Dispatch Date
    { wch: 14 }, // Dispatch Time
    { wch: 30 }  // Remarks
  ];
  XLSX.utils.book_append_sheet(workbook, wsDispatch, 'Dispatch Details');

  // 4. Order Summary
  const wsSummary = XLSX.utils.json_to_sheet(orderSummaryRows);
  wsSummary['!cols'] = [
    { wch: 30 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Order Summary');

  // Generate File
  const code = (project?.projectCode || project?.title || 'WorkOrder').replace(/[^a-zA-Z0-9_-]/g, '_');
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Production_Summary_${code}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
