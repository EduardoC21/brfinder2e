import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { textos } from '@idiomas/index';

describe('esqueleto da interface', () => {
  it('renderiza React dentro do jsdom e le o texto do arquivo de idioma', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(textos.app.nome);
  });
});
