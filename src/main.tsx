import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './ui/design/tokens.css';
import './ui/design/base.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
