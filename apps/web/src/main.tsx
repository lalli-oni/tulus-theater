import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/grenze-gotisch/400.css';
import '@fontsource/grenze-gotisch/500.css';
import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import { App } from './App';
import { ToastHost } from './components/ToastHost';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastHost>
          <App />
        </ToastHost>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
