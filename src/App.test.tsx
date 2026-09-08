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

/**
 * O caminho inteiro do estoque, do jeito que ele foi decidido: a bobina entra cheia,
 * salvar um orçamento não mexe em nada, e só o toque explícito em "dar baixa" desconta.
 */
describe('estoque', () => {
  /**
   * O saldo e o peso original exibem o mesmo texto numa bobina cheia, então procurar
   * "1.000 g" acha dois elementos. O rótulo da barra de nível diz os dois de uma vez e é
   * único por bobina — é o alvo certo, e de quebra checa a acessibilidade da barra.
   */
  const nivel = () => screen.getByRole('img', { name: /do peso original/i }).getAttribute('aria-label') ?? '';

  const cadastrarBobina = (gramas = '1000') => {
    irPara('Estoque');
    fireEvent.click(screen.getByRole('button', { name: /Nova bobina/i }));
    fireEvent.change(screen.getByLabelText(/^Cor$/i), { target: { value: 'Preto' } });
    fireEvent.change(screen.getByLabelText(/Peso da bobina/i), { target: { value: gramas } });
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }));
  };

  it('cadastra uma bobina cheia', () => {
    render(<App />);
    cadastrarBobina();
    expect(nivel()).toMatch(/100% do peso original, 1\.000 g de 1\.000 g/);
  });

  it('salvar um orçamento não mexe no estoque', () => {
    render(<App />);
    cadastrarBobina();
    irPara('Calcular');
    fireEvent.click(screen.getByRole('button', { name: /Salvar no histórico/i }));
    irPara('Estoque');
    expect(nivel()).toMatch(/1\.000 g de 1\.000 g/);
  });

  it('a baixa a partir do histórico desconta o peso do orçamento', () => {
    render(<App />);
    cadastrarBobina();
    irPara('Calcular');
    fireEvent.click(screen.getByRole('button', { name: /Salvar no histórico/i }));
    irPara('Histórico');

    fireEvent.click(screen.getByRole('button', { name: /Dar baixa de 85 g/i }));
    fireEvent.click(screen.getByRole('button', { name: /Baixar 85 g/i }));

    irPara('Estoque');
    expect(nivel()).toMatch(/915 g de 1\.000 g/);
  });

  it('recusa a baixa que não cabe na bobina, sem alterar o saldo', () => {
    render(<App />);
    cadastrarBobina('50');
    irPara('Calcular');
    fireEvent.click(screen.getByRole('button', { name: /Salvar no histórico/i }));
    irPara('Histórico');

    fireEvent.click(screen.getByRole('button', { name: /Dar baixa de 85 g/i }));
    fireEvent.click(screen.getByRole('button', { name: /Baixar 85 g/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/faltam 35 g/i);
    irPara('Estoque');
    expect(nivel()).toMatch(/100% do peso original, 50 g de 50 g/);
  });

  it('avisa quando a bobina está acabando', () => {
    render(<App />);
    cadastrarBobina('100');
    irPara('Calcular');
    fireEvent.click(screen.getByRole('button', { name: /Salvar no histórico/i }));
    irPara('Histórico');
    fireEvent.click(screen.getByRole('button', { name: /Dar baixa de 85 g/i }));
    fireEvent.click(screen.getByRole('button', { name: /Baixar 85 g/i }));

    irPara('Estoque');
    expect(screen.getByText(/está acabando/i)).toBeInTheDocument();
  });

  it('o estoque sobrevive a recarregar o app', () => {
    const primeira = render(<App />);
    cadastrarBobina();
    primeira.unmount();

    render(<App />);
    irPara('Estoque');
    expect(nivel()).toMatch(/1\.000 g de 1\.000 g/);
  });
});

describe('quantidade', () => {
  const definirQuantidade = (valor: string) => {
    irPara('Calcular');
    fireEvent.change(screen.getByLabelText(/^Quantidade$/i), { target: { value: valor } });
  };

  it('cinco peças custam menos que cinco vezes uma, porque a embalagem entra uma vez', () => {
    render(<App />);
    irPara('Calcular');
    const umaPeca = screen.getByRole('heading', { level: 1 }).textContent ?? '';

    definirQuantidade('5');
    const cincoPecas = screen.getByRole('heading', { level: 1 }).textContent ?? '';

    const valor = (texto: string) => Number(texto.replace(/[^\d,]/g, '').replace(',', '.'));
    expect(valor(cincoPecas)).toBeGreaterThan(valor(umaPeca));
    expect(valor(cincoPecas)).toBeLessThan(valor(umaPeca) * 5);
  });

  /**
   * `profit` sempre foi o lucro do pedido. Enquanto o rótulo dizia "por peça" fixo, com
   * cinco peças ele anunciava o lucro do lote como se fosse de uma.
   */
  it('o rótulo do lucro acompanha o que o número é', () => {
    render(<App />);
    irPara('Calcular');
    expect(screen.getByText(/^por peça$/i)).toBeInTheDocument();

    definirQuantidade('5');
    expect(screen.getByText(/^no pedido$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^por peça$/i)).not.toBeInTheDocument();
  });

  it('mostra o preço por peça só quando há mais de uma', () => {
    render(<App />);
    irPara('Calcular');
    expect(screen.queryByText(/por peça · /i)).not.toBeInTheDocument();

    definirQuantidade('5');
    expect(screen.getByText(/5 peças/i)).toBeInTheDocument();
  });

  /**
   * O campo guarda o texto digitado e só volta ao valor do modelo quando perde o foco —
   * sem isso o clamp reescreveria o que a pessoa está digitando. Aqui o que importa é que
   * o cálculo nunca use zero: o preço continua o de uma peça enquanto o texto diz 0, e o
   * campo se corrige ao sair.
   */
  it('não calcula pedido de zero peça, e corrige o campo ao sair dele', () => {
    render(<App />);
    irPara('Calcular');
    const umaPeca = screen.getByRole('heading', { level: 1 }).textContent;

    const campo = screen.getByLabelText(/^Quantidade$/i);
    fireEvent.change(campo, { target: { value: '0' } });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(umaPeca);

    fireEvent.blur(campo);
    expect(campo).toHaveValue('1');
  });

  /**
   * O botão de baixa e o desconto no estoque tinham que sair do mesmo número. Enquanto o
   * App multiplicava num lugar e não no outro, o rótulo prometia uma coisa e o saldo
   * fazia outra.
   */
  it('a baixa desconta o pedido inteiro, não uma peça', () => {
    render(<App />);
    irPara('Estoque');
    fireEvent.click(screen.getByRole('button', { name: /Nova bobina/i }));
    fireEvent.change(screen.getByLabelText(/Peso da bobina/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }));

    definirQuantidade('5');
    fireEvent.click(screen.getByRole('button', { name: /Salvar no histórico/i }));

    irPara('Histórico');
    fireEvent.click(screen.getByRole('button', { name: /Dar baixa de 425 g/i }));
    fireEvent.click(screen.getByRole('button', { name: /Baixar 425 g/i }));

    irPara('Estoque');
    const rotulo = screen.getByRole('img', { name: /do peso original/i }).getAttribute('aria-label') ?? '';
    expect(rotulo).toMatch(/575 g de 1\.000 g/);
  });
});
