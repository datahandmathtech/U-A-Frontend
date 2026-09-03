import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useGetInventoryQuery, useGetInventoryLogsQuery } from '../store/apiSlice';

import MaterialAllocation from './MaterialAllocation';

const MONTHS = [
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' }
];

const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  
  // Default to current FY and current Month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentFY = currentMonth >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  
  const [selectedFY, setSelectedFY] = useState<string>(currentFY);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(''); 

  const { data: inventory, isLoading } = useGetInventoryQuery();
  
  // Dialog state
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierItems, setSupplierItems] = useState<any[]>([]);

  const { data: supplierLogs, isLoading: isLoadingLogs } = useGetInventoryLogsQuery(selectedSupplier || '', { skip: !selectedSupplier });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const groupedBySupplier = useMemo(() => {
    if (!inventory) return {};
    let filtered = inventory.filter((item: any) => 
      activeTab === 0 ? item.jobWorkType === 'company' : item.jobWorkType === 'client'
    );

    // Apply FY and Month filter
    if (selectedFY && selectedMonth !== '') {
      const startYear = parseInt(selectedFY.split('-')[0]);
      const endYear = parseInt(selectedFY.split('-')[1]);
      
      // Determine the actual calendar year for the selected month
      // April (3) to Dec (11) fall in the startYear. Jan (0) to March (2) fall in endYear.
      const actualYear = selectedMonth >= 3 ? startYear : endYear;

      filtered = filtered.filter((item: any) => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getFullYear() === actualYear && itemDate.getMonth() === selectedMonth;
      });
    }

    return filtered.reduce((acc: any, item: any) => {
      const sup = item.supplier || 'Unknown';
      if (!acc[sup]) acc[sup] = [];
      acc[sup].push(item);
      return acc;
    }, {});
  }, [inventory, activeTab, selectedFY, selectedMonth]);

  const handleRowClick = (supplier: string, items: any[]) => {
    navigate(`/inventory/ledger/${encodeURIComponent(supplier)}`);
  };

  const handleCloseDialog = () => {
    setSelectedSupplier(null);
    setSupplierItems([]);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Inventory Management</Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>View Unnati Materials, Client Materials, and Allocations.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: '#FFF' }}>
            <InputLabel>Financial Year</InputLabel>
            <Select
              value={selectedFY}
              label="Financial Year"
              onChange={(e) => setSelectedFY(e.target.value)}
            >
              <MenuItem value="2024-2025">2024-2025</MenuItem>
              <MenuItem value="2025-2026">2025-2026</MenuItem>
              <MenuItem value="2026-2027">2026-2027</MenuItem>
              <MenuItem value="2027-2028">2027-2028</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: '#FFF' }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value=""><em>All Months</em></MenuItem>
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
          <Tab label="Unnati Material" sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2 }} />
          <Tab label="Client Material" sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2 }} />
          <Tab label="Material Allocation" sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2 }} />
        </Tabs>
      </Box>

      {activeTab === 2 ? (
        <MaterialAllocation />
      ) : isLoading ? (
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Loading inventory...</Typography>
      ) : Object.keys(groupedBySupplier).length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: '#FAFAFA', border: '2px dashed #E0E0E0' }}>
          <Typography variant="h5" color="text.secondary">No materials found for the selected filter.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
          <Table size="medium">
            <TableHead sx={{ bgcolor: '#F5F5F5' }}>
              <TableRow>
                <TableCell sx={{ py: 2.5 }}>
                  <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                    {activeTab === 0 ? 'Vendor Name' : 'Client Name'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 2.5 }}>
                  <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>Date (Latest)</Typography>
                </TableCell>
                <TableCell sx={{ py: 2.5 }}>
                  <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>Total Blocks</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 2.5 }}>
                  <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>Total Pieces</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(groupedBySupplier).map(([supplier, items]: [string, any]) => {
                const latestDate = items.reduce((latest: Date, item: any) => {
                  const itemDate = new Date(item.createdAt);
                  return itemDate > latest ? itemDate : latest;
                }, new Date(0));
                
                const uniqueBlocks = new Set(items.map((i: any) => i.blockNumber || 'No Block')).size;

                return (
                  <TableRow 
                    key={supplier} 
                    hover 
                    onClick={() => handleRowClick(supplier, items)}
                    sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                  >
                    <TableCell sx={{ py: 3 }}>
                      <Typography fontWeight="bold" color="primary.main" sx={{ fontSize: '1.2rem' }}>
                        {supplier}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Typography sx={{ fontSize: '1.05rem', color: '#555' }}>
                        {latestDate.toLocaleDateString('en-GB')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Typography fontWeight="500" sx={{ fontSize: '1.1rem', color: '#555' }}>
                        {uniqueBlocks} Blocks
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 3 }}>
                      <Typography fontWeight="bold" sx={{ fontSize: '1.1rem', color: '#333' }}>
                        {items.length} Total Pieces
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Details Dialog */}
      <Dialog 
        open={Boolean(selectedSupplier)} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, minHeight: '60vh', bgcolor: '#FAFAFA' } }}
      >
        <DialogTitle sx={{ bgcolor: '#FFF', borderBottom: '1px solid #E0E0E0', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              {selectedSupplier}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Material Ledger (In / Out History)
            </Typography>
          </Box>
          <IconButton onClick={handleCloseDialog} size="large" sx={{ bgcolor: '#F5F5F5' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {isLoadingLogs ? (
            <Typography align="center" sx={{ mt: 5 }}>Loading ledger...</Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3 }}>
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                    <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Date</strong></TableCell>
                    <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Material Name</strong></TableCell>
                    <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Block No</strong></TableCell>
                    <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>L x W x T</strong></TableCell>
                    <TableCell align="center" sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>IN (+)</strong></TableCell>
                    <TableCell align="center" sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>OUT (-)</strong></TableCell>
                    <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Remarks</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplierLogs?.map((log: any, idx: number) => {
                    const item = log.inventory || {};
                    return (
                      <TableRow key={log.id || idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography sx={{ fontSize: '1.05rem', color: '#555' }}>
                            {new Date(log.createdAt).toLocaleDateString('en-GB')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography fontWeight="500" sx={{ fontSize: '1.05rem' }}>{item.itemName || '-'}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>{item.blockNumber || '-'}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography sx={{ fontSize: '1.05rem' }}>
                            {[item.length, item.width, item.thickness].filter(Boolean).join(' x ') || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          {log.type === 'IN' ? (
                            <Typography fontWeight="bold" sx={{ fontSize: '1.15rem', color: 'success.main' }}>
                              + {log.quantity.toFixed(2)} {item.unit}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          {log.type === 'OUT' ? (
                            <Typography fontWeight="bold" sx={{ fontSize: '1.15rem', color: 'error.main' }}>
                              - {log.quantity.toFixed(2)} {item.unit}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography sx={{ fontSize: '1.05rem', color: '#666' }}>{log.remarks || '-'}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#FFF', borderTop: '1px solid #E0E0E0' }}>
          <Button variant="outlined" size="large" onClick={handleCloseDialog} sx={{ borderRadius: 2, px: 4 }}>
            Close Window
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
