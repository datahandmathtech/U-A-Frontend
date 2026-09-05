import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store';
import theme from './theme';
import './index.css';
import App from './App.tsx';

// Globally disable mouse wheel changing number inputs when scrolling
document.addEventListener('wheel', (event) => {
  const target = event.target as HTMLElement;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    (target as HTMLInputElement).blur();
  }
}, { passive: true });
// PWA Service Worker handling
if ('serviceWorker' in navigator) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Unregister any active service workers on localhost to ensure fast, unhindered development
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
          console.log('Unnati Arts PWA Service Worker Registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker Registration Failed:', err);
        });
    });
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
