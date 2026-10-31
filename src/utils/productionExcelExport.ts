import * as XLSX from 'xlsx';

export interface ProductionExportParams {
  project: any;
  slabs: any[];
  machines?: any[];
  productionLogs?: any[];
}

export const exportProjectProductionExcel = ({
  project,
  slabs = [],
  machines = [],
  productionLogs = []
}: ProductionExportParams) => {
  // Machine lookup map for easy display
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

  // Build Sheet 1: Machine & Work Execution Ledger
  const executionRows: any[] = [];
  let executionCounter = 1;

  slabs.forEach((slab: any) => {
    const slabName = slab.name || 'Unnamed Slab';
    const slabSize = slab.size || `${slab.length || 0} x ${slab.height || 0} ${slab.unit || 'MM'}`;
    const pieces = slab.pieces && Array.isArray(slab.pieces) ? slab.pieces : [];

    pieces.forEach((piece: any) => {
      const pieceLabel = `Piece #${piece.pieceNumber || 1}`;
      const pieceName = piece.productName || slabName;
      const pieceSize = piece.size || slabSize;
      const logs = piece.logs && Array.isArray(piece.logs) && piece.logs.length > 0 ? piece.logs : [];

      if (logs.length > 0) {
        // Sort logs chronologically
        const sortedLogs = [...logs].sort((a: any, b: any) => {
          const tA = new Date(a.createdAt || a.endTime || 0).getTime();
          const tB = new Date(b.createdAt || b.endTime || 0).getTime();
          return tA - tB;
        });

        sortedLogs.forEach((log: any) => {
          const machineName = log.machineId
            ? (machineMap.get(String(log.machineId)) || `Machine: ${log.machineId}`)
            : 'Manual / Hand Work';
          const driverOrOp = log.driverName || log.operatorName || (log.operatorId ? `Operator ID: ${log.operatorId}` : '-');
          const dateStr = formatDate(log.createdAt || log.endTime);
          const timeStr = formatTime(log.createdAt || log.endTime);
          const stageName = (log.stage || piece.stage || 'Production').replace(' Work', '');
          const statusStr = (log.status || piece.status || 'Completed').toUpperCase();
          const photo = log.endPhotoUrl || log.startPhotoUrl || '-';

          executionRows.push({
            'S.No': executionCounter++,
            'Slab / Item Name': slabName,
            'Piece No': pieceLabel,
            'Product / Specification': pieceName,
            'Size / Dimensions': pieceSize,
            'Manufacturing Stage': stageName,
            'Work Date': dateStr,
            'Work Time': timeStr,
            'Machine Used': machineName,
            'Operator / Karigar / Driver': driverOrOp,
            'Quantity': '1 Pc',
            'Execution Status': statusStr,
            'Remarks / Notes': log.remarks || 'Stage Completed',
            'Photo Proof URL': photo
          });
        });
      } else {
        // Piece with no logs yet
        executionRows.push({
          'S.No': executionCounter++,
          'Slab / Item Name': slabName,
          'Piece No': pieceLabel,
          'Product / Specification': pieceName,
          'Size / Dimensions': pieceSize,
          'Manufacturing Stage': (piece.stage || 'Production').replace(' Work', ''),
          'Work Date': '-',
          'Work Time': '-',
          'Machine Used': '-',
          'Operator / Karigar / Driver': '-',
          'Quantity': '1 Pc',
          'Execution Status': (piece.status || 'Pending').toUpperCase(),
          'Remarks / Notes': 'Pending Execution',
          'Photo Proof URL': '-'
        });
      }
    });
  });

  // Sheet 2: Slabs & Pieces Progress Summary
  let summaryCounter = 1;
  const summaryRows = slabs.map((slab: any) => {
    const pieces = slab.pieces && Array.isArray(slab.pieces) ? slab.pieces : [];
    const totalPcs = pieces.length || slab.totalPieces || 0;
    const completedPcs = pieces.filter((p: any) => p.status === 'completed' || p.status === 'approved').length;
    const progressPct = totalPcs > 0 ? Math.round((completedPcs / totalPcs) * 100) : 0;
    const stages = Array.isArray(slab.requiredStages)
      ? slab.requiredStages.join(' ➔ ')
      : 'Production ➔ Polishing ➔ Packing ➔ Dispatch';

    return {
      'S.No': summaryCounter++,
      'Slab / Item Name': slab.name,
      'Dimensions': slab.size || `${slab.length || 0} x ${slab.height || 0} ${slab.unit || 'MM'}`,
      'Total Pieces': totalPcs,
      'Completed Pieces': completedPcs,
      'Remaining Pieces': Math.max(0, totalPcs - completedPcs),
      'Progress %': `${progressPct}%`,
      'Required Pipeline Stages': stages,
      'Total Sq.Ft': slab.totalSqFt || slab.squareFeet || slab.sqft || '-',
      'Slab Status': progressPct === 100 ? 'COMPLETED' : progressPct > 0 ? 'IN PROGRESS' : 'PENDING'
    };
  });

  // Sheet 3: Project Overview & Metadata
  const projectInfoRows = [
    { 'Attribute': 'Company Name', 'Details': 'UNNATI ARTS — Architectural Stone & Crafts' },
    { 'Attribute': 'Report Name', 'Details': 'Production Tracking & Machine Execution Ledger' },
    { 'Attribute': 'Project Code', 'Details': project?.projectCode || '-' },
    { 'Attribute': 'Project Title', 'Details': project?.title || project?.name || '-' },
    { 'Attribute': 'Client Name', 'Details': project?.clientName || '-' },
    { 'Attribute': 'Client Contact', 'Details': project?.clientPhone || project?.clientEmail || '-' },
    { 'Attribute': 'Project Status', 'Details': (project?.status || 'completed').toUpperCase() },
    { 'Attribute': 'Order Start Date', 'Details': formatDate(project?.startDate) },
    { 'Attribute': 'Delivery Target Date', 'Details': formatDate(project?.targetDeliveryDate || project?.endDate) },
    { 'Attribute': 'Total Slabs / Items', 'Details': slabs.length },
    { 'Attribute': 'Total Pieces Tracked', 'Details': slabs.reduce((acc, s) => acc + (s.pieces?.length || 0), 0) },
    { 'Attribute': 'Report Generated On', 'Details': `${formatDate(new Date())} at ${formatTime(new Date())}` }
  ];

  // Create Workbook
  const workbook = XLSX.utils.book_new();

  // 1. Detailed Execution Ledger Sheet
  const wsExecution = XLSX.utils.json_to_sheet(executionRows.length > 0 ? executionRows : [{ 'Notice': 'No piece execution logs recorded yet' }]);
  wsExecution['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 22 }, // Slab / Item Name
    { wch: 14 }, // Piece No
    { wch: 28 }, // Product / Specification
    { wch: 20 }, // Size / Dimensions
    { wch: 22 }, // Manufacturing Stage
    { wch: 14 }, // Work Date
    { wch: 14 }, // Work Time
    { wch: 24 }, // Machine Used
    { wch: 26 }, // Operator / Karigar / Driver
    { wch: 12 }, // Quantity
    { wch: 18 }, // Execution Status
    { wch: 30 }, // Remarks / Notes
    { wch: 45 }  // Photo Proof URL
  ];
  XLSX.utils.book_append_sheet(workbook, wsExecution, 'Machine & Work Execution');

  // 2. Summary Sheet
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{ 'Notice': 'No slabs defined' }]);
  wsSummary['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 24 }, // Slab / Item Name
    { wch: 20 }, // Dimensions
    { wch: 14 }, // Total Pieces
    { wch: 16 }, // Completed Pieces
    { wch: 16 }, // Remaining Pieces
    { wch: 14 }, // Progress %
    { wch: 45 }, // Required Pipeline Stages
    { wch: 14 }, // Total Sq.Ft
    { wch: 16 }  // Slab Status
  ];
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Slabs Progress Summary');

  // 3. Project Overview Sheet
  const wsInfo = XLSX.utils.json_to_sheet(projectInfoRows);
  wsInfo['!cols'] = [
    { wch: 25 },
    { wch: 60 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsInfo, 'Project Overview');

  // Generate File
  const code = (project?.projectCode || project?.title || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Production_Report_${code}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
