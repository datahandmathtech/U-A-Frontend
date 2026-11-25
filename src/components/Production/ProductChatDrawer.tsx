import React from 'react';
import { Dialog } from '@mui/material';
import ChatRoomThread from '../Chat/ChatRoomThread';

interface ProductChatDrawerProps {
  open: boolean;
  onClose: () => void;
  slab: any;
  projectId?: string;
  projectName?: string;
  onOpenOrder?: () => void;
}

export const ProductChatDrawer: React.FC<ProductChatDrawerProps> = ({
  open,
  onClose,
  slab,
  projectId,
  projectName,
  onOpenOrder
}) => {
  const slabId = slab?.id || projectId || '';
  const resolvedProjectId = projectId || slab?.projectId || slab?.id || '';
  const title = slab?.clientName || slab?.name || projectName || 'Work Order Chat';
  const subtitle = slab?.size
    ? `${projectName ? `${projectName} • ` : ''}${slab.size}`
    : projectName || 'Team Discussion Room';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            overflow: 'hidden',
            height: { xs: '88vh', sm: '80vh' },
            maxHeight: 680,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
          }
        }
      }}
    >
      {slabId && (
        <ChatRoomThread
          slabId={slabId}
          projectId={resolvedProjectId}
          title={title}
          subtitle={subtitle}
          avatarPhoto={slab?.customerPhoto}
          isActive={open}
          onClose={onClose}
          onOpenOrder={onOpenOrder}
          height="100%"
        />
      )}
    </Dialog>
  );
};

export default ProductChatDrawer;
