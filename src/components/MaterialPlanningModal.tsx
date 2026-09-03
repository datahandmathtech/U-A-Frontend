import React, { useState, useRef } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Button, TextField, Select, MenuItem, Dialog, DialogTitle, DialogContent, Autocomplete, CircularProgress, FormControlLabel, RadioGroup, Radio } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useGetProjectsQuery, useGetProjectMaterialsQuery, useDeleteProjectMaterialMutation, useReserveProjectMaterialMutation, useCreateInventoryMutation } from '../store/apiSlice';

export const MaterialPlanningModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { data: projects } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projectMaterials, refetch: refetchMaterials, isLoading: materialsLoading } = useGetProjectMaterialsQuery(selectedProjectId || '', { skip: !selectedProjectId });
  const [deleteProjectMaterial] = useDeleteProjectMaterialMutation();
  const [reserveProjectMaterial] = useReserveMaterialMutation();
  const [createInventory] = useCreateInventoryItemMutation();

  const [clientSlabs, setClientSlabs] = useState([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
  const [isReservingClientMaterial, setIsReservingClientMaterial] = useState(false);
  const isReservingRef = useRef(false);
  const isEditingRef = useRef(false);

  const selectedProject = projects?.find((p: any) => p.id === selectedProjectId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: '90vh', borderRadius: 4, bgcolor: '#FAFAFA' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FFF', borderBottom: '1px solid #eee' }}>
        <Typography variant="h5" fontWeight="bold">Project Material Planning</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>Select Project</Typography>
        <Autocomplete
          options={projects || []}
          getOptionLabel={(o: any) => `${o.projectId || o.name} ${o.clientName ? `(${o.clientName})` : ''}`}
          value={selectedProject || null}
          onChange={(e, val) => setSelectedProjectId(val ? val.id : null)}
          renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Search project..." />}
          sx={{ mb: 4, maxWidth: 500, bgcolor: '#FFF' }}
        />

        {selectedProjectId && (
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={2}>Reserved Materials</Typography>
            <Box sx={{ mb: 4 }}>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #E0E0E0', bgcolor: '#FFF' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#FFFDF5' }}>
                      <TableRow>
                        <TableCell><strong>Source</strong></TableCell>
                        <TableCell><strong>Material Name</strong></TableCell>
                        <TableCell><strong>Block No.</strong></TableCell>
                        <TableCell><strong>L x W x T</strong></TableCell>
                        <TableCell><strong>Qty</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialsLoading ? (
                        <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} sx={{ my: 2 }} /></TableCell></TableRow>
                      ) : projectMaterials && projectMaterials.length > 0 ? projectMaterials.map((pm: any) => (
                        <TableRow key={pm.id} hover>
                          <TableCell>
                            {pm.inventory?.jobWorkType === 'client' ? (
                              <Chip label="Client" size="small" color="info" variant="outlined" />
                            ) : (
                              <Chip label="Unnati" size="small" color="success" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>{pm.inventory?.itemName}</TableCell>
                          <TableCell>{pm.inventory?.blockNumber || '-'}</TableCell>
                          <TableCell>{[pm.inventory?.length, pm.inventory?.width, pm.inventory?.thickness].filter(Boolean).join(' x ') || '-'}</TableCell>
                          <TableCell>{pm.quantity} {pm.inventory?.unit}</TableCell>
                          <TableCell align="center">
                            <IconButton color="primary" size="small" onClick={async () => {
                              if (isEditingRef.current) return;
                              isEditingRef.current = true;
                              try {
                                setClientSlabs([{
                                  materialName: pm.inventory?.itemName || '',
                                  blockNo: pm.inventory?.blockNumber || '',
                                  unit: 'inch',
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
                            }}>
                              <Typography variant="body2" color="primary">Edit</Typography>
                            </IconButton>
                            <IconButton color="error" size="small" onClick={async () => {
                              await deleteProjectMaterial({ projectId: selectedProjectId, materialId: pm.id }).unwrap();
                              refetchMaterials();
                            }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={6} align="center"><Typography color="textSecondary" sx={{ py: 3 }}>No materials reserved yet.</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box sx={{ p: 3, border: '1px solid #E0E0E0', borderRadius: 3, bgcolor: '#FFF' }}>
              <Typography variant="h6" fontWeight="bold" mb={3}>Add New Materials</Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Source</strong></TableCell>
                      <TableCell><strong>Material Name</strong></TableCell>
                      <TableCell><strong>Block No</strong></TableCell>
                      <TableCell><strong>Unit</strong></TableCell>
                      <TableCell><strong>Length</strong></TableCell>
                      <TableCell><strong>Width</strong></TableCell>
                      <TableCell><strong>Thickness</strong></TableCell>
                      <TableCell><strong>Total Sq.Ft</strong></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientSlabs.map((row, idx) => {
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <RadioGroup row value={row.isUnnati ? 'unnati' : 'client'} onChange={(e) => {
                              const newSlabs = [...clientSlabs];
                              newSlabs[idx].isUnnati = e.target.value === 'unnati';
                              setClientSlabs(newSlabs);
                            }}>
                              <FormControlLabel value="unnati" control={<Radio size="small"/>} label="Unnati" sx={{ mr: 1, '& .MuiTypography-root': { fontSize: '0.875rem' } }} />
                              <FormControlLabel value="client" control={<Radio size="small"/>} label="Client" sx={{ '& .MuiTypography-root': { fontSize: '0.875rem' } }} />
                            </RadioGroup>
                          </TableCell>
                          <TableCell><TextField size="small" placeholder="Name" value={row.materialName} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].materialName = e.target.value; setClientSlabs(newSlabs); }} /></TableCell>
                          <TableCell><TextField size="small" placeholder="Block" value={row.blockNo} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].blockNo = e.target.value; setClientSlabs(newSlabs); }} /></TableCell>
                          <TableCell>
                            <Select size="small" value={row.unit} onChange={e => {
                              const newSlabs = [...clientSlabs];
                              newSlabs[idx].unit = e.target.value;
                              setClientSlabs(newSlabs);
                            }}>
                              <MenuItem value="inch">Inches</MenuItem>
                              <MenuItem value="feet">Sq. Feet</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell><TextField size="small" type="number" value={row.length} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].length = e.target.value; setClientSlabs(newSlabs); }} /></TableCell>
                          <TableCell><TextField size="small" type="number" value={row.width} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].width = e.target.value; setClientSlabs(newSlabs); }} /></TableCell>
                          <TableCell><TextField size="small" type="number" value={row.thickness} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].thickness = e.target.value; setClientSlabs(newSlabs); }} /></TableCell>
                          <TableCell>
                            <Typography variant="body2">{(row.unit === 'inch' ? (Number(row.length || 0) * Number(row.width || 0)) / 144 : (Number(row.length || 0) * Number(row.width || 0))).toFixed(2)}</Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton color="error" size="small" onClick={() => {
                              const newSlabs = clientSlabs.filter((_, i) => i !== idx);
                              setClientSlabs(newSlabs.length ? newSlabs : [{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
                            }}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                <Button variant="outlined" onClick={() => setClientSlabs([...clientSlabs, { isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }])}>
                  + Add Slab Row
                </Button>
                <Button variant="contained" disabled={isReservingClientMaterial} onClick={async () => {
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
                        length: len, width: wid, thickness: Number(row.thickness),
                        quantity: qty, unit: 'sq_ft', 
                        supplier: row.isUnnati ? 'Unnati Arts' : (selectedProject?.clientName || 'Client')
                      }).unwrap();
                      
                      await reserveProjectMaterial({ projectId: selectedProjectId as string, data: { inventoryId: newItem.id, quantity: qty, cost: 0 } }).unwrap();
                    }
                    setClientSlabs([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
                    refetchMaterials();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    isReservingRef.current = false;
                    setIsReservingClientMaterial(false);
                  }
                }}>
                  {isReservingClientMaterial ? 'Reserving...' : 'Reserve Materials'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
