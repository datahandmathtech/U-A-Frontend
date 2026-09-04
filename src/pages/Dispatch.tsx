import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, MenuItem, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useGetProjectsQuery, useSavePackingItemsMutation, useGetPackingItemsQuery } from '../store/apiSlice';
import { getBase64ImageFromUrl } from '../utils/pdfGenerator';

interface PackingRow {
  id: number;
  box: string;
  code: string;
  subCategory: string;
  size: string;
  pcs: number | '';
}

const Dispatch: React.FC = () => {
  const { data: projects } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [savePackingItems] = useSavePackingItemsMutation();
  const { data: savedPackingItems } = useGetPackingItemsQuery(selectedProjectId, { skip: !selectedProjectId });
  
  const [rows, setRows] = useState<PackingRow[]>([
    { id: 1, box: '', code: '', subCategory: '', size: '', pcs: '' }
  ]);

  // Auto-load saved packing items when project is selected
  React.useEffect(() => {
    if (savedPackingItems && savedPackingItems.length > 0) {
      setRows(savedPackingItems.map((item: any) => ({
        id: item.id || Date.now() + Math.random(),
        box: item.box || '',
        code: item.code || '',
        subCategory: item.subCategory || '',
        size: item.size || '',
        pcs: item.pcs ?? ''
      })));
    } else if (selectedProjectId) {
      setRows([{ id: 1, box: '', code: '', subCategory: '', size: '', pcs: '' }]);
    }
  }, [savedPackingItems, selectedProjectId]);

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), box: '', code: '', subCategory: '', size: '', pcs: '' }]);
  };

  const handleRemoveRow = (id: number) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const handleChange = (id: number, field: keyof PackingRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const generatePDF = async () => {
    const project = projects?.find((p: any) => p.id === selectedProjectId);
    if (!project) return;

    // Save packing items to database
    try {
      await savePackingItems({
        projectId: selectedProjectId,
        items: rows.filter(r => r.box || r.code).map(r => ({
          box: r.box,
          code: r.code,
          subCategory: r.subCategory,
          size: r.size,
          pcs: r.pcs ? Number(r.pcs) : undefined
        }))
      }).unwrap();
    } catch (err) {
      console.error('Failed to save packing items:', err);
    }

    const doc = new jsPDF();
    
    // Header Logo & Text
    const logoBase64 = await getBase64ImageFromUrl('/logo.png');
    if (logoBase64) {
      doc.addImage(logoBase64 as string, 'PNG', 15, 10, 45, 18);
    }

    doc.setFontSize(22);
    doc.setTextColor(179, 139, 54); // Gold #B38B36
    doc.text('UNNATI ARTS', logoBase64 ? 120 : 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('DISPATCH / PACKING LIST', 105, 30, { align: 'center' });
    
    // Client Info
    doc.setFontSize(11);
    doc.setTextColor(0,0,0);
    doc.text('CLIENT: ' + String(project.clientName || 'N/A').toUpperCase(), 20, 45);
    doc.setFont(undefined, 'normal');
    doc.text('FOR: ' + String(project.name || 'N/A').toUpperCase(), 20, 52);
    
    doc.setFont(undefined, 'bold');
    const d = new Date();
    const dateStr = d.getDate().toString().padStart(2, '0') + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getFullYear();
    doc.text('DATE: ' + dateStr, 190, 45, { align: 'right' });

    // Format Data for Table
    // The design has: Box | Code | Size | Pcs
    // If subCategory exists, it is placed under Code
    const tableBody = rows.map(r => {
      const codeStr = r.subCategory ? r.code + '\n' + r.subCategory : r.code;
      return [
        r.box,
        codeStr,
        r.size,
        r.pcs ? String(r.pcs) : '-'
      ];
    });

    autoTable(doc, {
      startY: 60,
      head: [['Box', 'Code', 'Size', 'Pcs']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [179, 139, 54], // Gold text on black background
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        halign: 'center',
        valign: 'middle',
        textColor: [0,0,0]
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 50 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 }
      },
    });

    doc.save('Dispatch_' + (project.clientName || 'Client') + '.pdf');
  };

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Dispatch & Packing List</Typography>
          <Typography variant="body2" color="text.secondary">Create and download packing list PDFs for clients.</Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>1. Select Client / Project</Typography>
        <TextField 
          select
          label="Select Project" 
          fullWidth 
          value={selectedProjectId} 
          onChange={(e) => setSelectedProjectId(e.target.value)} 
        >
          {projects && projects.length > 0 ? (
            projects.map((p: any) => (
              <MenuItem key={p.id} value={p.id}>{p.clientName ? p.clientName + ' (' + p.name + ')' : p.name}</MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>No projects available.</MenuItem>
          )}
        </TextField>
      </Paper>

      {selectedProjectId && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">2. Packing Items</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddRow}>
              Add Row
            </Button>
          </Box>
          
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell><strong>Box</strong></TableCell>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Sub-Category (Optional)</strong></TableCell>
                  <TableCell><strong>Size</strong></TableCell>
                  <TableCell><strong>Pcs</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <TextField size="small" variant="standard" placeholder="e.g. V, W, 26" value={row.box} onChange={(e) => handleChange(row.id, 'box', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" variant="standard" placeholder="e.g. MD2a" value={row.code} onChange={(e) => handleChange(row.id, 'code', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" variant="standard" placeholder="e.g. (C1, C2, C3)" value={row.subCategory} onChange={(e) => handleChange(row.id, 'subCategory', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" variant="standard" placeholder="e.g. 1200x246x70" value={row.size} onChange={(e) => handleChange(row.id, 'size', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" variant="standard" type="number" placeholder="e.g. 20" value={row.pcs} onChange={(e) => handleChange(row.id, 'pcs', e.target.value ? Number(e.target.value) : '')} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton color="error" size="small" onClick={() => handleRemoveRow(row.id)} disabled={rows.length === 1}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="success" 
              size="large"
              onClick={async () => {
                try {
                  await savePackingItems({
                    projectId: selectedProjectId,
                    items: rows.filter(r => r.box || r.code).map(r => ({
                      box: r.box,
                      code: r.code,
                      subCategory: r.subCategory,
                      size: r.size,
                      pcs: r.pcs ? Number(r.pcs) : undefined
                    }))
                  }).unwrap();
                  alert('Packing items saved successfully!');
                } catch (err) {
                  alert('Failed to save');
                }
              }}
              sx={{ borderRadius: 8, px: 4 }}
            >
              Save Items
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              startIcon={<LocalShippingIcon />} 
              onClick={generatePDF}
              sx={{ borderRadius: 8, px: 4 }}
            >
              Download PDF
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Dispatch;
