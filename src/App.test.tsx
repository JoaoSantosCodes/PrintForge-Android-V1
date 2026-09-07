// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

/**
 * Teste de fumaça do app inteiro.
 *
 * Existe para dar rede de segurança à quebra do App.tsx em módulos: se a navegação, o
 * cálculo ou a gravação no histórico pararem de funcionar durante a refatoração, aqui
 * quebra. Não tenta cobrir cada tela — cobre o caminho que o usuário realmente percorre.
 */

beforeEach(() => localStorage.clear());
afterEach(cleanup);

// Nome exato: "Histórico" também aparece dentro de "Salvar no histórico".
const irPara = (aba: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${aba}$`, 'i') }));

describe('PrintForge', () => {
  it('abre no painel inicial', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Início/i })).toBeInTheDocument();
  });

  it('semeia catálogo de materiais e impressoras na primeira execução', () => {
    render(<App />);
    irPara('Materiais');
    expect(localStorage.getItem('printforge.materials')).not.toBeNull();
  });

  it('navega entre as abas', () => {
    render(<App />);
    irPara('Ajustes');
    expect(screen.getByRole('heading', { name: /Parâmetros padrão/i })).toBeInTheDocument();
    irPara('Materiais');
    expect(screen.queryByRole('heading', { name: /Parâmetros padrão/i })).not.toBeInTheDocument();
  });

  it('calcula um preço a partir do peso digitado', () => {
    render(<App />);
    irPara('Calcular');

    const peso = screen.getByLabelText(/Peso da peça/i);
    fireEvent.focus(peso);
    fireEvent.change(peso, { target: { value: '250' } });

    // O preço de venda aparece como título da seção de resultado.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/R\$/);
  });

  it('salva no histórico e mostra o registro na aba correspondente', () => {
    render(<App />);
    irPara('Calcular');

    const peso = screen.getByLabelText(/Peso da peça/i);
    fireEvent.focus(peso);
    fireEvent.change(peso, { target: { value: '250' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar no histórico/i }));
    expect(screen.getByText(/Cálculo salvo/i)).toBeInTheDocument();

    irPara('Histórico');
    expect(localStorage.getItem('printforge.calculations')).toContain('"weightGrams":250');
  });

  it('persiste ajustes alterados', () => {
    render(<App />);
    irPara('Ajustes');

    const margem = within(screen.getByRole('heading', { name: /Parâmetros padrão/i }).closest('section')!)
      .getByLabelText(/Margem/i);
    fireEvent.focus(margem);
    fireEvent.change(margem, { target: { value: '45' } });
    fireEvent.blur(margem);

    expect(localStorage.getItem('printforge.settings')).toContain('"marginPercent":45');
  });

  it('limita a margem a 99 mesmo com entrada maior', () => {
    render(<App />);
    irPara('Ajustes');

    const margem = within(screen.getByRole('heading', { name: /Parâmetros padrão/i }).closest('section')!)
      .getByLabelText(/Margem/i);
    fireEvent.focus(margem);
    fireEvent.change(margem, { target: { value: '150' } });
    fireEvent.blur(margem);

    expect(localStorage.getItem('printforge.settings')).toContain('"marginPercent":99');
  });
});

describe('entrada por volume', () => {
  const irParaCalculo = () => {
    render(<App />);
    irPara('Calcular');
  };

  it('começa por peso, oferecendo a alternância', () => {
    irParaCalculo();
    expect(screen.getByLabelText(/Peso da peça/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Informar por volume/i })).toBeInTheDocument();
  });

  it('troca para volume e converte usando a densidade do material', () => {
    irParaCalculo();

    const peso = screen.getByLabelText(/Peso da peça/i);
    fireEvent.focus(peso);
    fireEvent.change(peso, { target: { value: '124' } });
    fireEvent.blur(peso);

    fireEvent.click(screen.getByRole('button', { name: /Informar por volume/i }));

    // PLA tem densidade 1,24 g/cm³, então 124 g equivalem a 100 cm³.
    expect((screen.getByLabelText(/Volume da peça/i) as HTMLInputElement).value).toBe('100');
  });

  it('converte de volta ao digitar volume, mostrando a massa equivalente', () => {
    irParaCalculo();
    fireEvent.click(screen.getByRole('button', { name: /Informar por volume/i }));

    const volume = screen.getByLabelText(/Volume da peça/i);
    fireEvent.focus(volume);
    fireEvent.change(volume, { target: { value: '50' } });

    expect(screen.getByText('62 g')).toBeInTheDocument();
  });

  it('volta para peso preservando o valor convertido', () => {
    irParaCalculo();
    fireEvent.click(screen.getByRole('button', { name: /Informar por volume/i }));

    const volume = screen.getByLabelText(/Volume da peça/i);
    fireEvent.focus(volume);
    fireEvent.change(volume, { target: { value: '50' } });
    fireEvent.blur(volume);

    fireEvent.click(screen.getByRole('button', { name: /Informar por peso/i }));
    expect((screen.getByLabelText(/Peso da peça/i) as HTMLInputElement).value).toBe('62');
  });

  it('grava o peso em gramas no histórico, não o volume', () => {
    irParaCalculo();
    fireEvent.click(screen.getByRole('button', { name: /Informar por volume/i }));

    const volume = screen.getByLabelText(/Volume da peça/i);
    fireEvent.focus(volume);
    fireEvent.change(volume, { target: { value: '50' } });
    fireEvent.blur(volume);

    fireEvent.click(screen.getByRole('button', { name: /Salvar no histórico/i }));
    expect(localStorage.getItem('printforge.calculations')).toContain('"weightGrams":62');
  });
});

describe('troca de tema', () => {
  const abrirAjustes = () => {
    render(<App />);
    irPara('Ajustes');
  };

  it('começa em automático, sem estampar atributo no html', () => {
    abrirAjustes();
    expect(screen.getByRole('button', { name: 'Automático' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('estampa data-theme ao escolher claro', () => {
    abrirAjustes();
    fireEvent.click(screen.getByRole('button', { name: 'Claro' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('volta a não estampar nada ao retornar para automático', () => {
    abrirAjustes();
    fireEvent.click(screen.getByRole('button', { name: 'Escuro' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Automático' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('guarda a escolha em chave própria, fora dos ajustes do negócio', () => {
    abrirAjustes();
    fireEvent.click(screen.getByRole('button', { name: 'Claro' }));
    expect(localStorage.getItem('printforge.theme')).toBe('"light"');
    expect(localStorage.getItem('printforge.settings')).not.toContain('light');
  });
});

describe('composição do custo', () => {
  it('mostra a barra e a legenda depois de um cálculo', () => {
    render(<App />);
    irPara('Calcular');

    const peso = screen.getByLabelText(/Peso da peça/i);
    fireEvent.focus(peso);
    fireEvent.change(peso, { target: { value: '250' } });

    expect(screen.getByRole('img', { name: /Filamento \d+%/i })).toBeInTheDocument();
  });

  it('não desenha barra alguma quando não há custo', () => {
    render(<App />);
    irPara('Calcular');

    const peso = screen.getByLabelText(/Peso da peça/i);
    fireEvent.focus(peso);
    fireEvent.change(peso, { target: { value: '0' } });
    const horas = screen.getByLabelText('Horas');
    fireEvent.focus(horas);
    fireEvent.change(horas, { target: { value: '0' } });

    expect(screen.queryByRole('img', { name: /Filamento/i })).not.toBeInTheDocument();
  });
});
