import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Paper,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import {
  useGetProductChatQuery,
  useSendProductChatMessageMutation,
  useMarkProductChatReadMutation,
  useUploadFilesMutation
} from '../../store/apiSlice';
import { useSelector } from 'react-redux';

interface ProductChatDrawerProps {
  open: boolean;
  onClose: () => void;
  slab: any;
  projectId?: string;
  projectName?: string;
}

export const ProductChatDrawer: React.FC<ProductChatDrawerProps> = ({
  open,
  onClose,
  slab,
  projectId,
  projectName
}) => {
  const currentUser = useSelector((state: any) => state.auth?.user);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const { data: chatData, isLoading: isChatLoading, refetch } = useGetProductChatQuery(slab?.id, {
    skip: !open || !slab?.id,
    pollingInterval: open ? 5000 : undefined // auto-poll when drawer is open
  });

  const [sendMessage, { isLoading: isSending }] = useSendProductChatMessageMutation();
  const [markAsRead] = useMarkProductChatReadMutation();
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();

  const [text, setText] = useState<string>('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark as read when opened by Admin
  useEffect(() => {
    if (open && slab?.id && isAdmin) {
      markAsRead(slab.id).catch(() => {});
    }
  }, [open, slab?.id, isAdmin, markAsRead, chatData?.unreadCount]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, chatData?.messages]);

  // Handle Photo Attachment
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('files', file);

    try {
      const res = await uploadFiles(formData).unwrap();
      if (res?.success && res.urls?.length > 0) {
        setAttachments(prev => [...prev, res.urls[0]]);
      }
    } catch (err) {
      console.error('Attachment upload failed:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && attachments.length === 0) || !slab?.id) return;

    try {
      await sendMessage({
        slabId: slab.id,
        projectId: projectId || slab.projectId,
        message: text.trim() || 'Sent an attachment',
        attachments
      }).unwrap();

      setText('');
      setAttachments([]);
      refetch();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = chatData?.messages || [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 460 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#F8FAFC',
            boxShadow: '0 0 40px rgba(0,0,0,0.15)'
          }
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          px: 2.5,
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Avatar sx={{ bgcolor: '#FFF4E5', color: '#C89F5A', width: 40, height: 40 }}>
            <ChatBubbleOutlineRoundedIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2, textTransform: 'uppercase', noWrap: true }}
            >
              {slab?.name || 'Product Discussion'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              {projectName ? `${projectName} • ` : ''}Product Chat & Updates
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Messages List Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.75
        }}
      >
        {isChatLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={28} />
          </Box>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94A3B8',
              textAlign: 'center',
              p: 3
            }}
          >
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#64748B' }}>
              No messages yet
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5 }}>
              Staff or Admin can send instructions, photos, or updates regarding this product.
            </Typography>
          </Box>
        ) : (
          messages.map((m: any) => {
            const isMe = currentUser?.id && String(m.senderId) === String(currentUser.id);
            const isMsgAdmin = m.senderRole === 'admin' || m.senderRole === 'manager';

            return (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                {/* Sender name & role badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, px: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.72rem' }}>
                    {isMe ? 'You' : m.senderName}
                  </Typography>
                  <Chip
                    label={isMsgAdmin ? 'Admin' : 'Staff'}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      bgcolor: isMsgAdmin ? '#FEF3C7' : '#EFF6FF',
                      color: isMsgAdmin ? '#92400E' : '#1D4ED8',
                      px: 0.2
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.68rem' }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>

                {/* Message Bubble */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    px: 1.75,
                    borderRadius: 2.5,
                    bgcolor: isMe ? '#1E293B' : '#FFFFFF',
                    color: isMe ? '#FFFFFF' : '#1E293B',
                    border: '1px solid',
                    borderColor: isMe ? '#0F172A' : '#E2E8F0',
                    maxWidth: '85%',
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                    {m.message}
                  </Typography>

                  {/* Attached images */}
                  {m.attachments && m.attachments.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {m.attachments.map((url: string, idx: number) => (
                        <Box
                          key={idx}
                          component="a"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          sx={{
                            display: 'block',
                            width: 120,
                            height: 100,
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        >
                          <img src={url} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>

                {isMe && isMsgAdmin && m.isReadByAdmin && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.25, pr: 0.5 }}>
                    <DoneAllIcon sx={{ fontSize: 13, color: '#3B82F6' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94A3B8' }}>Seen</Typography>
                  </Box>
                )}
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Pending Attachments Preview */}
      {attachments.length > 0 && (
        <Box sx={{ px: 2, py: 1, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1 }}>
          {attachments.map((url, idx) => (
            <Box key={idx} sx={{ position: 'relative', width: 60, height: 60, borderRadius: 1.5, overflow: 'hidden' }}>
              <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <IconButton
                size="small"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', p: 0.2 }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Bottom Input Area */}
      <Box
        sx={{
          p: 1.5,
          px: 2,
          bgcolor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <IconButton
          component="label"
          size="small"
          disabled={isUploading}
          sx={{ color: '#64748B', '&:hover': { color: '#C89F5A' } }}
        >
          {isUploading ? <CircularProgress size={18} /> : <PhotoCameraIcon />}
          <input type="file" accept="image/*" capture="environment" hidden onChange={handleAttachmentUpload} />
        </IconButton>

        <TextField
          fullWidth
          size="small"
          placeholder="Product update ya message likhein..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={3}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: '#F8FAFC',
              fontSize: '0.88rem'
            }
          }}
        />

        <Button
          variant="contained"
          size="small"
          onClick={handleSend}
          disabled={isSending || (!text.trim() && attachments.length === 0)}
          sx={{
            minWidth: 42,
            width: 42,
            height: 40,
            borderRadius: '50%',
            p: 0,
            bgcolor: '#C89F5A',
            color: '#FFFFFF',
            '&:hover': { bgcolor: '#B08844' }
          }}
        >
          {isSending ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
        </Button>
      </Box>
    </Drawer>
  );
};

export default ProductChatDrawer;
