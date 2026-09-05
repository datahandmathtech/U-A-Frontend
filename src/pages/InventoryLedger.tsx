import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { useGetInventoryQuery, useGetInventoryLogsQuery } from '../store/apiSlice';
import * as XLSX from 'xlsx';

const InventoryLedger = () => {
  const { supplier } = useParams<{ supplier: string }>();
  const navigate = useNavigate();
  const decodedSupplier = decodeURIComponent(supplier || '');
  
  const { data: allInventory, isLoading: isLoadingInv } = useGetInventoryQuery();
  const { data: logs, isLoading: isLoadingLogs } = useGetInventoryLogsQuery(decodedSupplier);

  if (isLoadingInv || isLoadingLogs) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;

  // Filter inventory by supplier or project
  const supplierInventory = (allInventory || []).filter((item: any) => {
    if (item.supplier && item.supplier.toLowerCase() === decodedSupplier.toLowerCase()) return true;
    const proj1 = item.projectMaterials?.[0]?.project;
    const proj2 = item.slabs?.[0]?.project;
    const p = proj1 || proj2;
    if (p) {
      const projDisplay = `${p.projectId ? p.projectId + ' – ' : ''}${p.name}`.toLowerCase();
      const projDisplayDash = `${p.projectId ? p.projectId + ' - ' : ''}${p.name}`.toLowerCase();
      const dec = decodedSupplier.toLowerCase();
      if (
        projDisplay === dec ||
        projDisplayDash === dec ||
        (p.name && p.name.toLowerCase() === dec) ||
        (p.projectId && p.projectId.toLowerCase() === dec) ||
        p.id === decodedSupplier ||
        (p.clientName && p.clientName.toLowerCase() === dec)
      ) {
        return true;
      }
    }
    return false;
  });

  const projectInfo = supplierInventory[0]?.projectMaterials?.[0]?.project || supplierInventory[0]?.slabs?.[0]?.project;
  const pageTitle = projectInfo 
    ? (projectInfo.projectId ? `${projectInfo.projectId} – ${projectInfo.name}` : projectInfo.name)
    : decodedSupplier;

  // Calculate used quantity for each inventory item
  const inventoryStats = supplierInventory.map((item: any) => {
    // Find all logs for this item
    const itemLogs = (logs || []).filter((l: any) => l.inventoryId === item.id);
    
    const usedQty = itemLogs.filter((l: any) => l.type === 'OUT').reduce((sum: number, l: any) => sum + Number(l.quantity), 0);
    const inQty = itemLogs.filter((l: any) => l.type === 'IN').reduce((sum: number, l: any) => sum + Number(l.quantity), 0);
    
    return {
      ...item,
      procure: inQty,
      used: usedQty,
      balance: item.quantity, // Current quantity
      itemLogs: itemLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Create Summary Sheet
    const summaryData = inventoryStats.map((item: any) => {
      let detectedUnit = 'Inches';
      if (item?.length && item?.width && item?.procure) {
        const sqFtFromInches = (Number(item.length) * Number(item.width)) / 144;
        if (Math.abs(sqFtFromInches - Number(item.procure)) < 0.05) {
          detectedUnit = 'Inches';
        } else if (Math.abs((Number(item.length) * Number(item.width)) - Number(item.procure)) < 0.05) {
          detectedUnit = 'Sq. Feet';
        } else if (item.unit === 'sq_ft' || item.unit === 'feet') {
          detectedUnit = 'Sq. Feet';
        }
      } else if (item?.unit === 'sq_ft' || item?.unit === 'feet') {
        detectedUnit = 'Sq. Feet';
      }

      return {
        'Date': new Date(item.createdAt).toLocaleDateString(),
        'Material Name': item.itemName || '',
        'Block No': item.blockNumber || 'N/A',
        'Unit': detectedUnit,
        'L x W x T': item.type !== 'consumable' ? `${item.length || 0} x ${item.width || 0} x ${item.thickness || 0}` : 'N/A',
        'Procure': `${item.procure.toFixed(2)}`,
        'Used': `${item.used.toFixed(2)}`,
        'Balance': `${item.balance.toFixed(2)}`
      };
    });
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    
    // Auto-size columns for Summary
    const wscolsSummary = [
      {wch: 12}, // Date
      {wch: 20}, // Material Name
      {wch: 10}, // Block No
      {wch: 10}, // Unit
      {wch: 20}, // L x W x T
      {wch: 15}, // Procure
      {wch: 15}, // Used
      {wch: 15}  // Balance
    ];
    summaryWs['!cols'] = wscolsSummary;
    
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // 2. Create a separate sheet for EACH block
    inventoryStats.forEach((item: any) => {
      let currentBalance = 0;
      
      const blockDataAoA = [
        ['Date', 'Project / Remarks', 'Available / IN (+)', 'OUT (-)', 'Balance']
      ];
      
      item.itemLogs.forEach((log: any) => {
        const previousBalance = currentBalance;
        if (log.type === 'IN') currentBalance += Number(log.quantity);
        else currentBalance -= Number(log.quantity);
        
        blockDataAoA.push([
          new Date(log.createdAt).toLocaleDateString(),
          log.remarks || '-',
          log.type === 'IN' ? `+ ${log.quantity.toFixed(2)} ${item.unit}` : `${previousBalance.toFixed(2)} ${item.unit}`,
          log.type === 'OUT' ? `- ${log.quantity.toFixed(2)} ${item.unit}` : '-',
          `${currentBalance.toFixed(2)} ${item.unit}`
        ]);
      });

      const blockWs = XLSX.utils.aoa_to_sheet(blockDataAoA);
      
      // Auto-size columns for Block Details
      const wscolsBlock = [
        {wch: 12}, // Date
        {wch: 40}, // Remarks
        {wch: 20}, // IN
        {wch: 15}, // OUT
        {wch: 20}  // Balance
      ];
      blockWs['!cols'] = wscolsBlock;

      const sheetName = `Block ${item.blockNumber || item.itemName.substring(0, 10)}`;
      
      // Ensure sheet name is unique and < 31 chars (Excel limit)
      let finalSheetName = sheetName.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
      
      try {
        XLSX.utils.book_append_sheet(wb, blockWs, finalSheetName);
      } catch (e) {
        // Fallback if duplicate sheet name
        XLSX.utils.book_append_sheet(wb, blockWs, `Item ${item.id.substring(0,5)}`);
      }
    });

    // Write file
    XLSX.writeFile(wb, `${decodedSupplier}_Full_Ledger.xlsx`);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, margin: '0 auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory')} sx={{ mb: 2, color: '#b8860b' }}>
        Back to Inventory
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>{pageTitle}</Typography>
          <Typography variant="subtitle1" color="text.secondary">Inventory Items Summary</Typography>
        </Box>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportExcel} color="primary" sx={{ fontWeight: 'bold' }}>
          Export Excel (All Data)
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Material Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Block No</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>L x W x T</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Procure</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>Used</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>Balance</TableCell>
              <TableCell sx={{ fontWeight: 'bold', align: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryStats.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">No items found.</TableCell></TableRow>
            ) : (
              inventoryStats.map((item: any) => {
                let detectedUnit = 'Inches';
                if (item?.length && item?.width && item?.procure) {
                  const sqFtFromInches = (Number(item.length) * Number(item.width)) / 144;
                  if (Math.abs(sqFtFromInches - Number(item.procure)) < 0.05) {
                    detectedUnit = 'Inches';
                  } else if (Math.abs((Number(item.length) * Number(item.width)) - Number(item.procure)) < 0.05) {
                    detectedUnit = 'Sq. Feet';
                  } else if (item.unit === 'sq_ft' || item.unit === 'feet') {
                    detectedUnit = 'Sq. Feet';
                  }
                } else if (item?.unit === 'sq_ft' || item?.unit === 'feet') {
                  detectedUnit = 'Sq. Feet';
                }

                return (
                <TableRow key={item.id} hover sx={{ cursor: 'pointer', transition: 'bgcolor 0.2s', '&:hover': { bgcolor: '#f5f5f5' } }} onClick={() => navigate(`/inventory/item/${item.id}`)}>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.blockNumber || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>
                    {detectedUnit}
                  </TableCell>
                  <TableCell>
                    {item.type !== 'consumable' 
                      ? `${item.length || 0} x ${item.width || 0} x ${item.thickness || 0}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {item.procure.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    {item.used.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {item.balance.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Button variant="outlined" size="small" endIcon={<VisibilityIcon />}>
                      View Ledger
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InventoryLedger;
