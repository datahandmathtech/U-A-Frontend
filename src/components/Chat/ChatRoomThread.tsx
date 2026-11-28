import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useSelector } from 'react-redux';
import {
  useGetProductChatQuery,
  useMarkProductChatReadMutation,
  useSendProductChatMessageMutation,
  useUploadFilesMutation
} from '../../store/apiSlice';

export interface ReadReceiptItem {
  userId: string;
  userName: string;
  userRole: string;
  seenAt?: string;
}

export interface ChatRoomThreadProps {
  slabId: string;
  projectId?: string;
  title: string;
  subtitle?: string;
  avatarPhoto?: string;
  isActive?: boolean;
  onClose?: () => void;
  onOpenOrder?: () => void;
  height?: string | number;
}

const formatTimeShort = (dt?: string) => {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatFullTimestamp = (dt?: string) => {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateSeparator = (dt: string) => {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const resolveFileUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${window.location.origin}${url}`;
};

export const getReadersExcludingSender = (msg: any): ReadReceiptItem[] => {
  const senderId = msg?.senderId ? String(msg.senderId) : '';
  const rawList: ReadReceiptItem[] = Array.isArray(msg?.readBy) ? msg.readBy : [];
  const filtered = rawList.filter((r) => r?.userId && (!senderId || String(r.userId) !== senderId));

  // Fallback for legacy messages read by admin before readBy array existed
  if (filtered.length === 0 && msg?.isReadByAdmin && msg?.senderRole !== 'admin') {
    return [{ userId: 'admin', userName: 'Admin', userRole: 'admin', seenAt: msg.readAt }];
  }
  return filtered;
};

export const ChatRoomThread: React.FC<ChatRoomThreadProps> = ({
  slabId,
  projectId,
  title,
  subtitle,
  avatarPhoto,
  isActive = true,
  onClose,
  onOpenOrder,
  height = '100%'
}) => {
  const currentUser = useSelector((state: any) => state.auth.user);
  const currentUserId = currentUser?.id ? String(currentUser.id) : '';

  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const lastMarkedRef = useRef<string>('');

  const {
    data: chatData,
    isLoading,
    refetch
  } = useGetProductChatQuery(slabId, {
    skip: !isActive || !slabId,
    pollingInterval: isActive ? 5000 : 0
  });

  const [sendMessage, { isLoading: isSending }] = useSendProductChatMessageMutation();
  const [markAsRead] = useMarkProductChatReadMutation();
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();

  const messages = chatData?.messages || [];
  const unreadCount = chatData?.unreadCount || 0;

  // Scroll to bottom when active room changes or new message arrives
  useEffect(() => {
    if (isActive && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isActive, slabId]);

  // Reset mark-read key and message search when switching rooms
  useEffect(() => {
    lastMarkedRef.current = '';
    setIsSearchOpen(false);
    setMessageSearch('');
  }, [slabId]);

  // Mark room messages as read ONLY when actively viewed by current user
  useEffect(() => {
    if (!isActive || !slabId || isLoading || unreadCount <= 0) return;
    const lastId = messages.length > 0 ? messages[messages.length - 1]?.id : 'none';
    const markKey = `${slabId}:${unreadCount}:${lastId}`;
    if (lastMarkedRef.current === markKey) return;
    lastMarkedRef.current = markKey;
    markAsRead(slabId).catch(() => {});
  }, [isActive, slabId, isLoading, unreadCount, messages, markAsRead]);

  const handleUploadSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));

    try {
      const res = await uploadFiles(formData).unwrap();
      if (res?.urls && res.urls.length > 0) {
        setAttachments((prev) => [...prev, ...res.urls]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleSend = async () => {
    if (!slabId) return;
    const cleanText = messageText.trim();
    if (!cleanText && attachments.length === 0) return;

    try {
      await sendMessage({
        slabId,
        projectId,
        message: cleanText || (attachments.length > 0 ? '📷 Photo attachment' : ''),
        attachments
      }).unwrap();
      setMessageText('');
      setAttachments([]);
      refetch();
    } catch (err) {
      console.error('Send chat message failed:', err);
    }
  };

  const handleDownloadImage = async (imgUrl: string) => {
    const fullUrl = resolveFileUrl(imgUrl);
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `chat-attachment-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fullUrl, '_blank');
    }
  };

  const normalizedMessageSearch = messageSearch.trim().toLowerCase();
  const visibleMessages = useMemo(() => {
    if (!normalizedMessageSearch) return messages;
    return messages.filter((msg: any) => {
      const text = String(msg.message || '').toLowerCase();
      const sender = String(msg.senderName || '').toLowerCase();
      return text.includes(normalizedMessageSearch) || sender.includes(normalizedMessageSearch);
    });
  }, [messages, normalizedMessageSearch]);

  // Group visible messages with date divider tags
  const renderedTimeline = useMemo(() => {
    let lastDateStr = '';
    return visibleMessages.map((msg: any) => {
      const dayLabel = formatDateSeparator(msg.createdAt);
      const showDayDivider = dayLabel && dayLabel !== lastDateStr;
      if (dayLabel) lastDateStr = dayLabel;
      return { msg, showDayDivider, dayLabel };
    });
  }, [visibleMessages]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
        bgcolor: '#EFEAE2',
        position: 'relative'
      }}
    >
      {/* WhatsApp Emerald Header */}
      <Box
        sx={{
          bgcolor: '#075E54',
          color: '#FFFFFF',
          px: { xs: 1.25, sm: 2 },
          py: { xs: 1, sm: 1.35 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 0.75, sm: 1.5 },
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          zIndex: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0, flex: 1 }}>
          <Avatar
            src={avatarPhoto ? resolveFileUrl(avatarPhoto) : undefined}
            sx={{
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              bgcolor: '#128C7E',
              color: '#FFFFFF',
              fontWeight: 800,
              border: '2px solid rgba(255,255,255,0.28)',
              flexShrink: 0
            }}
          >
            {(title || 'C').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, fontSize: { xs: '0.88rem', sm: '0.96rem' } }}
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'rgba(255,255,255,0.82)', display: 'block', fontSize: { xs: '0.68rem', sm: '0.73rem' } }}
            >
              {subtitle || 'Permanent Order Discussion • Active'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.35, sm: 0.75 }, flexShrink: 0 }}>
          <Tooltip title={isSearchOpen ? 'Hide Message Search' : 'Search Messages'}>
            <IconButton
              size="small"
              onClick={() => {
                setIsSearchOpen((prev) => {
                  if (prev) setMessageSearch('');
                  return !prev;
                });
              }}
              sx={{
                color: '#FFFFFF',
                bgcolor: isSearchOpen ? 'rgba(255,255,255,0.22)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' }
              }}
            >
              <SearchRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onOpenOrder && (
            <Tooltip title="Open Order Workspace">
              <Button
                size="small"
                variant="outlined"
                onClick={onOpenOrder}
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: '13px !important' }} />}
                sx={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(255,255,255,0.35)',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: { xs: '0.69rem', sm: '0.73rem' },
                  borderRadius: 2,
                  minWidth: 'auto',
                  py: 0.4,
                  px: { xs: 0.85, sm: 1.2 },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: '#FFFFFF' }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Open </Box>
                Order
              </Button>
            </Tooltip>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ color: '#FFFFFF' }}>
              <CloseRoundedIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Optional In-Conversation Message Search Strip */}
      {isSearchOpen && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0
          }}
        >
          <TextField
            fullWidth
            size="small"
            autoFocus
            placeholder="Search messages or sender name in this chat..."
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 17, color: '#64748B' }} />
                  </InputAdornment>
                ),
                endAdornment: messageSearch ? (
                  <InputAdornment position="end">
                    <Typography variant="caption" sx={{ color: '#075E54', fontWeight: 700, mr: 0.75 }}>
                      {visibleMessages.length} found
                    </Typography>
                    <IconButton size="small" onClick={() => setMessageSearch('')}>
                      <CloseRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#FFFFFF',
                borderRadius: 2,
                fontSize: '0.82rem',
                '& fieldset': { borderColor: '#CBD5E1' },
                '&.Mui-focused fieldset': { borderColor: '#075E54' }
              }
            }}
          />
          <IconButton
            size="small"
            onClick={() => {
              setIsSearchOpen(false);
              setMessageSearch('');
            }}
            sx={{ color: '#64748B' }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Scrollable WhatsApp Chat Wallpaper Body */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          px: { xs: 1.25, sm: 2.5 },
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.15,
          backgroundColor: '#EFEAE2',
          backgroundImage:
            'radial-gradient(rgba(11, 20, 26, 0.05) 1px, transparent 1px), radial-gradient(rgba(11, 20, 26, 0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress size={30} sx={{ color: '#075E54' }} />
          </Box>
        ) : visibleMessages.length === 0 ? (
          <Box
            sx={{
              m: 'auto',
              textAlign: 'center',
              maxWidth: 320,
              bgcolor: 'rgba(255,255,255,0.9)',
              p: 3,
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 38, color: '#128C7E', mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
              {normalizedMessageSearch ? 'No matching messages' : 'No messages yet'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
              {normalizedMessageSearch
                ? `No messages or senders matched "${messageSearch.trim()}" in this order.`
                : 'Start the conversation below. Messages stay permanently saved and notify every active team member until seen.'}
            </Typography>
          </Box>
        ) : (
          renderedTimeline.map(({ msg, showDayDivider, dayLabel }: any) => {
            const msgSenderId = msg.senderId ? String(msg.senderId) : '';
            const isMine =
              (currentUserId && msgSenderId && currentUserId === msgSenderId) ||
              (!msgSenderId && currentUser?.name && msg.senderName === currentUser.name);

            const readers = getReadersExcludingSender(msg);
            const isSeenByOthers = readers.length > 0;

            const seenTooltipContent = (
              <Box sx={{ p: 0.5, minWidth: 170 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.5,
                    color: isSeenByOthers ? '#38BDF8' : '#CBD5E1'
                  }}
                >
                  <VisibilityRoundedIcon sx={{ fontSize: 13 }} />
                  {isSeenByOthers ? `Seen by (${readers.length})` : 'Delivered • Not seen yet'}
                </Typography>
                {readers.map((r, idx) => (
                  <Box
                    key={`${r.userId}-${idx}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 0.25,
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.72rem' }}>
                      {r.userName}
                      {r.userRole ? ` (${r.userRole === 'admin' ? 'Admin' : 'Staff'})` : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.67rem' }}>
                      {formatFullTimestamp(r.seenAt)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            );

            return (
              <React.Fragment key={msg.id}>
                {showDayDivider && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.75 }}>
                    <Chip
                      label={dayLabel}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(255,255,255,0.92)',
                        color: '#475569',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                      }}
                    />
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                    width: '100%'
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      maxWidth: { xs: '88%', sm: '75%' },
                      minWidth: 120,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2.25,
                      borderTopRightRadius: isMine ? 0.5 : 2.25,
                      borderTopLeftRadius: !isMine ? 0.5 : 2.25,
                      bgcolor: isMine ? '#D9FDD3' : '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(11, 20, 26, 0.13)',
                      position: 'relative'
                    }}
                  >
                    {/* Sender Header inside bubble */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.35 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.73rem',
                          color: isMine ? '#065F46' : msg.senderRole === 'admin' ? '#B45309' : '#0F766E'
                        }}
                      >
                        {isMine ? `You (${msg.senderName})` : msg.senderName}
                      </Typography>
                      {!isMine && msg.senderRole && (
                        <Chip
                          label={msg.senderRole === 'admin' ? 'Admin' : 'Staff'}
                          size="small"
                          sx={{
                            height: 15,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            bgcolor: msg.senderRole === 'admin' ? '#FEF3C7' : '#F1F5F9',
                            color: msg.senderRole === 'admin' ? '#B45309' : '#475569'
                          }}
                        />
                      )}
                    </Box>

                    {/* Image Attachments */}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
                        {msg.attachments.map((imgUrl: string, idx: number) => (
                          <Box
                            key={`${msg.id}-att-${idx}`}
                            onClick={() => setPreviewImage(resolveFileUrl(imgUrl))}
                            sx={{
                              width: 150,
                              height: 112,
                              borderRadius: 1.75,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: '1px solid rgba(0,0,0,0.08)',
                              bgcolor: '#F8FAFC',
                              '&:hover': { opacity: 0.9 }
                            }}
                          >
                            <img
                              src={resolveFileUrl(imgUrl)}
                              alt="Attachment"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Message Body */}
                    {msg.message && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#111B21',
                          fontSize: '0.86rem',
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {msg.message}
                      </Typography>
                    )}

                    {/* Footer Timestamp + Blue/Grey Ticks + Hover Read Receipt */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                        mt: 0.45
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.66rem', color: '#667781' }}>
                        {formatTimeShort(msg.createdAt)}
                      </Typography>

                      {isMine ? (
                        <Tooltip
                          title={seenTooltipContent}
                          arrow
                          placement="top-end"
                          slotProps={{
                            tooltip: {
                              sx: {
                                bgcolor: '#0F172A',
                                borderRadius: 2,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                p: 1
                              }
                            }
                          }}
                        >
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.3,
                              cursor: 'pointer',
                              px: 0.25,
                              borderRadius: 1,
                              '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.08)' }
                            }}
                          >
                            <DoneAllRoundedIcon
                              sx={{
                                fontSize: 16,
                                color: isSeenByOthers ? '#0284C7' : '#8696A0'
                              }}
                            />
                            {isSeenByOthers && (
                              <Typography
                                variant="caption"
                                sx={{ fontSize: '0.63rem', fontWeight: 700, color: '#0284C7' }}
                              >
                                Seen ({readers.length})
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      ) : (
                        readers.length > 0 && (
                          <Tooltip
                            title={seenTooltipContent}
                            arrow
                            placement="top"
                            slotProps={{
                              tooltip: {
                                sx: {
                                  bgcolor: '#0F172A',
                                  borderRadius: 2,
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                  p: 1
                                }
                              }
                            }}
                          >
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', ml: 0.25 }}>
                              <VisibilityRoundedIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                            </Box>
                          </Tooltip>
                        )
                      )}
                    </Box>
                  </Paper>
                </Box>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Pending Attachments Strip */}
      {attachments.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#F0F2F5',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          {attachments.map((url, idx) => (
            <Box key={`pending-${idx}`} sx={{ position: 'relative', width: 52, height: 52 }}>
              <img
                src={resolveFileUrl(url)}
                alt="Pending"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
              />
              <IconButton
                size="small"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  bgcolor: '#EF4444',
                  color: '#FFF',
                  p: 0.25,
                  '&:hover': { bgcolor: '#DC2626' }
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleUploadSelection}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleUploadSelection}
      />

      {/* WhatsApp Bottom Composer Bar */}
      <Box
        sx={{
          bgcolor: '#F0F2F5',
          px: { xs: 1, sm: 1.5 },
          py: { xs: 0.9, sm: 1.15 },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, sm: 0.85 },
          borderTop: '1px solid #D1D7DB',
          minWidth: 0,
          flexShrink: 0
        }}
      >
        <Tooltip title="Attach Photo">
          <IconButton
            size="small"
            disabled={isUploading}
            onClick={() => galleryInputRef.current?.click()}
            sx={{ color: '#54656F' }}
          >
            <AttachFileRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Take Camera Photo">
          <IconButton
            size="small"
            disabled={isUploading}
            onClick={() => cameraInputRef.current?.click()}
            sx={{ color: '#54656F' }}
          >
            <PhotoCameraRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={3}
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#FFFFFF',
              borderRadius: 3,
              fontSize: '0.88rem',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: '#CBD5E1' },
              '&.Mui-focused fieldset': { borderColor: '#128C7E' }
            }
          }}
        />

        <IconButton
          onClick={handleSend}
          disabled={isSending || isUploading || (!messageText.trim() && attachments.length === 0)}
          sx={{
            bgcolor: '#00A884',
            color: '#FFFFFF',
            width: 40,
            height: 40,
            flexShrink: 0,
            '&:hover': { bgcolor: '#008F72' },
            '&.Mui-disabled': { bgcolor: '#CBD5E1', color: '#94A3B8' }
          }}
        >
          {isSending || isUploading ? (
            <CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
          ) : (
            <SendRoundedIcon sx={{ fontSize: 19 }} />
          )}
        </IconButton>
      </Box>

      {/* Fullscreen Image Lightbox */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: { bgcolor: '#0F172A', borderRadius: 3, overflow: 'hidden' }
          }
        }}
      >
        <DialogContent sx={{ p: 1.5, position: 'relative', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
            {previewImage && (
              <Button
                size="small"
                variant="contained"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => handleDownloadImage(previewImage)}
                sx={{ bgcolor: '#00A884', textTransform: 'none', fontWeight: 700 }}
              >
                Download
              </Button>
            )}
            <IconButton onClick={() => setPreviewImage(null)} sx={{ color: '#FFFFFF' }}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ChatRoomThread;
