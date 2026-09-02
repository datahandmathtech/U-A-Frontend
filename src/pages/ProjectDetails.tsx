import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Paper, Stepper, Step, StepLabel, TextField, Divider, Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Avatar, Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Autocomplete, Snackbar, createFilterOptions, InputAdornment, Grid, LinearProgress, Tabs, Tab, Collapse, Checkbox, Radio, RadioGroup, FormControlLabel } from '@mui/material';
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
const projectSteps = ['Shop Drawing & Approval', 'Material Planning', 'Production', 'Work Order Active'];
const steps = [...crmSteps, ...projectSteps];

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
    <TableRow sx={{ bgcolor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA', '&:hover': { bgcolor: '#F0F7F0' } }}>
      <TableCell sx={{ color: '#444' }}>
        <Typography variant="body2">{slab.name}</Typography>
      </TableCell>
      <TableCell sx={{ color: '#666' }}>
        <Typography variant="body2">{dimensionStr}</Typography>
      </TableCell>
      {STAGES.filter(stage => activeColumns.includes(stage)).map(stage => (
        <TableCell key={stage} sx={{ verticalAlign: 'top', pt: 2 }}>
          {stage === 'Polishing' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Checkbox size="small" disabled={isLocked} checked={requiredStages.includes('Polishing - Honed') || requiredStages.includes('Polishing')} onChange={(e) => handleToggleStage('Polishing - Honed', e)} sx={{ p: 0 }} />
                <Typography variant="caption">Honed</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Checkbox size="small" disabled={isLocked} checked={requiredStages.includes('Polishing - Mirror')} onChange={(e) => handleToggleStage('Polishing - Mirror', e)} sx={{ p: 0 }} />
                <Typography variant="caption">Mirror</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Checkbox size="small" disabled={isLocked} checked={requiredStages.includes(stage)} onChange={(e) => handleToggleStage(stage, e)} sx={{ p: 0 }} />
              <Typography variant="caption">{stage}</Typography>
            </Box>
          )}
        </TableCell>
      ))}
      <TableCell align="center" sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        {isLocked ? (
           <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>Active</Typography>
        ) : (
           <Typography variant="caption" sx={{ color: 'text.secondary' }}>Pending</Typography>
        )}
        <Box>
          <IconButton color="primary" size="small" disabled={isLocked} onClick={(e) => { e.stopPropagation(); onEdit(slab); }}><EditIcon fontSize="small" /></IconButton>
          <IconButton color="error" size="small" onClick={(e) => { e.stopPropagation(); onDelete(slab.id); }}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
};

