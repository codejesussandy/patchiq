import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Start MSW worker only when enabled (default: true for dev)
async function enableMocking() {
  const enableMsw = import.meta.env.VITE_ENABLE_MSW !== 'false';

  if (!enableMsw) {
    console.log('[MSW] Disabled - using real backend');
    return;
  }

  const { worker } = await import('./mocks/browser');
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
