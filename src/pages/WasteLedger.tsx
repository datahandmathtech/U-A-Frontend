import React, { useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { useGetWasteMaterialsQuery } from '../store/apiSlice';

const WasteLedger = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  const { data: wasteMaterials, isLoading } = useGetWasteMaterialsQuery({ month: selectedMonth, year: selectedYear });

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  const years = ['2023', '2024', '2025', '2026', '2027'];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 4 }, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: { xs: 2.5, sm: 4 } }}>
        <Typography variant="h4" fontWeight="bold" color="#333">Waste Ledger</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 120 }, flex: { xs: '1 1 120px', sm: 'none' } }}>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value as string)}>
              {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 100 }, flex: { xs: '1 1 100px', sm: 'none' } }}>
            <InputLabel>Year</InputLabel>
            <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value as string)}>
              {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: '#F5F5F5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Date Generated</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Project Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Source Material</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Original Reserved</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Used (Pieces)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Waste Leftover</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
            ) : wasteMaterials?.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No waste materials recorded for this month.</TableCell></TableRow>
            ) : (
              wasteMaterials?.map((wm: any) => (
                <TableRow key={wm.id} hover>
                  <TableCell>{new Date(wm.addedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography fontWeight="bold" color="primary">{wm.project?.name || 'Direct Deduction'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>{wm.inventory?.itemName || 'Unknown'}</Typography>
                    <Typography variant="caption" color="text.secondary">{wm.inventory?.supplier}</Typography>
                  </TableCell>
                  <TableCell>{wm.quantity ? `${wm.quantity} Sq.Ft` : 'N/A'}</TableCell>
                  <TableCell>{wm.quantity ? `${wm.usedQuantity || 0} Sq.Ft` : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${wm.wasteQuantity} Sq.Ft`} 
                      color="error" 
                      variant="outlined" 
                      size="small" 
                      sx={{ fontWeight: 'bold', bgcolor: '#ffebee' }} 
                    />
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

export default WasteLedger;
