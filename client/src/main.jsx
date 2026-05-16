import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './store/index.js';
import App from './App.jsx';
import { ConfirmProvider } from './components/common/ConfirmDialog.jsx';
import './services/pwaInstall.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ConfirmProvider>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        </ConfirmProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
