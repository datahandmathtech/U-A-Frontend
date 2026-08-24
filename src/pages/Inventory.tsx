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
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: open ? '#F4F6F8' : 'inherit' }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Typography fontWeight="bold" color="primary.main" sx={{ fontSize: '1.1rem' }}>
            {supplier}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography fontWeight="500">{blocks.length} Blocks</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography fontWeight="bold">{items.length} Total Pieces</Typography>
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, ml: 6 }}>
              <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: 'text.secondary', mb: 2 }}>
                Block Details
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead sx={{ bgcolor: '#FFFDF5' }}>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Block No</strong></TableCell>
                    <TableCell><strong>L x W x T</strong></TableCell>
                    <TableCell align="center"><strong>Total Pieces</strong></TableCell>
                    <TableCell align="right"><strong>Total Quantity</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blocks.map((block: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(block.date).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell><Typography fontWeight="bold">{block.blockNo}</Typography></TableCell>
                      <TableCell>
                        {[block.length, block.width, block.thickness].filter(Boolean).join(' x ') || '-'}
                      </TableCell>
                      <TableCell align="center">{block.totalPieces}</TableCell>
                      <TableCell align="right">{block.totalQty?.toFixed(2)} {block.unit}</TableCell>
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Inventory Management</Typography>
        <Typography variant="body2" color="textSecondary">View Unnati Materials and Client Materials.</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
          <Tab label="Unnati Material" sx={{ fontWeight: 'bold', fontSize: '1.05rem' }} />
          <Tab label="Client Material" sx={{ fontWeight: 'bold', fontSize: '1.05rem' }} />
        </Tabs>
      </Box>

      {isLoading ? (
        <Typography>Loading inventory...</Typography>
      ) : Object.keys(groupedBySupplier).length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, bgcolor: '#FAFAFA', border: '1px dashed #CCC' }}>
          <Typography variant="h6" color="text.secondary">No materials found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F5F5F5' }}>
              <TableRow>
                <TableCell width="50" />
                <TableCell><strong>{activeTab === 0 ? 'Vendor Name' : 'Client Name'}</strong></TableCell>
                <TableCell><strong>Total Blocks</strong></TableCell>
                <TableCell align="right"><strong>Total Pieces</strong></TableCell>
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
