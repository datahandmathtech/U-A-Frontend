import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography, Button, Paper, Stepper, Step, StepLabel, TextField, Divider, Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Avatar, Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Autocomplete, Snackbar, createFilterOptions, InputAdornment, Grid, LinearProgress, Tabs, Tab, Collapse, Checkbox, Radio, RadioGroup, FormControlLabel, Card, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveIcon from '@mui/icons-material/Remove';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import DownloadIcon from '@mui/icons-material/Download';
import CircleIcon from '@mui/icons-material/Circle';
import FilterListIcon from '@mui/icons-material/FilterList';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { 
  useGetProjectByIdQuery, useUpdateProjectMutation, useCreateQuotationMutation, 
  useCreateInvoiceMutation, useUploadFilesMutation, useGetDrawingsQuery, 
  useAddDrawingMutation, useApproveDrawingMutation,
  useGetProjectMaterialsQuery, useReserveProjectMaterialMutation, useDeleteProjectMaterialMutation,
  useGetProjectProductionLogsQuery, useCreateProductionLogMutation, useUpdateProductionLogMutation,
  useGetInventoryQuery, useCreateInventoryMutation, useGetCategoriesQuery, useCreateCategoryMutation, useDeleteCategoryMutation,
  useGetUnitsQuery, useCreateUnitMutation, useDeleteUnitMutation,
  useDeleteDrawingMutation, useUpdateDrawingMutation, useGetMachineLogsQuery, useUpdateQuotationMutation,
  useGetSlabsQuery, useCreateSlabMutation, useUpdateSlabMutation, useDeleteSlabMutation, useAddPiecesMutation, useSyncSlabsMutation,
  useGetQuotationTermsQuery, useAddQuotationTermMutation
} from '../store/apiSlice';
import { generateReceiptPDF, generateWorkOrderPDF, generateQuotationPDF } from '../utils/pdfGenerator';

const crmSteps = ['Enquiry Details', 'Reference Image', 'Quotation & Costing', 'Advance Payment'];
const projectSteps = ['Shop Drawing & Approval', 'Production', 'Work Order Active'];
const steps = [...crmSteps, ...projectSteps];

const STANDARD_TERMS = [
  "Payment terms shall be 50% advance against order confirmation and the remaining 50% before dispatch of the material.",
  "No post-dated cheque shall be applicable.",
  "The quoted prices are net and shall not be subject to deductions towards site maintenance, housekeeping, debris disposal, administration, Methadi charges, or any similar site-related charges. All such charges, wherever applicable, shall be borne directly by the Client.",
  "Since the material is natural stone/marble, natural veins, grains, patches, colour variations, pinholes, mineral marks, resin filling, and other inherent natural characteristics shall be considered acceptable and shall not be treated as manufacturing defects.",
  "The approximate material delivery period shall be 30 days from the date of receipt of advance payment, final approved drawings, and all required confirmations.",
  "Fixing or installation work, wherever included in our scope, shall take approximately 10 to 15 days, subject to site readiness and uninterrupted access. In such cases, all required scaffolding, suitable accommodation/stay for our fixing staff, and the necessary stone adhesive/chemical required for installation shall be arranged and provided by the client at their own cost.",
  "The delivery and installation timelines shall be reasonably extended in the event of force majeure, transport delays, shortage or rejection of raw material, natural-stone selection delays, site unavailability, civil-work delays, or delayed approvals or payments from the Client.",
  "Goods once sold, manufactured, or dispatched shall not be taken back, exchanged, or returned.",
  "No test certificate, warranty certificate, or any other certificate shall be provided unless specifically agreed by us in writing.",
  "Any variation in the approved design, dimensions, quantity, material, finish, carving depth, or site conditions may result in revision of price and delivery timeline.",
  "All payments made toward your order are strictly non-refundable once production has commenced or once raw materials/inventory have been purchased specifically for your project, whichever occurs first.",
  "You may cancel your order for a full or partial refund only if written notice of cancellation is received and confirmed before production has begun and prior to the procurement of any raw materials. Once material acquisition or production has started, no refunds, credits, or chargebacks will be issued under any circumstances.",
  "In the event of a cancellation after raw materials have been purchased, any procured materials, custom tooling, or work-in-progress remain the sole property of the company.",
  "All disputes and transactions shall be subject to Udaipur jurisdiction only.",
  "E. & O.E. — Errors and Omissions Excepted."
];

const SlabPlanningRow = ({ slab, index, onEdit, onDelete, products, activeColumns }: { slab: any, index: number, onEdit: (slab: any) => void, onDelete: (id: string) => void, products: any[], activeColumns: string[] }) => {
  const { id: projectId } = useParams();

  const matchedProduct = products?.find(p => slab.name.startsWith(p.category));
  const dimensionStr = slab.size
    ? slab.size.replace(/ x (\d+MM)/i, ' | $1').replace(/ A- (\d+MM)/i, ' | $1')
    : (matchedProduct 
      ? `${matchedProduct.length || 0}L A- ${matchedProduct.width || 0}W ${matchedProduct.breadth ? `| ${matchedProduct.breadth}MM` : ''}` 
      : (slab.pieces?.[0]?.size ? slab.pieces[0].size.replace(/ x (\d+MM)/i, ' | $1').replace(/ A- (\d+MM)/i, ' | $1') : ''));

  const [updateSlab] = useUpdateSlabMutation();
  const requiredStages = slab.requiredStages || ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'];

  const handleToggleStage = async (stageKey: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    let newRequired;
    const isCurrentlyChecked = requiredStages.includes(stageKey) || (stageKey === 'Polishing - Honed' && requiredStages.includes('Polishing'));
    
    if (isCurrentlyChecked) {
      newRequired = requiredStages.filter((s: string) => s !== stageKey && s !== 'Polishing');
    } else {
      // If we are adding a stage, make sure we remove the legacy 'Polishing' string to keep it clean
      newRequired = [...requiredStages.filter((s: string) => s !== 'Polishing'), stageKey];
    }
    try {
      await updateSlab({ id: slab.id, data: { requiredStages: newRequired } }).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];
  const isLocked = slab.status !== 'pending';

  return (
    <TableRow sx={{ bgcolor: index % 2 === 0 ? '#FFFFFF' : '#FBFBFB', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background-color 0.15s ease' }}>
      <TableCell sx={{ py: 2 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>{slab.name}</Typography>
          <Chip 
            label={`${slab.pieces?.length || 0} Pieces`} 
            size="small" 
            sx={{ 
              mt: 0.5, 
              bgcolor: '#EFF6FF', 
              color: '#1D4ED8', 
              fontWeight: 700, 
              fontSize: '0.72rem', 
              height: 22, 
              borderRadius: 1.5, 
              border: '1px solid #DBEAFE' 
            }} 
          />
        </Box>
      </TableCell>
      <TableCell sx={{ py: 2 }}>
        {dimensionStr ? (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.25, py: 0.5 }}>
            <StraightenRoundedIcon sx={{ fontSize: 15, color: '#64748B' }} />
            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, fontSize: '0.82rem' }}>{dimensionStr}</Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>Standard Spec</Typography>
        )}
      </TableCell>
      {STAGES.filter(stage => activeColumns.includes(stage)).map(stage => (
        <TableCell key={stage} sx={{ verticalAlign: 'middle', py: 2 }}>
          {stage === 'Polishing' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {(() => {
                const isHoned = requiredStages.includes('Polishing - Honed') || requiredStages.includes('Polishing');
                return (
                  <Box 
                    onClick={isLocked ? undefined : (e) => handleToggleStage('Polishing - Honed', e)}
                    sx={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 0.75, 
                      px: 1.25, py: 0.4, borderRadius: 1.5, 
                      bgcolor: isHoned ? '#F0FDF4' : '#F8FAFC', 
                      border: '1px solid', borderColor: isHoned ? '#86EFAC' : '#E2E8F0', 
                      cursor: isLocked ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': isLocked ? {} : { borderColor: '#16A34A', bgcolor: '#DCFCE7' }
                    }}
                  >
                    <Checkbox size="small" disabled={isLocked} checked={isHoned} sx={{ p: 0, '&.Mui-checked': { color: '#16A34A' } }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isHoned ? '#166534' : '#64748B', fontSize: '0.75rem' }}>Honed</Typography>
                  </Box>
                );
              })()}
              {(() => {
                const isMirror = requiredStages.includes('Polishing - Mirror');
                return (
                  <Box 
                    onClick={isLocked ? undefined : (e) => handleToggleStage('Polishing - Mirror', e)}
                    sx={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 0.75, 
                      px: 1.25, py: 0.4, borderRadius: 1.5, 
                      bgcolor: isMirror ? '#F0FDF4' : '#F8FAFC', 
                      border: '1px solid', borderColor: isMirror ? '#86EFAC' : '#E2E8F0', 
                      cursor: isLocked ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': isLocked ? {} : { borderColor: '#16A34A', bgcolor: '#DCFCE7' }
                    }}
                  >
                    <Checkbox size="small" disabled={isLocked} checked={isMirror} sx={{ p: 0, '&.Mui-checked': { color: '#16A34A' } }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isMirror ? '#166534' : '#64748B', fontSize: '0.75rem' }}>Mirror</Typography>
                  </Box>
                );
              })()}
            </Box>
          ) : (
            (() => {
              const isChecked = requiredStages.includes(stage);
              return (
                <Box 
                  onClick={isLocked ? undefined : (e) => handleToggleStage(stage, e)}
                  sx={{ 
                    display: 'inline-flex', alignItems: 'center', gap: 0.75, 
                    px: 1.5, py: 0.6, borderRadius: 1.75, 
                    bgcolor: isChecked ? '#F0FDF4' : '#F8FAFC', 
                    border: '1px solid', borderColor: isChecked ? '#86EFAC' : '#E2E8F0', 
                    cursor: isLocked ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': isLocked ? {} : { borderColor: '#16A34A', bgcolor: '#DCFCE7' }
                  }}
                >
                  <Checkbox size="small" disabled={isLocked} checked={isChecked} sx={{ p: 0, '&.Mui-checked': { color: '#16A34A' } }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: isChecked ? '#166534' : '#64748B', fontSize: '0.78rem' }}>{stage}</Typography>
                </Box>
              );
            })()
          )}
        </TableCell>
      ))}
      <TableCell align="center" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={isLocked ? 'Active' : 'Planning'} 
            size="small" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '0.7rem', 
              height: 22, 
              bgcolor: isLocked ? '#DCFCE7' : '#FEF3C7', 
              color: isLocked ? '#15803D' : '#B45309', 
              border: '1px solid',
              borderColor: isLocked ? '#86EFAC' : '#FDE68A'
            }} 
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={isLocked ? "Slab is in active production" : "Edit Slab Details"}>
              <span>
                <IconButton 
                  size="small" 
                  disabled={isLocked} 
                  onClick={(e) => { e.stopPropagation(); onEdit(slab); }}
                  sx={{ 
                    color: '#0284C7', 
                    bgcolor: '#F0F9FF', 
                    border: '1px solid #BAE6FD', 
                    '&:hover': { bgcolor: '#E0F2FE' },
                    '&.Mui-disabled': { bgcolor: '#F8FAFC', borderColor: '#E2E8F0', color: '#CBD5E1' }
                  }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete Slab">
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); onDelete(slab.id); }}
                sx={{ 
                  color: '#DC2626', 
                  bgcolor: '#FEF2F2', 
                  border: '1px solid #FECACA', 
                  '&:hover': { bgcolor: '#FEE2E2' } 
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </TableCell>
    </TableRow>
  );
};

