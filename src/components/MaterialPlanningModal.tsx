import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import * as XLSX from 'xlsx';
import { 
  useGetProjectsQuery, 
  useGetProjectMaterialsQuery, 
  useGetInventoryQuery,
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

export const MaterialPlanningModal: React.FC<{ open: boolean; onClose: () => void; initialProjectId?: string }> = ({ open, onClose, initialProjectId }) => {
  const navigate = useNavigate();
  const { data: projects } = useGetProjectsQuery();
  const { data: allInventory, refetch: refetchInventory } = useGetInventoryQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);

  React.useEffect(() => {
    if (open && initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [open, initialProjectId]);

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

  // Strict Client Material Isolation: only display materials strictly belonging to or reserved for this client/project
  const displayedMaterials = useMemo(() => {
    const reservedList = Array.isArray(projectMaterials) ? projectMaterials.filter((pm: any) => pm.inventory) : [];

    if (!selectedProject) return reservedList;
    const pName = (selectedProject.name || '').trim().toLowerCase();
    const pClient = (selectedProject.clientName || '').trim().toLowerCase();

    const matchedInv = (allInventory || []).filter((item: any) => {
      const sup = (item.supplier || '').trim().toLowerCase();
      // Only match if supplier explicitly matches this client's name (and isn't generic company stock)
      if (pClient && pClient !== 'unnati arts' && sup === pClient) return true;
      if (pName && sup === pName) return true;
      if (Array.isArray(item.projectMaterials) && item.projectMaterials.some((pm: any) => pm.projectId === selectedProjectId || pm.project?.id === selectedProjectId)) return true;
      if (Array.isArray(item.slabs) && item.slabs.some((s: any) => s.projectId === selectedProjectId || s.project?.id === selectedProjectId)) return true;
      return false;
    });

    if (reservedList.length > 0) {
      const reservedInvIds = new Set(reservedList.map((pm: any) => (pm.inventory?.id || pm.inventoryId)?.toString()).filter(Boolean));
      const extraMatched = matchedInv.filter((inv: any) => !reservedInvIds.has(inv.id?.toString())).map((inv: any) => ({
        id: `inv_${inv.id}`,
        projectId: selectedProjectId,
        inventoryId: inv.id,
        quantity: inv.quantity,
        procure: inv.procure || inv.quantity || 0,
        used: inv.used || 0,
        balance: inv.quantity || 0,
        addedAt: inv.createdAt,
        inventory: inv
      }));
      return [...reservedList, ...extraMatched];
    }

    // STRICT ISOLATION: Never fall back to company stock or other clients' items!
    return matchedInv.map((inv: any) => ({
      id: `inv_${inv.id}`,
      projectId: selectedProjectId,
      inventoryId: inv.id,
      quantity: inv.quantity,
      procure: inv.procure || inv.quantity || 0,
      used: inv.used || 0,
      balance: inv.quantity || 0,
      addedAt: inv.createdAt,
      inventory: inv
    }));
  }, [projectMaterials, allInventory, selectedProject, selectedProjectId]);

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
      slotProps={{ paper: { sx: { height: { xs: '94dvh', md: '92vh' }, borderRadius: { xs: 2.5, sm: 4 }, bgcolor: '#FAFAFA' } } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, bgcolor: '#FFF', borderBottom: '1px solid #eee', py: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" fontWeight="900" color="#0F172A">Project Material Planning</Typography>
          <Typography variant="caption" color="text.secondary">Enter buy sheets, split multi-blocks, and reserve slab inventory</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ bgcolor: '#F1F5F9' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 1.5, sm: 3, md: 3.5 } }}>
        {initialProjectId ? (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 3,
              border: '1.5px solid #BAE6FD',
              bgcolor: '#F0F9FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {selectedProject?.projectId && (
                <Chip
                  label={selectedProject.projectId}
                  sx={{
                    fontWeight: 900,
                    bgcolor: '#FFF',
                    color: '#0284C7',
                    border: '1.5px solid #0284C7',
                    borderRadius: 1.5,
                    fontSize: '0.82rem',
                    height: 28
                  }}
                />
              )}
              <Box>
                <Typography variant="h6" fontWeight="900" color="#0F172A" sx={{ lineHeight: 1.2 }}>
                  {selectedProject?.name || 'Client Project Material Planning'}
                </Typography>
                {selectedProject?.clientName && (
                  <Typography variant="body2" sx={{ color: '#0369A1', fontWeight: 700, mt: 0.3 }}>
                    Client: {selectedProject.clientName}
                  </Typography>
                )}
              </Box>
            </Box>
            <Chip
              label="Direct Client Material Planning"
              color="info"
              sx={{ fontWeight: 800, bgcolor: '#E0F2FE', color: '#0369A1', borderRadius: 2 }}
            />
          </Paper>
        ) : (
          <Box sx={{ mb: 3.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#475569', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1. Select Active Project
            </Typography>
            <Autocomplete
              options={projects || []}
              getOptionLabel={(o: any) => {
                const code = o.projectId ? `${o.projectId}` : '';
                const name = o.name || '';
                const client = o.clientName ? `(${o.clientName})` : '';
                if (code && name && name.toLowerCase() !== code.toLowerCase()) {
                  return `${code} - ${name} ${client}`.trim();
                }
                return `${code || name} ${client}`.trim();
              }}
              renderOption={(props, o: any) => {
                const { key, ...restProps } = props as any;
                return (
                  <li key={key} {...restProps}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, py: 0.4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {o.projectId && (
                          <Chip
                            label={o.projectId}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              height: 20,
                              bgcolor: '#FFF7ED',
                              color: '#C2410C',
                              border: '1px solid #FFEDD5',
                              borderRadius: 1
                            }}
                          />
                        )}
                        <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                          {o.name || 'Unnamed Project'}
                        </Typography>
                      </Box>
                      {o.clientName && (
                        <Typography sx={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, pl: o.projectId ? 0.5 : 0 }}>
                          Client: {o.clientName}
                        </Typography>
                      )}
                    </Box>
                  </li>
                );
              }}
              value={selectedProject || null}
              onChange={(_, val) => setSelectedProjectId(val ? val.id : null)}
              renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Search project name, ID, or client..." />}
              sx={{ maxWidth: 520, bgcolor: '#FFF', borderRadius: 2 }}
            />
          </Box>
        )}

        {selectedProjectId && (
          <Box>
            {/* RESERVED MATERIALS & STOCK LEDGER SECTION */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight="800" color="#0F172A" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Currently Reserved Materials & Stock Ledger
                  {displayedMaterials && displayedMaterials.length > 0 && (
                    <Chip label={`${displayedMaterials.length} Items`} size="small" sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }} />
                  )}
                </Typography>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={() => {
                    const ledgerKey = selectedProject?.clientName || selectedProject?.name || 'Unnati Arts (Raw Stock)';
                    onClose();
                    navigate(`/inventory/ledger/${encodeURIComponent(ledgerKey)}`);
                  }}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, borderColor: '#0284C7', color: '#0284C7' }}
                >
                  Open Full Inventory Summary
                </Button>
              </Box>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #E2E8F0', bgcolor: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>DATE</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>SOURCE</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>MATERIAL NAME</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>BLOCK NO.</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>UNIT</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>L x W x T</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#0284C7', fontSize: '0.75rem' }}>PROCURE (+)</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#DC2626', fontSize: '0.75rem' }}>USED (-)</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#059669', fontSize: '0.75rem' }}>BALANCE</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>ACTIONS</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialsLoading ? (
                        <TableRow><TableCell colSpan={10} align="center"><CircularProgress size={24} sx={{ my: 2 }} /></TableCell></TableRow>
                      ) : displayedMaterials && displayedMaterials.length > 0 ? displayedMaterials.map((pm: any) => {
                        const inv = pm.inventory;
                        const invId = inv?.id || pm.inventoryId;
                        const procureNum = Number(pm.procure ?? inv?.procure ?? pm.quantity ?? inv?.quantity ?? 0);
                        const usedNum = Number(pm.used ?? inv?.used ?? 0);
                        const balanceNum = Number(pm.balance ?? inv?.balance ?? inv?.quantity ?? pm.quantity ?? 0);

                        let detectedUnit = 'Inches';
                        if (inv?.length && inv?.width && procureNum) {
                          const sqFtFromInches = (Number(inv.length) * Number(inv.width)) / 144;
                          if (Math.abs(sqFtFromInches - procureNum) < 0.05) {
                            detectedUnit = 'Inches';
                          } else if (Math.abs((Number(inv.length) * Number(inv.width)) - procureNum) < 0.05) {
                            detectedUnit = 'Sq. Feet';
                          } else if (inv.unit === 'sq_ft' || inv.unit === 'feet') {
                            detectedUnit = 'Sq. Feet';
                          }
                        } else if (inv?.unit === 'sq_ft' || inv?.unit === 'feet') {
                          detectedUnit = 'Sq. Feet';
                        }

                        return (
                          <TableRow
                            key={pm.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (invId) {
                                onClose();
                                navigate(`/inventory/item/${invId}`);
                              }
                            }}
                          >
                            <TableCell sx={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                              {new Date(pm.addedAt || inv?.createdAt || Date.now()).toLocaleDateString('en-GB')}
                            </TableCell>
                            <TableCell>
                              {pm.inventory?.jobWorkType === 'client' ? (
                                <Chip label="Client" size="small" color="info" variant="outlined" sx={{ fontWeight: 700 }} />
                              ) : (
                                <Chip label="Unnati Stock" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#0F172A' }}>{pm.inventory?.itemName}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{pm.inventory?.blockNumber || '-'}</TableCell>
                            <TableCell>
                              <Chip label={detectedUnit} size="small" sx={{ bgcolor: '#F1F5F9', color: '#334155', fontWeight: 600, fontSize: '0.72rem' }} />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{[pm.inventory?.length, pm.inventory?.width, pm.inventory?.thickness].filter(Boolean).join(' x ') || '-'}</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#0284C7' }}>+{procureNum.toFixed(2)} Sq.Ft</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: usedNum > 0 ? '#DC2626' : '#94A3B8' }}>
                              {usedNum > 0 ? `-${usedNum.toFixed(2)} Sq.Ft` : '0.00 Sq.Ft'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 900, color: '#059669' }}>{balanceNum.toFixed(2)} Sq.Ft</TableCell>
                            <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                                {invId && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<VisibilityIcon sx={{ fontSize: 15 }} />}
                                    onClick={() => {
                                      onClose();
                                      navigate(`/inventory/item/${invId}`);
                                    }}
                                    sx={{
                                      textTransform: 'none',
                                      fontWeight: 800,
                                      fontSize: '0.74rem',
                                      borderRadius: 1.5,
                                      py: 0.3,
                                      px: 1.2,
                                      borderColor: '#0284C7',
                                      color: '#0284C7',
                                      bgcolor: '#F0F9FF',
                                      '&:hover': { bgcolor: '#E0F2FE' }
                                    }}
                                  >
                                    View Ledger (+/-)
                                  </Button>
                                )}
                                <Button 
                                  size="small" 
                                  variant="text"
                                  sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1 }}
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
                                      refetchInventory();
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
                                  refetchInventory();
                                }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow><TableCell colSpan={10} align="center"><Typography color="textSecondary" sx={{ py: 3, fontWeight: 500 }}>No materials reserved yet for this project.</Typography></TableCell></TableRow>
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

              {/* TABLE HEADER & SUMMARY WITH EXCEL UPLOAD & PROFORMA DOWNLOAD (Change 5) */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography variant="h6" fontWeight="900" color="#0F172A">Add Slabs / Blocks</Typography>
                  <Typography variant="caption" color="text.secondary">Upload Excel sheet to auto-create stock in one click, or enter rows below</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FileDownloadRoundedIcon />}
                    onClick={() => {
                      const sampleRows = [
                        { 'Source': 'Unnati', 'Material Name': 'Table Top', 'Block No': '1', 'Unit': 'Inches', 'Length': 200, 'Width': 20, 'Thickness (MM)': 10 },
                        { 'Source': 'Unnati', 'Material Name': 'Table Top', 'Block No': '2', 'Unit': 'Inches', 'Length': 180, 'Width': 24, 'Thickness (MM)': 10 },
                        { 'Source': 'Client', 'Material Name': 'Lanka White', 'Block No': 'BLK-1', 'Unit': 'Feet', 'Length': 8, 'Width': 4, 'Thickness (MM)': 18 }
                      ];
                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet(sampleRows);
                      ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
                      XLSX.utils.book_append_sheet(wb, ws, 'Material Planning');
                      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'Material_Planning_Proforma.xlsx';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#334155' }}
                  >
                    Download Proforma
                  </Button>

                  <Button
                    size="small"
                    variant="contained"
                    component="label"
                    disabled={isReservingClientMaterial}
                    startIcon={isReservingClientMaterial ? <CircularProgress size={16} color="inherit" /> : <UploadFileRoundedIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 800,
                      bgcolor: '#0284C7',
                      color: '#FFFFFF',
                      '&:hover': { bgcolor: '#0369A1' }
                    }}
                  >
                    {isReservingClientMaterial ? 'Uploading & Creating Stock...' : 'Upload Excel & Create Stock'}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedProjectId) return;
                        try {
                          setIsReservingClientMaterial(true);
                          const buf = await file.arrayBuffer();
                          const wb = XLSX.read(buf, { type: 'array' });
                          const firstSheetName = wb.SheetNames[0];
                          const sheet = wb.Sheets[firstSheetName];
                          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                          const parsedRows: any[] = [];
                          rawRows.forEach((r: any, idx: number) => {
                            const getVal = (keys: string[]) => {
                              for (const k of Object.keys(r)) {
                                const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                                if (keys.includes(norm) && String(r[k]).trim() !== '') {
                                  return String(r[k]).trim();
                                }
                              }
                              return '';
                            };

                            const matName = getVal(['materialname', 'material', 'itemname', 'item', 'stone', 'stonename', 'particulars', 'product', 'name', 'slabname']);
                            const blockNo = getVal(['blockno', 'blocknumber', 'block', 'slabno', 'sno', 'serialno']) || String(idx + 1);
                            const srcRaw = getVal(['source', 'type', 'jobworktype', 'owner']).toLowerCase();
                            const isUnnati = !srcRaw.includes('client');
                            const unitRaw = getVal(['unit', 'uom', 'dimensionunit']).toLowerCase();
                            const unit = (unitRaw.includes('feet') || unitRaw.includes('ft') || unitRaw.includes('sq')) ? 'feet' : 'inch';
                            const length = getVal(['length', 'len', 'l', 'lengthl']);
                            const width = getVal(['width', 'wid', 'w', 'breadth', 'b', 'widthw']);
                            const thickness = getVal(['thickness', 'thick', 'thicknessmm', 'thickmm', 't', 'mm']) || '10';

                            if (matName && Number(length) > 0 && Number(width) > 0) {
                              parsedRows.push({
                                isUnnati,
                                unnatiId: '',
                                unnatiQty: '',
                                materialName: matName,
                                blockNo,
                                unit,
                                length,
                                width,
                                thickness
                              });
                            }
                          });

                          if (parsedRows.length === 0) {
                            alert('No valid rows found in Excel! Please ensure columns include Material Name, Block No, Length, and Width.');
                            return;
                          }

                          // Immediately create and reserve stock for all uploaded rows
                          for (const row of parsedRows) {
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
                              supplier: selectedProject?.clientName || (row.isUnnati ? 'Unnati Arts' : 'Client')
                            }).unwrap();

                            await reserveProjectMaterial({
                              projectId: selectedProjectId as string,
                              data: { inventoryId: newItem.id, quantity: qty, cost: 0 }
                            }).unwrap();
                          }

                          refetchMaterials();
                        } catch (err) {
                          console.error('Excel upload error:', err);
                          alert('Failed to upload Excel file.');
                        } finally {
                          setIsReservingClientMaterial(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </Button>

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

              <TableContainer sx={{ mb: 3, border: '1px solid #E2E8F0', borderRadius: 2.5, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 850 }}>
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
                          supplier: selectedProject?.clientName || (row.isUnnati ? 'Unnati Arts' : 'Client')
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

