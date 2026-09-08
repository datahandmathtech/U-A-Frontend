import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider
} from '@mui/material';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';

// Icons
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import LiveTvRoundedIcon from '@mui/icons-material/LiveTvRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import FolderSpecialRoundedIcon from '@mui/icons-material/FolderSpecialRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  drawerWidth: number;
}

interface MenuItemDef {
  text: string;
  icon: any;
  path: string;
  category: 'Overview' | 'Operations' | 'Stock & Machines' | 'Management';
}

const ALL_MENU_ITEMS: MenuItemDef[] = [
  { text: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/', category: 'Overview' },
  { text: 'Live Feed', icon: <LiveTvRoundedIcon />, path: '/live-feed', category: 'Overview' },
  { text: 'Log Book', icon: <MenuBookRoundedIcon />, path: '/log-book', category: 'Operations' },
  { text: 'Enquiries Pipeline', icon: <FilterAltRoundedIcon />, path: '/crm', category: 'Operations' },
  { text: 'Active Work Orders', icon: <WorkRoundedIcon />, path: '/projects', category: 'Operations' },
  { text: 'Approvals Queue', icon: <PendingActionsRoundedIcon />, path: '/approvals', category: 'Stock & Machines' },
  { text: 'In/Out Ledger', icon: <FolderSpecialRoundedIcon />, path: '/in-out-ledger', category: 'Stock & Machines' },
  { text: 'Inventory', icon: <Inventory2RoundedIcon />, path: '/inventory', category: 'Stock & Machines' },
  { text: 'Machine Master', icon: <PrecisionManufacturingRoundedIcon />, path: '/machines', category: 'Stock & Machines' },
  { text: 'HR & Payroll', icon: <GroupsRoundedIcon />, path: '/hr', category: 'Management' },
  { text: 'Admin Console', icon: <ShieldRoundedIcon />, path: '/admin-console', category: 'Management' }
];

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, handleDrawerToggle, drawerWidth }) => {
  const user = useSelector((state: any) => state.auth.user);
  const dispatch = useDispatch();

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        "To install Unnati Arts ERP:\n• On Chrome/Edge (PC/Laptop): Click the install button (⊕) in the browser address bar.\n• On Android: Tap browser menu (⋮) and tap 'Install app'.\n• On iPhone (Safari): Tap the Share icon and select 'Add to Home Screen'."
      );
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = '/login';
  };

  const menuItems = ALL_MENU_ITEMS.filter((item) => {
    if (user?.modulesAccess && user.modulesAccess.length > 0) {
      return user.modulesAccess.includes(item.path);
    }
    return true;
  });

  const categories = ['Overview', 'Operations', 'Stock & Machines', 'Management'] as const;

  const drawer = (
    <Box
      sx={{
        backgroundColor: '#0F172A', // Rich Dark Slate
        height: '100%',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {/* Brand Header */}
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 2, mt: 0.5 }}>
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            px: 2,
            py: 1,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            border: '1.5px solid #C89F5A'
          }}
        >
          <img src="/logo.png" alt="Unnati Arts" style={{ height: 34, width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
        </Box>
      </Toolbar>

      {/* Menu Categories */}
      <Box sx={{ px: 2, flexGrow: 1, overflowY: 'auto', py: 1 }}>
        {categories.map((category) => {
          const itemsInCategory = menuItems.filter((item) => item.category === category);
          if (itemsInCategory.length === 0) return null;

          return (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  mb: 0.75,
                  display: 'block',
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.75px'
                }}
              >
                {category}
              </Typography>

              <List disablePadding>
                {itemsInCategory.map((item) => (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      component={NavLink}
                      to={item.path}
                      sx={{
                        borderRadius: 2.5,
                        py: 0.85,
                        px: 1.5,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          transform: 'translateX(2px)'
                        },
                        '&.active': {
                          backgroundColor: '#C89F5A',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 14px rgba(200, 159, 90, 0.35)',
                          '& .MuiListItemIcon-root': { color: '#FFFFFF' }
                        }
                      }}
                    >
                      <ListItemIcon sx={{ color: 'rgba(255,255,255,0.65)', minWidth: 36, '& svg': { fontSize: 20 } }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography sx={{ fontSize: '0.86rem', fontWeight: 600 }}>
                            {item.text}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Bottom Footer Actions */}
      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {!isStandalone && (
          <ListItemButton
            onClick={handleInstallApp}
            sx={{
              borderRadius: 2.5,
              mb: 1.5,
              bgcolor: '#C89F5A',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(200, 159, 90, 0.3)',
              py: 0.8,
              '&:hover': { bgcolor: '#B38B36' }
            }}
          >
            <ListItemIcon sx={{ color: '#FFFFFF', minWidth: 32 }}>
              <GetAppRoundedIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Install App</Typography>}
              secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.65rem' }}>PWA Desktop/Mobile</Typography>}
            />
          </ListItemButton>
        )}

        {/* User Mini Card */}
        <Box
          sx={{
            p: 1.25,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar sx={{ bgcolor: '#C89F5A', width: 32, height: 32, fontWeight: 700, fontSize: '0.82rem' }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', noWrap: true, color: '#FFF' }}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#10B981', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>
                ● Online
              </Typography>
            </Box>
          </Box>

          <ListItemButton
            onClick={handleLogout}
            sx={{
              p: 0.5,
              borderRadius: 2,
              minWidth: 0,
              color: '#EF4444',
              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.15)' }
            }}
          >
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />
          </ListItemButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', backgroundColor: '#0F172A' }
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', backgroundColor: '#0F172A' }
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
