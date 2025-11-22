import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ChatWidget from './components/ChatWidget'; // Componente do widget
import AdminPanel from '../src/components/AdminPanel'; // Novo componente do painel admin
import './index.css';

const root = document.getElementById('root'); // Certifique-se de que 'root' existe no seu index.html
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatWidget />} /> {/* Widget padrão na raiz */}
          <Route path="/admin" element={<AdminPanel />} /> {/* Painel admin em /admin */}
          {/* Outras rotas podem ser adicionadas aqui */}
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  console.error("Elemento #root não encontrado no index.html");
}