import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  Autocomplete,
  IconButton,
  Tooltip,
  InputAdornment,
  Grid,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CircularProgress
} from '@mui/material';

// Icons
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import CollectionsIcon from '@mui/icons-material/Collections';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import LanguageIcon from '@mui/icons-material/Language';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import BrushIcon from '@mui/icons-material/Brush';
import PeopleIcon from '@mui/icons-material/People';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LayersIcon from '@mui/icons-material/Layers';
import PersonIcon from '@mui/icons-material/Person';

import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useUploadFilesMutation
} from '../store/apiSlice';

// Helper for stage colors & styling
const STAGE_CONFIG: Record<string, { label: string; step: number; color: string; bg: string; border: string; icon: any }> = {
  enquiry: {
    label: '1. Enquiry Details',
    step: 1,
    color: '#6366F1',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    icon: FolderSpecialIcon
  },
  design_sharing: {
    label: '2. Reference Image',
    step: 2,
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    icon: CollectionsIcon
  },
  quotation: {
    label: '3. Quotation Sharing',
    step: 3,
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: RequestQuoteIcon
  },
  advance_payment: {
    label: '4. Costing & Advance',
    step: 4,
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: MonetizationOnIcon
  }
};

const SOURCE_ICONS: Record<string, any> = {
  'WhatsApp': WhatsAppIcon,
  'Website': LanguageIcon,
  'Call': PhoneIcon,
  'Architect': ArchitectureIcon,
  'Interior Designer': BrushIcon,
  'Reference': PeopleIcon
};

