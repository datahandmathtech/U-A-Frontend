import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, Breadcrumbs, Link, Dialog
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetVendorLedgerQuery, useGetVendorsQuery, useDeleteProductionLogMutation, useCreateMaterialLogMutation, useGetActiveOutLogsQuery, useUpdateProductionLogMutation, useGetProjectsQuery } from '../store/apiSlice';
import ManagerStyleEntryDialog from '../components/ManagerStyleEntryDialog';

const VendorLedger = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ledger = [], isLoading } = useGetVendorLedgerQuery(id || '');
  const { data: vendors = [] } = useGetVendorsQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: activeOutLogs = [] } = useGetActiveOutLogsQuery();
  const vendor = vendors.find(v => v.id === id);

  const [openEdit, setOpenEdit] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [deleteProductionLog] = useDeleteProductionLogMutation();
  const [createMaterialLog] = useCreateMaterialLogMutation();
  const [updateProductionLog] = useUpdateProductionLogMutation();

  const [openManual, setOpenManual] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const handleManualSubmit = async (data: any) => {
    try {
      if (openEdit && selectedEntry) {
        await updateProductionLog({
          id: selectedEntry.id,
          data
        }).unwrap();
      } else {
        await createMaterialLog({
          ...data,
          vendors: data.transactionType === 'OUT' ? [{ vendorId: data.vendorId, vendorName: data.vendorName, qty: data.quantityProduced }] : undefined,
          source: 'admin_manual',
          startPhotos: { unit: data.photoUrl, machine: data.photoUrl, software: data.photoUrl }
        }).unwrap();
      }
      setOpenManual(false);
      setOpenEdit(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Failed to add manual entry", error);
      alert("Failed to save entry");
    }
  };

  const handleEditClick = (entry: any) => {
    setSelectedEntry(entry);
    setOpenEdit(true);
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm("Are you sure you want to delete this ledger entry?")) {
      try {
        await deleteProductionLog(entryId).unwrap();
      } catch (error) {
        console.error("Failed to delete log", error);
        alert("Failed to delete log");
      }
    }
  };

  if (isLoading) return <Typography>Loading Ledger...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Breadcrumbs>
          <Link component="button" variant="body1" onClick={() => navigate('/vendors')} sx={{ display: 'flex', alignItems: 'center' }}>
            <ArrowBackIcon sx={{ mr: 0.5, fontSize: 20 }} /> Back to Vendors
          </Link>
          <Typography color="text.primary">{vendor?.name}</Typography>
        </Breadcrumbs>
        <Button variant="contained" color="primary" onClick={() => { setSelectedEntry(null); setOpenManual(true); }}>
          + Add Manual Entry
        </Button>
      </Box>

      <Typography variant="h4" fontWeight="bold" mb={3}>
        {vendor?.name} - Ledger Account
      </Typography>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8F9FA' }}>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>MATERIAL TYPE</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>VEHICLE NUMBER</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#d32f2f', textAlign: 'center' }}>OUTWARD (-)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' }}>INWARD (+)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#1976d2', textAlign: 'center' }}>BALANCE</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666', textAlign: 'center' }}>STATUS</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#666' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ledger.map((entry: any, index: number) => {
              const isOut = entry.transactionType === 'OUT';
              
              return (
                <TableRow key={entry.id} hover sx={{ bgcolor: isOut ? '#fff5f5' : '#f5fff5' }}>
                  <TableCell>{new Date(entry.createdAt || entry.date).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#444' }}>
                    {entry.stage}
                    {entry.productName && <Typography variant="caption" display="block" color="text.secondary">{entry.productName}</Typography>}
                  </TableCell>
                  <TableCell>{entry.vehicleNumber || '-'}</TableCell>
                  
                  <TableCell align="center" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                    {entry.quantityProduced && isOut ? entry.quantityProduced : (entry.piecesOut > 0 ? entry.piecesOut : '-')}
                  </TableCell>
                  
                  <TableCell align="center" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    {entry.quantityProduced && !isOut ? entry.quantityProduced : (entry.piecesIn > 0 ? entry.piecesIn : '-')}
                  </TableCell>
                  
                  <TableCell align="center">
                    <Box sx={{ 
                      display: 'inline-block', 
                      px: 2, 
                      py: 0.5, 
                      borderRadius: 1, 
                      bgcolor: entry.balance > 0 ? '#e3f2fd' : (entry.balance < 0 ? '#ffebee' : '#f5f5f5'),
                      color: entry.balance > 0 ? '#1565c0' : (entry.balance < 0 ? '#c62828' : '#757575'),
                      fontWeight: 'bold'
                    }}>
                      {entry.balance > 0 ? `${entry.balance} (Pending)` : (entry.balance < 0 ? `${Math.abs(entry.balance)} (Adv)` : '0')}
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: '900', color: isOut ? '#d32f2f' : '#2e7d32', bgcolor: isOut ? '#ffebee' : '#e8f5e9', display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1 }}>
                        {isOut ? 'OUT (-)' : 'IN (+)'}
                      </Typography>
                      {(entry.photoUrl || entry.startPhotos?.unit || entry.startPhotos?.machine) && (
                         <IconButton onClick={() => setPreviewPhoto(entry.photoUrl || entry.startPhotos?.unit || entry.startPhotos?.machine)} size="small" color="primary">
                           <VisibilityIcon fontSize="small" />
                         </IconButton>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleEditClick(entry)} title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)} title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {ledger.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Manual Add / Edit Dialog using new Component */}
      <ManagerStyleEntryDialog 
        open={openManual || openEdit}
        isEditMode={openEdit}
        onClose={() => { setOpenManual(false); setOpenEdit(false); setSelectedEntry(null); }}
        onSave={handleManualSubmit}
        defaultVendorId={vendor?.id}
        initialData={selectedEntry}
        vendors={vendors}
        projects={projects}
      />

      {/* Photo Preview Dialog */}
      <Dialog open={!!previewPhoto} onClose={() => setPreviewPhoto(null)} maxWidth="lg" fullWidth PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } } as any}>
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 2 }} onClick={() => setPreviewPhoto(null)}>
          {previewPhoto && previewPhoto !== 'no-photo' ? <img src={previewPhoto} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} /> : <Typography sx={{color: 'white'}}>No photo available</Typography>}
        </Box>
      </Dialog>
    </Box>
  );
};

export default VendorLedger;
