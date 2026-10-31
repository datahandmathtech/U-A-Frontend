import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';

import { useQuickRevertPieceMutation } from '../../store/apiSlice';

interface RevertPieceDialogProps {
  open: boolean;
  onClose: () => void;
  slab: any;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export const RevertPieceDialog: React.FC<RevertPieceDialogProps> = ({
  open,
  onClose,
  slab,
  onSuccess,
  onError
}) => {
  const [quickRevertPiece, { isLoading: isReverting }] = useQuickRevertPieceMutation();
  const [selectedPieceId, setSelectedPieceId] = useState<string>('');

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPieceId('');
    }
  }, [open]);

  // "jiska kaam complete ho gya ho vo hi show ho na" -> ONLY show pieces whose work is completed!
  const completedPieces = useMemo(() => {
    if (!slab?.pieces || !Array.isArray(slab.pieces)) return [];
    return slab.pieces.filter((p: any) => {
      const logs = (p.logs && Array.isArray(p.logs)) ? p.logs : [];
      const hasLogs = logs.some((l: any) => l.status === 'completed' || l.status === 'approved');
      return hasLogs || p.status === 'completed' || p.status === 'approved';
    });
  }, [slab]);

  const handleRevert = async () => {
    if (!slab?.id || !selectedPieceId) return;

    const pieceObj = slab?.pieces?.find((p: any) => p.id === selectedPieceId);

    try {
      const res = await quickRevertPiece({
        slabId: slab.id,
        pieceId: selectedPieceId
      }).unwrap();

      onSuccess?.(res?.message || `Piece #${pieceObj?.pieceNumber || ''} reverted successfully!`);
      onClose();
    } catch (err: any) {
      onError?.(err?.data?.message || err?.message || 'Failed to revert piece');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isReverting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 1
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UndoRoundedIcon sx={{ color: '#D97706', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
            Revert Piece
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={isReverting} sx={{ color: '#94A3B8' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
          Slab: <strong>{slab?.name}</strong>
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel id="revert-piece-select-label">Select Piece to Revert</InputLabel>
          <Select
            labelId="revert-piece-select-label"
            label="Select Piece to Revert"
            value={selectedPieceId}
            onChange={(e) => setSelectedPieceId(e.target.value)}
            sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}
            MenuProps={{
              autoFocus: false,
              disableAutoFocusItem: true,
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              slotProps: {
                paper: {
                  sx: {
                    maxHeight: 280,
                    borderRadius: 2.5,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    mt: 0.5
                  }
                }
              }
            }}
          >
            {completedPieces.length > 0 ? (
              completedPieces.map((p: any) => {
                const logs = p.logs && Array.isArray(p.logs) ? p.logs : [];
                const stageNames = logs.map((l: any) => l.stage?.split(' - ')[0]).filter(Boolean).join(', ');
                const statusText = (p.status || 'completed').toUpperCase();

                return (
                  <MenuItem key={p.id} value={p.id}>
                    Piece #{p.pieceNumber} {p.productName ? `(${p.productName})` : ''} — [{statusText}] {stageNames ? `• Done: ${stageNames}` : ''}
                  </MenuItem>
                );
              })
            ) : (
              <MenuItem value="" disabled>
                No completed pieces found to revert
              </MenuItem>
            )}
          </Select>
        </FormControl>

        <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.78rem' }}>
          Reverting will reset the piece status back to pending and remove its latest completion record.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #F1F5F9' }}>
        <Button onClick={onClose} color="inherit" disabled={isReverting} sx={{ fontWeight: 600, textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleRevert}
          variant="contained"
          disabled={isReverting || !selectedPieceId || completedPieces.length === 0}
          startIcon={isReverting ? <CircularProgress size={16} color="inherit" /> : <UndoRoundedIcon />}
          sx={{
            bgcolor: '#D97706',
            color: '#FFFFFF',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: 2,
            px: 2.5,
            '&:hover': { bgcolor: '#B45309' }
          }}
        >
          {isReverting ? 'Reverting...' : 'Revert Piece'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RevertPieceDialog;
