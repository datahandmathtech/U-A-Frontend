import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useGetInventoryQuery } from '../store/apiSlice';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { data: inventory, isLoading } = useGetInventoryQuery();
  
  // Dialog state
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierItems, setSupplierItems] = useState<any[]>([]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const groupedBySupplier = useMemo(() => {
    if (!inventory) return {};
    const filtered = inventory.filter((item: any) => 
      activeTab === 0 ? item.jobWorkType === 'company' : item.jobWorkType === 'client'
    );
    return filtered.reduce((acc: any, item: any) => {
      const sup = item.supplier || 'Unknown';
      if (!acc[sup]) acc[sup] = [];
      acc[sup].push(item);
      return acc;
    }, {});
  }, [inventory, activeTab]);

  const handleRowClick = (supplier: string, items: any[]) => {
    setSelectedSupplier(supplier);
    setSupplierItems(items);
  };

  const handleCloseDialog = () => {
    setSelectedSupplier(null);
    setSupplierItems([]);
  };

  // Group items inside the dialog by block number
  const blocksForDialog = useMemo(() => {
    if (!supplierItems.length) return [];
    const grouped = supplierItems.reduce((acc: any, item: any) => {
      const blockNo = item.blockNumber || 'No Block';
      if (!acc[blockNo]) acc[blockNo] = [];
      acc[blockNo].push(item);
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([blockNo, blockItems]: [string, any]) => {
      const totalPieces = blockItems.length;
      const totalQty = blockItems.reduce((sum: number, i: any) => sum + (i.inCurrentFY || i.quantity || 0), 0);
      const first = blockItems[0];
      return {
        blockNo,
        totalPieces,
        totalQty,
        unit: first.unit,
        length: first.length,
        width: first.width,
        thickness: first.thickness,
        date: first.createdAt
      };
    });
  }, [supplierItems]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Inventory Management</Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>View Unnati Materials and Client Materials.</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
          <Tab label="Unnati Material" sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2 }} />
          <Tab label="Client Material" sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2 }} />
        </Tabs>
      </Box>

      {isLoading ? (
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Loading inventory...</Typography>
      ) : Object.keys(groupedBySupplier).length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: '#FAFAFA', border: '2px dashed #E0E0E0' }}>
          <Typography variant="h5" color="text.secondary">No materials found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
          <Table size="medium">
            <TableHead sx={{ bgcolor: '#F5F5F5' }}>
              <TableRow>
                <TableCell sx={{ py: 2.5 }}>
                  <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>Date</Typography>
                </TableCell>
                <TableCell sx={{ py: 2.5 }}>
                  <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                    {activeTab === 0 ? 'Vendor Name' : 'Client Name'}
                  </Typography>
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
                // Determine the latest date for this supplier
                const latestDate = items.reduce((latest: Date, item: any) => {
                  const itemDate = new Date(item.createdAt);
                  return itemDate > latest ? itemDate : latest;
                }, new Date(0));
                
                // Count unique blocks
                const uniqueBlocks = new Set(items.map((i: any) => i.blockNumber || 'No Block')).size;

                return (
                  <TableRow 
                    key={supplier} 
                    hover 
                    onClick={() => handleRowClick(supplier, items)}
                    sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                  >
                    <TableCell sx={{ py: 3 }}>
                      <Typography sx={{ fontSize: '1.05rem', color: '#555' }}>
                        {latestDate.toLocaleDateString('en-GB')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Typography fontWeight="bold" color="primary.main" sx={{ fontSize: '1.2rem' }}>
                        {supplier}
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

      {/* Details Dialog / Page Modal */}
      <Dialog 
        open={Boolean(selectedSupplier)} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, minHeight: '60vh', bgcolor: '#FAFAFA' } }}
      >
        <DialogTitle sx={{ bgcolor: '#FFF', borderBottom: '1px solid #E0E0E0', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              {selectedSupplier}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Material Details Overview
            </Typography>
          </Box>
          <IconButton onClick={handleCloseDialog} size="large" sx={{ bgcolor: '#F5F5F5' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3 }}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                  <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Date</strong></TableCell>
                  <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Block No</strong></TableCell>
                  <TableCell sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>L x W x T</strong></TableCell>
                  <TableCell align="center" sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Total Pieces</strong></TableCell>
                  <TableCell align="right" sx={{ py: 2, borderBottom: '2px solid #E8E1D5' }}><strong>Total Quantity</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {blocksForDialog.map((block: any, idx: number) => (
                  <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography sx={{ fontSize: '1.05rem', color: '#555' }}>
                        {new Date(block.date).toLocaleDateString('en-GB')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>{block.blockNo}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography sx={{ fontSize: '1.05rem' }}>
                        {[block.length, block.width, block.thickness].filter(Boolean).join(' x ') || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2.5 }}>
                      <Typography fontWeight="500" sx={{ fontSize: '1.1rem' }}>{block.totalPieces}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.5 }}>
                      <Typography fontWeight="bold" sx={{ fontSize: '1.15rem', color: 'success.main' }}>
                        {block.totalQty?.toFixed(2)} {block.unit}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
