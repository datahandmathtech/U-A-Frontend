import React, { useState, useRef } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Chip, IconButton, Button, TextField, Select, MenuItem, Dialog, 
  DialogTitle, DialogContent, Autocomplete, CircularProgress, FormControlLabel, 
  RadioGroup, Radio, Tooltip, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BoltIcon from '@mui/icons-material/Bolt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import { 
  useGetProjectsQuery, 
  useGetProjectMaterialsQuery, 
  useDeleteProjectMaterialMutation, 
  useReserveProjectMaterialMutation, 
  useCreateInventoryMutation 
} from '../store/apiSlice';

function generateBlockNumbers(startBlock: string, count: number): string[] {
  const trimmed = (startBlock || '').trim();
  if (!trimmed) {
    return Array.from({ length: count }, (_, i) => `Block ${i + 1}`);
  }
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const padLen = numStr.length;
    const startNum = parseInt(numStr, 10);
    return Array.from({ length: count }, (_, i) => {
      const currentNum = startNum + i;
      const formattedNum = padLen > 1 ? String(currentNum).padStart(padLen, '0') : String(currentNum);
      return `${prefix}${formattedNum}`;
    });
  }
  return Array.from({ length: count }, (_, i) => `${trimmed} - ${i + 1}`);
}

export const MaterialPlanningModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { data: projects } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projectMaterials, refetch: refetchMaterials, isLoading: materialsLoading } = useGetProjectMaterialsQuery(selectedProjectId || '', { skip: !selectedProjectId });
  const [deleteProjectMaterial] = useDeleteProjectMaterialMutation();
  const [reserveProjectMaterial] = useReserveProjectMaterialMutation();
  const [createInventory] = useCreateInventoryMutation();

  const [clientSlabs, setClientSlabs] = useState([
    { isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }
  ]);
  const [isReservingClientMaterial, setIsReservingClientMaterial] = useState(false);
  const isReservingRef = useRef(false);
  const isEditingRef = useRef(false);

  // Bulk Generator State
  const [bulkExpanded, setBulkExpanded] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    isUnnati: true,
    materialName: '',
    startBlockNo: '1',
    count: 20,
    unit: 'inch',
    length: '',
    width: '',
    thickness: ''
  });

  const selectedProject = projects?.find((p: any) => p.id === selectedProjectId);

  const handleApplyBulk = () => {
    const count = Math.max(1, Math.min(100, Number(bulkForm.count) || 1));
    const blockNos = generateBlockNumbers(bulkForm.startBlockNo, count);
    
    const newRows = blockNos.map((bNo) => ({
      isUnnati: bulkForm.isUnnati,
      unnatiId: '',
      unnatiQty: '',
      materialName: bulkForm.materialName || '',
      blockNo: bNo,
      unit: bulkForm.unit,
      length: bulkForm.length || '',
      width: bulkForm.width || '',
      thickness: bulkForm.thickness || ''
    }));

    if (clientSlabs.length === 1 && !clientSlabs[0].materialName && !clientSlabs[0].length && !clientSlabs[0].width) {
      setClientSlabs(newRows);
    } else {
      setClientSlabs([...clientSlabs, ...newRows]);
    }
  };

  const handleDuplicateRow = (idx: number) => {
    const row = clientSlabs[idx];
    const match = (row.blockNo || '').match(/^(.*?)(\d+)$/);
    let nextBlockNo = row.blockNo ? `${row.blockNo} (Copy)` : '';
    if (match) {
      const nextNum = parseInt(match[2], 10) + 1;
      const padLen = match[2].length;
      nextBlockNo = `${match[1]}${padLen > 1 ? String(nextNum).padStart(padLen, '0') : String(nextNum)}`;
    }
    const newRow = { ...row, blockNo: nextBlockNo };
    const newSlabs = [...clientSlabs];
    newSlabs.splice(idx + 1, 0, newRow);
    setClientSlabs(newSlabs);
  };

  const totalCalculatedSqFt = clientSlabs.reduce((acc, row) => {
    const l = Number(row.length || 0);
    const w = Number(row.width || 0);
    if (l <= 0 || w <= 0) return acc;
    const sqFt = row.unit === 'inch' ? (l * w) / 144 : (l * w);
    return acc + sqFt;
  }, 0);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth 
      slotProps={{ paper: { sx: { height: '92vh', borderRadius: 4, bgcolor: '#FAFAFA' } } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FFF', borderBottom: '1px solid #eee', py: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="900" color="#0F172A">Project Material Planning</Typography>
          <Typography variant="caption" color="text.secondary">Enter buy sheets, split multi-blocks, and reserve slab inventory</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ bgcolor: '#F1F5F9' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" color="#475569" mb={1} textTransform="uppercase" letterSpacing={0.5}>
          1. Select Active Project
        </Typography>
        <Autocomplete
          options={projects || []}
          getOptionLabel={(o: any) => `${o.projectId || o.name} ${o.clientName ? `(${o.clientName})` : ''}`}
          value={selectedProject || null}
          onChange={(_, val) => setSelectedProjectId(val ? val.id : null)}
          renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Search project name or client..." />}
          sx={{ mb: 3.5, maxWidth: 520, bgcolor: '#FFF', borderRadius: 2 }}
        />

        {selectedProjectId && (
          <Box>
            {/* RESERVED MATERIALS SECTION */}
            <Box sx={{ mb: 3.5 }}>
              <Typography variant="subtitle1" fontWeight="800" color="#0F172A" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Currently Reserved Materials
                {projectMaterials && projectMaterials.length > 0 && (
                  <Chip label={`${projectMaterials.length} Items`} size="small" sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }} />
                )}
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #E2E8F0', bgcolor: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>SOURCE</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>MATERIAL NAME</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>BLOCK NO.</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>UNIT</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>L x W x T</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>QTY (SQ.FT)</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>ACTIONS</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialsLoading ? (
                        <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} sx={{ my: 2 }} /></TableCell></TableRow>
                      ) : projectMaterials && projectMaterials.length > 0 ? projectMaterials.map((pm: any) => {
                        const inv = pm.inventory;
                        const qtyNum = Number(pm.quantity || 0);
                        let detectedUnit = 'Inches';
                        if (inv?.length && inv?.width && qtyNum) {
                          const sqFtFromInches = (Number(inv.length) * Number(inv.width)) / 144;
                          if (Math.abs(sqFtFromInches - qtyNum) < 0.05) {
                            detectedUnit = 'Inches';
                          } else if (Math.abs((Number(inv.length) * Number(inv.width)) - qtyNum) < 0.05) {
                            detectedUnit = 'Sq. Feet';
                          } else if (inv.unit === 'sq_ft' || inv.unit === 'feet') {
                            detectedUnit = 'Sq. Feet';
                          }
                        } else if (inv?.unit === 'sq_ft' || inv?.unit === 'feet') {
                          detectedUnit = 'Sq. Feet';
                        }

                        return (
                          <TableRow key={pm.id} hover>
                            <TableCell>
                              {pm.inventory?.jobWorkType === 'client' ? (
                                <Chip label="Client" size="small" color="info" variant="outlined" sx={{ fontWeight: 700 }} />
                              ) : (
                                <Chip label="Unnati Stock" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#0F172A' }}>{pm.inventory?.itemName}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{pm.inventory?.blockNumber || '-'}</TableCell>
                            <TableCell>
                              <Chip label={detectedUnit} size="small" sx={{ bgcolor: '#F1F5F9', color: '#334155', fontWeight: 600, fontSize: '0.72rem' }} />
                            </TableCell>
                            <TableCell>{[pm.inventory?.length, pm.inventory?.width, pm.inventory?.thickness].filter(Boolean).join(' x ') || '-'}</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#059669' }}>{qtyNum.toFixed(2)} Sq.Ft</TableCell>
                            <TableCell align="center">
                              <Button 
                                size="small" 
                                variant="text"
                                sx={{ mr: 1, textTransform: 'none', fontWeight: 700 }}
                                onClick={async () => {
                                  if (isEditingRef.current) return;
                                  isEditingRef.current = true;
                                  try {
                                    setClientSlabs([{
                                      materialName: pm.inventory?.itemName || '',
                                      blockNo: pm.inventory?.blockNumber || '',
                                      unit: detectedUnit === 'Inches' ? 'inch' : 'feet',
                                      length: pm.inventory?.length || '',
                                      width: pm.inventory?.width || '',
                                      thickness: pm.inventory?.thickness || '',
                                      isUnnati: pm.inventory?.jobWorkType !== 'client',
                                      unnatiId: '',
                                      unnatiQty: pm.quantity || ''
                                    }]);
                                    await deleteProjectMaterial({ projectId: selectedProjectId, materialId: pm.id }).unwrap();
                                    refetchMaterials();
                                  } finally {
                                    isEditingRef.current = false;
                                  }
                                }}
                              >
                                Edit
                              </Button>
                              <IconButton color="error" size="small" onClick={async () => {
                                await deleteProjectMaterial({ projectId: selectedProjectId, materialId: pm.id }).unwrap();
                                refetchMaterials();
                              }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow><TableCell colSpan={7} align="center"><Typography color="textSecondary" sx={{ py: 3, fontWeight: 500 }}>No materials reserved yet for this project.</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            {/* ADD NEW MATERIALS SECTION */}
            <Box sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3.5, bgcolor: '#FFF', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              
              {/* BULK BUY-SHEET GENERATOR ACCORDION */}
              <Accordion 
                expanded={bulkExpanded} 
                onChange={(_, isExp) => setBulkExpanded(isExp)}
                sx={{ 
                  mb: 3, 
                  bgcolor: '#FFFDF5', 
                  border: '1px solid #FDE68A', 
                  borderRadius: '12px !important',
                  '&:before': { display: 'none' },
                  boxShadow: 'none'
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#B45309' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <BoltIcon sx={{ color: '#D97706' }} />
                    <Typography fontWeight="800" color="#92400E" sx={{ fontSize: '0.95rem' }}>
                      ⚡ Quick Multi-Block Entry (Buy Sheet Auto-Generator)
                    </Typography>
                    <Chip label="e.g. 20 Blocks with same L x W" size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: '0.72rem' }} />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 2.5 }}>
                  <Typography variant="body2" color="#78350F" sx={{ mb: 2 }}>
                    Quickly add multiple blocks from supplier buy sheets where material, length, width, and thickness are identical.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)', md: 'repeat(8, 1fr)' }, gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Source</Typography>
                      <RadioGroup row value={bulkForm.isUnnati ? 'unnati' : 'client'} onChange={(e) => setBulkForm({ ...bulkForm, isUnnati: e.target.value === 'unnati' })}>
                        <FormControlLabel value="unnati" control={<Radio size="small" />} label="Unnati" sx={{ mr: 1, '& .MuiTypography-root': { fontSize: '0.8rem', fontWeight: 600 } }} />
                        <FormControlLabel value="client" control={<Radio size="small" />} label="Client" sx={{ '& .MuiTypography-root': { fontSize: '0.8rem', fontWeight: 600 } }} />
                      </RadioGroup>
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Material Name</Typography>
                      <TextField size="small" fullWidth placeholder="e.g. Lanka White" value={bulkForm.materialName} onChange={(e) => setBulkForm({ ...bulkForm, materialName: e.target.value })} />
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Start Block #</Typography>
                      <TextField size="small" fullWidth placeholder="e.g. 1 or BLK-1" value={bulkForm.startBlockNo} onChange={(e) => setBulkForm({ ...bulkForm, startBlockNo: e.target.value })} />
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Block Count</Typography>
                      <TextField size="small" type="number" fullWidth placeholder="20" value={bulkForm.count} onChange={(e) => setBulkForm({ ...bulkForm, count: Number(e.target.value) })} />
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Unit</Typography>
                      <Select size="small" fullWidth value={bulkForm.unit} onChange={(e) => setBulkForm({ ...bulkForm, unit: e.target.value })}>
                        <MenuItem value="inch">Inches</MenuItem>
                        <MenuItem value="feet">Sq. Feet</MenuItem>
                      </Select>
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Length (L)</Typography>
                      <TextField size="small" type="number" fullWidth placeholder="L" value={bulkForm.length} onChange={(e) => setBulkForm({ ...bulkForm, length: e.target.value })} />
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Width (W)</Typography>
                      <TextField size="small" type="number" fullWidth placeholder="W" value={bulkForm.width} onChange={(e) => setBulkForm({ ...bulkForm, width: e.target.value })} />
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight="bold" color="#64748B">Thick (MM)</Typography>
                      <TextField size="small" type="number" fullWidth placeholder="MM" value={bulkForm.thickness} onChange={(e) => setBulkForm({ ...bulkForm, thickness: e.target.value })} />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="contained" 
                      onClick={handleApplyBulk}
                      disabled={!bulkForm.materialName || !bulkForm.length || !bulkForm.width}
                      startIcon={<AddIcon />}
                      sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, fontWeight: 800, textTransform: 'none', px: 3, borderRadius: 2 }}
                    >
                      Generate {bulkForm.count || 20} Block Rows
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* TABLE HEADER & SUMMARY */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="900" color="#0F172A">Add Slabs / Blocks</Typography>
                  <Typography variant="caption" color="text.secondary">Review row by row or duplicate / break slabs as needed</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip 
                    label={`Total Blocks: ${clientSlabs.length}`} 
                    sx={{ bgcolor: '#F1F5F9', fontWeight: 800, color: '#334155' }} 
                  />
                  <Chip 
                    label={`Total Area: ${totalCalculatedSqFt.toFixed(2)} Sq.Ft`} 
                    sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 900, border: '1px solid #A7F3D0', fontSize: '0.85rem' }} 
                  />
                </Box>
              </Box>

              <TableContainer sx={{ mb: 3, border: '1px solid #E2E8F0', borderRadius: 2.5, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>SOURCE</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>MATERIAL NAME</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>BLOCK NO</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>UNIT</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>LENGTH</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>WIDTH</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>THICKNESS (MM)</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>TOTAL SQ.FT</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientSlabs.map((row, idx) => {
                      const len = Number(row.length || 0);
                      const wid = Number(row.width || 0);
                      const rowSqFt = row.unit === 'inch' ? (len * wid) / 144 : (len * wid);

                      return (
                        <TableRow key={idx} hover sx={{ bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                          <TableCell sx={{ py: 1.2 }}>
                            <RadioGroup row value={row.isUnnati ? 'unnati' : 'client'} onChange={(e) => {
                              const newSlabs = [...clientSlabs];
                              newSlabs[idx].isUnnati = e.target.value === 'unnati';
                              setClientSlabs(newSlabs);
                            }}>
                              <FormControlLabel value="unnati" control={<Radio size="small"/>} label="Unnati" sx={{ mr: 1, '& .MuiTypography-root': { fontSize: '0.8rem', fontWeight: 600 } }} />
                              <FormControlLabel value="client" control={<Radio size="small"/>} label="Client" sx={{ '& .MuiTypography-root': { fontSize: '0.8rem', fontWeight: 600 } }} />
                            </RadioGroup>
                          </TableCell>
                          <TableCell sx={{ py: 1.2 }}>
                            <TextField size="small" placeholder="e.g. Lanka White" value={row.materialName} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].materialName = e.target.value; setClientSlabs(newSlabs); }} />
                          </TableCell>
                          <TableCell sx={{ py: 1.2 }}>
                            <TextField size="small" placeholder="Block No" value={row.blockNo} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].blockNo = e.target.value; setClientSlabs(newSlabs); }} />
                          </TableCell>
                          <TableCell sx={{ py: 1.2 }}>
                            <Select size="small" value={row.unit} onChange={e => {
                              const newSlabs = [...clientSlabs];
                              newSlabs[idx].unit = e.target.value;
                              setClientSlabs(newSlabs);
                            }}>
                              <MenuItem value="inch">Inches</MenuItem>
                              <MenuItem value="feet">Sq. Feet</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell sx={{ py: 1.2 }}>
                            <TextField size="small" type="number" sx={{ width: 85 }} value={row.length} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].length = e.target.value; setClientSlabs(newSlabs); }} />
                          </TableCell>
                          <TableCell sx={{ py: 1.2 }}>
                            <TextField size="small" type="number" sx={{ width: 85 }} value={row.width} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].width = e.target.value; setClientSlabs(newSlabs); }} />
                          </TableCell>
                          <TableCell sx={{ py: 1.2 }}>
                            <TextField size="small" type="number" sx={{ width: 85 }} value={row.thickness} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].thickness = e.target.value; setClientSlabs(newSlabs); }} />
                          </TableCell>
                          <TableCell sx={{ py: 1.2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: rowSqFt > 0 ? '#059669' : '#94A3B8' }}>
                              {rowSqFt.toFixed(2)} Sq.Ft
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.2 }}>
                            <Tooltip title="Duplicate / Copy this Block Row">
                              <IconButton size="small" color="primary" onClick={() => handleDuplicateRow(idx)} sx={{ mr: 0.5 }}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Row">
                              <IconButton color="error" size="small" onClick={() => {
                                const newSlabs = clientSlabs.filter((_, i) => i !== idx);
                                setClientSlabs(newSlabs.length ? newSlabs : [{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
                              }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<AddIcon />}
                    onClick={() => setClientSlabs([...clientSlabs, { isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }])}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    + Add Single Row
                  </Button>
                  {clientSlabs.length > 1 && (
                    <Button 
                      variant="text" 
                      color="error" 
                      onClick={() => setClientSlabs([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }])}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Clear All Rows
                    </Button>
                  )}
                </Box>
                
                <Button 
                  variant="contained" 
                  disabled={isReservingClientMaterial || totalCalculatedSqFt <= 0} 
                  onClick={async () => {
                    if (isReservingRef.current) return;
                    isReservingRef.current = true;
                    setIsReservingClientMaterial(true);
                    try {
                      for (const row of clientSlabs) {
                        if (!row.materialName || !row.length || !row.width) continue;
                        const len = Number(row.length || 0);
                        const wid = Number(row.width || 0);
                        const qty = row.unit === 'inch' ? (len * wid) / 144 : (len * wid);
                        
                        const newItem = await createInventory({
                          type: 'slab', 
                          jobWorkType: row.isUnnati ? 'company' : 'client', 
                          itemName: row.materialName, 
                          blockNumber: row.blockNo, 
                          length: len, 
                          width: wid, 
                          thickness: Number(row.thickness) || 0,
                          quantity: qty, 
                          unit: 'sq_ft', 
                          supplier: row.isUnnati ? 'Unnati Arts' : (selectedProject?.clientName || 'Client')
                        }).unwrap();
                        
                        await reserveProjectMaterial({ 
                          projectId: selectedProjectId as string, 
                          data: { inventoryId: newItem.id, quantity: qty, cost: 0 } 
                        }).unwrap();
                      }
                      setClientSlabs([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
                      refetchMaterials();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      isReservingRef.current = false;
                      setIsReservingClientMaterial(false);
                    }
                  }}
                  sx={{ 
                    bgcolor: '#059669', 
                    '&:hover': { bgcolor: '#047857' }, 
                    fontWeight: 800, 
                    fontSize: '0.95rem',
                    textTransform: 'none', 
                    px: 4, 
                    py: 1.2, 
                    borderRadius: 2.5,
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
                  }}
                >
                  {isReservingClientMaterial ? 'Reserving Slabs...' : `Reserve Materials (${totalCalculatedSqFt.toFixed(2)} Sq.Ft)`}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