const SlabTrackingRow = ({ slab, index, onEdit, onDelete, products, productionLogs, activeColumns, projectTotalPieces }: { slab: any, index: number, onEdit: (slab: any) => void, onDelete: (id: string) => void, products: any[], productionLogs: any[], activeColumns: string[], projectTotalPieces: number }) => {
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  const matchedProduct = products?.find(p => slab.name.startsWith(p.category));
  const dimensionStr = slab.size
    ? slab.size.replace(/ x (\d+MM)/i, ' | $1').replace(/ A- (\d+MM)/i, ' | $1')
    : (matchedProduct 
      ? `${matchedProduct.length || 0}L A- ${matchedProduct.width || 0}W ${matchedProduct.breadth ? `| ${matchedProduct.breadth}MM` : ''}` 
      : (slab.pieces?.[0]?.size ? slab.pieces[0].size.replace(/ x (\d+MM)/i, ' | $1').replace(/ A- (\d+MM)/i, ' | $1') : ''));

  const requiredStages = slab.requiredStages || [];

  const getStageStatus = (stageName: string) => {
    const normalizedStageName = stageName.split(' - ')[0];

    // If stage is omitted from required stages, return N/A
    if (requiredStages && requiredStages.length > 0) {
      const isRequired = requiredStages.some((rs: string) => rs.split(' - ')[0] === normalizedStageName);
      if (!isRequired) return 'N/A';
    }

    const BASE_STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];
    const stageIdx = BASE_STAGES.indexOf(normalizedStageName);
    const targetQty = (slab.pieces && slab.pieces.length > 0) ? slab.pieces.length : (matchedProduct?.qty || 0);

    // 1. Piece-level tracking if pieces exist
    let piecesCompletedInThisStage = 0;
    let piecesActiveInThisStage = 0;
    if (slab.pieces && slab.pieces.length > 0) {
      for (const p of slab.pieces) {
        const normalizedPieceStage = (p.stage || 'Production').split(' - ')[0].replace(' Work', '').trim();
        const pStageIdx = BASE_STAGES.indexOf(normalizedPieceStage);

        // Check if piece has an approved/completed log specifically for this stage
        const hasCompletedStageLog = p.logs && p.logs.some((l: any) => {
          const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
          return (lStage === normalizedStageName || lStage.startsWith(normalizedStageName)) && (l.status === 'completed' || l.status === 'approved');
        });

        // Check if there is an approved productionLog matching this piece for this stage
        const hasApprovedProductionLog = productionLogs && productionLogs.some((l: any) => {
          if (l.approvalStatus !== 'approved') return false;
          const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
          if (lStage !== normalizedStageName && !lStage.startsWith(normalizedStageName)) return false;
          return (l.pieceIds && l.pieceIds.includes(p.id)) || (l.slabId === slab.id && (!l.pieceIds || l.pieceIds.length === 0));
        });

        // Or if the piece's current stage is this stage and it is completed
        const isCurrentStageCompleted = normalizedPieceStage === normalizedStageName && p.status === 'completed';

        if (hasCompletedStageLog || hasApprovedProductionLog || isCurrentStageCompleted) {
          piecesCompletedInThisStage++;
        } else if (pStageIdx === stageIdx && (p.status === 'active' || p.status === 'in_progress')) {
          piecesActiveInThisStage++;
        }
      }

      if (piecesCompletedInThisStage >= slab.pieces.length) return 'Completed';
    }

    // 2. Production logs check (for direct slab logs or packed logs)
    if (targetQty > 0 && productionLogs) {
      let sumQty = 0;

      if (normalizedStageName === 'Dispatch') {
        const directDispatchLogs = productionLogs.filter((log: any) => 
          log.approvalStatus === 'approved' &&
          (log.stage === 'Dispatch' || log.stage === 'Dispatch Work') &&
          (log.slabId === slab.id || log.productId === slab.id || log.productName === slab.name || (log.pieceIds && log.pieceIds.some((pid: string) => slab.pieces?.some((p: any) => p.id === pid))))
        );

        const packedLogs = productionLogs.filter((log: any) => 
          log.approvalStatus === 'approved' &&
          (log.stage === 'Packing' || log.stage === 'Packing Work') &&
          (log.productName === slab.name || log.productId === slab.id || log.slabId === slab.id)
        );
        const allDispatchLogs = productionLogs.filter((l: any) => (l.stage === 'Dispatch' || l.stage === 'Dispatch Work') && l.approvalStatus === 'approved');
        const dispatchedPackedLogs = packedLogs.filter((pLog: any) => 
           allDispatchLogs.some((d: any) => d.boxCode && pLog.boxCode && d.boxCode.includes(pLog.boxCode))
        );

        const directQty = directDispatchLogs.reduce((acc: number, log: any) => acc + (log.quantityProduced || 0), 0);
        const packedDispatchedQty = dispatchedPackedLogs.reduce((acc: number, log: any) => acc + (log.quantityProduced || 0), 0);
        sumQty = Math.max(directQty, packedDispatchedQty);
      } else {
        const stageLogs = productionLogs.filter((log: any) => 
          log.approvalStatus === 'approved' &&
          (log.stage === normalizedStageName || log.stage === `${normalizedStageName} Work` || log.stage.startsWith(normalizedStageName)) &&
          (log.productName === slab.name || log.productId === slab.id || log.slabId === slab.id || (log.pieceIds && log.pieceIds.some((pid: string) => slab.pieces?.some((p: any) => p.id === pid))))
        );
        sumQty = stageLogs.reduce((acc: number, log: any) => acc + (log.quantityProduced || 0), 0);
      }

      if (sumQty >= targetQty) return 'Completed';
      if (sumQty > 0 || piecesCompletedInThisStage > 0 || piecesActiveInThisStage > 0) return 'In Progress';
    } else if (piecesCompletedInThisStage > 0 || piecesActiveInThisStage > 0) {
      return 'In Progress';
    }

    return 'Pending';
  };

  const renderStatusBadge = (status: string, label: string, onClickRoute: () => void) => {
    let bgcolor = '#F8FAFC';
    let borderColor = '#E2E8F0';
    let color = '#64748B';
    let icon = <CircleIcon sx={{ fontSize: 8, color: '#94A3B8' }} />;

    if (status === 'Completed') {
      bgcolor = '#ECFDF5';
      borderColor = '#A7F3D0';
      color = '#065F46';
      icon = <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#059669' }} />;
    } else if (status === 'In Progress') {
      bgcolor = '#FFFBEB';
      borderColor = '#FDE68A';
      color = '#92400E';
      icon = <CircleIcon sx={{ fontSize: 10, color: '#D97706' }} />;
    }

    return (
      <Tooltip title={`Click to open live ${label} tracking`}>
        <Box 
          onClick={onClickRoute}
          sx={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 0.9, 
            px: 1.5, 
            py: 0.7, 
            borderRadius: 2, 
            bgcolor, 
            border: '1px solid', 
            borderColor, 
            cursor: 'pointer', 
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            '&:hover': { 
              borderColor: '#3B82F6', 
              boxShadow: '0 3px 10px rgba(59, 130, 246, 0.15)',
              transform: 'translateY(-1px)'
            } 
          }}
        >
          {icon}
          <Typography variant="caption" sx={{ fontWeight: 700, color, fontSize: '0.78rem' }}>
            {label}
          </Typography>
          <OpenInNewRoundedIcon sx={{ fontSize: 12, color: '#94A3B8', opacity: 0.6 }} />
        </Box>
      </Tooltip>
    );
  };

  const STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];

  return (
    <TableRow sx={{ bgcolor: index % 2 === 0 ? '#FFFFFF' : '#FBFBFB', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background-color 0.15s ease' }}>
      <TableCell sx={{ py: 2 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>{slab.name}</Typography>
          <Chip 
            label={`${slab.pieces?.length || 0} Pieces`} 
            size="small" 
            sx={{ 
              mt: 0.5, 
              bgcolor: '#EFF6FF', 
              color: '#1D4ED8', 
              fontWeight: 700, 
              fontSize: '0.72rem', 
              height: 22, 
              borderRadius: 1.5, 
              border: '1px solid #DBEAFE' 
            }} 
          />
        </Box>
      </TableCell>
      <TableCell sx={{ py: 2 }}>
        {dimensionStr ? (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, px: 1.25, py: 0.5 }}>
            <StraightenRoundedIcon sx={{ fontSize: 15, color: '#64748B' }} />
            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, fontSize: '0.82rem' }}>{dimensionStr}</Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>Standard Spec</Typography>
        )}
      </TableCell>
      {STAGES.filter(stage => activeColumns.includes(stage)).map(stage => {
        if (stage === 'Polishing') {
          const hasHoned = requiredStages.includes('Polishing - Honed') || requiredStages.includes('Polishing');
          const hasMirror = requiredStages.includes('Polishing - Mirror');
          if (!hasHoned && !hasMirror) return <TableCell key={stage} sx={{ py: 2 }}><Typography variant="caption" sx={{ color: '#CBD5E1' }}>—</Typography></TableCell>;
          return (
            <TableCell key={stage} sx={{ verticalAlign: 'middle', py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {hasHoned && renderStatusBadge(
                  getStageStatus('Polishing - Honed'), 
                  `Honed: ${getStageStatus('Polishing - Honed')}`, 
                  () => navigate(`/projects/${projectId}/slab/${slab.id}/stage/polishing`)
                )}
                {hasMirror && renderStatusBadge(
                  getStageStatus('Polishing - Mirror'), 
                  `Mirror: ${getStageStatus('Polishing - Mirror')}`, 
                  () => navigate(`/projects/${projectId}/slab/${slab.id}/stage/polishing`)
                )}
              </Box>
            </TableCell>
          );
        }

        const isRequired = requiredStages.includes(stage);
        if (!isRequired) {
          return (
            <TableCell key={stage} sx={{ py: 2 }}>
              <Chip label="Skipped" size="small" sx={{ bgcolor: '#F1F5F9', color: '#94A3B8', fontSize: '0.7rem', height: 20 }} />
            </TableCell>
          );
        }

        const status = getStageStatus(stage);
        return (
          <TableCell key={stage} sx={{ verticalAlign: 'middle', py: 2 }}>
            {renderStatusBadge(
              status, 
              status, 
              () => navigate(`/projects/${projectId}/slab/${slab.id}/stage/${stage.toLowerCase()}`)
            )}
          </TableCell>
        );
      })}
      <TableCell align="center" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
          <Chip 
            label="In Production" 
            size="small" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '0.7rem', 
              height: 22, 
              bgcolor: '#ECFDF5', 
              color: '#059669', 
              border: '1px solid #A7F3D0' 
            }} 
          />
          <Tooltip title="Edit Slab Specification">
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); onEdit(slab); }}
              sx={{ 
                color: '#0284C7', 
                bgcolor: '#F0F9FF', 
                border: '1px solid #BAE6FD', 
                '&:hover': { bgcolor: '#E0F2FE' } 
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
};

const filter = createFilterOptions<any>();

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: project, isLoading, refetch } = useGetProjectByIdQuery(id as string);
  const { data: drawings, refetch: refetchDrawings } = useGetDrawingsQuery(id as string);
  const [updateProject] = useUpdateProjectMutation();
  const [createQuotation] = useCreateQuotationMutation();
  const [updateQuotation] = useUpdateQuotationMutation();
  const { data: quotationTerms = [], refetch: refetchTerms } = useGetQuotationTermsQuery();
  const [addQuotationTerm] = useAddQuotationTermMutation();
  const [createInvoice, { isLoading: isCreatingInvoice }] = useCreateInvoiceMutation();
  const [uploadFiles] = useUploadFilesMutation();
  const [addDrawing] = useAddDrawingMutation();
  const [approveDrawing] = useApproveDrawingMutation();

  const { data: projectMaterials, refetch: refetchMaterials } = useGetProjectMaterialsQuery(id as string, { skip: !id });
  const [reserveMaterial] = useReserveProjectMaterialMutation();
  const [deleteProjectMaterial] = useDeleteProjectMaterialMutation();
  const { data: productionLogs, refetch: refetchProduction } = useGetProjectProductionLogsQuery(id as string, { skip: !id });
  const [createProductionLog] = useCreateProductionLogMutation();
  const [updateProductionLog] = useUpdateProductionLogMutation();
  const { data: inventoryItems } = useGetInventoryQuery();
  const [createInventoryItem] = useCreateInventoryMutation();
  const { data: allMachineLogs, isLoading: machineLogsLoading } = useGetMachineLogsQuery();
  const projectMachineLogs = allMachineLogs?.filter((log: any) => log.projectId === id) || [];

  const { data: projectSlabs, refetch: refetchSlabs } = useGetSlabsQuery(id as string, { skip: !id });
  const [createSlab] = useCreateSlabMutation();
  const [updateSlab] = useUpdateSlabMutation();
  const [deleteSlab] = useDeleteSlabMutation();
  const [syncSlabs] = useSyncSlabsMutation();

  const user = useSelector((state: any) => state.auth.user);
  const isSuperAdmin = user?.role === 'admin' && (!user?.modulesAccess || user.modulesAccess.length === 0);
  const hasCrmAccess = isSuperAdmin || (Array.isArray(user?.modulesAccess) && user.modulesAccess.includes('/crm'));
  const isCrmView = location.pathname.includes('/crm') && hasCrmAccess;

  const [activeStep, setActiveStep] = useState(0);
  const [viewingStepOverride, setViewingStepOverride] = useState<number | null>(null);

  React.useEffect(() => {
    // Auto-sync slabs removed per user request
  }, [project, projectSlabs]);

  const queryParams = new URLSearchParams(location.search);
  const viewParam = queryParams.get('view');

  React.useEffect(() => {
    if (viewParam !== null) {
      const parsedView = parseInt(viewParam, 10);
      if (isCrmView) {
        setViewingStepOverride(parsedView);
      } else {
        if (parsedView < 4) {
          navigate(`/crm/${id}?view=${parsedView}`, { replace: true });
        } else {
          setViewingStepOverride(parsedView);
        }
      }
    } else {
      setViewingStepOverride(null);
    }
  }, [viewParam, isCrmView, id, navigate]);
  const [designFinalizedDate, setDesignFinalizedDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [cameraPurpose, setCameraPurpose] = useState<'drawing' | 'clientPhoto'>('drawing');
  const [slabDialogOpen, setSlabDialogOpen] = useState(false);
  const [editSlabDialogOpen, setEditSlabDialogOpen] = useState(false);
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [slabForm, setSlabForm] = useState({ name: '', size: '', cost: 0, inventoryId: '', requiredStages: ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'] });
  const [materialSource, setMaterialSource] = useState('unnati');
  const [clientSlabs, setClientSlabs] = useState([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
  const [clientMaterialUnit, setClientMaterialUnit] = useState<'inch' | 'feet'>('inch');
  const [isReservingClientMaterial, setIsReservingClientMaterial] = useState(false);
  const [reservedMaterialTab, setReservedMaterialTab] = useState(0);
  const isReservingRef = useRef(false);
  const isEditingRef = useRef(false);

  const isPlanningMode = projectSlabs?.some((s: any) => s.status === 'pending') || !projectSlabs || projectSlabs.length === 0;

  const globalRequiredStages = new Set<string>();
  if (!isPlanningMode && projectSlabs) {
    projectSlabs.forEach((s: any) => {
      (s.requiredStages || []).forEach((stage: string) => globalRequiredStages.add(stage.split(' ')[0]));
    });
  }
  const ALL_STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];
  const activeColumns = isPlanningMode ? ALL_STAGES : ALL_STAGES.filter(s => globalRequiredStages.has(s));

  const handleStartAllWork = async () => {
    try {
      const pendingSlabs = projectSlabs?.filter((s: any) => s.status === 'pending') || [];
      if (pendingSlabs.length === 0) {
        setSnackbarMessage('No pending slabs to start.');
        return;
      }
      for (const slab of pendingSlabs) {
        await updateSlab({ id: slab.id, data: { status: 'active' } }).unwrap();
      }
      refetchSlabs();
      setSnackbarMessage(`Started work for ${pendingSlabs.length} slabs!`);
    } catch (error) {
      console.error(error);
      setSnackbarMessage('Error starting work.');
    }
  };

  const handleCreateSlab = async () => {
    try {
      await createSlab({ projectId: id, ...slabForm, status: 'pending' }).unwrap();
      setSlabDialogOpen(false);
      setSlabForm({ name: '', size: '', cost: 0, inventoryId: '', requiredStages: ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'] });
      refetchSlabs();
      setSnackbarMessage('Slab added successfully!');
    } catch (error) {
      console.error(error);
      setSnackbarMessage('Failed to add slab.');
    }
  };

  const handleEditSlabClick = (slab: any) => {
    setEditingSlabId(slab.id);
    setSlabForm({ 
      name: slab.name, 
      size: slab.size || '', 
      cost: slab.cost || 0, 
      inventoryId: slab.inventoryId || '',
      requiredStages: slab.requiredStages || ['Production', 'Polishing - Honed', 'Packing', 'Dispatch']
    });
    setEditSlabDialogOpen(true);
  };

  const handleUpdateSlab = async () => {
    try {
      await updateSlab({ id: editingSlabId as string, data: slabForm }).unwrap();
      setEditSlabDialogOpen(false);
      setSlabForm({ name: '', size: '', cost: 0, inventoryId: '', requiredStages: ['Production', 'Polishing - Honed', 'Packing', 'Dispatch'] });
      setEditingSlabId(null);
      refetchSlabs();
      setSnackbarMessage('Slab updated successfully!');
    } catch (error) {
      console.error(error);
      setSnackbarMessage('Failed to update slab.');
    }
  };

  const handleDeleteSlab = async (slabId: string) => {
    if (window.confirm("Delete this slab?")) {
      await deleteSlab(slabId).unwrap();
      refetchSlabs();
    }
  };
  
  // Edit Drawing Dialog States
  const [isEditDrawingOpen, setIsEditDrawingOpen] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<any>(null);
  const [editDrawingTitle, setEditDrawingTitle] = useState('');
  const [editDrawingComments, setEditDrawingComments] = useState('');

  const [deleteDrawing] = useDeleteDrawingMutation();
  const [updateDrawing] = useUpdateDrawingMutation();

  // Edit Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    clientName: '',
    clientContact: '',
    enquirySource: '',
    location: '',
    description: '',
    createdAt: '',
    customerPhoto: ''
  });

  // Form states
  const [designFiles, setDesignFiles] = useState<{name: string, url: string, file?: File | Blob}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProducts, setEditingProducts] = useState<Product[]>([]);
  const [cameraProductIndex, setCameraProductIndex] = useState<number | null>(null);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [reserveQty, setReserveQty] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const [customCostName, setCustomCostName] = useState('');
  
  type Product = {
    id: string;
    category: string;
    unit: string;
    length: number;
    width: number;
    breadth: number;
    qty: number;
    rate: number;
    amount: number;
    photo?: string;
  };
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`quoteProducts_${id}`);
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem(`quoteProducts_${id}`, JSON.stringify(products));
  }, [products, id]);

  const [activeCostProductId, setActiveCostProductId] = useState<string>('');
  const [isCategoryCostsDialogOpen, setIsCategoryCostsDialogOpen] = useState<boolean>(false);

  const getDefaultCosts = () => [
      { id: 'mat', name: 'Material Cost', amount: 0 },
      { id: 'cnc', name: 'CNC Cost', amount: 0 },
      { id: 'hc', name: 'Hand Carving Cost', amount: 0 },
      { id: 'inlay', name: 'Inlay Cost', amount: 0 },
      { id: 'polish', name: 'Polishing Cost', amount: 0 },
      { id: 'pack', name: 'Packing Cost', amount: 0 },
      { id: 'trans', name: 'Transport Cost', amount: 0 },
      { id: 'inst', name: 'Installation Cost', amount: 0 }
  ];

  const [quoteDetails, setQuoteDetails] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem(`quoteDraft_${id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
          return { default: parsed };
      }
      if (parsed && typeof parsed === 'object') {
          if (parsed.materialCost !== undefined) {
             return { default: [
               { id: 'mat', name: 'Material Cost', amount: parsed.materialCost || 0 },
               { id: 'cnc', name: 'CNC Cost', amount: parsed.cncCost || 0 },
               { id: 'hc', name: 'Hand Carving Cost', amount: parsed.handCarvingCost || 0 },
               { id: 'inlay', name: 'Inlay Cost', amount: parsed.inlayCost || 0 },
               { id: 'polish', name: 'Polishing Cost', amount: parsed.polishingCost || 0 },
               { id: 'pack', name: 'Packing Cost', amount: parsed.packingCost || 0 },
               { id: 'trans', name: 'Transport Cost', amount: parsed.transportCost || 0 },
               { id: 'inst', name: 'Installation Cost', amount: parsed.installationCost || 0 }
             ]};
          }
          return parsed;
      }
    }
    return {};
  });

  React.useEffect(() => {
    localStorage.setItem(`quoteDraft_${id}`, JSON.stringify(quoteDetails));
  }, [quoteDetails, id]);

  const [advancePayment, setAdvancePayment] = useState(0);
  const [productionTab, setProductionTab] = useState(0);
  const [gstPercent, setGstPercent] = useState<number>(() => {
    const saved = localStorage.getItem(`gstPercentDraft_${id}`);
    return saved ? Number(saved) : 18;
  });

  React.useEffect(() => {
    localStorage.setItem(`gstPercentDraft_${id}`, gstPercent.toString());
  }, [gstPercent, id]);

  const [packageCostEnabled, setPackageCostEnabled] = useState(false);
  const [transportCostEnabled, setTransportCostEnabled] = useState(false);
  const [packageCost, setPackageCost] = useState<number>(0);
  const [transportCost, setTransportCost] = useState<number>(0);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);

  const { data: categories = [] } = useGetCategoriesQuery();
  const [createCategory] = useCreateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const { data: units = [] } = useGetUnitsQuery();
  const [createUnit] = useCreateUnitMutation();
  const [deleteUnit] = useDeleteUnitMutation();

  // Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const hasInitializedStep = useRef(false);

  const getStepIndex = (status: string) => {
    if (status === 'enquiry') return 0;
    if (status === 'design_sharing') return 1;
    if (status === 'quotation') return 2;
    if (status === 'advance_payment') return 3;
    if (status === 'shop_drawing') return 4;
    if (status === 'production' || status === 'material_planning') return 5;
    if (status === 'work_order' || status === 'completed') return 6;
    return 0;
  };

  React.useEffect(() => {
    if (project) {
      if (!hasInitializedStep.current) {
        setActiveStep(getStepIndex(project.status));
        hasInitializedStep.current = true;
      }

      if (project.designFiles && project.designFiles.length > 0) {
        setDesignFiles(project.designFiles.map((url: string, i: number) => ({ name: `Design_${i+1}`, url })));
      }
      if (project.customerPhoto) {
        setCustomerPhoto(project.customerPhoto);
      }
      if (project.startDate) {
        setDesignFinalizedDate(new Date(project.startDate).toISOString().split('T')[0]);
      }
      if (project.invoices && project.invoices.length > 0) {
        const inv = project.invoices[0];
        setAdvancePayment(inv.advancePaid || 0);
        if (inv.paymentMethod) setPaymentMethod(inv.paymentMethod);
        if (inv.paymentDate) setPaymentDate(new Date(inv.paymentDate).toISOString().split('T')[0]);
      }

      // Load saved quotation from database if project is past the quotation stage,
      // OR if no local draft exists (or draft is empty).
      if (project.quotations && project.quotations.length > 0) {
        const latestQuote = project.quotations[0];
        const isPastQuotation = getStepIndex(project.status) > 2;

        const savedProductsStr = localStorage.getItem(`quoteProducts_${id}`);
        const savedProducts = savedProductsStr ? JSON.parse(savedProductsStr) : [];

        const savedDraftStr = localStorage.getItem(`quoteDraft_${id}`);
        const savedDraft = savedDraftStr ? JSON.parse(savedDraftStr) : null;

        if (isPastQuotation || savedProducts.length === 0) {
          if (latestQuote.products) {
            setProducts(latestQuote.products as any);
          }
        }

        if (!savedDraft) {
          if (latestQuote.additionalCosts && typeof latestQuote.additionalCosts === 'object') {
            if (Array.isArray(latestQuote.additionalCosts)) {
               setQuoteDetails({ default: latestQuote.additionalCosts });
            } else if ((latestQuote.additionalCosts as any).materialCost !== undefined) {
               setQuoteDetails({ default: [
                 { id: 'mat', name: 'Material Cost', amount: (latestQuote.additionalCosts as any).materialCost || 0 },
                 { id: 'cnc', name: 'CNC Cost', amount: (latestQuote.additionalCosts as any).cncCost || 0 },
                 { id: 'hc', name: 'Hand Carving Cost', amount: (latestQuote.additionalCosts as any).handCarvingCost || 0 },
                 { id: 'inlay', name: 'Inlay Cost', amount: (latestQuote.additionalCosts as any).inlayCost || 0 },
                 { id: 'polish', name: 'Polishing Cost', amount: (latestQuote.additionalCosts as any).polishingCost || 0 },
                 { id: 'pack', name: 'Packing Cost', amount: (latestQuote.additionalCosts as any).packingCost || 0 },
                 { id: 'trans', name: 'Transport Cost', amount: (latestQuote.additionalCosts as any).transportCost || 0 },
                 { id: 'inst', name: 'Installation Cost', amount: (latestQuote.additionalCosts as any).installationCost || 0 }
               ]});
            } else {
               setQuoteDetails(latestQuote.additionalCosts as any);
            }
          } else {
            setQuoteDetails({});
          }
        }
      }
    }
  }, [project, id]);

  // Clean up camera stream when dialog closes or component unmounts
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async (purpose: 'drawing' | 'clientPhoto' = 'drawing') => {
    setCameraPurpose(purpose);
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setSnackbarMessage("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const fileName = `Captured_Photo_${new Date().getTime()}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            stopCamera();
            
            setIsUploading(true);
            const formData = new FormData();
            formData.append('files', file);
            try {
              const res = await uploadFiles(formData).unwrap();
              if (res.success && res.urls.length > 0) {
                const url = res.urls[0];
                if (cameraPurpose === 'clientPhoto') {
                  setEditFormData(prev => {
                    const photos = prev.customerPhoto ? prev.customerPhoto.split(',').filter(Boolean) : [];
                    return { ...prev, customerPhoto: [...photos, url].join(',') };
                  });
                  setSnackbarMessage('Client photo captured successfully!');
                } else if (cameraPurpose === 'productPhoto') {
                  if (cameraProductIndex !== null) {
                    const ep = editingProducts[cameraProductIndex];
                    const existing = ep.photo ? ep.photo.split(',').filter(Boolean) : [];
                    handleUpdateEditingProduct(cameraProductIndex, 'photo', [...existing, url].join(','));
                    setCameraProductIndex(null);
                  }
                  setSnackbarMessage('Product design photo captured successfully!');
                } else {
                  const currentStepVal = viewingStepOverride !== null ? viewingStepOverride : activeStep;
                  const type = currentStepVal === 1 ? 'Reference Design' : 'Shop Drawing';
                  const title = currentStepVal === 1 ? 'Reference Design Photo' : 'Shop Drawing Photo';
                  await addDrawing({ projectId: id, title, type, fileUrl: url }).unwrap();
                  setSnackbarMessage('Drawing photo captured successfully!');
                  refetchDrawings();
                }
              }
            } catch (err) {
              console.error(err);
              setSnackbarMessage('Upload failed');
            } finally {
              setIsUploading(false);
            }
          }
        }, 'image/jpeg');
      }
    }
  };



  const calculateAmount = (p: Product) => {
    let amount = 0;
    const lengthDec = p.length || 0;
    const widthDec = p.width || 0;
    const breadthDec = p.breadth || 1; // Default to 1 if breadth is 0
    const qtyDec = p.qty || 1; // 0 pe bhi 1 calculate hoga, as requested

    if (p.unit?.toLowerCase().includes('inch')) {
      amount = ((lengthDec * widthDec) / 144) * qtyDec * p.rate;
    } else if (p.unit?.toLowerCase() !== 'pieces' && p.unit?.toLowerCase() !== 'piece' && p.unit?.toLowerCase() !== 'pcs') {
      amount = lengthDec * widthDec * qtyDec * p.rate;
    } else {
      amount = qtyDec * p.rate;
    }
    return Math.round(amount);
  };

  const handleAddProduct = () => {
    setEditingProducts([{
      id: Date.now().toString(),
      category: '',
      unit: '',
      length: 0,
      width: 0,
      breadth: 0,
      qty: 1, rate: 0, amount: 0
    }]);
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (p: Product) => {
    setEditingProducts([p]);
    setIsProductDialogOpen(true);
  };

  const handleUpdateEditingProduct = (index: number, field: string, value: any) => {
    const updatedArray = [...editingProducts];
    const updated = { ...updatedArray[index], [field]: value };
    updated.amount = calculateAmount(updated);
    updatedArray[index] = updated;
    setEditingProducts(updatedArray);
  };

  const handleAddNewRow = () => {
    setEditingProducts([...editingProducts, {
      id: Date.now().toString() + Math.random().toString(),
      category: '',
      unit: '',
      length: 0,
      width: 0,
      breadth: 0,
      qty: 1, rate: 0, amount: 0
    }]);
  };

  const handleRemoveRow = (index: number) => {
    setEditingProducts(editingProducts.filter((_, i) => i !== index));
  };

  const handleSaveProducts = async () => {
    let newProducts = [...products];
    editingProducts.forEach(ep => {
      const existingIdx = newProducts.findIndex(p => p.id === ep.id);
      if (existingIdx >= 0) {
        newProducts[existingIdx] = ep;
      } else {
        newProducts.push(ep);
      }
    });
    setProducts(newProducts);
    setIsProductDialogOpen(false);
    setEditingProducts([]);

    // Persist to backend if a quotation exists for this project
    try {
      const { data: quotations } = await fetch(`/api/quotations/project/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json()).then(data => ({ data }));
      if (quotations && quotations.length > 0) {
        await updateQuotation({ id: quotations[0].id, data: { products: newProducts } });
      }
    } catch (e) {
      // Silent fail - products are still updated in local state
      console.error('Failed to persist products to quotation:', e);
    }
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleNextStage = async (newStatus: string) => {
    try {
      await updateProject({ id: id as string, data: { status: newStatus } }).unwrap();
      setActiveStep(getStepIndex(newStatus));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFreezeDesign = async () => {
    try {
      setIsUploading(true);
      await updateProject({ 
        id: id as string, 
        data: { 
          status: 'quotation', 
          startDate: designFinalizedDate ? new Date(designFinalizedDate).toISOString() : null 
        } 
      }).unwrap();
      setActiveStep(getStepIndex('quotation'));
      setViewingStepOverride(null);
    } catch (err) {
      console.error("Failed to proceed to costing", err);
      setSnackbarMessage("Error saving data before proceeding.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateQuotation = async () => {
    try {
      await createQuotation({ projectId: id, products, additionalCosts: quoteDetails }).unwrap();
      localStorage.removeItem(`quoteDraft_${id}`);
      localStorage.removeItem(`quoteProducts_${id}`);
      await handleNextStage('advance_payment');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdvancePayment = async () => {
    try {
      const productsTotal = products.reduce((acc, p) => acc + p.amount, 0);
      const additionalTotal = Array.isArray(quoteDetails)
        ? quoteDetails.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        : 0;
      const totalAmount = productsTotal + additionalTotal;

      await createInvoice({ 
        projectId: id, 
        totalAmount, 
        advancePaid: advancePayment, 
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : null,
        dueDate: paymentDate ? new Date(paymentDate).toISOString() : null
      }).unwrap();
      
      await handleNextStage('shop_drawing');
      setViewingStepOverride(null);
      setSnackbarMessage("Payment recorded! Proceeding to Active Work Orders.");
      navigate('/crm');
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditDrawingClick = (drawing: any) => {
    setEditingDrawing(drawing);
    setEditDrawingTitle(drawing.title || '');
    setEditDrawingComments(drawing.comments || '');
    setIsEditDrawingOpen(true);
  };

  const handleSaveDrawingEdit = async () => {
    try {
      await updateDrawing({
        id: editingDrawing.id,
        projectId: id as string,
        body: { title: editDrawingTitle, comments: editDrawingComments }
      }).unwrap();
      setIsEditDrawingOpen(false);
      refetchDrawings();
      setSnackbarMessage('Drawing updated successfully!');
    } catch (err) {
      console.error(err);
      setSnackbarMessage('Failed to update drawing');
    }
  };

  const handleDeleteDrawingClick = async (drawingId: string) => {
    if (window.confirm("Are you sure you want to delete this drawing?")) {
      try {
        await deleteDrawing({ id: drawingId, projectId: id as string }).unwrap();
        refetchDrawings();
        setSnackbarMessage('Drawing deleted successfully!');
      } catch (err) {
        console.error(err);
        setSnackbarMessage('Failed to delete drawing');
      }
    }
  };

  const handleDownloadReceipt = () => {
    generateReceiptPDF(project, advancePayment);
  };

  const handleDownloadWorkOrder = () => {
    generateWorkOrderPDF(project, advancePayment);
  };

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading Project Details...</Typography>;
  if (!project) return <Typography sx={{ p: 4 }}>Project not found.</Typography>;

  const isProjectActive = project ? ['shop_drawing', 'material_planning', 'production', 'work_order', 'completed'].includes(project.status) : false;
  const currentSteps = isCrmView ? crmSteps : projectSteps;
  const displayActiveStep = isCrmView
    ? (activeStep < 4 ? activeStep : 4)
    : (activeStep >= 4 ? activeStep - 4 : 0);
  
  // In Active Work Orders, stepToRender MUST ALWAYS be >= 4 (Shop Drawing, Material Planning, Production Pipeline)
  const stepToRender = isCrmView
    ? (viewingStepOverride !== null ? Math.min(3, viewingStepOverride) : Math.min(3, activeStep))
    : (viewingStepOverride !== null && viewingStepOverride >= 4 ? viewingStepOverride : Math.max(4, activeStep));

  const handleGoBackStep = () => {
    if (!isCrmView) {
      if (viewingStepOverride !== null) {
        setViewingStepOverride(null);
        return;
      }
      navigate('/projects');
      return;
    }

    if (viewingStepOverride !== null) {
      setViewingStepOverride(null);
      return;
    }
    const currentStepVal = Math.min(3, activeStep);
    
    if (currentStepVal === 0) navigate('/crm');
    else if (currentStepVal === 1) handleNextStage('enquiry');
    else if (currentStepVal === 2) handleNextStage('design_sharing');
    else if (currentStepVal === 3) handleNextStage('quotation');
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 0, sm: 0.5, md: 1 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleGoBackStep} 
          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
          disableRipple
        >
          {isCrmView ? 'Back' : 'Back to Work Orders'}
        </Button>
        {isCrmView && hasCrmAccess && (
          <IconButton 
            onClick={() => navigate('/crm')} 
            title="Back to Pipeline"
            sx={{ bgcolor: '#FFFDF5', color: '#B38B36', border: '1px solid #E8E1D5', '&:hover': { bgcolor: '#F0E6D2' } }}
          >
            <FilterListIcon />
          </IconButton>
        )}
      </Box>

      
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start', width: '100%' }}>
        {/* LEFT MAIN COLUMN */}
        <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
          {/* CONTENT AREA */}
          <Box sx={{ minHeight: 400 }}>
            
            {/* VIEWING OVERRIDE WARNING BANNER */}
            {viewingStepOverride !== null && isProjectActive && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                p: 2.5, 
                mb: 4, 
                bgcolor: '#FFF9E6', 
                border: '1.5px solid #FFD54F', 
                borderRadius: 3,
                boxShadow: '0 4px 15px rgba(255, 179, 0, 0.08)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <InfoIcon sx={{ color: '#B38B36', fontSize: '1.75rem' }} />
                  <Typography variant="body1" color="text.primary" fontWeight="600">
                    {isCrmView 
                      ? <>You are viewing a past CRM stage: <span style={{ color: '#B38B36', fontWeight: '800' }}>{crmSteps[viewingStepOverride] || crmSteps[0]}</span></>
                      : <>You are viewing a past stage: <span style={{ color: '#B38B36', fontWeight: '800' }}>{steps[viewingStepOverride] || steps[4]}</span></>
                    }
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  size="medium" 
                  onClick={() => navigate(`/projects/${id}`)}
                  sx={{ 
                    bgcolor: '#B38B36', 
                    color: '#fff', 
                    '&:hover': { bgcolor: '#936F28' }, 
                    borderRadius: 2, 
                    textTransform: 'none', 
                    fontWeight: 'bold',
                    px: 3,
                    boxShadow: '0 2px 8px rgba(179, 139, 54, 0.2)'
                  }}
                >
                  Back to Active Step
                </Button>
              </Box>
            )}
            
            {/* STEP 0: ENQUIRY DETAILS */}
            {stepToRender === 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4.5 },
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 4,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)'
                }}
              >
                {/* Header Strip */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
                        Enquiry & Client Intake
                      </Typography>
                      <Chip
                        label="CRM Stage 1"
                        size="small"
                        sx={{
                          bgcolor: '#FFF4E5',
                          color: '#B38B36',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          border: '1px solid #FFE0B2',
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
                      Initial client discovery, communication coordinates, and design scope.
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={<EditIcon sx={{ fontSize: '18px !important' }} />}
                    onClick={() => {
                      setEditFormData({
                        name: project.name || '',
                        clientName: project.clientName || '',
                        clientContact: project.clientContact || '',
                        enquirySource: project.enquirySource || '',
                        location: project.location || '',
                        description: project.description || '',
                        createdAt: project.createdAt ? new Date(project.createdAt).toISOString().split('T')[0] : '',
                        customerPhoto: project.customerPhoto || ''
                      });
                      setIsEditDialogOpen(true);
                    }}
                    sx={{
                      borderRadius: 2.5,
                      borderColor: '#CBD5E1',
                      color: '#1E293B',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 2.5,
                      py: 0.9,
                      '&:hover': { borderColor: '#B38B36', bgcolor: '#FFFDF5' }
                    }}
                  >
                    Edit Details
                  </Button>
                </Box>

                {/* 4 Executive KPI Info Cards */}
                <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
                  {/* Card 1: Client Profile */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#EEF2FF', color: '#6366F1' }}>
                            <PersonRoundedIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Client Name
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.2, mb: 1 }}>
                          {project.clientName || 'Unnamed Client'}
                        </Typography>
                      </Box>
                      
                      {project.clientContact ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Chip
                            icon={<CallRoundedIcon sx={{ fontSize: '14px !important', color: '#0284C7 !important' }} />}
                            label={project.clientContact}
                            size="small"
                            component="a"
                            href={`tel:${project.clientContact}`}
                            clickable
                            sx={{
                              bgcolor: '#F0F9FF',
                              color: '#0284C7',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              border: '1px solid #BAE6FD',
                              borderRadius: 1.5
                            }}
                          />
                          <IconButton
                            size="small"
                            component="a"
                            href={`https://wa.me/${project.clientContact.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            sx={{
                              bgcolor: '#DCFCE7',
                              color: '#16A34A',
                              width: 28,
                              height: 28,
                              border: '1px solid #86EFAC',
                              '&:hover': { bgcolor: '#BBF7D0' }
                            }}
                          >
                            <WhatsAppIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>No contact provided</Typography>
                      )}
                    </Card>
                  </Grid>

                  {/* Card 2: Project Identification */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#FFF4E5', color: '#B38B36' }}>
                            <LayersRoundedIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Project ID & Title
                          </Typography>
                        </Box>
                        <Chip
                          label={project.projectId}
                          size="small"
                          sx={{
                            bgcolor: '#1E293B',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            mb: 1,
                            borderRadius: 1.5
                          }}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1E293B' }}>
                          {project.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mt: 1 }}>
                        Status: <span style={{ color: '#B38B36', textTransform: 'capitalize' }}>{project.status?.replace('_', ' ')}</span>
                      </Typography>
                    </Card>
                  </Grid>

                  {/* Card 3: Source & Timeline */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#ECFDF5', color: '#059669' }}>
                            <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Source & Date
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Chip
                            icon={<LocalOfferRoundedIcon sx={{ fontSize: '13px !important' }} />}
                            label={project.enquirySource || 'Direct Enquiry'}
                            size="small"
                            sx={{
                              bgcolor: '#F1F5F9',
                              color: '#475569',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              borderRadius: 1.5
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                          {new Date(project.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>Logged in CRM</Typography>
                    </Card>
                  </Grid>

                  {/* Card 4: Location & Handled By */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#FEF2F2', color: '#DC2626' }}>
                            <LocationOnRoundedIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Site Location & Owner
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
                          {project.location || 'Site Location Not Specified'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        Handler: <span style={{ color: '#1E293B' }}>{project.clientHandle || project.assignedTo?.name || 'Unassigned'}</span>
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                {/* Client Inspiration Photos */}
                {project.customerPhoto && (
                  <Box sx={{ mb: 3.5, p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CollectionsRoundedIcon sx={{ fontSize: 18, color: '#B38B36' }} />
                      Client Inspiration Photos
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {project.customerPhoto.split(',').filter(Boolean).map((photoUrl: string, idx: number) => (
                        <Box
                          key={idx}
                          onClick={() => setPreviewFileUrl(photoUrl)}
                          sx={{
                            position: 'relative',
                            width: 100,
                            height: 100,
                            borderRadius: 2.5,
                            overflow: 'hidden',
                            border: '1.5px solid #E2E8F0',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.04)',
                              borderColor: '#B38B36',
                              boxShadow: '0 6px 16px rgba(0,0,0,0.1)'
                            }
                          }}
                        >
                          <img src={photoUrl} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              bgcolor: 'rgba(0,0,0,0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              '&:hover': { opacity: 1 }
                            }}
                          >
                            <ZoomInRoundedIcon sx={{ color: '#FFFFFF', fontSize: 24 }} />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Scope of Work & Requirements */}
                <Box sx={{ mb: 4, p: 3, bgcolor: '#FFFDF5', borderRadius: 3, border: '1px solid #FFE0B2', borderLeft: '4px solid #C89F5A' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#B38B36', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    Requirements / Scope of Work
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {project.description || 'No specific requirement description recorded during intake.'}
                  </Typography>
                </Box>

                {/* Step Progression Footer */}
                {viewingStepOverride === null && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, borderTop: '1px solid #E2E8F0' }}>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => handleNextStage('design_sharing')}
                      sx={{
                        px: 4,
                        py: 1.3,
                        borderRadius: 2.5,
                        bgcolor: '#1E293B',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        textTransform: 'none',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                        '&:hover': { bgcolor: '#0F172A' }
                      }}
                    >
                      Proceed to Reference Image
                    </Button>
                  </Box>
                )}
              </Paper>
            )}

            {/* STEP 1: REFERENCE IMAGE */}
            {stepToRender === 1 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4.5 },
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 4,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)'
                }}
              >
                {/* Header Strip */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
                        Finalized Reference Designs & Material Images
                      </Typography>
                      <Chip
                        label="CRM Stage 2"
                        size="small"
                        sx={{
                          bgcolor: '#F0F9FF',
                          color: '#0284C7',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          border: '1px solid #BAE6FD',
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
                      Upload inspiration photos, approved stone samples, and reference drawings.
                    </Typography>
                  </Box>

                  {/* Finalized Design Date Selector */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#F8FAFC', p: 1.25, borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
                    <CalendarMonthRoundedIcon sx={{ color: '#B38B36', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        Design Finalized Date
                      </Typography>
                      <input
                        type="date"
                        value={designFinalizedDate}
                        onChange={(e) => setDesignFinalizedDate(e.target.value)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: '#1E293B',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Upload & Camera Action Hub */}
                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                  {/* Action 1: Upload Files */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box
                      component="label"
                      sx={{
                        p: 3.5,
                        border: '2px dashed #C89F5A',
                        borderRadius: 3.5,
                        bgcolor: isUploading ? '#F8FAFC' : '#FFFDF5',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        textAlign: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#FFF4E5',
                          borderColor: '#B38B36',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#FFF4E5', color: '#B38B36', width: 52, height: 52 }}>
                        <CloudUploadIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                          {isUploading ? 'Uploading Files...' : 'Click to Upload Images & Drawings'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                          Supports JPG, PNG, WebP, PDF & DWG (Multi-select enabled)
                        </Typography>
                      </Box>
                      <input
                        type="file"
                        hidden
                        multiple
                        disabled={isUploading}
                        accept="image/*,.pdf,.dwg"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setIsUploading(true);
                            const formData = new FormData();
                            Array.from(e.target.files).forEach(f => formData.append('files', f));
                            try {
                              const res = await uploadFiles(formData).unwrap();
                              for (const url of res.urls) {
                                await addDrawing({ projectId: id, title: 'Reference Design', type: 'Reference Design', fileUrl: url }).unwrap();
                              }
                              refetchDrawings();
                              setSnackbarMessage('Images uploaded successfully!');
                            } catch (err) {
                              console.error(err);
                              setSnackbarMessage('Upload failed');
                            } finally {
                              setIsUploading(false);
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                    </Box>
                  </Grid>

                  {/* Action 2: Camera Capture */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box
                      onClick={isUploading ? undefined : startCamera}
                      sx={{
                        p: 3.5,
                        border: '2px dashed #0284C7',
                        borderRadius: 3.5,
                        bgcolor: '#F0F9FF',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        textAlign: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#E0F2FE',
                          borderColor: '#0369A1',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#E0F2FE', color: '#0284C7', width: 52, height: 52 }}>
                        <CameraAltIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                          Take Live Photo with Camera
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                          Snap physical samples, stone slabs, or site sketches directly
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {/* Finalized Reference Designs Gallery */}
                {drawings && drawings.filter((d: any) => d.type === 'Reference Design').length > 0 ? (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CollectionsRoundedIcon sx={{ fontSize: 20, color: '#B38B36' }} />
                      Uploaded Reference Files ({drawings.filter((d: any) => d.type === 'Reference Design').length})
                    </Typography>

                    <Grid container spacing={2}>
                      {drawings.filter((d: any) => d.type === 'Reference Design').map((drawing: any) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={drawing.id}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              bgcolor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              transition: 'all 0.2s ease',
                              '&:hover': { borderColor: '#B38B36', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }
                            }}
                          >
                            <Box
                              onClick={() => setPreviewFileUrl(drawing.fileUrl)}
                              sx={{
                                width: '100%',
                                height: 140,
                                borderRadius: 2,
                                overflow: 'hidden',
                                bgcolor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                position: 'relative'
                              }}
                            >
                              {drawing.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                  <PictureAsPdfRoundedIcon sx={{ fontSize: 40, color: '#DC2626' }} />
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>PDF Document</Typography>
                                </Box>
                              ) : (
                                <img src={drawing.fileUrl} alt={drawing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </Box>

                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                                  {drawing.title}
                                </Typography>
                                <Chip label={`v${drawing.version}`} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#FFF4E5', color: '#B38B36' }} />
                              </Box>
                              {drawing.comments && (
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>
                                  Note: {drawing.comments}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                                {new Date(drawing.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #E2E8F0' }}>
                              <Button
                                size="small"
                                onClick={() => setPreviewFileUrl(drawing.fileUrl)}
                                sx={{ textTransform: 'none', fontWeight: 700, color: '#0284C7', p: 0 }}
                              >
                                View Preview
                              </Button>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" onClick={() => handleEditDrawingClick(drawing)} sx={{ color: '#64748B' }}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDeleteDrawingClick(drawing.id)} sx={{ color: '#DC2626' }}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : (
                  <Box sx={{ mb: 4, p: 4, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 3, border: '1px dashed #CBD5E1' }}>
                    <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                      No reference images uploaded yet. Use the upload box or camera above to add inspiration files.
                    </Typography>
                  </Box>
                )}

                {/* Footer Navigation */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #E2E8F0' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      if (viewingStepOverride !== null) setViewingStepOverride(null);
                      else handleNextStage('enquiry');
                    }}
                    sx={{
                      px: 3.5,
                      py: 1.2,
                      borderRadius: 2.5,
                      borderColor: '#CBD5E1',
                      color: '#1E293B',
                      fontWeight: 700,
                      textTransform: 'none'
                    }}
                  >
                    Back
                  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardRoundedIcon />}
                    onClick={() => {
                      if (viewingStepOverride !== null) setViewingStepOverride(null);
                      else handleFreezeDesign();
                    }}
                    disabled={isUploading}
                    sx={{
                      px: 4,
                      py: 1.2,
                      borderRadius: 2.5,
                      bgcolor: '#1E293B',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                      '&:hover': { bgcolor: '#0F172A' }
                    }}
                  >
                    {viewingStepOverride !== null ? 'Back to Active Step' : (isUploading ? 'Saving...' : 'Proceed to Costing Builder')}
                  </Button>
                </Box>
              </Paper>
            )}

            {/* STEP 2: QUOTATION & COSTING BUILDER */}
            {stepToRender === 2 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4.5 },
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 4,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)'
                }}
              >
                {/* Header Strip */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
                        Quotation & Product Costing Builder
                      </Typography>
                      <Chip
                        label="CRM Stage 3"
                        size="small"
                        sx={{
                          bgcolor: '#FFFBEB',
                          color: '#D97706',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          border: '1px solid #FDE68A',
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
                      Item-wise product sizing, factory labor costs, taxes, and customer terms.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      startIcon={<PictureAsPdfRoundedIcon />}
                      onClick={() => generateQuotationPDF(project, products, quoteDetails, { packageCostEnabled, transportCostEnabled, packageCost, transportCost }, selectedTerms, gstPercent)}
                      sx={{
                        bgcolor: '#DC2626',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: 2.5,
                        px: 2.5,
                        py: 1,
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                        '&:hover': { bgcolor: '#B91C1C' }
                      }}
                    >
                      Download PDF Quotation
                    </Button>

                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddProduct}
                      sx={{
                        bgcolor: '#1E293B',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: 2.5,
                        px: 2.5,
                        py: 1,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        '&:hover': { bgcolor: '#0F172A' }
                      }}
                    >
                      Add Product
                    </Button>
                  </Box>
                </Box>

                {/* Product Estimation Table Card */}
                <Box sx={{ mb: 4, p: 3, border: '1px solid #E2E8F0', borderRadius: 3.5, bgcolor: '#F8FAFC' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
                      Product Estimation Breakdown
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                      {products.length} {products.length === 1 ? 'item' : 'items'} in quotation
                    </Typography>
                  </Box>

                  <TableContainer
                    sx={{
                      bgcolor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 3,
                      overflowX: 'auto',
                      '&::-webkit-scrollbar': { height: 8 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 4 }
                    }}
                  >
                    <Table size="small" sx={{ minWidth: 850 }}>
                      <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                        <TableRow>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>PRODUCT / CATEGORY</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>UNIT</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>DIMENSIONS (L x W x MM)</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>QTY</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>RATE (₹)</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>AMOUNT (₹)</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#475569', fontSize: '0.75rem' }} align="right">ACTIONS</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {products.map((p) => (
                          <TableRow
                            key={p.id}
                            sx={{
                              '& td': { borderBottom: '1px solid #F1F5F9', py: 1.75 },
                              '&:hover': { bgcolor: '#FFFDF5' }
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {p.photo ? (
                                  <Avatar
                                    src={p.photo}
                                    variant="rounded"
                                    onClick={() => setPreviewFileUrl(p.photo!)}
                                    sx={{ width: 42, height: 42, border: '1.5px solid #E2E8F0', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 42,
                                      height: 42,
                                      borderRadius: 2,
                                      border: '1.5px dashed #CBD5E1',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: '#F8FAFC'
                                    }}
                                  >
                                    <ImageIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                                  </Box>
                                )}
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                                    {p.category}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={p.unit} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#F1F5F9' }} />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                {`${p.length || 0}L × ${p.width || 0}W ${p.breadth ? `| ${p.breadth}MM` : ''}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                                {p.qty}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                ₹{p.rate.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#B38B36', fontSize: '0.92rem' }}>
                                ₹{p.amount.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => handleEditProduct(p)} sx={{ mr: 1, color: '#0284C7', bgcolor: '#F0F9FF', '&:hover': { bgcolor: '#E0F2FE' } }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleRemoveProduct(p.id)} sx={{ color: '#DC2626', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        {products.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94A3B8' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                No products added to quotation yet. Click "+ Add Product" to build quotation.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Two-Column Financial & Terms Summary */}
                  <Box sx={{ mt: 3, width: '100%' }}>
                    {(() => {
                      const totalProductsAmount = products.reduce((acc, p) => acc + p.amount, 0);

                      let additionalTotal = 0;
                      if (Array.isArray(quoteDetails)) {
                        additionalTotal = quoteDetails.reduce((sum, item) => sum + Number(item.amount || 0), 0);
                      } else if (typeof quoteDetails === 'object') {
                        Object.values(quoteDetails).forEach((costs: any) => {
                          if (Array.isArray(costs)) {
                            additionalTotal += costs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
                          }
                        });
                      }

                      let globalCostTotal = 0;
                      if (packageCostEnabled) globalCostTotal += Number(packageCost || 0);
                      if (transportCostEnabled) globalCostTotal += Number(transportCost || 0);

                      const subTotal = totalProductsAmount + globalCostTotal;
                      const gstAmount = (subTotal * gstPercent) / 100;
                      const finalBill = subTotal + gstAmount;

                      return (
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                          {/* Terms & Conditions (Left Column) */}
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Card
                              elevation={0}
                              sx={{
                                p: 3,
                                borderRadius: 3,
                                bgcolor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                              }}
                            >
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                                    Commercial Terms & Conditions
                                  </Typography>
                                  <Button size="small" variant="outlined" onClick={() => setIsTermsDialogOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#1E293B' }}>
                                    Select / Add Terms
                                  </Button>
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 220, overflowY: 'auto', pr: 1 }}>
                                  {selectedTerms.length === 0 ? (
                                    <Typography variant="body2" sx={{ color: '#94A3B8', fontStyle: 'italic', p: 2, bgcolor: '#F8FAFC', borderRadius: 2, textAlign: 'center' }}>
                                      No specific terms attached. Standard factory delivery terms will apply.
                                    </Typography>
                                  ) : (
                                    selectedTerms.map((term: string, i: number) => (
                                      <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 1.25, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, alignItems: 'center' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#B38B36', minWidth: 20 }}>
                                          {i + 1}.
                                        </Typography>
                                        <Typography variant="caption" sx={{ flex: 1, color: '#334155', fontWeight: 600, lineHeight: 1.3 }} title={term}>
                                          {term}
                                        </Typography>
                                        <IconButton size="small" onClick={() => setSelectedTerms(selectedTerms.filter((t: string) => t !== term))} sx={{ color: '#DC2626', p: 0.5 }}>
                                          <CloseIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                    ))
                                  )}
                                </Box>
                              </Box>
                            </Card>
                          </Grid>

                          {/* Executive Quotation Financial Summary (Right Column) */}
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Card
                              elevation={0}
                              sx={{
                                p: 3,
                                borderRadius: 3,
                                bgcolor: '#FFFFFF',
                                border: '1.5px solid #E2E8F0',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
                              }}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B', mb: 2.5, pb: 1, borderBottom: '1px solid #E2E8F0' }}>
                                Quotation Breakdown
                              </Typography>

                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Total Products Base Amount</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B' }}>₹{totalProductsAmount.toLocaleString('en-IN')}</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Checkbox size="small" checked={packageCostEnabled} onChange={(e) => setPackageCostEnabled(e.target.checked)} sx={{ p: 0, color: '#B38B36', '&.Mui-checked': { color: '#B38B36' } }} />
                                    <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Packaging / Crating Charges</Typography>
                                  </Box>
                                  {packageCostEnabled ? (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={packageCost === 0 ? '' : packageCost}
                                      onChange={(e) => setPackageCost(Number(e.target.value))}
                                      sx={{ width: 110, '& .MuiInputBase-input': { textAlign: 'right', fontWeight: 700, py: 0.5 } }}
                                      placeholder="₹0"
                                      variant="outlined"
                                    />
                                  ) : (
                                    <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>-</Typography>
                                  )}
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Checkbox size="small" checked={transportCostEnabled} onChange={(e) => setTransportCostEnabled(e.target.checked)} sx={{ p: 0, color: '#B38B36', '&.Mui-checked': { color: '#B38B36' } }} />
                                    <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Transport / Installation Cost</Typography>
                                  </Box>
                                  {transportCostEnabled ? (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={transportCost === 0 ? '' : transportCost}
                                      onChange={(e) => setTransportCost(Number(e.target.value))}
                                      sx={{ width: 110, '& .MuiInputBase-input': { textAlign: 'right', fontWeight: 700, py: 0.5 } }}
                                      placeholder="₹0"
                                      variant="outlined"
                                    />
                                  ) : (
                                    <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>-</Typography>
                                  )}
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>GST Applicable</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Select
                                      size="small"
                                      value={gstPercent}
                                      onChange={(e) => setGstPercent(Number(e.target.value))}
                                      sx={{ height: 32, borderRadius: 2, fontWeight: 700, fontSize: '0.82rem' }}
                                    >
                                      <MenuItem value={0}>0%</MenuItem>
                                      <MenuItem value={5}>5%</MenuItem>
                                      <MenuItem value={12}>12%</MenuItem>
                                      <MenuItem value={18}>18%</MenuItem>
                                      <MenuItem value={28}>28%</MenuItem>
                                    </Select>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#DC2626', minWidth: 80, textAlign: 'right' }}>
                                      + ₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </Typography>
                                  </Box>
                                </Box>

                                <Divider sx={{ my: 0.5 }} />

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FFFDF5', p: 1.75, borderRadius: 2.5, border: '1px solid #FFE0B2' }}>
                                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
                                    Grand Total
                                  </Typography>
                                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#B38B36' }}>
                                    ₹{finalBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                  </Typography>
                                </Box>
                              </Box>
                            </Card>
                          </Grid>
                        </Grid>
                      );
                    })()}
                  </Box>
                </Box>

                {/* Additional Processing Costs for Selected Product */}
                {(() => {
                  const currentCostId = activeCostProductId || (products.length > 0 ? products[0].id : null);
                  return (
                    <Box sx={{ mb: 4, p: 3, border: '1px solid #E2E8F0', borderRadius: 3.5, bgcolor: '#F8FAFC' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', mb: 2.5 }}>
                        Additional Processing Costs {currentCostId ? `(${products.find(p => p.id === currentCostId)?.category || 'Selected Product'})` : ''}
                      </Typography>

                      {currentCostId ? (
                        <Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5, p: 3, bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', mb: 2 }}>
                            {(quoteDetails[currentCostId] || getDefaultCosts()).map((item: any) => (
                              <Box key={item.id}>
                                <TextField
                                  fullWidth
                                  type="number"
                                  label={item.name}
                                  value={item.amount === 0 ? '' : item.amount}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setQuoteDetails(prev => {
                                      const list = prev[currentCostId] || getDefaultCosts();
                                      return { ...prev, [currentCostId]: list.map(c => c.id === item.id ? { ...c, amount: val } : c) };
                                    });
                                  }}
                                  slotProps={{
                                    input: {
                                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                                    }
                                  }}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                />
                              </Box>
                            ))}
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Button
                              variant="outlined"
                              onClick={() => { setCustomCostName(''); setIsCostDialogOpen(true); }}
                              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#1E293B' }}
                            >
                              + Manage Cost Items
                            </Button>
                            <Chip
                              label={`Total Additional Cost: ₹${((quoteDetails[currentCostId] || []).reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0)).toLocaleString('en-IN')}`}
                              sx={{ bgcolor: '#FFF4E5', color: '#B38B36', fontWeight: 800, fontSize: '0.85rem', height: 32, border: '1px solid #FFE0B2' }}
                            />
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ p: 4, textAlign: 'center', color: '#94A3B8', bgcolor: '#FFFFFF', borderRadius: 2.5, border: '1px dashed #CBD5E1' }}>
                          Please add a product to estimation above to specify item-level additional processing costs.
                        </Box>
                      )}
                    </Box>
                  );
                })()}

                {/* Footer Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #E2E8F0' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      if (viewingStepOverride !== null) setViewingStepOverride(null);
                      else handleNextStage('design_sharing');
                    }}
                    sx={{
                      px: 3.5,
                      py: 1.2,
                      borderRadius: 2.5,
                      borderColor: '#CBD5E1',
                      color: '#1E293B',
                      fontWeight: 700,
                      textTransform: 'none'
                    }}
                  >
                    Back
                  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<CheckCircleRoundedIcon />}
                    onClick={async () => {
                      if (viewingStepOverride !== null) {
                        setViewingStepOverride(null);
                      } else {
                        await handleCreateQuotation();
                      }
                    }}
                    sx={{
                      px: 4,
                      py: 1.2,
                      borderRadius: 2.5,
                      bgcolor: '#1E293B',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                      '&:hover': { bgcolor: '#0F172A' }
                    }}
                  >
                    {viewingStepOverride !== null ? 'Back to Active Step' : 'Save & Proceed to Advance Payment'}
                  </Button>
                </Box>
              </Paper>
            )}

            {/* STEP 3: ADVANCE PAYMENT */}
            {stepToRender === 3 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4.5 },
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 4,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)'
                }}
              >
                {/* Header Strip */}
                <Box sx={{ mb: 3.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
                      Advance Payment & Work Order Freeze
                    </Typography>
                    <Chip
                      label="CRM Stage 4"
                      size="small"
                      sx={{
                        bgcolor: '#ECFDF5',
                        color: '#059669',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        border: '1px solid #A7F3D0',
                        borderRadius: '6px'
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
                    Record client token advance to freeze commercial terms and convert enquiry into an Active Work Order.
                  </Typography>
                </Box>

                {/* Financial Overview Banner */}
                {(() => {
                  const quoteTotal = project.quotations?.[0]?.finalAmount || 0;
                  const recordedAdvance = advancePayment || 0;
                  const balanceAmount = quoteTotal > 0 ? Math.max(0, quoteTotal - recordedAdvance) : 0;

                  return (
                    <Grid container spacing={2.5} sx={{ mb: 4 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                            Approved Quotation Total
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mt: 0.5 }}>
                            ₹{quoteTotal.toLocaleString('en-IN')}
                          </Typography>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                            Advance To Be Recorded
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                            ₹{recordedAdvance.toLocaleString('en-IN')}
                          </Typography>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#FFFDF5', border: '1px solid #FFE0B2' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#B38B36', textTransform: 'uppercase' }}>
                            Balance Payable on Dispatch
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#B38B36', mt: 0.5 }}>
                            ₹{balanceAmount.toLocaleString('en-IN')}
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  );
                })()}

                {/* Payment Intake Form Card */}
                <Box sx={{ mb: 4, p: 3.5, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
                  {/* Quick Preset Buttons */}
                  {project.quotations?.[0]?.finalAmount > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 1, textTransform: 'uppercase' }}>
                        Quick Advance Presets
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {[
                          { label: '25% Token', pct: 0.25 },
                          { label: '50% Standard Advance', pct: 0.50 },
                          { label: '100% Full Payment', pct: 1.0 }
                        ].map((preset) => {
                          const quoteTotal = project.quotations?.[0]?.finalAmount || 0;
                          const calculatedAmount = Math.round(quoteTotal * preset.pct);
                          const isSelected = advancePayment === calculatedAmount;

                          return (
                            <Button
                              key={preset.label}
                              size="small"
                              variant={isSelected ? 'contained' : 'outlined'}
                              onClick={() => setAdvancePayment(calculatedAmount)}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2,
                                py: 0.75,
                                bgcolor: isSelected ? '#1E293B' : '#FFFFFF',
                                color: isSelected ? '#FFFFFF' : '#1E293B',
                                borderColor: isSelected ? '#1E293B' : '#CBD5E1',
                                '&:hover': { bgcolor: isSelected ? '#0F172A' : '#FFFDF5', borderColor: '#B38B36' }
                              }}
                            >
                              {preset.label} (₹{calculatedAmount.toLocaleString('en-IN')})
                            </Button>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  <Grid container spacing={3} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Advance Payment Received (₹)"
                        value={advancePayment === 0 ? '' : advancePayment}
                        onChange={(e) => setAdvancePayment(Number(e.target.value))}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>
                          }
                        }}
                        sx={{ bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth sx={{ bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}>
                        <InputLabel>Payment Mode</InputLabel>
                        <Select
                          value={paymentMethod}
                          label="Payment Mode"
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <MenuItem value="Bank">Bank Transfer / NEFT / RTGS</MenuItem>
                          <MenuItem value="UPI">UPI / Online Payment</MenuItem>
                          <MenuItem value="Cheque">Cheque</MenuItem>
                          <MenuItem value="Cash">Cash</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Payment Receipt Date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                      />
                    </Grid>
                  </Grid>

                  {advancePayment > 0 && (
                    <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                        Advance receipt ready to generate
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<PictureAsPdfRoundedIcon />}
                        onClick={handleDownloadReceipt}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          textTransform: 'none',
                          color: '#0284C7',
                          borderColor: '#BAE6FD',
                          bgcolor: '#F0F9FF',
                          '&:hover': { bgcolor: '#E0F2FE' }
                        }}
                      >
                        Download Payment Receipt PDF
                      </Button>
                    </Box>
                  )}
                </Box>

                {/* Footer Navigation */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #E2E8F0' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      if (viewingStepOverride !== null) setViewingStepOverride(null);
                      else handleNextStage('quotation');
                    }}
                    sx={{
                      px: 3.5,
                      py: 1.2,
                      borderRadius: 2.5,
                      borderColor: '#CBD5E1',
                      color: '#1E293B',
                      fontWeight: 700,
                      textTransform: 'none'
                    }}
                  >
                    Back
                  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<CheckCircleRoundedIcon />}
                    onClick={() => {
                      if (viewingStepOverride !== null) setViewingStepOverride(null);
                      else handleAdvancePayment();
                    }}
                    disabled={isCreatingInvoice}
                    sx={{
                      px: 4,
                      py: 1.3,
                      borderRadius: 2.5,
                      bgcolor: viewingStepOverride !== null ? '#1E293B' : '#059669',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                      '&:hover': { bgcolor: viewingStepOverride !== null ? '#0F172A' : '#047857' }
                    }}
                  >
                    {viewingStepOverride !== null ? 'Back to Active Step' : (isCreatingInvoice ? 'Processing...' : 'Confirm Advance & Convert to Work Order')}
                  </Button>
                </Box>
              </Paper>
            )}

            {/* STEP 4: SHOP DRAWING & APPROVAL */}
            {stepToRender === 4 && (
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 3, md: 4.5 }, 
                  bgcolor: '#FFFFFF', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: 4, 
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)' 
                }}
              >
                {/* Header Strip */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
                        Shop Drawing & Design Approval
                      </Typography>
                      <Chip
                        label="Stage 5: Technical Drawings"
                        size="small"
                        sx={{
                          bgcolor: '#EFF6FF',
                          color: '#1D4ED8',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          border: '1px solid #BAE6FD',
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
                      Upload finalized shop drawings, production layouts, CAD blueprints, and 3D renders.
                    </Typography>
                  </Box>

                  {/* Date Badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#F8FAFC', p: 1.25, borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
                    <CalendarMonthRoundedIcon sx={{ color: '#B38B36', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        Approval Date
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.85rem' }}>
                        {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Dual Action Hub */}
                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                  {/* Action 1: Upload Blueprints & CAD */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box
                      component="label"
                      sx={{
                        p: 3.5,
                        border: '2px dashed #C89F5A',
                        borderRadius: 3.5,
                        bgcolor: isUploading ? '#F8FAFC' : '#FFFDF5',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        textAlign: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#FFF4E5',
                          borderColor: '#B38B36',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#FFF4E5', color: '#B38B36', width: 52, height: 52 }}>
                        <CloudUploadIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                          {isUploading ? 'Uploading Drawings...' : 'Click to Upload Shop Drawings & CAD'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                          Supports JPG, PNG, WebP, PDF & DWG (Multi-select enabled)
                        </Typography>
                      </Box>
                      <input
                        type="file"
                        hidden
                        multiple
                        disabled={isUploading}
                        accept="image/*,.pdf,.dwg"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setIsUploading(true);
                            const formData = new FormData();
                            Array.from(e.target.files).forEach(f => formData.append('files', f));
                            try {
                              const res = await uploadFiles(formData).unwrap();
                              for (const url of res.urls) {
                                await addDrawing({ projectId: id, title: 'Shop Drawing', type: 'Shop Drawing', fileUrl: url }).unwrap();
                              }
                              refetchDrawings();
                              setSnackbarMessage('Shop drawings uploaded successfully!');
                            } catch (err) {
                              console.error(err);
                              setSnackbarMessage('Upload failed');
                            } finally {
                              setIsUploading(false);
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                    </Box>
                  </Grid>

                  {/* Action 2: Camera Capture */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box
                      onClick={isUploading ? undefined : startCamera}
                      sx={{
                        p: 3.5,
                        border: '2px dashed #0284C7',
                        borderRadius: 3.5,
                        bgcolor: '#F0F9FF',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        textAlign: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#E0F2FE',
                          borderColor: '#0369A1',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#E0F2FE', color: '#0284C7', width: 52, height: 52 }}>
                        <CameraAltIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                          Snap Physical Blueprint / Layout
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                          Take instant photos of printed workshop drawings or site revisions
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {/* Uploaded Shop Drawings Gallery */}
                {drawings && drawings.filter((d: any) => d.type === 'Shop Drawing').length > 0 ? (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionRoundedIcon sx={{ fontSize: 20, color: '#B38B36' }} />
                      Uploaded Shop Drawings ({drawings.filter((d: any) => d.type === 'Shop Drawing').length})
                    </Typography>

                    <Grid container spacing={2}>
                      {drawings.filter((d: any) => d.type === 'Shop Drawing').map((drawing: any) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={drawing.id}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              bgcolor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              transition: 'all 0.2s ease',
                              '&:hover': { borderColor: '#B38B36', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }
                            }}
                          >
                            <Box
                              onClick={() => setPreviewFileUrl(drawing.fileUrl)}
                              sx={{
                                width: '100%',
                                height: 140,
                                borderRadius: 2,
                                overflow: 'hidden',
                                bgcolor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                position: 'relative'
                              }}
                            >
                              {drawing.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                  <PictureAsPdfRoundedIcon sx={{ fontSize: 40, color: '#DC2626' }} />
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>PDF Blueprint</Typography>
                                </Box>
                              ) : (
                                <img src={drawing.fileUrl} alt={drawing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </Box>

                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                                  {drawing.title}
                                </Typography>
                                <Chip label={`v${drawing.version}`} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#FFF4E5', color: '#B38B36' }} />
                              </Box>
                              {drawing.comments && (
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>
                                  Note: {drawing.comments}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                                {new Date(drawing.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #E2E8F0' }}>
                              <Button
                                size="small"
                                onClick={() => setPreviewFileUrl(drawing.fileUrl)}
                                sx={{ textTransform: 'none', fontWeight: 700, color: '#0284C7', p: 0 }}
                              >
                                View Preview
                              </Button>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="Edit Details">
                                  <IconButton size="small" onClick={() => handleEditDrawingClick(drawing)} sx={{ color: '#64748B' }}>
                                    <EditIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Drawing">
                                  <IconButton size="small" onClick={() => handleDeleteDrawingClick(drawing.id)} sx={{ color: '#DC2626' }}>
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : (
                  <Box sx={{ mb: 4, p: 4, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 3, border: '1px dashed #CBD5E1' }}>
                    <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                      No shop drawings uploaded yet. Use the upload box or camera above to add technical blueprints.
                    </Typography>
                  </Box>
                )}

                {/* Footer Navigation */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #E2E8F0' }}>
                  <Button 
                    variant="outlined" 
                    size="large" 
                    onClick={() => {
                      if (viewingStepOverride !== null) setViewingStepOverride(null);
                      else handleNextStage('advance_payment');
                    }} 
                    sx={{ 
                      px: 3.5, 
                      py: 1.2, 
                      borderRadius: 2.5,
                      borderColor: '#CBD5E1',
                      color: '#1E293B',
                      fontWeight: 700,
                      textTransform: 'none'
                    }}
                  >
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                      variant="contained" 
                      size="large" 
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={async () => {
                        if (viewingStepOverride !== null) {
                           setViewingStepOverride(null);
                        } else {
                           await updateProject({ id: id as string, data: { status: 'production' } }).unwrap();
                           setActiveStep(5);
                           setViewingStepOverride(null);
                           refetch();
                        }
                      }} 
                      sx={{ 
                        px: 4, 
                        py: 1.3, 
                        borderRadius: 2.5, 
                        bgcolor: viewingStepOverride !== null ? '#1E293B' : '#059669', 
                        color: '#FFFFFF',
                        fontWeight: 800,
                        textTransform: 'none',
                        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                        '&:hover': { bgcolor: viewingStepOverride !== null ? '#0F172A' : '#047857' } 
                      }}
                    >
                      {viewingStepOverride !== null ? 'Back to Active Step' : 'Proceed to Production Pipeline'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* STEP 5: PRODUCTION MANAGEMENT (SLABS & PRODUCTS TRACKING) */}
            {stepToRender === 5 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5, md: 3 },
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 4,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)',
                  width: '100%'
                }}
              >
                {viewingStepOverride !== null && (
                   <Button startIcon={<ArrowBackIcon />} variant="text" size="small" onClick={() => setViewingStepOverride(null)} sx={{ mb: 2.5, fontWeight: 700, color: '#0284C7', textTransform: 'none' }}>
                     Back to Pipeline
                   </Button>
                )}

                {/* Executive Header Bar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.3px' }}>
                        Slabs & Products Production Pipeline
                      </Typography>
                      <Chip
                        label={isPlanningMode ? 'Stage Configuration' : 'Live Production Tracking'}
                        size="small"
                        sx={{
                          bgcolor: isPlanningMode ? '#FEF3C7' : '#ECFDF5',
                          color: isPlanningMode ? '#B45309' : '#059669',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          border: '1px solid',
                          borderColor: isPlanningMode ? '#FDE68A' : '#A7F3D0',
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
                      {isPlanningMode 
                        ? 'Configure required manufacturing stages, piece counts, and surface finishes before starting production.' 
                        : 'Real-time piece-level tracking across factory work stations and machine operations.'}
                    </Typography>
                  </Box>

                  {/* Summary Metric Pills & Top Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8FAFC', px: 1.5, py: 0.75, borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <LayersRoundedIcon sx={{ fontSize: 18, color: '#B38B36' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E293B' }}>
                        {projectSlabs?.length || 0} Slabs
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8FAFC', px: 1.5, py: 0.75, borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <Inventory2RoundedIcon sx={{ fontSize: 18, color: '#0284C7' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E293B' }}>
                        {projectSlabs?.reduce((acc: number, s: any) => acc + (s.pieces?.length || 0), 0) || 0} Pieces
                      </Typography>
                    </Box>

                    <Button 
                      variant="outlined" 
                      startIcon={<SyncIcon />} 
                      onClick={async () => {
                        try {
                          await syncSlabs(id as string).unwrap();
                          refetchSlabs();
                          setSnackbarMessage('Synced successfully with Quotation!');
                        } catch(err) {
                          setSnackbarMessage('Error syncing slabs.');
                        }
                      }}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        borderColor: '#CBD5E1',
                        color: '#1E293B',
                        bgcolor: '#FFFFFF',
                        '&:hover': { borderColor: '#B38B36', bgcolor: '#FFFDF5' }
                      }}
                    >
                      Sync with Quotation
                    </Button>

                    {isPlanningMode && (
                      <Button 
                        variant="contained" 
                        startIcon={<PlayArrowRoundedIcon />}
                        onClick={handleStartAllWork}
                        sx={{
                          borderRadius: 2.5,
                          textTransform: 'none',
                          fontWeight: 800,
                          bgcolor: '#059669',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                          '&:hover': { bgcolor: '#047857' }
                        }}
                      >
                        Finalize & Send to Production
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Luxury Production Table */}
                <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden', mb: 3.5 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.75 }}>
                          Product / Slab Name
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.75 }}>
                          Original Spec
                        </TableCell>
                        {activeColumns.includes('Production') && (
                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.75 }}>
                            Production
                          </TableCell>
                        )}
                        {activeColumns.includes('Polishing') && (
                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.75 }}>
                            Polishing (Honed / Mirror)
                          </TableCell>
                        )}
                        {activeColumns.includes('Packing') && (
                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.75 }}>
                            Packing
                          </TableCell>
                        )}
                        {activeColumns.includes('Dispatch') && (
                          <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.75 }}>
                            Dispatch
                          </TableCell>
                        )}
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.75 }} align="center">
                          Action / Status
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projectSlabs?.map((slab: any, idx: number) => (
                        isPlanningMode 
                          ? <SlabPlanningRow key={slab.id} slab={slab} index={idx} onEdit={handleEditSlabClick} onDelete={handleDeleteSlab} products={products} activeColumns={activeColumns} />
                          : <SlabTrackingRow key={slab.id} slab={slab} index={idx} onEdit={handleEditSlabClick} onDelete={handleDeleteSlab} products={products} productionLogs={productionLogs || []} activeColumns={activeColumns} projectTotalPieces={projectSlabs?.reduce((acc: number, s: any) => acc + (s.pieces?.length || 0), 0) || 0} />
                      ))}
                      {(!projectSlabs || projectSlabs.length === 0) && (
                         <TableRow>
                           <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                             <LayersRoundedIcon sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                             <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                               No slabs created yet
                             </Typography>
                             <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                               Click "Sync with Quotation" above to auto-generate slabs from your approved quotation.
                             </Typography>
                           </TableCell>
                         </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Paper>

                {/* Footer Navigation */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  {viewingStepOverride !== null ? (
                    <Button 
                      variant="contained" 
                      size="large" 
                      onClick={() => setViewingStepOverride(null)} 
                      sx={{ 
                        px: 4, 
                        py: 1.3, 
                        borderRadius: 2.5, 
                        bgcolor: '#1E293B', 
                        color: '#FFFFFF',
                        fontWeight: 800, 
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#0F172A' } 
                      }}
                    >
                      Back to Active Step
                    </Button>
                  ) : !isPlanningMode ? (
                    <Button 
                      variant="contained" 
                      size="large" 
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={async () => {
                         await updateProject({ id: id as string, data: { status: 'work_order' } }).unwrap();
                         setActiveStep(7);
                         setViewingStepOverride(null);
                         refetch();
                      }} 
                      sx={{ 
                        px: 5, 
                        py: 1.3, 
                        borderRadius: 2.5, 
                        bgcolor: '#059669', 
                        color: '#FFFFFF',
                        fontWeight: 800, 
                        fontSize: '1rem',
                        textTransform: 'none',
                        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                        '&:hover': { bgcolor: '#047857' } 
                      }}
                    >
                      Finalize & Send to Dispatch
                    </Button>
                  ) : null}
                </Box>
              </Paper>
            )}

            {/* STEP 6: WORK ORDER ACTIVE */}
            {stepToRender >= 7 && (
              <Paper elevation={0} sx={{ 
                p: 6, textAlign: 'center', 
                border: '1px solid', borderColor: '#C8E6C9', 
                borderRadius: 4, bgcolor: '#F4FBF5' 
              }}>
                <CheckCircleIcon sx={{ fontSize: 80, color: '#4CAF50', mb: 2 }} />
                <Typography variant="h4" fontWeight="bold" color="success.main" mb={2}>Project Pipeline Complete!</Typography>
                <Typography variant="body1" color="text.secondary" mb={4} sx={{ maxWidth: 500, mx: 'auto' }}>
                  This project has successfully completed the enquiry pipeline and is now an <strong>Active Work Order</strong> in the factory.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button variant="outlined" color="primary" size="large" onClick={handleDownloadWorkOrder} sx={{ borderRadius: 2, px: 4 }}>
                    Download Work Order PDF
                  </Button>
                  <Button variant="contained" color="success" size="large" onClick={() => navigate('/projects')} sx={{ borderRadius: 2, px: 4 }}>
                    Go to Active Work Orders
                  </Button>
                </Box>
              </Paper>
            )}

          </Box>
        </Box> {/* End of LEFT MAIN COLUMN */}

        {/* RIGHT SIDEBAR (Costs Category for Step 2) */}
        {stepToRender === 2 && (
          <Box sx={{ width: { xs: '100%', md: 350 }, flexShrink: 0, position: 'sticky', top: 24 }}>

            <Paper elevation={0} sx={{ p: 4, mt: 10, border: '1px solid', borderColor: '#E8E1D5', borderRadius: 4, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" mb={1}>Costs Category</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Select a category to view and edit its cost estimation.</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {products.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No products added yet.</Typography>
                ) : (
                  products.map((p, idx) => {
                    const currentCostId = activeCostProductId || products[0].id;
                    const isSelected = p.id === currentCostId;
                    const hasCosts = (quoteDetails[p.id] || []).some((c: any) => c.amount > 0);
                    return (
                      <Box 
                        key={p.id} 
                        onClick={() => {
                          setActiveCostProductId(p.id);
                          if (!quoteDetails[p.id]) {
                            setQuoteDetails(prev => ({ ...prev, [p.id]: getDefaultCosts() }));
                          }
                        }}
                        sx={{ 
                          p: 2, 
                          border: isSelected ? '2px solid' : '1px solid', 
                          borderColor: isSelected ? '#B38B36' : '#E8E1D5', 
                          borderRadius: 3, 
                          bgcolor: isSelected ? '#FFF' : '#FAFAFA',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s ease-in-out',
                          boxShadow: isSelected ? '0 4px 12px rgba(179, 139, 54, 0.15)' : 'none',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': { borderColor: '#B38B36', bgcolor: '#FFF', boxShadow: '0 4px 12px rgba(179, 139, 54, 0.1)' }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: isSelected ? '#B38B36' : '#E0E0E0', color: isSelected ? '#FFF' : 'text.secondary', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {idx + 1}
                          </Avatar>
                          <Typography variant="subtitle2" fontWeight={isSelected ? 700 : 500} color={isSelected ? "#333" : "text.secondary"}>{p.category}</Typography>
                        </Box>
                        {hasCosts ? (
                           <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
                        ) : (
                           <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isSelected ? '#B38B36' : '#E0E0E0' }} />
                        )}
                      </Box>
                    )
                  })
                )}
              </Box>
            </Paper>

        </Box>
        )}

      </Box>


      {/* CAMERA CAPTURE DIALOG */}
      <Dialog 
        open={isCameraOpen} 
        onClose={stopCamera} 
        maxWidth="md" 
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#1A1C29', color: '#FFF', borderRadius: 4, border: '1px solid #333' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          Take Photo
          <IconButton onClick={stopCamera} sx={{ color: '#FFF' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <Box sx={{ 
            width: '100%', 
            maxWidth: 600, 
            bgcolor: '#000', 
            borderRadius: 4, 
            overflow: 'hidden',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            mb: 3, position: 'relative'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'cover' }} 
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Box>
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<CameraAltIcon />} 
            onClick={capturePhoto}
            sx={{ 
              bgcolor: '#10B981', color: '#FFF', 
              fontWeight: 'bold', px: 6, py: 1.5, borderRadius: 2,
              '&:hover': { bgcolor: '#059669' }
            }}
          >
            Capture Photo
          </Button>
        </DialogContent>
      </Dialog>
      {/* EDIT DETAILS DIALOG */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Enquiry Details</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
          <TextField 
            label="Date" 
            type="date"
            fullWidth 
            value={editFormData.createdAt}
            onChange={(e) => setEditFormData({...editFormData, createdAt: e.target.value})}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField 
            label="Project / Enquiry Title" 
            fullWidth 
            value={editFormData.name}
            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
          />
          <TextField 
            label="Client Name" 
            fullWidth 
            value={editFormData.clientName}
            onChange={(e) => setEditFormData({...editFormData, clientName: e.target.value})}
          />
          <TextField 
            label="Contact Number" 
            fullWidth 
            value={editFormData.clientContact}
            onChange={(e) => setEditFormData({...editFormData, clientContact: e.target.value})}
          />
          <TextField 
            label="Location" 
            fullWidth 
            value={editFormData.location}
            onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
          />
          <TextField 
            label="Lead Source" 
            fullWidth 
            value={editFormData.enquirySource}
            onChange={(e) => setEditFormData({...editFormData, enquirySource: e.target.value})}
          />
          <TextField 
            label="Requirements / Scope of Work" 
            fullWidth 
            multiline 
            rows={4}
            value={editFormData.description}
            onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
          />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>Client Photos</Typography>
            
            {/* Grid of existing photos */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              {editFormData.customerPhoto ? editFormData.customerPhoto.split(',').filter(Boolean).map((photoUrl, idx) => (
                <Box key={idx} sx={{ position: 'relative', width: 80, height: 80, border: '1px solid #CCC', borderRadius: 2, overflow: 'hidden' }}>
                  <img src={photoUrl} alt={`Client Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      const photos = editFormData.customerPhoto.split(',').filter(Boolean);
                      const updated = photos.filter((_, i) => i !== idx).join(',');
                      setEditFormData({ ...editFormData, customerPhoto: updated });
                    }}
                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(255, 255, 255, 0.7)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' } }}
                  >
                    <CloseIcon fontSize="small" sx={{ color: 'error.main' }} />
                  </IconButton>
                </Box>
              )) : null}
            </Box>

            {/* Upload & Take Photo buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                disabled={isUploading}
                sx={{ 
                  height: 100, 
                  width: 130, 
                  border: '1.5px dashed #B38B36', 
                  bgcolor: '#FFFDF5', 
                  borderRadius: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  fontSize: '0.82rem', 
                  color: '#B38B36', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  textTransform: 'none', 
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(179, 139, 54, 0.04)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    borderColor: '#B38B36', 
                    bgcolor: '#FFF4E5', 
                    color: '#B38B36',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(179, 139, 54, 0.15)'
                  } 
                }}
              >
                <CloudUploadIcon sx={{ fontSize: '1.75rem', mb: 0.5, color: '#B38B36' }} />
                {isUploading ? 'Uploading...' : 'Upload Photo'}
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setIsUploading(true);
                      const filesArray = Array.from(e.target.files);
                      const uploadPromises = filesArray.map(async (file) => {
                        const uploadData = new FormData();
                        uploadData.append('files', file);
                        const res = await uploadFiles(uploadData).unwrap();
                        return res.success && res.urls.length > 0 ? res.urls[0] : null;
                      });
                      try {
                        const urls = await Promise.all(uploadPromises);
                        const validUrls = urls.filter((url): url is string => !!url);
                        if (validUrls.length > 0) {
                          const existing = editFormData.customerPhoto ? editFormData.customerPhoto.split(',').filter(Boolean) : [];
                          const updated = [...existing, ...validUrls].join(',');
                          setEditFormData({ ...editFormData, customerPhoto: updated });
                          setSnackbarMessage('Photos uploaded successfully!');
                        }
                      } catch (err) {
                        console.error('Failed to upload client photos', err);
                        setSnackbarMessage('Upload failed');
                      } finally {
                        setIsUploading(false);
                      }
                    }
                  }}
                />
              </Button>
              <Button
                variant="outlined"
                disabled={isUploading}
                onClick={() => startCamera('clientPhoto')}
                sx={{ 
                  height: 100, 
                  width: 130, 
                  border: '1.5px dashed #B38B36', 
                  bgcolor: '#FFFDF5', 
                  borderRadius: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  fontSize: '0.82rem', 
                  color: '#B38B36', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  textTransform: 'none', 
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(179, 139, 54, 0.04)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    borderColor: '#B38B36', 
                    bgcolor: '#FFF4E5', 
                    color: '#B38B36',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(179, 139, 54, 0.15)'
                  } 
                }}
              >
                <CameraAltIcon sx={{ fontSize: '1.75rem', mb: 0.5, color: '#B38B36' }} />
                Take Photo
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => setIsEditDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="primary" onClick={async () => {
            try {
              const dataToUpdate = {
                ...editFormData,
                createdAt: editFormData.createdAt ? new Date(editFormData.createdAt).toISOString() : undefined
              };
              await updateProject({ id: id as string, data: dataToUpdate }).unwrap();
              setIsEditDialogOpen(false);
              refetch();
            } catch (err) {
              console.error(err);
            }
          }}>Save Changes</Button>
        </Box>
      </Dialog>

      {/* FILE PREVIEW DIALOG */}
      <Dialog open={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          File Preview
          <IconButton onClick={() => setPreviewFileUrl(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ height: '80vh', p: 0, bgcolor: '#F5F5F5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {previewFileUrl && (
            previewFileUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewFileUrl} title="File Preview" width="100%" height="100%" style={{ border: 'none' }} />
            ) : (
              <img src={previewFileUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )
          )}
        </DialogContent>
      </Dialog>
      {/* PRODUCT DIALOG */}
      <Dialog open={isProductDialogOpen} onClose={() => setIsProductDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingProducts.length === 1 && products.some(p => p.id === editingProducts[0].id) ? 'Edit Product' : 'Add Products'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 3, pb: 4 }}>
          {editingProducts.map((ep, index) => (
            <Box key={ep.id} sx={{ p: 3, border: '1px solid #EEEEEE', borderRadius: 2, bgcolor: '#FAFAFA', position: 'relative' }}>
              {editingProducts.length > 1 && (
                <IconButton 
                  size="small" 
                  color="error" 
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={() => handleRemoveRow(index)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl fullWidth size="small">
                  <Autocomplete
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={categories}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (option.inputValue) return option.inputValue;
                      return option.name;
                    }}
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      const { inputValue } = params;
                      const isExisting = options.some((option) => inputValue === option.name);
                      if (inputValue !== '' && !isExisting) {
                        filtered.push({
                          inputValue,
                          name: `Add "${inputValue}"`,
                          isNew: true,
                        });
                      }
                      return filtered;
                    }}
                    value={categories.find((c: any) => c.name === ep.category) || ep.category}
                    onChange={(e, newValue) => {
                      if (typeof newValue === 'string') {
                        handleUpdateEditingProduct(index, 'category', newValue);
                      } else if (newValue && newValue.inputValue) {
                        // User selected "Add 'xxx'"
                        handleUpdateEditingProduct(index, 'category', newValue.inputValue);
                        createCategory({ name: newValue.inputValue });
                      } else if (newValue && newValue.name) {
                        handleUpdateEditingProduct(index, 'category', newValue.name);
                      } else {
                        handleUpdateEditingProduct(index, 'category', '');
                      }
                    }}
                    onInputChange={(e, newInputValue) => handleUpdateEditingProduct(index, 'category', newInputValue)}
                    renderInput={(params) => <TextField {...params} label="Category / Item Name" size="small" />}
                    renderOption={(props, option) => {
                      const { key, ...restProps } = props as any;
                      if (option.isNew) {
                        return (
                          <li key={key} {...restProps} style={{ color: '#B38B36', fontWeight: 'bold' }}>
                            {option.name}
                          </li>
                        );
                      }
                      return (
                        <li key={key} {...restProps} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span>{option.name}</span>
                          <IconButton 
                            size="small" 
                            color="error"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (window.confirm(`Are you sure you want to remove "${option.name}" from the category list?`)) {
                                deleteCategory(option.id);
                              }
                            }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                        </li>
                      );
                    }}
                    fullWidth
                  />
                </FormControl>
                <FormControl fullWidth size="small">
                  <Autocomplete
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={units}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (option.inputValue) return option.inputValue;
                      return option.name;
                    }}
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      const { inputValue } = params;
                      const isExisting = options.some((option) => inputValue === option.name);
                      if (inputValue !== '' && !isExisting) {
                        filtered.push({
                          inputValue,
                          name: `Add "${inputValue}"`,
                          isNew: true,
                        });
                      }
                      return filtered;
                    }}
                    value={units.find((u: any) => u.name === ep.unit) || ep.unit}
                    onChange={(e, newValue) => {
                      if (typeof newValue === 'string') {
                        handleUpdateEditingProduct(index, 'unit', newValue);
                      } else if (newValue && newValue.inputValue) {
                        handleUpdateEditingProduct(index, 'unit', newValue.inputValue);
                        createUnit({ name: newValue.inputValue });
                      } else if (newValue && newValue.name) {
                        handleUpdateEditingProduct(index, 'unit', newValue.name);
                      } else {
                        handleUpdateEditingProduct(index, 'unit', '');
                      }
                    }}
                    onInputChange={(e, newInputValue) => handleUpdateEditingProduct(index, 'unit', newInputValue)}
                    renderInput={(params) => <TextField {...params} label="Unit" size="small" />}
                    renderOption={(props, option) => {
                      const { key, ...restProps } = props as any;
                      if (option.isNew) {
                        return (
                          <li key={key} {...restProps} style={{ color: '#B38B36', fontWeight: 'bold' }}>
                            {option.name}
                          </li>
                        );
                      }
                      return (
                        <li key={key} {...restProps} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span>{option.name}</span>
                          <IconButton 
                            size="small" 
                            color="error"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (window.confirm(`Are you sure you want to remove "${option.name}" from the unit list?`)) {
                                deleteUnit(option.id);
                              }
                            }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                        </li>
                      );
                    }}
                    fullWidth
                  />
                </FormControl>
              </Box>

              {/* Product Design Photo Upload/Camera section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>Product Design Photo</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {ep.photo && ep.photo.split(',').filter(Boolean).length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {ep.photo.split(',').filter(Boolean).map((photoUrl, photoIdx) => (
                        <Box key={photoIdx} sx={{ position: 'relative', width: 80, height: 80, border: '1px solid #CCC', borderRadius: 2, overflow: 'hidden' }}>
                          <img src={photoUrl} alt="Product Design" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              const photos = ep.photo!.split(',').filter(Boolean);
                              const updated = photos.filter((_, i) => i !== photoIdx).join(',');
                              handleUpdateEditingProduct(index, 'photo', updated);
                            }}
                            sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(255, 255, 255, 0.7)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' } }}
                          >
                            <CloseIcon fontSize="small" sx={{ color: 'error.main' }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        disabled={isUploading}
                        sx={{ 
                          height: 80, 
                          width: 120, 
                          border: '1.5px dashed #B38B36', 
                          bgcolor: '#FFFDF5', 
                          borderRadius: 3, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          fontSize: '0.82rem', 
                          color: '#B38B36', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          textTransform: 'none', 
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(179, 139, 54, 0.04)',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': { 
                            borderColor: '#B38B36', 
                            bgcolor: '#FFF4E5', 
                            color: '#B38B36',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(179, 139, 54, 0.15)'
                          } 
                        }}
                      >
                        <CloudUploadIcon sx={{ fontSize: '1.5rem', mb: 0.5, color: '#B38B36' }} />
                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                        <input
                          type="file"
                          multiple
                          hidden
                          accept="image/*"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setIsUploading(true);
                              const filesArray = Array.from(e.target.files);
                              const uploadPromises = filesArray.map(async (file) => {
                                const uploadData = new FormData();
                                uploadData.append('files', file);
                                const res = await uploadFiles(uploadData).unwrap();
                                return res.success && res.urls.length > 0 ? res.urls[0] : null;
                              });
                              try {
                                const urls = await Promise.all(uploadPromises);
                                const validUrls = urls.filter((url): url is string => !!url);
                                if (validUrls.length > 0) {
                                  const existing = ep.photo ? ep.photo.split(',').filter(Boolean) : [];
                                  const updated = [...existing, ...validUrls].join(',');
                                  handleUpdateEditingProduct(index, 'photo', updated);
                                }
                              } catch (err) {
                                console.error('Failed to upload product photos', err);
                                setSnackbarMessage('Upload failed');
                              } finally {
                                setIsUploading(false);
                              }
                            }
                          }}
                        />
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={isUploading}
                        onClick={() => {
                          setCameraProductIndex(index);
                          startCamera('productPhoto');
                        }}
                        sx={{ 
                          height: 80, 
                          width: 120, 
                          border: '1.5px dashed #B38B36', 
                          bgcolor: '#FFFDF5', 
                          borderRadius: 3, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          fontSize: '0.82rem', 
                          color: '#B38B36', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          textTransform: 'none', 
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(179, 139, 54, 0.04)',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': { 
                            borderColor: '#B38B36', 
                            bgcolor: '#FFF4E5', 
                            color: '#B38B36',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(179, 139, 54, 0.15)'
                          } 
                        }}
                      >
                        <CameraAltIcon sx={{ fontSize: '1.5rem', mb: 0.5, color: '#B38B36' }} />
                        Take Photo
                      </Button>
                    </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Length (L)</Typography>
                  <TextField size="small" type="number" value={ep.length === 0 ? '' : ep.length} onChange={e => handleUpdateEditingProduct(index, 'length', Number(e.target.value))} fullWidth />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Width (W)</Typography>
                  <TextField size="small" type="number" value={ep.width === 0 ? '' : ep.width} onChange={e => handleUpdateEditingProduct(index, 'width', Number(e.target.value))} fullWidth />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>MM</Typography>
                  <TextField size="small" type="number" value={ep.breadth === 0 ? '' : ep.breadth} onChange={e => handleUpdateEditingProduct(index, 'breadth', Number(e.target.value))} fullWidth />
                </Box>
                {ep.unit === 'Pieces' && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Dimension In</Typography>
                    <Select 
                      size="small" 
                      fullWidth 
                      value={(ep as any).dimensionUnit || 'inch'} 
                      onChange={e => handleUpdateEditingProduct(index, 'dimensionUnit', e.target.value)}
                    >
                      <MenuItem value="inch">Inches</MenuItem>
                      <MenuItem value="sq_ft">Sq. Feet</MenuItem>
                    </Select>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField 
                  size="small" type="number" 
                  label={ep.unit === 'Pieces' ? 'Total Sq.Ft' : (ep.unit?.toLowerCase().includes('inch') ? 'Total Sq.Ft' : `Total ${ep.unit || ''}`)} 
                  value={(() => {
                    const l = ep.length || 0;
                    const w = ep.width || 0;
                    if (ep.unit === 'Pieces') {
                      return ((ep as any).dimensionUnit || 'inch') === 'inch' ? Number(((l * w) / 144).toFixed(2)) : l * w;
                    }
                    return ep.unit?.toLowerCase().includes('inch') ? Number(((l * w) / 144).toFixed(2)) : l * w;
                  })()} 
                  disabled 
                  fullWidth 
                  sx={{ bgcolor: '#f5f5f5' }}
                />
                <TextField 
                  size="small" type="number" label={ep.unit === 'Pieces' ? "Rate (per piece)" : "Rate (per unit)"} 
                  value={ep.rate === 0 ? '' : ep.rate} 
                  onChange={e => handleUpdateEditingProduct(index, 'rate', Number(e.target.value))} 
                  fullWidth 
                  slotProps={{ input: { startAdornment: <Typography variant="body2" color="text.secondary" sx={{mr: 0.5}}>₹</Typography> } as any }}
                />
                <TextField 
                  size="small" type="number" label={ep.unit === 'Pieces' ? "Quantity (Pieces)" : "No. of Pieces"} 
                  value={ep.qty === 0 ? '' : ep.qty} 
                  onChange={e => handleUpdateEditingProduct(index, 'qty', Number(e.target.value))} 
                  fullWidth 
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Item Amount:</Typography>
                <Typography variant="subtitle1" color="#B38B36" sx={{ fontWeight: 'bold' }}>₹{ep.amount.toLocaleString('en-IN')}</Typography>
              </Box>
            </Box>
          ))}
          
          <Button variant="outlined" sx={{ borderStyle: 'dashed', borderWidth: 2, py: 1.5 }} onClick={handleAddNewRow}>
            + Add Another Item
          </Button>

          <Box sx={{ p: 2, mt: 1, bgcolor: '#FFFDF5', border: '1px solid #E8E1D5', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="text.secondary">Grand Total</Typography>
            <Typography variant="h4" color="#B38B36" sx={{ fontWeight: 'bold' }}>
              ₹{editingProducts.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: '#FAFAFA' }}>
          <Button onClick={() => setIsProductDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSaveProducts} sx={{ px: 4 }}>Save Products</Button>
        </Box>
      </Dialog>



      {/* ADD/EDIT ADDITIONAL COST DIALOG */}
      <Dialog open={isCostDialogOpen} onClose={() => setIsCostDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Manage Cost Items</DialogTitle>
        <DialogContent dividers sx={{ pt: 2, pb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
             <TextField 
                label="New Cost Item Name (e.g. Custom Polish)" 
                fullWidth 
                size="small"
                value={customCostName} 
                onChange={(e) => setCustomCostName(e.target.value)} 
             />
             <Button 
                variant="contained"
                onClick={() => {
                  if (customCostName.trim() && products.length > 0) {
                    setQuoteDetails(prev => {
                      const newState = { ...prev };
                      const newCostId = `cost_${new Date().getTime()}`;
                      products.forEach(p => {
                         const list = newState[p.id] || getDefaultCosts();
                         newState[p.id] = [
                           ...list,
                           { id: newCostId, name: customCostName.trim(), amount: 0 }
                         ];
                      });
                      return newState;
                    });
                    setCustomCostName('');
                  }
                }}
             >Add Field</Button>
          </Box>

          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">Current Cost Items</Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflowY: 'auto', p: 1 }}>
             {products.length > 0 && (quoteDetails[products[0].id] || getDefaultCosts()).map((item: any) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid #eee', borderRadius: 2 }}>
                   <Typography variant="body2">{item.name}</Typography>
                   <IconButton 
                     size="small" 
                     color="error" 
                     onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently remove "${item.name}" from ALL products?`)) {
                           setQuoteDetails(prev => {
                             const newState = { ...prev };
                             products.forEach(p => {
                               const list = newState[p.id] || [];
                               newState[p.id] = list.filter(c => c.id !== item.id);
                             });
                             return newState;
                           });
                        }
                     }}
                   >
                     <RemoveIcon />
                   </IconButton>
                </Box>
             ))}
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => setIsCostDialogOpen(false)} color="inherit">Close</Button>
        </Box>
      </Dialog>

      {/* CREATE SLAB DIALOG */}
      <Dialog 
        open={slabDialogOpen} 
        onClose={() => setSlabDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B', fontSize: '1.25rem' }}>Add New Slab Specification</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          <FormControl fullWidth>
            <InputLabel>Link Raw Material (Optional)</InputLabel>
            <Select
              label="Link Raw Material (Optional)"
              value={slabForm.inventoryId}
              onChange={(e) => setSlabForm({ ...slabForm, inventoryId: e.target.value })}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="" disabled>Select Raw Material</MenuItem>
              {inventoryItems?.filter((i: any) => i.quantity > 0).map((item: any) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.itemName} (Block: {item.blockNumber || 'N/A'}) - Avail: {item.quantity}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField 
            select
            label="Select Slab Category (From Quotation)" 
            fullWidth 
            value={slabForm.name} 
            onChange={(e) => setSlabForm({ ...slabForm, name: e.target.value })} 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          >
            {products?.filter(p => !projectSlabs?.some((s: any) => s.name === p.category)).length > 0 ? (
              products.filter(p => !projectSlabs?.some((s: any) => s.name === p.category)).map((p: any) => (
                <MenuItem key={p.id} value={p.category}>{p.category}</MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>All Categories Added / None Found</MenuItem>
            )}
          </TextField>
          <TextField 
            label="Size / Grid Spec (e.g. 5x2, 10x4)" 
            fullWidth 
            value={slabForm.size} 
            onChange={(e) => setSlabForm({ ...slabForm, size: e.target.value })} 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setSlabDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateSlab} 
            disabled={!slabForm.name}
            sx={{ 
              borderRadius: 2, 
              bgcolor: '#1E293B', 
              color: '#FFFFFF', 
              fontWeight: 800, 
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#0F172A' }
            }}
          >
            Add Slab
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT SLAB DIALOG */}
      <Dialog 
        open={editSlabDialogOpen} 
        onClose={() => setEditSlabDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B', fontSize: '1.25rem' }}>Edit Slab Specification</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2.5 }}>
          <TextField 
            select
            label="Select Slab Category (From Quotation)" 
            fullWidth 
            value={slabForm.name} 
            onChange={(e) => setSlabForm({ ...slabForm, name: e.target.value })} 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          >
            {products?.filter(p => p.category === slabForm.name || !projectSlabs?.some((s: any) => s.name === p.category)).length > 0 ? (
              products.filter(p => p.category === slabForm.name || !projectSlabs?.some((s: any) => s.name === p.category)).map((p: any) => (
                <MenuItem key={p.id} value={p.category}>{p.category}</MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>All Categories Added / None Found</MenuItem>
            )}
          </TextField>
          <TextField 
            label="Grid Layout / Size Spec (e.g. 5x2)" 
            value={slabForm.size} 
            onChange={(e) => setSlabForm({ ...slabForm, size: e.target.value })} 
            fullWidth 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#1E293B', fontWeight: 800 }}>Required Manufacturing Stages:</Typography>
            <Grid container spacing={1.5}>
              {['Production', 'Polishing - Honed', 'Polishing - Mirror', 'Packing', 'Dispatch'].map(stage => {
                const isSelected = slabForm.requiredStages?.includes(stage) || (stage === 'Polishing - Honed' && slabForm.requiredStages?.includes('Polishing')) || false;
                return (
                  <Grid size={{ xs: 6, sm: 4 }} key={stage}>
                    <Box
                      onClick={() => {
                        let newStages;
                        if (!isSelected) {
                          newStages = [...(slabForm.requiredStages || []).filter(s => s !== 'Polishing'), stage];
                        } else {
                          newStages = (slabForm.requiredStages || []).filter(s => s !== stage && s !== 'Polishing');
                        }
                        setSlabForm({ ...slabForm, requiredStages: newStages });
                      }}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isSelected ? '#86EFAC' : '#E2E8F0',
                        bgcolor: isSelected ? '#F0FDF4' : '#F8FAFC',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: '#16A34A', bgcolor: '#DCFCE7' }
                      }}
                    >
                      <Checkbox 
                        size="small"
                        checked={isSelected}
                        sx={{ p: 0, '&.Mui-checked': { color: '#16A34A' } }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: isSelected ? '#166534' : '#64748B', fontSize: '0.78rem' }}>
                        {stage}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setEditSlabDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateSlab} 
            disabled={!slabForm.name}
            sx={{ 
              borderRadius: 2, 
              bgcolor: '#1E293B', 
              color: '#FFFFFF', 
              fontWeight: 800, 
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#0F172A' }
            }}
          >
            Update Slab
          </Button>
        </DialogActions>
      </Dialog>

      {/* RESERVE MATERIAL DIALOG */}
      <Dialog 
        open={reserveDialogOpen} 
        onClose={() => setReserveDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B' }}>Reserve Raw Material</DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          {selectedInventoryItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  Selected: <strong style={{ color: '#1E293B' }}>{selectedInventoryItem.itemName}</strong> (Block: {selectedInventoryItem.blockNumber || 'N/A'})
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                  Available Stock: <strong style={{ color: '#059669' }}>{selectedInventoryItem.quantity} {selectedInventoryItem.unit}</strong>
                </Typography>
              </Box>
              <TextField 
                label={`Quantity to Reserve (${selectedInventoryItem.unit})`} 
                type="number" 
                fullWidth 
                value={reserveQty}
                onChange={(e) => setReserveQty(e.target.value)}
                autoFocus
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setReserveDialogOpen(false)} sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (reserveQty && !isNaN(Number(reserveQty))) {
                reserveMaterial({ 
                  projectId: id as string, 
                  data: { 
                    inventoryId: selectedInventoryItem.id, 
                    quantity: Number(reserveQty), 
                    cost: selectedInventoryItem.costPerUnit * Number(reserveQty) 
                  } 
                }).unwrap().then(() => {
                  refetchMaterials();
                  setReserveDialogOpen(false);
                  setSnackbarMessage('Material reserved successfully!');
                }).catch(() => {
                  setSnackbarMessage('Failed to reserve material. Not enough stock?');
                  setReserveDialogOpen(false);
                });
              }
            }}
            sx={{ 
              borderRadius: 2, 
              bgcolor: '#059669', 
              color: '#FFFFFF', 
              fontWeight: 800, 
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            Confirm Reserve
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT DRAWING DIALOG */}
      <Dialog 
        open={isEditDrawingOpen} 
        onClose={() => setIsEditDrawingOpen(false)} 
        maxWidth="xs" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B' }}>Edit Drawing Info</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          <TextField 
            label="Drawing Title" 
            fullWidth 
            value={editDrawingTitle} 
            onChange={(e) => setEditDrawingTitle(e.target.value)} 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
          <TextField 
            label="Comments / Engineering Notes" 
            fullWidth 
            multiline 
            rows={3} 
            value={editDrawingComments} 
            onChange={(e) => setEditDrawingComments(e.target.value)} 
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setIsEditDrawingOpen(false)} sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveDrawingEdit}
            sx={{ 
              borderRadius: 2, 
              bgcolor: '#1E293B', 
              color: '#FFFFFF', 
              fontWeight: 800, 
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#0F172A' }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* STANDARD TERMS DIALOG */}
      <Dialog open={isTermsDialogOpen} onClose={() => setIsTermsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Select Terms and Conditions</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '60vh' }}>
            {STANDARD_TERMS.map((term, index) => {
              const isSelected = selectedTerms.includes(term);
              return (
                <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', p: 1, '&:hover': { bgcolor: '#f5f5f5' }, borderRadius: 1 }}>
                  <Checkbox 
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTerms([...selectedTerms, term]);
                        if (!quotationTerms.find((t: any) => t.text === term)) {
                          addQuotationTerm({ text: term });
                        }
                      } else {
                        setSelectedTerms(selectedTerms.filter(t => t !== term));
                      }
                    }}
                    sx={{ mt: -1 }}
                  />
                  <Typography variant="body2" sx={{ ml: 1, mt: 0.5 }}>{term}</Typography>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: '#FAFAFA' }}>
          <Button variant="contained" onClick={() => setIsTermsDialogOpen(false)}>Done</Button>
        </Box>
      </Dialog>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage('')}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ProjectDetails;
