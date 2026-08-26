import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { strings } from '@i18n/index';

describe('esqueleto da UI', () => {
  it('renderiza React dentro do jsdom e lê o texto do arquivo de idioma', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(strings.app.name);
  });
});
