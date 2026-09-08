import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Tabs, Tab, Dialog, DialogTitle, DialogContent, 
  DialogActions, Button, IconButton, FormControl, InputLabel, Select, 
  MenuItem, Grid, Chip, Avatar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useGetInventoryQuery, useGetInventoryLogsQuery, useGetProjectsQuery } from '../store/apiSlice';
import { MaterialPlanningModal } from '../components/MaterialPlanningModal';

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
  const [planningModalOpen, setPlanningModalOpen] = useState(false);
  
  // Default to current FY and current Month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentFY = currentMonth >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  
  const [selectedFY, setSelectedFY] = useState<string>(currentFY);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(''); 

  const { data: inventory, isLoading } = useGetInventoryQuery();
  const { data: projects } = useGetProjectsQuery();
  
  // Dialog state
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierItems, setSupplierItems] = useState<any[]>([]);

  const { data: supplierLogs, isLoading: isLoadingLogs } = useGetInventoryLogsQuery(selectedSupplier || '', { skip: !selectedSupplier });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const filteredMaterials = useMemo(() => {
    if (!inventory) return [];
    let filtered = inventory.filter((item: any) => 
      activeTab === 0 ? item.jobWorkType === 'company' : item.jobWorkType === 'client'
    );

    // Apply FY and Month filter
    if (selectedFY && selectedMonth !== '') {
      const startYear = parseInt(selectedFY.split('-')[0]);
      const endYear = parseInt(selectedFY.split('-')[1]);
      const actualYear = selectedMonth >= 3 ? startYear : endYear;

      filtered = filtered.filter((item: any) => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getFullYear() === actualYear && itemDate.getMonth() === selectedMonth;
      });
    }

    return filtered;
  }, [inventory, activeTab, selectedFY, selectedMonth]);

  const supplierRows = useMemo(() => {
    const map = filteredMaterials.reduce((acc: any, item: any) => {
      // Resolve client name for both tabs
      const pRel = item.projectMaterials?.[0]?.project || item.slabs?.[0]?.project;
      let matchedClient = pRel?.clientName;
      if (!matchedClient && projects && item.supplier) {
        const matchedProj = projects.find(
          (p: any) =>
            (p.clientName && p.clientName.trim().toLowerCase() === item.supplier.trim().toLowerCase()) ||
            (p.name && p.name.trim().toLowerCase() === item.supplier.trim().toLowerCase())
        );
        if (matchedProj?.clientName) {
          matchedClient = matchedProj.clientName;
        }
      }

      const clientName = matchedClient || item.supplier || (activeTab === 0 ? 'Unnati Arts' : 'Unknown Client');
      const key = clientName.trim().toLowerCase();
      const displayName = clientName;
      const ledgerIdentifier = clientName;

      if (!acc[key]) {
        acc[key] = {
          key,
          displayName,
          ledgerIdentifier,
          items: [],
          latestDate: item.createdAt,
          totalQty: 0
        };
      }
      acc[key].items.push(item);
      acc[key].totalQty += (item.quantity || 0);
      if (new Date(item.createdAt).getTime() > new Date(acc[key].latestDate).getTime()) {
        acc[key].latestDate = item.createdAt;
      }
      return acc;
    }, {});

    return Object.values(map).sort((a: any, b: any) => 
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  }, [filteredMaterials, activeTab, projects]);

  const totalPiecesCount = filteredMaterials.length;
  const totalStockQuantity = filteredMaterials.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);

  const handleCloseDialog = () => {
    setSelectedSupplier(null);
    setSupplierItems([]);
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 0, sm: 0.5, md: 1 } }}>
      {/* 1. EXECUTIVE HEADER & CONTROLS */}
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              Inventory Management
            </Typography>
            <Chip 
              label="Stock Vault" 
              size="small" 
              sx={{ 
                bgcolor: '#FFFDF5', 
                color: '#B38B36', 
                border: '1px solid #C89F5A', 
                fontWeight: 800, 
                fontSize: '0.72rem',
                borderRadius: 1.5 
              }} 
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
            Track factory raw material stock, company inventory slabs, and client job-work batches.
          </Typography>
        </Box>

        {/* Action Button & Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            startIcon={<AssignmentIcon />} 
            onClick={() => setPlanningModalOpen(true)}
            sx={{ 
              fontWeight: 800, 
              py: 1, 
              px: 2.5,
              borderRadius: 2.5,
              textTransform: 'none',
              fontSize: '0.88rem',
              bgcolor: '#059669',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            Material Planning
          </Button>

          <FormControl size="small" sx={{ minWidth: 140, bgcolor: '#FFF' }}>
            <InputLabel sx={{ fontSize: '0.82rem', fontWeight: 600 }}>Financial Year</InputLabel>
            <Select
              value={selectedFY}
              label="Financial Year"
              onChange={(e) => setSelectedFY(e.target.value)}
              sx={{ borderRadius: 2, fontSize: '0.85rem' }}
            >
              <MenuItem value="2024-2025">2024-2025</MenuItem>
              <MenuItem value="2025-2026">2025-2026</MenuItem>
              <MenuItem value="2026-2027">2026-2027</MenuItem>
              <MenuItem value="2027-2028">2027-2028</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130, bgcolor: '#FFF' }}>
            <InputLabel sx={{ fontSize: '0.82rem', fontWeight: 600 }}>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ borderRadius: 2, fontSize: '0.85rem' }}
            >
              <MenuItem value=""><em>All Months</em></MenuItem>
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* 2. KPI SUMMARY METRIC CARDS */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', width: 44, height: 44 }}>
              <LayersRoundedIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tracked Stock Batches
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.2 }}>
                {supplierRows.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#FFFDF5', color: '#B38B36', width: 44, height: 44 }}>
              <Inventory2RoundedIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Items / Slabs
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.2 }}>
                {totalPiecesCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 44, height: 44 }}>
              <BusinessRoundedIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Available Stock
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#059669', mt: 0.2 }}>
                {totalStockQuantity.toLocaleString('en-IN')} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Units / Sq.Ft</span>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. LUXURY TABS NAVIGATION */}
      <Paper elevation={0} sx={{ p: 0.75, borderRadius: 3, bgcolor: '#F1F5F9', mb: 3, display: 'inline-flex', border: '1px solid #E2E8F0' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          textColor="inherit"
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{ minHeight: 'unset' }}
        >
          <Tab 
            label="Unnati Material Stock" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '0.85rem', 
              py: 1, 
              px: 2.5,
              minHeight: 'unset',
              textTransform: 'none',
              borderRadius: 2.5,
              transition: 'all 0.15s ease',
              color: activeTab === 0 ? '#FFFFFF !important' : '#64748B',
              bgcolor: activeTab === 0 ? '#0F172A' : 'transparent',
              boxShadow: activeTab === 0 ? '0 2px 8px rgba(15, 23, 42, 0.15)' : 'none'
            }} 
          />
          <Tab 
            label="Client Material (Job Work)" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '0.85rem', 
              py: 1, 
              px: 2.5,
              minHeight: 'unset',
              textTransform: 'none',
              borderRadius: 2.5,
              transition: 'all 0.15s ease',
              color: activeTab === 1 ? '#FFFFFF !important' : '#64748B',
              bgcolor: activeTab === 1 ? '#0F172A' : 'transparent',
              boxShadow: activeTab === 1 ? '0 2px 8px rgba(15, 23, 42, 0.15)' : 'none'
            }} 
          />
        </Tabs>
      </Paper>

      {/* 4. DATA TABLE */}
      {isLoading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600 }}>Loading inventory records...</Typography>
        </Box>
      ) : supplierRows.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3.5, bgcolor: '#FFFFFF', border: '1px dashed #CBD5E1' }}>
          <Inventory2RoundedIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
            No materials found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            No inventory matches the selected filter for {activeTab === 0 ? 'Unnati Stock' : 'Client Material'}.
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3.5, overflow: 'hidden', bgcolor: '#FFFFFF', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2 }}>
                    Latest Entry Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2 }}>
                    {activeTab === 0 ? 'Category / Project Identifier' : 'Client / Project Name'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2 }}>
                    Total Items
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2 }}>
                    Available Stock
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supplierRows.map((row: any, idx: number) => {
                  return (
                    <TableRow 
                      key={row.key} 
                      hover 
                      onClick={() => navigate(`/inventory/ledger/${encodeURIComponent(row.ledgerIdentifier)}`)}
                      sx={{ 
                        cursor: 'pointer', 
                        transition: 'background-color 0.15s ease',
                        bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        '&:hover': { bgcolor: '#F1F5F9' }
                      }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                          <Typography sx={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                            {new Date(row.latestDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                          {row.displayName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip 
                          label={`${row.items.length} ${row.items.length === 1 ? 'Piece' : 'Pieces'}`}
                          size="small"
                          sx={{ 
                            bgcolor: '#EFF6FF', 
                            color: '#1D4ED8', 
                            fontWeight: 700, 
                            fontSize: '0.75rem', 
                            borderRadius: 1.5,
                            border: '1px solid #DBEAFE'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography sx={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem' }}>
                          {row.totalQty.toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Units</span>
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />}
                          sx={{ 
                            borderRadius: 2, 
                            textTransform: 'none', 
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            borderColor: '#CBD5E1',
                            color: '#0F172A',
                            '&:hover': { borderColor: '#B38B36', bgcolor: '#FFFDF5' }
                          }}
                        >
                          View Ledger
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 5. DETAILS DIALOG */}
      <Dialog 
        open={Boolean(selectedSupplier)} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, minHeight: '60vh', bgcolor: '#FAFAFA' } } }}
      >
        <DialogTitle sx={{ bgcolor: '#FFF', borderBottom: '1px solid #E2E8F0', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="#0F172A">
              {selectedSupplier}
            </Typography>
            <Typography variant="body2" color="#64748B" sx={{ mt: 0.5 }}>
              Material Ledger (In / Out History)
            </Typography>
          </Box>
          <IconButton onClick={handleCloseDialog} size="large" sx={{ bgcolor: '#F8FAFC' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {isLoadingLogs ? (
            <Typography align="center" sx={{ mt: 5 }}>Loading ledger...</Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
              <Table size="medium">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ py: 2, fontWeight: 800, color: '#475569' }}>Date</TableCell>
                    <TableCell sx={{ py: 2, fontWeight: 800, color: '#475569' }}>Material Name</TableCell>
                    <TableCell sx={{ py: 2, fontWeight: 800, color: '#475569' }}>Block No</TableCell>
                    <TableCell sx={{ py: 2, fontWeight: 800, color: '#475569' }}>L x W x T</TableCell>
                    <TableCell align="center" sx={{ py: 2, fontWeight: 800, color: '#475569' }}>IN (+)</TableCell>
                    <TableCell align="center" sx={{ py: 2, fontWeight: 800, color: '#475569' }}>OUT (-)</TableCell>
                    <TableCell sx={{ py: 2, fontWeight: 800, color: '#475569' }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplierLogs?.map((log: any, idx: number) => {
                    const item = log.inventory || {};
                    return (
                      <TableRow key={log.id || idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography sx={{ fontSize: '0.9rem', color: '#555' }}>
                            {new Date(log.createdAt).toLocaleDateString('en-GB')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography fontWeight="700" sx={{ fontSize: '0.92rem', color: '#0F172A' }}>{item.itemName || '-'}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography fontWeight="bold" sx={{ fontSize: '0.92rem' }}>{item.blockNumber || '-'}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography sx={{ fontSize: '0.88rem', color: '#475569' }}>
                            {[item.length, item.width, item.thickness].filter(Boolean).join(' x ') || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          {log.type === 'IN' ? (
                            <Typography fontWeight="bold" sx={{ fontSize: '0.95rem', color: '#059669' }}>
                              + {log.quantity.toFixed(2)} {item.unit}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          {log.type === 'OUT' ? (
                            <Typography fontWeight="bold" sx={{ fontSize: '0.95rem', color: '#DC2626' }}>
                              - {log.quantity.toFixed(2)} {item.unit}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography sx={{ fontSize: '0.88rem', color: '#64748B' }}>{log.remarks || '-'}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#FFF', borderTop: '1px solid #E2E8F0' }}>
          <Button variant="outlined" size="large" onClick={handleCloseDialog} sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 700 }}>
            Close Window
          </Button>
        </DialogActions>
      </Dialog>
      
      {planningModalOpen && (
        <MaterialPlanningModal open={planningModalOpen} onClose={() => setPlanningModalOpen(false)} />
      )}
    </Box>
  );
};

export default Inventory;
