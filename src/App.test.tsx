import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { strings } from '@i18n/index';

describe('esqueleto da UI', () => {
  it('renderiza a casca e lê o texto do arquivo de idioma', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toHaveTextContent(strings.app.name);
  });
});