const SlabTrackingRow = ({ slab, index, onEdit, onDelete, products, productionLogs, activeColumns }: { slab: any, index: number, onEdit: (slab: any) => void, onDelete: (id: string) => void, products: any[], productionLogs: any[], activeColumns: string[] }) => {
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
    if (slab.pieces && slab.pieces.length > 0) {
      const BASE_STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];
      
      const normalizedStageName = stageName.split(' - ')[0];
      const stageIdx = BASE_STAGES.indexOf(normalizedStageName);
      
      let allPiecesPassed = true;
      let anyPiecePassed = false;
      
      for (const p of slab.pieces) {
        const normalizedPieceStage = p.stage.split(' - ')[0];
        const pStageIdx = BASE_STAGES.indexOf(normalizedPieceStage);
        
        const isPassed = pStageIdx > stageIdx || (normalizedPieceStage === normalizedStageName && p.status === 'completed');
        
        if (!isPassed) {
          allPiecesPassed = false;
        } else {
          anyPiecePassed = true;
        }
      }
      
      if (allPiecesPassed && slab.pieces.length > 0) return 'Completed';
      if (anyPiecePassed) return 'In Progress';
      return 'Pending';
    }

    const targetQty = matchedProduct ? matchedProduct.qty : 0;
    if (targetQty > 0 && productionLogs) {
      const stageLogs = productionLogs.filter((log: any) => 
        log.transactionType === 'IN' && 
        log.approvalStatus === 'approved' &&
        log.stage.includes(stageName.split(' ')[0]) &&
        (log.productName === slab.name || slab.name.startsWith(log.productName))
      );
      const sumQty = stageLogs.reduce((acc: number, log: any) => acc + (log.quantityProduced || 0), 0);
      if (sumQty >= targetQty) return 'Completed';
      if (sumQty > 0) return 'In Progress';
    }
    return 'Pending';
  };

  const renderStatusIcon = (status: string) => {
    if (status === 'Completed') return <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />;
    if (status === 'In Progress') return <CircleIcon sx={{ fontSize: 16, color: '#ffb300' }} />;
    return <CircleIcon sx={{ fontSize: 16, color: '#d1c4e9' }} />;
  };

  const STAGES = ['Production', 'Polishing', 'Packing', 'Dispatch'];

  return (
    <TableRow sx={{ bgcolor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA', '&:hover': { bgcolor: '#F0F7F0' } }}>
      <TableCell sx={{ color: '#444' }}>
        <Typography variant="body2">{slab.name}</Typography>
      </TableCell>
      <TableCell sx={{ color: '#666' }}>
        <Typography variant="body2">{dimensionStr}</Typography>
      </TableCell>
      {STAGES.filter(stage => activeColumns.includes(stage)).map(stage => {
        if (stage === 'Polishing') {
          const hasHoned = requiredStages.includes('Polishing - Honed') || requiredStages.includes('Polishing');
          const hasMirror = requiredStages.includes('Polishing - Mirror');
          if (!hasHoned && !hasMirror) return <TableCell key={stage}></TableCell>;
          return (
            <TableCell key={stage} sx={{ verticalAlign: 'top', pt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {hasHoned && (
                  <Box 
                    onClick={() => navigate(`/projects/${projectId}/slab/${slab.id}/stage/polishing`)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                  >
                    {renderStatusIcon(getStageStatus('Polishing - Honed'))}
                    <Typography variant="body2" sx={{ color: '#444' }}>Honed</Typography>
                  </Box>
                )}
                {hasMirror && (
                  <Box 
                    onClick={() => navigate(`/projects/${projectId}/slab/${slab.id}/stage/polishing`)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                  >
                    {renderStatusIcon(getStageStatus('Polishing - Mirror'))}
                    <Typography variant="body2" sx={{ color: '#444' }}>Mirror</Typography>
                  </Box>
                )}
              </Box>
            </TableCell>
          );
        }

        const isRequired = requiredStages.includes(stage);
        if (!isRequired) return <TableCell key={stage}></TableCell>;

        const status = getStageStatus(stage);
        return (
          <TableCell key={stage} sx={{ verticalAlign: 'top', pt: 2 }}>
            <Box 
              onClick={() => navigate(`/projects/${projectId}/slab/${slab.id}/stage/${stage.toLowerCase()}`)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
            >
              {renderStatusIcon(status)}
              <Typography variant="body2" sx={{ color: '#444' }}>{status}</Typography>
            </Box>
          </TableCell>
        );
      })}
      <TableCell align="center">
        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', display: 'block', mb: 1 }}>Active</Typography>
        <IconButton color="primary" size="small" onClick={(e) => { e.stopPropagation(); onEdit(slab); }}><EditIcon fontSize="small" /></IconButton>
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

  const [activeStep, setActiveStep] = useState(0);
  const [viewingStepOverride, setViewingStepOverride] = useState<number | null>(null);

  React.useEffect(() => {
    // Auto-sync slabs removed per user request
  }, [project, projectSlabs]);

  const queryParams = new URLSearchParams(location.search);
  const viewParam = queryParams.get('view');

  React.useEffect(() => {
    setViewingStepOverride(viewParam !== null ? parseInt(viewParam, 10) : null);
  }, [viewParam]);
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
    if (status === 'material_planning') return 5;
    if (status === 'production') return 6;
    if (status === 'work_order' || status === 'completed') return 7;
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
      refetch();
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
      refetch();
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

  const isCrmView = location.pathname.includes('/crm');
  const isProjectActive = project ? ['shop_drawing', 'material_planning', 'production', 'work_order', 'completed'].includes(project.status) : false;
  const currentSteps = isCrmView ? crmSteps : projectSteps;
  const displayActiveStep = isCrmView
    ? (activeStep < 4 ? activeStep : 4)
    : (activeStep >= 4 ? activeStep - 4 : 0);
  const stepToRender = viewingStepOverride !== null 
    ? viewingStepOverride 
    : (isCrmView ? Math.min(3, activeStep) : Math.max(4, activeStep));

  const handleGoBackStep = () => {
    if (viewingStepOverride !== null) {
      setViewingStepOverride(null);
      return;
    }
    const currentStepVal = isCrmView ? Math.min(3, activeStep) : Math.max(4, activeStep);
    
    if (currentStepVal === 0) navigate(-1);
    else if (currentStepVal === 1) handleNextStage('enquiry');
    else if (currentStepVal === 2) handleNextStage('design_sharing');
    else if (currentStepVal === 3) handleNextStage('quotation');
    else if (currentStepVal === 4) handleNextStage('advance_payment');
    else if (currentStepVal === 5) handleNextStage('shop_drawing');
    else if (currentStepVal === 6) handleNextStage('material_planning');
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleGoBackStep} 
          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
          disableRipple
        >
          Back
        </Button>
        <IconButton 
          onClick={() => navigate('/crm')} 
          title="Back to Pipeline"
          sx={{ bgcolor: '#FFFDF5', color: '#B38B36', border: '1px solid #E8E1D5', '&:hover': { bgcolor: '#F0E6D2' } }}
        >
          <FilterListIcon />
        </IconButton>
      </Box>

      
      <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>
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
                    You are viewing a past CRM stage: <span style={{ color: '#B38B36', fontWeight: '800' }}>{crmSteps[viewingStepOverride] || crmSteps[0]}</span>
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
              <Paper elevation={0} sx={{ p: 5, border: '1px solid', borderColor: '#E8E1D5', borderRadius: 4, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)' }}>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="bold" color="text.primary">Enquiry Details</Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>Review the initial requirements and client information.</Typography>
                  </Box>
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => {
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
                  }}>Edit Details</Button>
                </Box>
                
                 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 4, mb: 4 }}>
                  {project.customerPhoto && (
                    <Box sx={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">Client Photos</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {project.customerPhoto.split(',').filter(Boolean).map((photoUrl, idx) => (
                          <Avatar 
                            key={idx}
                            src={photoUrl} 
                            alt={`Client Photo ${idx + 1}`} 
                            variant="rounded"
                            onClick={() => setPreviewFileUrl(photoUrl)}
                            sx={{ width: 100, height: 100, border: '2px solid #E8E1D5', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)', cursor: 'pointer', '&:hover': { opacity: 0.8 } }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  )}                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Enquiry ID / Project</Typography>
                    <Typography variant="body1" fontWeight={500} mt={0.5} color="primary.main">{project.projectId}</Typography>
                    <Typography variant="body2">{project.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Client Name</Typography>
                    <Typography variant="body1" fontWeight={500} mt={0.5}>{project.clientName || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Contact Number</Typography>
                    <Typography variant="body1" fontWeight={500} mt={0.5}>{project.clientContact || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Source</Typography>
                    <Typography variant="body1" fontWeight={500} mt={0.5}>{project.enquirySource || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Date</Typography>
                    <Typography variant="body1" fontWeight={500} mt={0.5}>{new Date(project.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 4 }} />

                <Box sx={{ mb: 4 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Requirements / Scope of Work</Typography>
                  <Typography variant="body1" mt={1} sx={{ p: 2, bgcolor: '#F9F9F9', borderRadius: 2, border: '1px solid #EEEEEE', minHeight: 100 }}>
                    {project.description || 'No specific requirements listed.'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 4 }} />
                {viewingStepOverride === null && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    
                    <Button variant="contained" size="large" onClick={() => {
                      handleNextStage('design_sharing');
                    }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                      Proceed to Reference Image
                    </Button>
                  </Box>
                )}
              </Paper>
            )}

            {/* STEP 1: REFERENCE IMAGE */}
            {stepToRender === 1 && (
              <Paper elevation={0} sx={{ p: 5, border: '1px solid', borderColor: '#E8E1D5', borderRadius: 4, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="bold" color="text.primary">Reference Image</Typography>
                    <Typography variant="body1" color="text.secondary" mt={1}>Upload the finalized reference design images, material choices, and inspiration photos.</Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}><strong>Current Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Typography>
                  </Box>
                  
                  {/* Custom Upload & Camera Buttons Aligned Right */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box 
                      component="label"
                      sx={{ 
                        width: 120, height: 120, 
                        border: '2px dashed #B38B36', borderRadius: 3, 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer', bgcolor: '#FFFDF5', '&:hover': { bgcolor: isUploading ? '#FFFDF5' : '#FFF4E5' }, transition: '0.2s',
                        opacity: isUploading ? 0.6 : 1
                      }}
                    >
                      <Typography variant="h4" color="#B38B36" sx={{ mb: 1 }}>+</Typography>
                      <Typography variant="body2" color="#B38B36" fontWeight="bold">{isUploading ? 'Uploading...' : 'Upload'}</Typography>
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

                    <Box 
                      onClick={isUploading ? undefined : startCamera}
                      sx={{ 
                        width: 120, height: 120, 
                        border: '2px dashed #B38B36', borderRadius: 3, 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer', bgcolor: '#FFFDF5', '&:hover': { bgcolor: isUploading ? '#FFFDF5' : '#FFF4E5' }, transition: '0.2s',
                        opacity: isUploading ? 0.6 : 1
                      }}
                    >
                      <Typography variant="h4" color="#B38B36" sx={{ mb: 1 }}>📷</Typography>
                      <Typography variant="body2" color="#B38B36" fontWeight="bold">Camera</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Calendar Finalized Design Date Selector */}
                <Box sx={{ mb: 4, display: 'flex', gap: 2, flexDirection: 'column', maxWidth: 300 }}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">Design Finalized Date</Typography>
                  <TextField 
                    type="date"
                    value={designFinalizedDate}
                    onChange={(e) => setDesignFinalizedDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                  />
                </Box>

                {/* Uploaded Reference Designs list */}
                {drawings && drawings.filter((d: any) => d.type === 'Reference Design').length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" mb={2}>Finalized Reference Designs</Typography>
                    {drawings.filter((d: any) => d.type === 'Reference Design').map((drawing: any) => (
                      <Box key={drawing.id} sx={{ display: 'flex', alignItems: 'center', p: 2, border: '1px solid #EEE', borderRadius: 2, mb: 2 }}>
                        <Box 
                          onClick={() => setPreviewFileUrl(drawing.fileUrl)}
                          sx={{ width: 80, height: 80, borderRadius: 2, overflow: 'hidden', mr: 2, cursor: 'pointer', border: '1px solid #E0E0E0', flexShrink: 0, bgcolor: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {drawing.fileUrl.toLowerCase().endsWith('.pdf') ? (
                            <Typography variant="h6" color="text.secondary">PDF</Typography>
                          ) : (
                            <img src={drawing.fileUrl} alt="Drawing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">{drawing.title} (v{drawing.version})</Typography>
                          {drawing.comments && <Typography variant="body2" color="text.secondary">Comments: {drawing.comments}</Typography>}
                          <Typography variant="caption" color="text.secondary">{new Date(drawing.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Typography>
                          <Typography 
                            onClick={() => setPreviewFileUrl(drawing.fileUrl)} 
                            sx={{ color: '#1976d2', textDecoration: 'underline', fontSize: 14, cursor: 'pointer', mt: 0.5, display: 'block', width: 'fit-content' }}
                          >
                            View File
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button variant="outlined" color="primary" size="small" startIcon={<EditIcon />} onClick={() => handleEditDrawingClick(drawing)}>Edit</Button>
                          <Button variant="outlined" color="error" size="small" startIcon={<DeleteIcon />} onClick={() => handleDeleteDrawingClick(drawing.id)}>Delete</Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" size="large" onClick={() => {
                    if (viewingStepOverride !== null) setViewingStepOverride(null);
                    else handleNextStage('enquiry');
                  }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    
                    <Button variant="contained" size="large" onClick={() => {
                       if (viewingStepOverride !== null) setViewingStepOverride(null);
                       else handleFreezeDesign();
                    }} disabled={isUploading} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                      {viewingStepOverride !== null ? 'Back to Active Step' : (isUploading ? 'Saving & Proceeding...' : 'Proceed to Costing')}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* STEP 2: QUOTATION & COSTING */}
            {stepToRender === 2 && (
              <Paper elevation={0} sx={{ p: 5, border: '1px solid', borderColor: '#E8E1D5', borderRadius: 4, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                  <Typography variant="h5" fontWeight="bold" color="text.primary">Quotation & Costing Builder</Typography>
                  <Button variant="contained" color="secondary" size="large" onClick={() => generateQuotationPDF(project, products, quoteDetails, { packageCostEnabled, transportCostEnabled, packageCost, transportCost }, selectedTerms, gstPercent)}>
                    Download PDF
                  </Button>
                </Box>
                
                <Box sx={{ mb: 4, p: 3, border: '1px solid #E0E0E0', borderRadius: 3, bgcolor: '#FAFAFA' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">Product Estimation</Typography>
                    <Button variant="contained" onClick={handleAddProduct} sx={{ borderRadius: 2 }}>+ Add Product</Button>
                  </Box>
                  <TableContainer sx={{ border: '1px solid #E0E0E0', borderRadius: 2, mb: 2, overflowX: 'auto', '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#CCC', borderRadius: 4 } }}>
                    <Table size="small" sx={{ minWidth: 850 }}>
                      <TableHead sx={{ bgcolor: '#F5F5F5' }}>
                        <TableRow>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Category</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Unit</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Length (L)</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Width (W)</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>MM</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Qty</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Rate</TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Amount</TableCell>
                          <TableCell sx={{ py: 1.5 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {products.map(p => (
                          <TableRow key={p.id} sx={{ '& td': { borderBottom: '1px solid #F0F0F0', py: 1.5 } }}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {p.photo ? (
                                  <Avatar 
                                    src={p.photo} 
                                    variant="rounded" 
                                    onClick={() => setPreviewFileUrl(p.photo!)}
                                    sx={{ width: 40, height: 40, border: '1px solid #E8E1D5', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                                  />
                                ) : (
                                  <Box 
                                    sx={{ 
                                      width: 40, 
                                      height: 40, 
                                      border: '1px dashed #CCC', 
                                      borderRadius: 1.5, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      bgcolor: '#FAFAFA'
                                    }}
                                  >
                                    <ImageIcon sx={{ fontSize: '1.2rem', color: '#AAA' }} />
                                  </Box>
                                )}
                                <Box>
                                  <Typography variant="body2">{p.category}</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2">{p.unit}</Typography></TableCell>
                            <TableCell>
                              {p.unit !== 'Pieces' ? <Typography variant="body2">{p.length}</Typography> : <Typography variant="body2" color="text.secondary">-</Typography>}
                            </TableCell>
                            <TableCell>
                              {p.unit !== 'Pieces' ? <Typography variant="body2">{p.width}</Typography> : <Typography variant="body2" color="text.secondary">-</Typography>}
                            </TableCell>
                            <TableCell>
                              {p.unit !== 'Pieces' ? <Typography variant="body2">{p.breadth || 0}</Typography> : <Typography variant="body2" color="text.secondary">-</Typography>}
                            </TableCell>
                            <TableCell><Typography variant="body2">{p.qty}</Typography></TableCell>
                            <TableCell><Typography variant="body2">₹{p.rate.toLocaleString('en-IN')}</Typography></TableCell>
                            <TableCell><Typography variant="body2" fontWeight="bold" color="#B38B36">₹{p.amount.toLocaleString('en-IN')}</Typography></TableCell>
                            <TableCell align="right">
                              <IconButton color="primary" size="small" onClick={() => handleEditProduct(p)} sx={{ mr: 1, bgcolor: '#E3F2FD', '&:hover': { bgcolor: '#BBDEFB' } }}><EditIcon fontSize="small" /></IconButton>
                              <IconButton color="error" size="small" onClick={() => handleRemoveProduct(p.id)} sx={{ bgcolor: '#FFEBEE', '&:hover': { bgcolor: '#FFCDD2' } }}><DeleteIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        {products.length === 0 && (
                          <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No products added. Click "+ Add Product".</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ display: 'flex', flexDirection: 'column', mt: 3, gap: 1, width: '100%' }}>
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

                      const subTotal = totalProductsAmount + additionalTotal + globalCostTotal;
                      const gstAmount = (subTotal * gstPercent) / 100;
                      const finalBill = subTotal + gstAmount;

                      return (
                        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', mt: 2, gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
                          
                          {/* Terms and Conditions (Left Side) */}
                          <Box sx={{ flex: 1, minWidth: '300px' }}>
                            <Typography variant="subtitle2" color="text.secondary" mb={1} fontWeight="bold">Terms and Conditions</Typography>
                            <Autocomplete
                              multiple
                              freeSolo
                              size="small"
                              options={quotationTerms.map((t: any) => t.text)}
                              value={selectedTerms}
                              onChange={(event, newValue) => {
                                setSelectedTerms(newValue);
                                const newTerms = newValue.filter((val) => !quotationTerms.find((t: any) => t.text === val));
                                newTerms.forEach(term => addQuotationTerm({ text: term }));
                              }}
                              renderInput={(params) => (
                                <TextField {...params} variant="outlined" placeholder="Select or type conditions..." sx={{ bgcolor: '#FAFAFA' }} />
                              )}
                            />
                          </Box>

                          {/* Totals Summary (Right Side) */}
                          <Box sx={{ width: '400px', bgcolor: '#FAFAFA', p: 3, borderRadius: 3, border: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="h6" fontWeight="bold" color="text.primary" mb={1} sx={{ borderBottom: '1px solid #E0E0E0', pb: 1 }}>Quotation Summary</Typography>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Total Products Amount</Typography>
                              <Typography variant="body2" fontWeight="bold">₹{totalProductsAmount.toLocaleString('en-IN')}</Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Total Additional Cost</Typography>
                              <Typography variant="body2" fontWeight="bold">₹{additionalTotal.toLocaleString('en-IN')}</Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Checkbox size="small" checked={packageCostEnabled} onChange={(e) => setPackageCostEnabled(e.target.checked)} sx={{ p: 0 }} />
                                <Typography variant="body2" color="text.secondary">Packing Charges</Typography>
                              </Box>
                              {packageCostEnabled ? (
                                <TextField size="small" type="number" value={packageCost === 0 ? '' : packageCost} onChange={(e) => setPackageCost(Number(e.target.value))} sx={{ width: 100 }} placeholder="₹0" variant="standard" />
                              ) : <Typography variant="body2" fontWeight="bold" color="text.secondary">-</Typography>}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Checkbox size="small" checked={transportCostEnabled} onChange={(e) => setTransportCostEnabled(e.target.checked)} sx={{ p: 0 }} />
                                <Typography variant="body2" color="text.secondary">Installation Cost</Typography>
                              </Box>
                              {transportCostEnabled ? (
                                <TextField size="small" type="number" value={transportCost === 0 ? '' : transportCost} onChange={(e) => setTransportCost(Number(e.target.value))} sx={{ width: 100 }} placeholder="₹0" variant="standard" />
                              ) : <Typography variant="body2" fontWeight="bold" color="text.secondary">-</Typography>}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">GST</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Select
                                  size="small"
                                  variant="standard"
                                  value={gstPercent}
                                  onChange={(e) => setGstPercent(Number(e.target.value))}
                                  sx={{ width: 75 }}
                                  disableUnderline
                                >
                                  <MenuItem value={0}>0%</MenuItem>
                                  <MenuItem value={5}>5%</MenuItem>
                                  <MenuItem value={12}>12%</MenuItem>
                                  <MenuItem value={18}>18%</MenuItem>
                                  <MenuItem value={28}>28%</MenuItem>
                                </Select>
                                <Typography variant="body2" fontWeight="bold" color="error.main" sx={{ width: 80, textAlign: 'right' }}>
                                  + ₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </Typography>
                              </Box>
                            </Box>

                            <Divider sx={{ my: 1 }} />
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6" fontWeight="bold" color="text.primary">Grand Total</Typography>
                              <Typography variant="h6" fontWeight="bold" color="primary.main">₹{finalBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                            </Box>
                            
                          </Box>
                        </Box>
                      )
                    })()}
                  </Box>
                </Box>

                {/* INLINE ADDITIONAL COSTS */}
                {(() => {
                  const currentCostId = activeCostProductId || (products.length > 0 ? products[0].id : null);
                  return (
                    <Box sx={{ mb: 4, p: 3, border: '1px solid #E0E0E0', borderRadius: 3, bgcolor: '#FAFAFA' }}>
                      <Typography variant="h6" fontWeight="bold" mb={3}>Additional Costs {currentCostId ? `for ${products.find(p => p.id === currentCostId)?.category || ''}` : ''}</Typography>
                      {currentCostId ? (
                        <Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3, p: 3, bgcolor: '#FFF', borderRadius: 2, border: '1px solid #E8E1D5', mb: 2 }}>
                            {(quoteDetails[currentCostId] || getDefaultCosts()).map((item: any) => (
                              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              </Box>
                            ))}
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button color="primary" onClick={() => { setCustomCostName(''); setIsCostDialogOpen(true); }}>
                              + Manage Cost Items
                            </Button>
                            <Typography variant="subtitle1" fontWeight="bold" color="#B38B36">
                              Total Additional Cost: ₹
                              {((quoteDetails[currentCostId] || []).reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0)).toLocaleString('en-IN')}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                         <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', bgcolor: '#FFF', borderRadius: 2, border: '1px dashed #CCC' }}>
                           Please add a product to estimation first.
                         </Box>
                      )}
                    </Box>
                  );
                })()}



                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" size="large" onClick={() => {
                    if (viewingStepOverride !== null) setViewingStepOverride(null);
                    else handleNextStage('design_sharing');
                  }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    
                    <Button variant="contained" size="large" onClick={async () => {
                      if (viewingStepOverride !== null) {
                         setViewingStepOverride(null);
                      } else {
                         await handleCreateQuotation();
                      }
                    }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                      {viewingStepOverride !== null ? 'Back to Active Step' : 'Save & Generate Quotation'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* STEP 3: ADVANCE PAYMENT */}
            {stepToRender === 3 && (
              <Paper elevation={0} sx={{ p: 5, border: '1px solid', borderColor: '#E8E1D5', borderRadius: 4, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)' }}>
                <Typography variant="h5" fontWeight="bold" mb={2} color="text.primary">Advance Payment</Typography>
                <Typography variant="body1" color="text.secondary" mb={4}>Enter the advance payment received to freeze this project and convert it into an Active Work Order.</Typography>
                
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center', mb: 4 }}>
                  <TextField 
                    type="number"
                    label="Advance Payment Received (₹)" 
                    value={advancePayment === 0 ? '' : advancePayment}
                    onChange={(e) => setAdvancePayment(Number(e.target.value))}
                    sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={paymentMethod}
                      label="Payment Method"
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank">Bank Transfer / Online</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField 
                    type="date"
                    label="Payment Date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  
                  {advancePayment > 0 && (
                    <Button variant="outlined" color="primary" onClick={handleDownloadReceipt} sx={{ height: 56, borderRadius: 2 }}>
                      Download Receipt PDF
                    </Button>
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" size="large" onClick={() => {
                    if (viewingStepOverride !== null) setViewingStepOverride(null);
                    else handleNextStage('quotation');
                  }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    
                    <Button variant="contained" color="success" size="large" onClick={() => {
                       if (viewingStepOverride !== null) setViewingStepOverride(null);
                       else handleAdvancePayment();
                    }} disabled={isCreatingInvoice} startIcon={viewingStepOverride !== null ? null : <CheckCircleIcon />} sx={{ px: 4, py: 1.5, borderRadius: 2, bgcolor: viewingStepOverride !== null ? 'primary.main' : '#2E7D32', '&:hover': { bgcolor: viewingStepOverride !== null ? 'primary.dark' : '#1B5E20' } }}>
                      {viewingStepOverride !== null ? 'Back to Active Step' : (isCreatingInvoice ? 'Processing...' : 'Confirm & Proceed to Shop Drawings')}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* STEP 4: SHOP DRAWING & APPROVAL */}
            {stepToRender === 4 && (
              <Paper elevation={0} sx={{ p: 5, border: '1px solid', borderColor: '#E8E1D5', borderRadius: 4, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="bold" color="text.primary">Shop Drawing & Design Approval</Typography>
                    <Typography variant="body1" color="text.secondary" mt={1}>Upload final shop drawings, production layouts, and 3D renders.</Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Typography>
                  </Box>
                  
                  {/* Custom Upload & Camera Buttons Aligned Right */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box 
                      component="label"
                      sx={{ 
                        width: 120, height: 120, 
                        border: '2px dashed #B38B36', borderRadius: 3, 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer', bgcolor: '#FFFDF5', '&:hover': { bgcolor: isUploading ? '#FFFDF5' : '#FFF4E5' }, transition: '0.2s',
                        opacity: isUploading ? 0.6 : 1
                      }}
                    >
                      <Typography variant="h4" color="#B38B36" sx={{ mb: 1 }}>+</Typography>
                      <Typography variant="body2" color="#B38B36" fontWeight="bold">{isUploading ? 'Uploading...' : 'Upload'}</Typography>
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
                              setSnackbarMessage('Drawings uploaded successfully!');
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

                    {/* Camera button using webcam dialog */}
                    <Box 
                      onClick={isUploading ? undefined : startCamera}
                      sx={{ 
                        width: 120, height: 120, 
                        border: '2px dashed #B38B36', borderRadius: 3, 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: isUploading ? 'not-allowed' : 'pointer', bgcolor: '#FFFDF5', '&:hover': { bgcolor: isUploading ? '#FFFDF5' : '#FFF4E5' }, transition: '0.2s',
                        opacity: isUploading ? 0.6 : 1
                      }}
                    >
                      <Typography variant="h4" color="#B38B36" sx={{ mb: 1 }}>📷</Typography>
                      <Typography variant="body2" color="#B38B36" fontWeight="bold">Camera</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Uploaded Shop Drawings List with Edit/Delete Buttons */}
                {drawings && drawings.filter((d: any) => d.type === 'Shop Drawing').length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" mb={2}>Uploaded Drawings</Typography>
                    {drawings.filter((d: any) => d.type === 'Shop Drawing').map((drawing: any) => (
                      <Box key={drawing.id} sx={{ display: 'flex', alignItems: 'center', p: 2, border: '1px solid #EEE', borderRadius: 2, mb: 2 }}>
                        <Box 
                          onClick={() => setPreviewFileUrl(drawing.fileUrl)}
                          sx={{ width: 80, height: 80, borderRadius: 2, overflow: 'hidden', mr: 2, cursor: 'pointer', border: '1px solid #E0E0E0', flexShrink: 0, bgcolor: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {drawing.fileUrl.toLowerCase().endsWith('.pdf') ? (
                            <Typography variant="h6" color="text.secondary">PDF</Typography>
                          ) : (
                            <img src={drawing.fileUrl} alt="Drawing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">{drawing.title} (v{drawing.version})</Typography>
                          {drawing.comments && <Typography variant="body2" color="text.secondary">Comments: {drawing.comments}</Typography>}
                          <Typography variant="caption" color="text.secondary">{new Date(drawing.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Typography>
                          <Typography 
                            onClick={() => setPreviewFileUrl(drawing.fileUrl)} 
                            sx={{ color: '#1976d2', textDecoration: 'underline', fontSize: 14, cursor: 'pointer', mt: 0.5, display: 'block', width: 'fit-content' }}
                          >
                            View File
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button variant="outlined" color="primary" size="small" startIcon={<EditIcon />} onClick={() => handleEditDrawingClick(drawing)}>Edit</Button>
                          <Button variant="outlined" color="error" size="small" startIcon={<DeleteIcon />} onClick={() => handleDeleteDrawingClick(drawing.id)}>Delete</Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" size="large" onClick={() => {
                    if (viewingStepOverride !== null) setViewingStepOverride(null);
                    else handleNextStage('advance_payment');
                  }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    
                    <Button variant="contained" color="success" size="large" onClick={async () => {
                      if (viewingStepOverride !== null) {
                         setViewingStepOverride(null);
                      } else {
                         await updateProject({ id: id as string, data: { status: 'material_planning' } }).unwrap();
                         setActiveStep(5);
                         setViewingStepOverride(null);
                         refetch();
                      }
                    }} sx={{ px: 4, py: 1.5, borderRadius: 2, bgcolor: viewingStepOverride !== null ? 'primary.main' : '#2E7D32', '&:hover': { bgcolor: viewingStepOverride !== null ? 'primary.dark' : '#1B5E20' } }}>
                      {viewingStepOverride !== null ? 'Back to Active Step' : 'Proceed to Material Planning'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* STEP 5: MATERIAL PLANNING */}
            {stepToRender === 5 && (
              <Paper elevation={0} sx={{ p: 5, border: '1px solid', borderColor: '#E8E1D5', borderRadius: 4, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)' }}>
                <Typography variant="h5" fontWeight="bold" mb={4} color="text.primary">Material Planning & Procurement</Typography>
                <Typography variant="body2" color="text.secondary" mb={4}>Select blocks, slabs, or other materials from inventory to reserve for this project.</Typography>

                <Box sx={{ mb: 4 }}>
                  <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #E0E0E0' }}>
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
      {projectMaterials && projectMaterials.length > 0 ? projectMaterials.map((pm: any) => (
        <TableRow key={pm.id} hover>
          <TableCell>
            {pm.inventory.jobWorkType === 'client' ? (
              <Chip label="Client" size="small" color="info" variant="outlined" />
            ) : (
              <Chip label="Unnati" size="small" color="success" variant="outlined" />
            )}
          </TableCell>
          <TableCell>{pm.inventory.itemName}</TableCell>
          <TableCell>{pm.inventory.blockNumber || '-'}</TableCell>
          <TableCell>{[pm.inventory.length, pm.inventory.width, pm.inventory.thickness].filter(Boolean).join(' x ') || '-'}</TableCell>
          <TableCell>{pm.quantity} {pm.inventory.unit}</TableCell>
          <TableCell align="center">
            <IconButton color="primary" size="small" onClick={async () => {
              if (isEditingRef.current) return;
              isEditingRef.current = true;
              try {
                setClientSlabs([{
                  materialName: pm.inventory.itemName || '',
                  blockNo: pm.inventory.blockNumber || '',
                  unit: 'inch',
                  length: pm.inventory.length || '',
                  width: pm.inventory.width || '',
                  thickness: pm.inventory.thickness || '',
                  isUnnati: pm.inventory.jobWorkType !== 'client',
                  unnatiId: '',
                  unnatiQty: pm.quantity || ''
                }]);
                await deleteProjectMaterial({ projectId: id as string, materialId: pm.id }).unwrap();
                setSnackbarMessage('Material moved to edit mode. Please update and reserve again.');
                refetchMaterials();
              } catch (err) {
                console.error(err);
                setSnackbarMessage('Error editing material.');
              } finally {
                isEditingRef.current = false;
              }
            }}><EditIcon fontSize="small" /></IconButton>
            <IconButton color="error" size="small" onClick={async () => {
              if (window.confirm('Are you sure you want to delete this reserved material?')) {
                try {
                  await deleteProjectMaterial({ projectId: id as string, materialId: pm.id }).unwrap();
                  setSnackbarMessage('Material deleted successfully');
                  refetchMaterials();
                } catch (err) {
                  console.error(err);
                  setSnackbarMessage('Error deleting material.');
                }
              }
            }}><DeleteIcon fontSize="small" /></IconButton>
          </TableCell>
        </TableRow>
      )) : (
        <TableRow>
          <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No materials reserved yet.</TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
</TableContainer>
</Paper>
                </Box>

                <Box sx={{ p: 3, border: '1px dashed #B38B36', borderRadius: 3, bgcolor: '#FFFDF5', mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#B38B36" mb={2}>Reserve New Material</Typography>
                  <Box>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
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
                            // For Unnati material, quantity is what they typed; for Client, it's auto-calculated L x W
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
                                  <TextField size="small" fullWidth placeholder="Material Name" value={row.materialName} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].materialName = e.target.value; setClientSlabs(newSlabs); }} />
                                </TableCell>
                                <TableCell><TextField size="small" value={row.blockNo} onChange={e => { const newSlabs = [...clientSlabs]; newSlabs[idx].blockNo = e.target.value; setClientSlabs(newSlabs); }} /></TableCell>
                                <TableCell>
                                  <Select size="small" fullWidth value={row.unit || 'inch'} onChange={(e) => {
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
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button variant="outlined" onClick={() => setClientSlabs([...clientSlabs, { isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }])}>
                        + Add Slab
                      </Button>
                      <Button variant="contained" disabled={isReservingClientMaterial} onClick={async () => {
                        if (isReservingRef.current) return;
                        isReservingRef.current = true;
                        setIsReservingClientMaterial(true);
                        try {
                          const token = localStorage.getItem('token');
                          for (const row of clientSlabs) {
                            if (!row.materialName || !row.length || !row.width) continue;
                            const len = Number(row.length || 0);
                            const wid = Number(row.width || 0);
                            const qty = row.unit === 'inch' ? (len * wid) / 144 : (len * wid);
                            
                            const newItem = await createInventoryItem({
                              type: 'slab', 
                              jobWorkType: row.isUnnati ? 'company' : 'client', 
                              itemName: row.materialName, 
                              blockNumber: row.blockNo, 
                              length: len, width: wid, thickness: Number(row.thickness),
                              quantity: qty, unit: 'sq_ft', 
                              supplier: row.isUnnati ? 'Unnati Arts' : (project?.clientName || 'Client')
                            }).unwrap();
                            
                            await reserveMaterial({ projectId: id as string, data: { inventoryId: newItem.id, quantity: qty, cost: 0 } }).unwrap();
                          }
                          setSnackbarMessage('Materials reserved successfully!');
                          setClientSlabs([{ isUnnati: true, unnatiId: '', unnatiQty: '', materialName: '', blockNo: '', unit: 'inch', length: '', width: '', thickness: '' }]);
                          refetchMaterials();
                        } catch (err) {
                          console.error(err);
                          setSnackbarMessage('Error reserving materials.');
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

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" size="large" onClick={() => {
                    if (viewingStepOverride !== null) setViewingStepOverride(null);
                    else handleNextStage('shop_drawing');
                  }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    
                    <Button variant="contained" size="large" onClick={async () => {
                      if (viewingStepOverride !== null) {
                         setViewingStepOverride(null);
                      } else {
                         await updateProject({ id: id as string, data: { status: 'production' } }).unwrap();
                         setActiveStep(6);
                         setViewingStepOverride(null);
                         refetch();
                      }
                    }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                      {viewingStepOverride !== null ? 'Back to Active Step' : 'Proceed to Production'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* STEP 6: PRODUCTION MANAGEMENT */}
            {stepToRender === 6 && (
              <Box sx={{ width: '100%' }}>
                {viewingStepOverride !== null && (
                   <Button startIcon={<ArrowBackIcon />} variant="text" size="small" onClick={() => setViewingStepOverride(null)} sx={{ mb: 3 }}>
                     Back to Pipeline
                   </Button>
                )}

                {/* Machine Usage */}
                 <Box sx={{ mb: 6 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">Slabs & Products Tracking</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button variant="outlined" startIcon={<SyncIcon />} onClick={async () => {
                        try {
                          await syncSlabs(id as string).unwrap();
                          refetchSlabs();
                          setSnackbarMessage('Synced successfully with Quotation!');
                        } catch(err) {
                          setSnackbarMessage('Error syncing slabs.');
                        }
                      }}>
                        Sync with Quotation
                      </Button>
                      {isPlanningMode && (
                        <Button variant="contained" color="success" onClick={handleStartAllWork}>
                          Finalize & Send to Production
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
                    <Table>
                      <TableHead sx={{ bgcolor: '#FDFBF7' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', color: '#4A4A4A', py: 2 }}>Product Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#4A4A4A', py: 2 }}>Original Size</TableCell>
                          {activeColumns.includes('Production') && <TableCell sx={{ fontWeight: 'bold', color: '#4A4A4A', py: 2 }}>Production</TableCell>}
                          {activeColumns.includes('Polishing') && <TableCell sx={{ fontWeight: 'bold', color: '#4A4A4A', py: 2 }}>Polishing</TableCell>}
                          {activeColumns.includes('Packing') && <TableCell sx={{ fontWeight: 'bold', color: '#4A4A4A', py: 2 }}>Packing</TableCell>}
                          {activeColumns.includes('Dispatch') && <TableCell sx={{ fontWeight: 'bold', color: '#4A4A4A', py: 2 }}>Dispatch</TableCell>}
                          <TableCell sx={{ fontWeight: 'bold', color: '#4A4A4A', py: 2 }} align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {projectSlabs?.map((slab: any, idx: number) => (
                          isPlanningMode 
                            ? <SlabPlanningRow key={slab.id} slab={slab} index={idx} onEdit={handleEditSlabClick} onDelete={handleDeleteSlab} products={products} activeColumns={activeColumns} />
                            : <SlabTrackingRow key={slab.id} slab={slab} index={idx} onEdit={handleEditSlabClick} onDelete={handleDeleteSlab} products={products} productionLogs={productionLogs || []} activeColumns={activeColumns} />
                        ))}
                        {(!projectSlabs || projectSlabs.length === 0) && (
                           <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>No slabs created yet.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Paper>
                 </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  {viewingStepOverride !== null ? (
                    <Button variant="contained" color="success" size="large" onClick={() => {
                      setViewingStepOverride(null);
                    }} sx={{ px: 5, py: 1.5, borderRadius: 2, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Back to Active Step
                    </Button>
                  ) : !isPlanningMode ? (
                    <Button variant="contained" color="success" size="large" onClick={async () => {
                       await updateProject({ id: id as string, data: { status: 'work_order' } }).unwrap();
                       setActiveStep(7);
                       setViewingStepOverride(null);
                       refetch();
                    }} sx={{ px: 5, py: 1.5, borderRadius: 2, bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' }, fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Finalize & Send to Dispatch
                    </Button>
                  ) : null}
                </Box>
              </Box>
            )}

            {/* STEP 7: WORK ORDER ACTIVE */}
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
      <Dialog open={slabDialogOpen} onClose={() => setSlabDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add New Slab</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Link Raw Material (Optional)</InputLabel>
            <Select
              label="Link Raw Material (Optional)"
              value={slabForm.inventoryId}
              onChange={(e) => setSlabForm({ ...slabForm, inventoryId: e.target.value })}
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
            label="Size (e.g., 5x2)" 
            fullWidth 
            value={slabForm.size} 
            onChange={(e) => setSlabForm({ ...slabForm, size: e.target.value })} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSlabDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleCreateSlab} disabled={!slabForm.name}>Add Slab</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editSlabDialogOpen} onClose={() => setEditSlabDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Slab</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <TextField 
            select
            label="Select Slab Category (From Quotation)" 
            fullWidth 
            value={slabForm.name} 
            onChange={(e) => setSlabForm({ ...slabForm, name: e.target.value })} 
          >
            {products?.filter(p => p.category === slabForm.name || !projectSlabs?.some((s: any) => s.name === p.category)).length > 0 ? (
              products.filter(p => p.category === slabForm.name || !projectSlabs?.some((s: any) => s.name === p.category)).map((p: any) => (
                <MenuItem key={p.id} value={p.category}>{p.category}</MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>All Categories Added / None Found</MenuItem>
            )}
          </TextField>
          <TextField label="Grid Layout / Size (e.g. 5x2)" value={slabForm.size} onChange={(e) => setSlabForm({ ...slabForm, size: e.target.value })} fullWidth />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Required Production Stages:</Typography>
            <Grid container spacing={1}>
              {['Production', 'Polishing - Honed', 'Polishing - Mirror', 'Packing', 'Dispatch'].map(stage => (
                <Grid item xs={6} sm={4} key={stage}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small"
                        checked={slabForm.requiredStages?.includes(stage) || (stage === 'Polishing - Honed' && slabForm.requiredStages?.includes('Polishing')) || false} 
                        onChange={(e) => {
                          let newStages;
                          if (e.target.checked) {
                            newStages = [...(slabForm.requiredStages || []).filter(s => s !== 'Polishing'), stage];
                          } else {
                            newStages = (slabForm.requiredStages || []).filter(s => s !== stage && s !== 'Polishing');
                          }
                          setSlabForm({ ...slabForm, requiredStages: newStages });
                        }} 
                      />
                    }
                    label={<Typography variant="body2">{stage}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditSlabDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleUpdateSlab} disabled={!slabForm.name}>Update Slab</Button>
        </DialogActions>
      </Dialog>

      {/* RESERVE MATERIAL DIALOG */}
      <Dialog open={reserveDialogOpen} onClose={() => setReserveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Reserve Material</DialogTitle>
        <DialogContent dividers>
          {selectedInventoryItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Selected: <strong>{selectedInventoryItem.itemName}</strong> (Block: {selectedInventoryItem.blockNumber || 'N/A'})
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Available Stock: <strong>{selectedInventoryItem.quantity} {selectedInventoryItem.unit}</strong>
              </Typography>
              <TextField 
                label={`Quantity to Reserve (${selectedInventoryItem.unit})`} 
                type="number" 
                fullWidth 
                value={reserveQty}
                onChange={(e) => setReserveQty(e.target.value)}
                autoFocus
              />
            </Box>
          )}
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => setReserveDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="primary" onClick={() => {
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
          }}>Confirm Reserve</Button>
        </Box>
      </Dialog>

      {/* EDIT DRAWING DIALOG */}
      <Dialog open={isEditDrawingOpen} onClose={() => setIsEditDrawingOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Drawing Info</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField 
            label="Drawing Title" 
            fullWidth 
            value={editDrawingTitle} 
            onChange={(e) => setEditDrawingTitle(e.target.value)} 
          />
          <TextField 
            label="Comments / Notes" 
            fullWidth 
            multiline 
            rows={3} 
            value={editDrawingComments} 
            onChange={(e) => setEditDrawingComments(e.target.value)} 
          />
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => setIsEditDrawingOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveDrawingEdit}>Save</Button>
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
