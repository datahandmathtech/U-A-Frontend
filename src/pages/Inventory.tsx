import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, IconButton, Collapse } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useGetInventoryQuery } from '../store/apiSlice';

const InventoryRow = ({ supplier, items }: { supplier: string, items: any[] }) => {
  const [open, setOpen] = useState(false);

  // Group items by block number
  const blocks = useMemo(() => {
    const grouped = items.reduce((acc: any, item: any) => {
      const blockNo = item.blockNumber || 'No Block';
      if (!acc[blockNo]) acc[blockNo] = [];
      acc[blockNo].push(item);
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([blockNo, blockItems]: [string, any]) => {
      const totalPieces = blockItems.length;
      const totalQty = blockItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
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
  }, [items]);

  return (
    <React.Fragment>
      <TableRow 
        hover
        onClick={() => setOpen(!open)}
        sx={{ 
          cursor: 'pointer',
          '& > *': { borderBottom: 'unset' }, 
          bgcolor: open ? '#F4F6F8' : 'inherit',
          transition: 'background-color 0.2s',
        }}
      >
        <TableCell sx={{ py: 3 }}>
          <IconButton aria-label="expand row" size="small" disableRipple sx={{ pointerEvents: 'none' }}>
            {open ? <KeyboardArrowUpIcon color="primary" /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ py: 3 }}>
          <Typography fontWeight="bold" color="primary.main" sx={{ fontSize: '1.2rem' }}>
            {supplier}
          </Typography>
        </TableCell>
        <TableCell sx={{ py: 3 }}>
          <Typography fontWeight="500" sx={{ fontSize: '1.1rem', color: '#555' }}>{blocks.length} Blocks</Typography>
        </TableCell>
        <TableCell align="right" sx={{ py: 3 }}>
          <Typography fontWeight="bold" sx={{ fontSize: '1.1rem', color: '#333' }}>{items.length} Total Pieces</Typography>
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0, borderBottom: open ? '1px solid rgba(224, 224, 224, 1)' : 'none' }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 3, ml: 8, p: 3, bgcolor: '#FFFDF5', borderRadius: 3, border: '1px solid #E8E1D5', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ color: '#B38B36', mb: 2, fontWeight: 'bold' }}>
                Block Details
              </Typography>
              <Table size="medium" aria-label="purchases">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'transparent' }}>
                    <TableCell sx={{ borderBottom: '2px solid #E8E1D5' }}><strong>Date</strong></TableCell>
                    <TableCell sx={{ borderBottom: '2px solid #E8E1D5' }}><strong>Block No</strong></TableCell>
                    <TableCell sx={{ borderBottom: '2px solid #E8E1D5' }}><strong>L x W x T</strong></TableCell>
                    <TableCell align="center" sx={{ borderBottom: '2px solid #E8E1D5' }}><strong>Total Pieces</strong></TableCell>
                    <TableCell align="right" sx={{ borderBottom: '2px solid #E8E1D5' }}><strong>Total Quantity</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blocks.map((block: any, idx: number) => (
                    <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ py: 2 }}>
                        <Typography sx={{ fontSize: '1.05rem', color: '#555' }}>
                          {new Date(block.date).toLocaleDateString('en-GB')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography fontWeight="bold" sx={{ fontSize: '1.1rem' }}>{block.blockNo}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography sx={{ fontSize: '1.05rem' }}>
                          {[block.length, block.width, block.thickness].filter(Boolean).join(' x ') || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Typography fontWeight="500" sx={{ fontSize: '1.1rem' }}>{block.totalPieces}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 2 }}>
                        <Typography fontWeight="bold" sx={{ fontSize: '1.15rem', color: 'success.main' }}>
                          {block.totalQty?.toFixed(2)} {block.unit}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { data: inventory, isLoading } = useGetInventoryQuery();

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
                <TableCell width="50" />
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
              {Object.entries(groupedBySupplier).map(([supplier, items]: [string, any]) => (
                <InventoryRow key={supplier} supplier={supplier} items={items} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Inventory;
