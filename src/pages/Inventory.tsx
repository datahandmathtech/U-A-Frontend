import React, { useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { useGetInventoryQuery } from '../store/apiSlice';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { data: inventory, isLoading } = useGetInventoryQuery();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const filteredInventory = inventory?.filter((item: any) => 
    activeTab === 0 ? item.jobWorkType === 'company' : item.jobWorkType === 'client'
  ) || [];

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
      ) : filteredInventory.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, bgcolor: '#FAFAFA', border: '1px dashed #CCC' }}>
          <Typography variant="h6" color="text.secondary">No materials found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F5F5F5' }}>
              <TableRow>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>{activeTab === 0 ? 'Vendor Name' : 'Client Name'}</strong></TableCell>
                <TableCell><strong>Material Name</strong></TableCell>
                <TableCell><strong>Block No</strong></TableCell>
                <TableCell><strong>L x W x T</strong></TableCell>
                <TableCell align="right"><strong>Quantity</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInventory.map((item: any) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold" color="primary.main">{item.supplier || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.blockNumber || '-'}</TableCell>
                  <TableCell>
                    {[item.length, item.width, item.thickness].filter(Boolean).join(' x ') || '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {item.quantity?.toFixed(2)} {item.unit}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Inventory;
