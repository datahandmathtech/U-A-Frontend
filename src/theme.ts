import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Cream Theme Palette
let theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#C89F5A', // Accent Color (Gold/Bronze)
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#EAE0D5', // Secondary Cream / Sand
      contrastText: '#2A2A2A',
    },
    background: {
      default: '#FDFBF7', // Primary Cream
      paper: '#FFFFFF', // Surface
    },
    text: {
      primary: '#2A2A2A', // Dark Charcoal
      secondary: '#5A5A5A',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // More rounded like LogKaro
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #EAE0D5',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }
      }
    },
    MuiDialog: {
      defaultProps: {
        fullWidth: true,
      },
      styleOverrides: {
        paper: ({ theme: t }) => ({
          [t.breakpoints.down('sm')]: {
            margin: 8,
            width: 'calc(100% - 16px)',
            maxWidth: 'calc(100% - 16px)',
            maxHeight: 'calc(100dvh - 16px)',
          },
        }),
        paperFullScreen: ({ theme: t }) => ({
          [t.breakpoints.down('sm')]: {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '100dvh',
            maxHeight: '100dvh',
            borderRadius: 0,
          },
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          [t.breakpoints.down('sm')]: {
            padding: '12px 14px',
            fontSize: '1.05rem',
          },
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          [t.breakpoints.down('sm')]: {
            padding: '12px 14px',
          },
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          [t.breakpoints.down('sm')]: {
            padding: '10px 14px',
            flexWrap: 'wrap',
            gap: 8,
          },
        }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          [t.breakpoints.down('sm')]: {
            minWidth: 'auto',
            padding: '8px 12px',
            fontSize: '0.8rem',
          },
        }),
      },
    }
  },
});

theme = responsiveFontSizes(theme);

export default theme;
