import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/Auth.jsx';
import { DataProvider } from './context/Data.jsx';
import { LangProvider } from './context/Lang.jsx';
import 'leaflet/dist/leaflet.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <LangProvider>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </LangProvider>
  </BrowserRouter>
);
