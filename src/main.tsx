import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './interface/design/tokens.css';
import './interface/design/base.css';
import { App } from './App';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root nao encontrado em index.html');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
