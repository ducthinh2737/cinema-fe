import { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';
import { ToastProvider } from './contexts/ToastContext';
import { AppRoutes } from './routes';
import { AuthGuard, DevTools } from './components';

const queryClient = new QueryClient();

// Global ScrollToTop helper for route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AuthGuard>
              <AppRoutes />
              <DevTools />
            </AuthGuard>
          </BrowserRouter>
        </ToastProvider>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
