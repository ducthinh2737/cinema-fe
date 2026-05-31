import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ToastProvider } from './contexts/ToastContext';
import { AppRoutes } from './routes';
import { AuthGuard, DevTools } from './components';

function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <AuthGuard>
            <AppRoutes />
            <DevTools />
          </AuthGuard>
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  );
}

export default App;