const CRM: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useGetProjectsQuery();
  const [createProject] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();

  // View & Filter States
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFY, setSelectedFY] = useState('FY 2026-27');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');

  // Modal Dialogs
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    clientContact: '',
    enquirySource: 'WhatsApp',
    location: '',
    requirements: '',
    status: 'enquiry',
    createdAt: new Date().toISOString().split('T')[0],
    customerPhoto: ''
  });

  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check camera permissions.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const fileName = `Client_Photo_${Date.now()}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            stopCamera();

            const uploadData = new FormData();
            uploadData.append('files', file);
            try {
              const res = await uploadFiles(uploadData).unwrap();
              if (res.success && res.urls.length > 0) {
                const url = res.urls[0];
                setFormData((prev) => {
                  const existing = prev.customerPhoto ? prev.customerPhoto.split(',').filter(Boolean) : [];
                  return { ...prev, customerPhoto: [...existing, url].join(',') };
                });
              }
            } catch (err) {
              console.error('Failed to upload client photo', err);
            }
          }
        }, 'image/jpeg', 0.85);
      }
    }
  };

  // Extract only CRM early-stage pipeline items
  const allCRMProjects = useMemo(() => {
    return (
      projects?.filter(
        (p: any) =>
          !['shop_drawing', 'material_planning', 'production', 'work_order', 'completed'].includes(p.status)
      ) || []
    );
  }, [projects]);

  // Metric Computations
  const stats = useMemo(() => {
    const total = allCRMProjects.length;
    const enquiryCount = allCRMProjects.filter((p: any) => p.status === 'enquiry').length;
    const designCount = allCRMProjects.filter((p: any) => p.status === 'design_sharing').length;
    const quotationCount = allCRMProjects.filter((p: any) => p.status === 'quotation').length;
    const advanceCount = allCRMProjects.filter((p: any) => p.status === 'advance_payment').length;
    return { total, enquiryCount, designCount, quotationCount, advanceCount };
  }, [allCRMProjects]);

  // Filtered Enquiries
  const filteredEnquiries = useMemo(() => {
    let list = [...allCRMProjects];

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p: any) => {
        return (
          p.name?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.clientContact?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.projectId?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.requirements?.toLowerCase().includes(q)
        );
      });
    }

    // Financial Year Filter
    if (selectedFY !== 'All') {
      list = list.filter((p: any) => {
        const date = new Date(p.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const fyStartYear = month >= 4 ? year : year - 1;
        const fyString = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
        return fyString === selectedFY;
      });
    }

    // Month Filter
    if (selectedMonth !== 'All') {
      list = list.filter((p: any) => {
        const date = new Date(p.createdAt);
        return date.toLocaleString('default', { month: 'long' }) === selectedMonth;
      });
    }

    // Source Filter
    if (selectedSource !== 'All') {
      list = list.filter((p: any) => p.enquirySource === selectedSource);
    }

    // Stage Filter
    if (selectedStage !== 'All') {
      list = list.filter((p: any) => p.status === selectedStage);
    }

    // Sort newest first
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allCRMProjects, searchQuery, selectedFY, selectedMonth, selectedSource, selectedStage]);

  // Form Handlers
  const handleOpen = () => {
    setEditingId(null);
    setFormData({
      name: '',
      clientName: '',
      clientContact: '',
      enquirySource: 'WhatsApp',
      location: '',
      requirements: '',
      status: 'enquiry',
      createdAt: new Date().toISOString().split('T')[0],
      customerPhoto: ''
    });
    setOpen(true);
  };

  const handleOpenEdit = (enq: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(enq.id);
    setFormData({
      name: enq.name || '',
      clientName: enq.clientName || '',
      clientContact: enq.clientContact || '',
      enquirySource: enq.enquirySource || 'WhatsApp',
      location: enq.location || '',
      requirements: enq.description || enq.requirements || '',
      status: enq.status || 'enquiry',
      createdAt: enq.createdAt ? new Date(enq.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      customerPhoto: enq.customerPhoto || ''
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.clientName.trim()) {
      alert('Please provide at least an Enquiry/Project Title and Client Name.');
      return;
    }
    try {
      if (editingId) {
        await updateProject({
          id: editingId,
          data: {
            ...formData,
            description: formData.requirements,
            requirements: formData.requirements,
            createdAt: new Date(formData.createdAt).toISOString()
          }
        }).unwrap();
      } else {
        await createProject({
          ...formData,
          description: formData.requirements,
          requirements: formData.requirements,
          createdAt: new Date(formData.createdAt).toISOString()
        }).unwrap();
      }
      handleClose();
    } catch (err) {
      console.error('Failed to save enquiry', err);
      alert('Failed to save enquiry. Please try again.');
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this enquiry? All associated references and notes will be removed.')) {
      try {
        await deleteProject(id).unwrap();
      } catch (err) {
        console.error('Failed to delete project', err);
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFY('FY 2026-27');
    setSelectedMonth('All');
    setSelectedSource('All');
    setSelectedStage('All');
  };

  const isFiltered = searchQuery !== '' || selectedStage !== 'All' || selectedSource !== 'All' || selectedMonth !== 'All';

  // Helper for WhatsApp click
  const openWhatsApp = (phone: string, clientName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanNum = phone.replace(/[^0-9]/g, '');
    const formattedNum = cleanNum.startsWith('91') ? cleanNum : `91${cleanNum}`;
    const msg = encodeURIComponent(`Hello ${clientName}, regarding your enquiry with Unnati Arts...`);
    window.open(`https://wa.me/${formattedNum}?text=${msg}`, '_blank');
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Header Banner */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>
              Enquiries & Lead Pipeline
            </Typography>
            <Chip
              label={`${allCRMProjects.length} Active`}
              size="small"
              sx={{
                bgcolor: '#FFF4E5',
                color: '#B38B36',
                fontWeight: 700,
                border: '1px solid #FFE0B2',
                borderRadius: '8px'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 500 }}>
            Capture client enquiries, track reference designs, prepare quotations, and convert to active work orders.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 3,
              p: 0.5,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                color: '#64748B',
                fontWeight: 600,
                fontSize: '0.82rem',
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: '#C89F5A',
                  color: '#FFF',
                  boxShadow: '0 2px 6px rgba(200, 159, 90, 0.35)',
                  '&:hover': { bgcolor: '#B38B36' }
                }
              }
            }}
          >
            <ToggleButton value="table">
              <ViewListIcon sx={{ fontSize: 18, mr: 0.75 }} /> List View
            </ToggleButton>
            <ToggleButton value="kanban">
              <ViewKanbanIcon sx={{ fontSize: 18, mr: 0.75 }} /> Pipeline Board
            </ToggleButton>
          </ToggleButtonGroup>

          {/* New Enquiry CTA */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{
              bgcolor: '#C89F5A',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.9rem',
              px: 2.5,
              py: 1,
              borderRadius: 3,
              boxShadow: '0 4px 14px rgba(200, 159, 90, 0.35)',
              textTransform: 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: '#B38B36',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 18px rgba(200, 159, 90, 0.45)'
              }
            }}
          >
            New Enquiry
          </Button>
        </Box>
      </Box>

      {/* 2. Executive KPI Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Active Enquiries */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => setSelectedStage('All')}
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: selectedStage === 'All' ? '#FFFDF5' : '#FFFFFF',
              border: '1.5px solid',
              borderColor: selectedStage === 'All' ? '#C89F5A' : '#EAE0D5',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedStage === 'All' ? '0 4px 16px rgba(200, 159, 90, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#C89F5A' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Pipeline
              </Typography>
              <Avatar sx={{ bgcolor: '#FFF4E5', color: '#B38B36', width: 34, height: 34 }}>
                <LayersIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.total}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              All non-converted leads
            </Typography>
          </Card>
        </Grid>

        {/* Step 1: Enquiry */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => setSelectedStage(selectedStage === 'enquiry' ? 'All' : 'enquiry')}
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: selectedStage === 'enquiry' ? '#F5F3FF' : '#FFFFFF',
              border: '1.5px solid',
              borderColor: selectedStage === 'enquiry' ? '#6366F1' : '#E2E8F0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedStage === 'enquiry' ? '0 4px 16px rgba(99, 102, 241, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#6366F1' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                1. Enquiry Logged
              </Typography>
              <Avatar sx={{ bgcolor: '#EEF2FF', color: '#6366F1', width: 34, height: 34 }}>
                <FolderSpecialIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.enquiryCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              Initial requirements
            </Typography>
          </Card>
        </Grid>

        {/* Step 2: Reference Image */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => setSelectedStage(selectedStage === 'design_sharing' ? 'All' : 'design_sharing')}
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: selectedStage === 'design_sharing' ? '#F0F9FF' : '#FFFFFF',
              border: '1.5px solid',
              borderColor: selectedStage === 'design_sharing' ? '#0284C7' : '#E2E8F0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedStage === 'design_sharing' ? '0 4px 16px rgba(2, 132, 199, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#0284C7' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                2. Reference Image
              </Typography>
              <Avatar sx={{ bgcolor: '#F0F9FF', color: '#0284C7', width: 34, height: 34 }}>
                <CollectionsIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.designCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              Design concepts
            </Typography>
          </Card>
        </Grid>

        {/* Step 3: Quotation Sharing */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => setSelectedStage(selectedStage === 'quotation' ? 'All' : 'quotation')}
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: selectedStage === 'quotation' ? '#FFFBEB' : '#FFFFFF',
              border: '1.5px solid',
              borderColor: selectedStage === 'quotation' ? '#D97706' : '#E2E8F0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedStage === 'quotation' ? '0 4px 16px rgba(217, 119, 6, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#D97706' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                3. Quotation Sharing
              </Typography>
              <Avatar sx={{ bgcolor: '#FFFBEB', color: '#D97706', width: 34, height: 34 }}>
                <RequestQuoteIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.quotationCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              Proposals sent
            </Typography>
          </Card>
        </Grid>

        {/* Step 4: Costing & Advance */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => setSelectedStage(selectedStage === 'advance_payment' ? 'All' : 'advance_payment')}
            sx={{
              p: 2,
              borderRadius: 3.5,
              bgcolor: selectedStage === 'advance_payment' ? '#ECFDF5' : '#FFFFFF',
              border: '1.5px solid',
              borderColor: selectedStage === 'advance_payment' ? '#059669' : '#E2E8F0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedStage === 'advance_payment' ? '0 4px 16px rgba(5, 150, 105, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#059669' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                4. Costing & Advance
              </Typography>
              <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 34, height: 34 }}>
                <MonetizationOnIcon sx={{ fontSize: 18 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {stats.advanceCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontWeight: 500 }}>
              Near conversion
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Search & Multi-Filter Control Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          bgcolor: '#FFFFFF',
          borderRadius: 3.5,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center'
        }}
      >
        {/* Live Search Input */}
        <TextField
          size="small"
          placeholder="Search by client, project, phone, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: { xs: '1 1 100%', sm: '1 1 260px' },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: '#F8FAFC',
              '& fieldset': { borderColor: '#E2E8F0' },
              '&:hover fieldset': { borderColor: '#CBD5E1' }
            }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }
          }}
        />

        {/* Source Filter */}
        <Select
          size="small"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value as string)}
          displayEmpty
          IconComponent={KeyboardArrowDownIcon}
          sx={{
            borderRadius: 2.5,
            bgcolor: '#F8FAFC',
            minWidth: 170,
            '& fieldset': { borderColor: '#E2E8F0' },
            '& .MuiSelect-select': { py: 1, px: 1.5, display: 'flex', alignItems: 'center', gap: 1 }
          }}
        >
          <MenuItem value="All">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon sx={{ fontSize: 16, color: '#64748B' }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>All Sources</Typography>
            </Box>
          </MenuItem>
          {['WhatsApp', 'Website', 'Call', 'Architect', 'Interior Designer', 'Reference'].map((src) => {
            const SrcIcon = SOURCE_ICONS[src] || PeopleIcon;
            return (
              <MenuItem key={src} value={src}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SrcIcon sx={{ fontSize: 16, color: '#B38B36' }} />
                  <Typography variant="body2">{src}</Typography>
                </Box>
              </MenuItem>
            );
          })}
        </Select>

        {/* Month Selector */}
        <Select
          size="small"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value as string)}
          IconComponent={KeyboardArrowDownIcon}
          sx={{
            borderRadius: 2.5,
            bgcolor: '#F8FAFC',
            minWidth: 140,
            '& fieldset': { borderColor: '#E2E8F0' },
            '& .MuiSelect-select': { py: 1, px: 1.5 }
          }}
        >
          <MenuItem value="All">All Months</MenuItem>
          {[
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ].map((m) => (
            <MenuItem key={m} value={m}>{m}</MenuItem>
          ))}
        </Select>

        {/* Financial Year Selector */}
        <Select
          size="small"
          value={selectedFY}
          onChange={(e) => setSelectedFY(e.target.value as string)}
          IconComponent={KeyboardArrowDownIcon}
          sx={{
            borderRadius: 2.5,
            bgcolor: '#F8FAFC',
            minWidth: 140,
            '& fieldset': { borderColor: '#E2E8F0' },
            '& .MuiSelect-select': { py: 1, px: 1.5, fontWeight: 600 }
          }}
        >
          <MenuItem value="All">All FY</MenuItem>
          <MenuItem value="FY 2025-26">FY 2025-26</MenuItem>
          <MenuItem value="FY 2026-27">FY 2026-27</MenuItem>
          <MenuItem value="FY 2027-28">FY 2027-28</MenuItem>
        </Select>

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            size="small"
            onClick={clearFilters}
            startIcon={<ClearIcon />}
            sx={{
              color: '#EF4444',
              bgcolor: '#FEF2F2',
              borderRadius: 2.5,
              px: 1.5,
              py: 0.75,
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { bgcolor: '#FEE2E2' }
            }}
          >
            Reset
          </Button>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Count Indicator */}
        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
          Showing <strong>{filteredEnquiries.length}</strong> of {allCRMProjects.length} enquiries
        </Typography>
      </Paper>

      {/* 4. MAIN CONTENT AREA: Table View or Kanban View */}
      {isLoading ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, border: '1px solid #E2E8F0' }}>
          <CircularProgress sx={{ color: '#C89F5A', mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600 }}>
            Loading CRM pipeline...
          </Typography>
        </Paper>
      ) : filteredEnquiries.length === 0 ? (
        <Paper
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 4,
            border: '1.5px dashed #CBD5E1',
            bgcolor: '#F8FAFC'
          }}
        >
          <Avatar
            sx={{
              bgcolor: '#FFF4E5',
              color: '#B38B36',
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2
            }}
          >
            <FolderSpecialIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
            No Enquiries Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 450, mx: 'auto', mb: 3 }}>
            {isFiltered
              ? 'No enquiries match your selected filters or search query. Try clearing the filters.'
              : 'Your enquiry pipeline is currently empty. Start by logging your first client enquiry.'}
          </Typography>
          {isFiltered ? (
            <Button variant="outlined" onClick={clearFilters} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}>
              Clear All Filters
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpen}
              sx={{
                bgcolor: '#C89F5A',
                color: '#FFF',
                borderRadius: 3,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#B38B36' }
              }}
            >
              Add New Enquiry
            </Button>
          )}
        </Paper>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}
        >
          <Table sx={{ minWidth: 850 }}>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>PROJECT / ENQUIRY</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>CLIENT & LOCATION</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>CONTACT</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>SOURCE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>PIPELINE STAGE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>REF PHOTOS</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>DATE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEnquiries.map((enq: any) => {
                const stage = STAGE_CONFIG[enq.status] || STAGE_CONFIG.enquiry;
                const StageIcon = stage.icon;
                const SourceIcon = SOURCE_ICONS[enq.enquirySource] || PeopleIcon;
                const photos = enq.customerPhoto ? enq.customerPhoto.split(',').filter(Boolean) : [];

                return (
                  <TableRow
                    key={enq.id}
                    hover
                    onClick={() => navigate(`/crm/${enq.id}`)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: '#FBFBFC' }
                    }}
                  >
                    {/* Project / Enquiry */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: '#FFF4E5',
                            color: '#B38B36',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            width: 38,
                            height: 38,
                            border: '1.5px solid #FFE0B2'
                          }}
                        >
                          {enq.clientName ? enq.clientName.charAt(0).toUpperCase() : 'E'}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Chip
                              label={enq.projectId || 'ENQ'}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                bgcolor: '#F1F5F9',
                                color: '#475569',
                                borderRadius: 1
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                              {enq.name}
                            </Typography>
                          </Box>
                          {enq.description && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#64748B',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                maxWidth: 220,
                                mt: 0.25
                              }}
                            >
                              {enq.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Client & Location */}
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {enq.clientName || 'Unnamed Client'}
                      </Typography>
                      {enq.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <LocationOnIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            {enq.location}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>

                    {/* Contact & WhatsApp */}
                    <TableCell sx={{ py: 2 }}>
                      {enq.clientContact ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                            {enq.clientContact}
                          </Typography>
                          <Tooltip title="Send WhatsApp Message">
                            <IconButton
                              size="small"
                              onClick={(e) => openWhatsApp(enq.clientContact, enq.clientName, e)}
                              sx={{
                                bgcolor: '#ECFDF5',
                                color: '#10B981',
                                p: 0.5,
                                '&:hover': { bgcolor: '#D1FAE5' }
                              }}
                            >
                              <WhatsAppIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Source */}
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        icon={<SourceIcon sx={{ fontSize: '14px !important' }} />}
                        label={enq.enquirySource || 'Direct'}
                        size="small"
                        sx={{
                          bgcolor: '#F8FAFC',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: 2
                        }}
                      />
                    </TableCell>

                    {/* Pipeline Stage */}
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        icon={<StageIcon sx={{ fontSize: '15px !important', color: `${stage.color} !important` }} />}
                        label={stage.label}
                        size="small"
                        sx={{
                          bgcolor: stage.bg,
                          color: stage.color,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: `1px solid ${stage.border}`,
                          borderRadius: 2,
                          py: 0.5
                        }}
                      />
                    </TableCell>

                    {/* Reference Photos */}
                    <TableCell sx={{ py: 2 }} onClick={(e) => e.stopPropagation()}>
                      {photos.length > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box
                            onClick={() => setPreviewPhoto(photos[0])}
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 2,
                              overflow: 'hidden',
                              border: '1.5px solid #CBD5E1',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'transform 0.15s ease',
                              '&:hover': { transform: 'scale(1.08)' }
                            }}
                          >
                            <img
                              src={photos[0]}
                              alt="Ref"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                          {photos.length > 1 && (
                            <Chip
                              label={`+${photos.length - 1}`}
                              size="small"
                              onClick={() => setPreviewPhoto(photos[0])}
                              sx={{
                                height: 22,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                bgcolor: '#F1F5F9',
                                color: '#475569',
                                cursor: 'pointer'
                              }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          None
                        </Typography>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        {enq.createdAt
                          ? new Date(enq.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" sx={{ py: 2 }} onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Open Pipeline Flow">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/crm/${enq.id}`)}
                            sx={{
                              bgcolor: '#FFF4E5',
                              color: '#B38B36',
                              '&:hover': { bgcolor: '#FFE0B2' }
                            }}
                          >
                            <ArrowForwardIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Enquiry">
                          <IconButton
                            size="small"
                            onClick={(e) => handleOpenEdit(enq, e)}
                            sx={{ color: '#64748B', '&:hover': { bgcolor: '#F1F5F9', color: '#1E293B' } }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Enquiry">
                          <IconButton
                            size="small"
                            onClick={(e) => handleDelete(enq.id, e)}
                            sx={{ color: '#94A3B8', '&:hover': { bgcolor: '#FEF2F2', color: '#EF4444' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* KANBAN PIPELINE BOARD VIEW */
        <Grid container spacing={2.5}>
          {Object.entries(STAGE_CONFIG).map(([stageKey, config]) => {
            const StageIcon = config.icon;
            const stageItems = filteredEnquiries.filter((p: any) => p.status === stageKey);

            return (
              <Grid size={{ xs: 12, md: 3 }} key={stageKey}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    minHeight: 520,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Column Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1.5, borderBottom: '1.5px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: config.bg, color: config.color, width: 28, height: 28 }}>
                        <StageIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                        {config.label}
                      </Typography>
                    </Box>
                    <Chip
                      label={stageItems.length}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        bgcolor: config.bg,
                        color: config.color,
                        border: `1px solid ${config.border}`
                      }}
                    />
                  </Box>

                  {/* Cards Container */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
                    {stageItems.length === 0 ? (
                      <Box
                        sx={{
                          py: 6,
                          px: 2,
                          textAlign: 'center',
                          border: '1.5px dashed #CBD5E1',
                          borderRadius: 3,
                          bgcolor: '#FFFFFF'
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                          No enquiries in this stage
                        </Typography>
                      </Box>
                    ) : (
                      stageItems.map((enq: any) => {
                        const photos = enq.customerPhoto ? enq.customerPhoto.split(',').filter(Boolean) : [];
                        const SourceIcon = SOURCE_ICONS[enq.enquirySource] || PeopleIcon;

                        return (
                          <Card
                            key={enq.id}
                            onClick={() => navigate(`/crm/${enq.id}`)}
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              bgcolor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
                                borderColor: config.color
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Chip
                                label={enq.projectId || 'ENQ'}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  bgcolor: '#F1F5F9',
                                  color: '#475569'
                                }}
                              />
                              <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                                <IconButton size="small" onClick={(e) => handleOpenEdit(enq, e)} sx={{ p: 0.25, color: '#94A3B8' }}>
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                                <IconButton size="small" onClick={(e) => handleDelete(enq.id, e)} sx={{ p: 0.25, color: '#94A3B8' }}>
                                  <DeleteIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Box>
                            </Box>

                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
                              {enq.name}
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                              <PersonIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
                                {enq.clientName}
                              </Typography>
                              {enq.location && (
                                <>
                                  <Typography variant="caption" sx={{ color: '#CBD5E1' }}>•</Typography>
                                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                                    {enq.location}
                                  </Typography>
                                </>
                              )}
                            </Box>

                            {enq.description && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#64748B',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  mb: 1.5,
                                  lineHeight: 1.3
                                }}
                              >
                                {enq.description}
                              </Typography>
                            )}

                            {/* Card Footer */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #F1F5F9' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Chip
                                  icon={<SourceIcon sx={{ fontSize: '12px !important' }} />}
                                  label={enq.enquirySource || 'Direct'}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                                />
                                {photos.length > 0 && (
                                  <Chip
                                    icon={<VisibilityIcon sx={{ fontSize: '12px !important' }} />}
                                    label={`${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewPhoto(photos[0]);
                                    }}
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#F0F9FF', color: '#0284C7' }}
                                  />
                                )}
                              </Box>

                              {enq.clientContact && (
                                <Tooltip title="WhatsApp Lead">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => openWhatsApp(enq.clientContact, enq.clientName, e)}
                                    sx={{ bgcolor: '#ECFDF5', color: '#10B981', p: 0.5, '&:hover': { bgcolor: '#D1FAE5' } }}
                                  >
                                    <WhatsAppIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Card>
                        );
                      })
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 5. ADD / EDIT ENQUIRY DIALOG */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
            }
          }
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
              {editingId ? 'Edit Enquiry Details' : 'Create New Client Enquiry'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Fill in client requirements to start the CRM flow (Reference designs, Quotations, and Work Orders).
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: '#94A3B8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Section 1: Project Basic Info */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                1. Project & Timeline
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    label="Project / Enquiry Title *"
                    fullWidth
                    size="small"
                    placeholder="e.g. Marble Mandir & Jaali Work, Villa 402"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Enquiry Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={formData.createdAt}
                    onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { max: new Date().toISOString().split('T')[0] }
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section 2: Client Details */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                2. Client Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Client Name *"
                    fullWidth
                    size="small"
                    placeholder="e.g. Rajesh Singhania"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Contact Number"
                    fullWidth
                    size="small"
                    placeholder="e.g. 9829012345"
                    value={formData.clientContact}
                    onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Site / Delivery Location"
                    fullWidth
                    size="small"
                    placeholder="e.g. Udaipur, Rajasthan"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOnIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section 3: Lead Source & Scope */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                3. Lead Source & Scope of Work
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    freeSolo
                    options={['WhatsApp', 'Website', 'Call', 'Architect', 'Interior Designer', 'Reference']}
                    value={formData.enquirySource}
                    onChange={(_e, newValue) => setFormData({ ...formData, enquirySource: newValue || 'WhatsApp' })}
                    onInputChange={(_e, newInputValue) => setFormData({ ...formData, enquirySource: newInputValue })}
                    renderInput={(params) => <TextField {...params} label="Lead Source" size="small" fullWidth />}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    label="Requirements / Scope of Work"
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    placeholder="Specify stone types, dimensions, carving details, finishes, or client remarks..."
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section 4: Client Photos & References */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B38B36', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                4. Client Site & Reference Photos
              </Typography>

              {/* Photo Thumbnails */}
              {formData.customerPhoto && formData.customerPhoto.split(',').filter(Boolean).length > 0 && (
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                  {formData.customerPhoto.split(',').filter(Boolean).map((photoUrl: string, idx: number) => (
                    <Box
                      key={idx}
                      sx={{
                        position: 'relative',
                        width: 84,
                        height: 84,
                        border: '1.5px solid #CBD5E1',
                        borderRadius: 2.5,
                        overflow: 'hidden',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                      }}
                    >
                      <img src={photoUrl} alt={`Ref ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton
                        size="small"
                        onClick={() => {
                          const updated = formData.customerPhoto
                            .split(',')
                            .filter(Boolean)
                            .filter((_, i) => i !== idx)
                            .join(',');
                          setFormData({ ...formData, customerPhoto: updated });
                        }}
                        sx={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          bgcolor: 'rgba(0, 0, 0, 0.65)',
                          color: '#FFF',
                          p: 0.3,
                          '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.9)' }
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Upload & Camera Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={isUploading}
                  sx={{
                    height: 80,
                    flex: 1,
                    border: '1.5px dashed #CBD5E1',
                    bgcolor: '#F8FAFC',
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '0.82rem',
                    color: '#475569',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textTransform: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#C89F5A',
                      bgcolor: '#FFFDF5',
                      color: '#B38B36'
                    }
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 24, mb: 0.5, color: '#C89F5A' }} />
                  {isUploading ? 'Uploading Photos...' : 'Upload Reference Photos'}
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const uploadData = new FormData();
                        Array.from(e.target.files).forEach((f) => uploadData.append('files', f));
                        try {
                          const res = await uploadFiles(uploadData).unwrap();
                          if (res.success && res.urls.length > 0) {
                            const existing = formData.customerPhoto ? formData.customerPhoto.split(',').filter(Boolean) : [];
                            const newPhotos = [...existing, ...res.urls].join(',');
                            setFormData({ ...formData, customerPhoto: newPhotos });
                          }
                        } catch (err) {
                          console.error('Failed to upload photo', err);
                        }
                      }
                    }}
                  />
                </Button>

                <Button
                  variant="outlined"
                  disabled={isUploading}
                  onClick={startCamera}
                  sx={{
                    height: 80,
                    flex: 1,
                    border: '1.5px dashed #CBD5E1',
                    bgcolor: '#F8FAFC',
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '0.82rem',
                    color: '#475569',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textTransform: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#C89F5A',
                      bgcolor: '#FFFDF5',
                      color: '#B38B36'
                    }
                  }}
                >
                  <CameraAltIcon sx={{ fontSize: 24, mb: 0.5, color: '#C89F5A' }} />
                  Take Live Photo
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC' }}>
          <Button onClick={handleClose} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              bgcolor: '#C89F5A',
              color: '#FFF',
              fontWeight: 700,
              px: 3,
              borderRadius: 2.5,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(200, 159, 90, 0.3)',
              '&:hover': { bgcolor: '#B38B36' }
            }}
          >
            {editingId ? 'Save Changes' : 'Create Enquiry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. LIVE CAMERA DIALOG */}
      <Dialog
        open={isCameraOpen}
        onClose={stopCamera}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0F172A',
              color: '#FFF',
              borderRadius: 4,
              border: '1px solid #334155'
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Capture Client Photo
          <IconButton onClick={stopCamera} sx={{ color: '#FFF' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <Box
            sx={{
              width: '100%',
              bgcolor: '#000',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 3,
              position: 'relative',
              border: '1.5px solid #334155'
            }}
          >
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: 'auto', maxHeight: 380, objectFit: 'cover' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<CameraAltIcon />}
            onClick={capturePhoto}
            sx={{
              bgcolor: '#10B981',
              color: '#FFF',
              fontWeight: 700,
              px: 5,
              py: 1.25,
              borderRadius: 3,
              textTransform: 'none',
              '&:hover': { bgcolor: '#059669' }
            }}
          >
            Capture & Upload
          </Button>
        </DialogContent>
      </Dialog>

      {/* 7. PREVIEW LIGHTBOX DIALOG */}
      <Dialog
        open={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: '#000',
              color: '#FFF',
              overflow: 'hidden'
            }
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setPreviewPhoto(null)}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: '#FFF',
              zIndex: 10,
              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.8)' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          {previewPhoto && (
            <img
              src={previewPhoto}
              alt="Reference Preview"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '85vh',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default CRM;
