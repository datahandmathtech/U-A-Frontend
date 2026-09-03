import React, { useState, useRef } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Autocomplete, TextField, Button, IconButton, Select, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetProjectsQuery, useGetProjectMaterialsQuery, useReserveProjectMaterialMutation, useDeleteProjectMaterialMutation, useGetInventoryQuery, useCreateInventoryMutation } from '../store/apiSlice';

const MaterialAllocation: React.FC = () => {
  const { data: projects } = useGetProjectsQuery();
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const { data: projectMaterials, refetch: refetchMaterials } = useGetProjectMaterialsQuery(selectedProject?.id || '', { skip: !selectedProject });
  const [reserveMaterial] = useReserveProjectMaterialMutation();
  const [deleteProjectMaterial] = useDeleteProjectMaterialMutation();

  const { data: inventoryItems } = useGetInventoryQuery();
  const [createInventoryItem] = useCreateInventoryMutation();

  const [clientSlabs, setClientSlabs] = useState([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
  const [isReservingClientMaterial, setIsReservingClientMaterial] = useState(false);
  const isReservingRef = useRef(false);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Select Project to Allocate Materials</Typography>
        <Autocomplete
          options={projects || []}
          getOptionLabel={(option: any) => `${option.name} (${option.clientName})`}
          value={selectedProject}
          onChange={(e, val) => setSelectedProject(val)}
          renderInput={(params) => <TextField {...params} label="Select Project" variant="outlined" />}
        />
      </Box>

      {selectedProject && (
        <>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Reserve Materials for {selectedProject.name}</Typography>
          <Box sx={{ p: 3, border: '1px solid #E0E0E0', borderRadius: 2, bgcolor: '#FAFAFA', mb: 4 }}>
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#EEEEEE' }}>
                  <TableRow>
                    <TableCell width="12%">Source</TableCell>
                    <TableCell width="25%">Material Name</TableCell>
                    <TableCell width="10%">Block No</TableCell>
                    <TableCell width="10%">Unit</TableCell>
                    <TableCell width="10%">Length</TableCell>
                    <TableCell width="10%">Width</TableCell>
                    <TableCell width="10%">Thick</TableCell>
                    <TableCell width="8%">Qty</TableCell>
                    <TableCell width="5%"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientSlabs.map((row, idx) => {
                    const sqFt = row.isUnnati ? Number(row.unnatiQty || 0) : (row.unit === 'inch' ? (Number(row.length || 0) * Number(row.width || 0)) / 144 : (Number(row.length || 0) * Number(row.width || 0)));
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select size="small" fullWidth value={row.isUnnati ? 'unnati' : 'client'} onChange={(e) => {
                            const newSlabs = [...clientSlabs];
                            newSlabs[idx].isUnnati = e.target.value === 'unnati';
                            setClientSlabs(newSlabs);
                          }}>
                            <MenuItem value="unnati">Unnati</MenuItem>
                            <MenuItem value="client">Client</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {row.isUnnati ? (
                            <Autocomplete
                              size="small"
                              options={inventoryItems || []}
                              getOptionLabel={(option: any) => `${option.itemName} (Block: ${option.blockNumber || 'N/A'}) - ${option.quantity} ${option.unit} avail`}
                              onChange={(e, val: any) => {
                                const newSlabs = [...clientSlabs];
                                newSlabs[idx].unnatiId = val?.id || '';
                                newSlabs[idx].materialName = val?.itemName || '';
                                setClientSlabs(newSlabs);
                              }}
                              renderInput={(params) => <TextField {...params} placeholder="Select from Inventory" />}
                            />
                          ) : (
                            <TextField size="small" fullWidth value={row.materialName} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].materialName = e.target.value; setClientSlabs(newSlabs); }} />
                          )}
                        </TableCell>
                        <TableCell>
                          {row.isUnnati ? '-' : <TextField size="small" value={row.blockNo} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].blockNo = e.target.value; setClientSlabs(newSlabs); }} />}
                        </TableCell>
                        <TableCell>
                          {row.isUnnati ? '-' : (
                            <Select size="small" fullWidth value={row.unit} onChange={(e) => {
                              const newSlabs = [...clientSlabs];
                              newSlabs[idx].unit = e.target.value;
                              setClientSlabs(newSlabs);
                            }}>
                              <MenuItem value="inch">Inches</MenuItem>
                              <MenuItem value="feet">Sq. Feet</MenuItem>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.isUnnati ? '-' : <TextField size="small" type="number" value={row.length} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].length = e.target.value; setClientSlabs(newSlabs); }} />}
                        </TableCell>
                        <TableCell>
                          {row.isUnnati ? '-' : <TextField size="small" type="number" value={row.width} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].width = e.target.value; setClientSlabs(newSlabs); }} />}
                        </TableCell>
                        <TableCell>
                          {row.isUnnati ? '-' : <TextField size="small" type="number" value={row.thickness} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].thickness = e.target.value; setClientSlabs(newSlabs); }} />}
                        </TableCell>
                        <TableCell>
                          {row.isUnnati ? (
                            <TextField size="small" type="number" value={row.unnatiQty} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].unnatiQty = e.target.value; setClientSlabs(newSlabs); }} />
                          ) : (
                            <Typography variant="body2">{sqFt.toFixed(2)}</Typography>
                          )}
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setClientSlabs([...clientSlabs, { isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }])}>
                + Add Row
              </Button>
              <Button variant="contained" disabled={isReservingClientMaterial} onClick={async () => {
                if (isReservingRef.current) return;
                isReservingRef.current = true;
                setIsReservingClientMaterial(true);
                try {
                  for (const row of clientSlabs) {
                    if (row.isUnnati) {
                      if (!row.unnatiId || !row.unnatiQty) continue;
                      const item = inventoryItems?.find((i: any) => i.id === row.unnatiId);
                      const cost = item ? (item.costPerUnit * Number(row.unnatiQty)) : 0;
                      await reserveMaterial({ projectId: selectedProject.id, data: { inventoryId: row.unnatiId, quantity: Number(row.unnatiQty), cost } }).unwrap();
                    } else {
                      if (!row.materialName || !row.length || !row.width) continue;
                      const len = Number(row.length || 0);
                      const wid = Number(row.width || 0);
                      const qty = row.unit === 'inch' ? (len * wid) / 144 : (len * wid);
                      
                      const newItem = await createInventoryItem({
                        type: 'slab', 
                        jobWorkType: 'client', 
                        itemName: row.materialName, 
                        blockNumber: row.blockNo, 
                        length: len, width: wid, thickness: Number(row.thickness),
                        quantity: qty, unit: 'sq_ft', 
                        supplier: selectedProject.clientName || 'Client'
                      }).unwrap();
                      
                      await reserveMaterial({ projectId: selectedProject.id, data: { inventoryId: newItem.id, quantity: qty, cost: 0 } }).unwrap();
                    }
                  }
                  alert('Materials reserved successfully!');
                  setClientSlabs([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
                  refetchMaterials();
                } catch (err) {
                  console.error(err);
                  alert('Error reserving materials.');
                } finally {
                  isReservingRef.current = false;
                  setIsReservingClientMaterial(false);
                }
              }}>
                {isReservingClientMaterial ? 'Reserving...' : 'Reserve Materials'}
              </Button>
            </Box>
          </Box>

          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Currently Allocated Materials</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#FFFDF5' }}>
                <TableRow>
                  <TableCell><strong>Source</strong></TableCell>
                  <TableCell><strong>Material Name</strong></TableCell>
                  <TableCell><strong>Block No</strong></TableCell>
                  <TableCell><strong>Quantity</strong></TableCell>
                  <TableCell align="right"><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!projectMaterials || projectMaterials.length === 0) ? (
                  <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" sx={{ py: 2 }}>No materials allocated yet.</Typography></TableCell></TableRow>
                ) : projectMaterials.map((mat: any) => (
                  <TableRow key={mat.id}>
                    <TableCell>{mat.inventory?.jobWorkType === 'company' ? 'Unnati Material' : 'Client Material'}</TableCell>
                    <TableCell>{mat.inventory?.itemName}</TableCell>
                    <TableCell>{mat.inventory?.blockNumber || 'N/A'}</TableCell>
                    <TableCell>{mat.quantity} {mat.inventory?.unit}</TableCell>
                    <TableCell align="right">
                      <IconButton color="error" size="small" onClick={async () => {
                        if (window.confirm("Remove this allocated material?")) {
                          await deleteProjectMaterial(mat.id).unwrap();
                          refetchMaterials();
                        }
                      }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default MaterialAllocation;
