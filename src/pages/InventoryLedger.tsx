import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { useGetInventoryQuery, useGetInventoryLogsQuery } from '../store/apiSlice';

const InventoryLedger = () => {
  const { supplier } = useParams<{ supplier: string }>();
  const navigate = useNavigate();
  const decodedSupplier = decodeURIComponent(supplier || '');
  
  const { data: allInventory, isLoading: isLoadingInv } = useGetInventoryQuery();
  const { data: logs, isLoading: isLoadingLogs } = useGetInventoryLogsQuery(decodedSupplier);

  if (isLoadingInv || isLoadingLogs) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;

  // Filter inventory by supplier
  const supplierInventory = (allInventory || []).filter((item: any) => item.supplier === decodedSupplier);

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
      balance: item.quantity // Current quantity
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleExportCSV = () => {
    const headers = ['Date', 'Material Name', 'Block No', 'L x W x T', 'Procure', 'Used', 'Balance'];
    const rows = inventoryStats.map((item: any) => [
      new Date(item.createdAt).toLocaleDateString(),
      item.itemName || '',
      item.blockNumber || '',
      item.type !== 'consumable' ? `${item.length || 0} x ${item.width || 0} x ${item.thickness || 0}` : 'N/A',
      `${item.procure.toFixed(2)} ${item.unit}`,
      `${item.used.toFixed(2)} ${item.unit}`,
      `${item.balance.toFixed(2)} ${item.unit}`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(s => `"${s}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${decodedSupplier}_Inventory_Summary.csv`;
    link.click();
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, margin: '0 auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory')} sx={{ mb: 2, color: '#b8860b' }}>
        Back to Inventory
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>{decodedSupplier}</Typography>
          <Typography variant="subtitle1" color="text.secondary">Inventory Items Summary</Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} color="primary" sx={{ fontWeight: 'bold' }}>
          Export Excel
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Material Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Block No</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>L x W x T</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Procure</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>Used</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>Balance</TableCell>
              <TableCell sx={{ fontWeight: 'bold', align: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryStats.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">No items found for this supplier.</TableCell></TableRow>
            ) : (
              inventoryStats.map((item: any) => (
                <TableRow key={item.id} hover sx={{ cursor: 'pointer', transition: 'bgcolor 0.2s', '&:hover': { bgcolor: '#f5f5f5' } }} onClick={() => navigate(`/inventory/item/${item.id}`)}>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.blockNumber || 'N/A'}</TableCell>
                  <TableCell>
                    {item.type !== 'consumable' 
                      ? `${item.length || 0} x ${item.width || 0} x ${item.thickness || 0}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {item.procure.toFixed(2)} {item.unit}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    {item.used.toFixed(2)} {item.unit}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {item.balance.toFixed(2)} {item.unit}
                  </TableCell>
                  <TableCell align="center">
                    <Button variant="outlined" size="small" endIcon={<VisibilityIcon />}>
                      View Ledger
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InventoryLedger;
