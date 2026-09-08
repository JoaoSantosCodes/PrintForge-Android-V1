import { useEffect, useRef, useState } from 'react';
import { maskDecimal, maskInteger } from '../core/input';

export function TextField({ label, value, placeholder, onChange, type = 'text' }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void; type?: 'text' | 'password' }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} autoComplete={type === 'password' ? 'current-password' : undefined} onChange={(event) => onChange(event.target.value)} /></label>;
}

/**
 * Campo numérico com texto próprio.
 *
 * O input é `type="text"` de propósito: com `type="number"` o navegador descarta
 * estados intermediários como `"1,"`, e o separador decimal some enquanto se digita.
 * O preço disso é aceitar qualquer caractere, então `maskDecimal` filtra a entrada.
 *
 * O texto exibido vive aqui e só é ressincronizado com o valor de fora quando o campo
 * não está em foco — senão o clamp do pai reescreveria o que a pessoa está digitando.
 */
export function Field({ label, value, onChange, mode = 'decimal' }: { label: string; value: number; onChange: (value: string) => void; mode?: 'decimal' | 'integer' }) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setText(String(value));
  }, [value]);

  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="text"
        inputMode={mode === 'integer' ? 'numeric' : 'decimal'}
        value={text}
        onFocus={(event) => {
          focused.current = true;
          event.target.select();
        }}
        onBlur={() => {
          focused.current = false;
          setText(String(value));
        }}
        onChange={(event) => {
          const next = mode === 'integer'
            ? maskInteger(event.target.value, text)
            : maskDecimal(event.target.value, text);
          if (next === text) return;
          setText(next);
          onChange(next);
        }}
      />
    </label>
  );
}

export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
