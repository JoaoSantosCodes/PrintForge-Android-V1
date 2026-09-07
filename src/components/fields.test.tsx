// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Field } from './fields';
import { clampNumericField, numberValue } from '../core/input';

afterEach(cleanup);

/** Reproduz como o App liga o Field: mascara, converte e aplica o limite do campo. */
function Controlado({ inicial = 0, onValor }: { inicial?: number; onValor?: (value: number) => void }) {
  const [value, setValue] = useState(inicial);
  return (
    <Field
      label="Margem (%)"
      value={value}
      onChange={(raw) => {
        const next = clampNumericField('marginPercent', numberValue(raw));
        setValue(next);
        onValor?.(next);
      }}
    />
  );
}

const input = () => screen.getByLabelText('Margem (%)') as HTMLInputElement;

describe('Field', () => {
  it('mostra o valor inicial', () => {
    render(<Controlado inicial={30} />);
    expect(input().value).toBe('30');
  });

  it('deixa digitar o separador decimal sem engolir a vírgula', () => {
    render(<Controlado />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '1,' } });
    expect(input().value).toBe('1,');
  });

  it('não deixa letra aparecer no campo', () => {
    render(<Controlado inicial={12} />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '12a' } });
    expect(input().value).toBe('12');
  });

  it('não propaga mudança quando a máscara rejeita a entrada', () => {
    const onValor = vi.fn();
    render(<Controlado inicial={12} onValor={onValor} />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '12x' } });
    expect(onValor).not.toHaveBeenCalled();
  });

  it('não reescreve o texto enquanto o campo está em foco', () => {
    render(<Controlado />);
    fireEvent.focus(input());
    // O pai limita a 99, mas quem está digitando precisa continuar vendo o que digitou.
    fireEvent.change(input(), { target: { value: '150' } });
    expect(input().value).toBe('150');
  });

  it('ressincroniza com o valor real ao perder o foco', () => {
    render(<Controlado />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '150' } });
    fireEvent.blur(input());
    expect(input().value).toBe('99');
  });

  it('mostra zero, e não texto vazio, depois de apagar tudo e sair', () => {
    render(<Controlado inicial={30} />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '' } });
    fireEvent.blur(input());
    expect(input().value).toBe('0');
  });

  it('usa teclado decimal no Android', () => {
    render(<Controlado />);
    expect(input()).toHaveAttribute('inputmode', 'decimal');
  });
});

describe('Field em modo inteiro', () => {
  function Tempo() {
    const [value, setValue] = useState(0);
    return <Field label="Horas" mode="integer" value={value} onChange={(raw) => setValue(Math.round(numberValue(raw)))} />;
  }
  const horas = () => screen.getByLabelText('Horas') as HTMLInputElement;

  it('não deixa a vírgula zerar o campo no meio da digitação', () => {
    render(<Tempo />);
    fireEvent.focus(horas());
    fireEvent.change(horas(), { target: { value: '2' } });
    fireEvent.change(horas(), { target: { value: '2,' } });
    expect(horas().value).toBe('2');
    fireEvent.blur(horas());
    expect(horas().value).toBe('2');
  });

  it('pede teclado numérico, não decimal', () => {
    render(<Tempo />);
    expect(horas()).toHaveAttribute('inputmode', 'numeric');
  });
});
