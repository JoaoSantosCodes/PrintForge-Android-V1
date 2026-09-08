import { describe, expect, it } from 'vitest';
import { linkLabel, safeExternalUrl } from './link';

describe('safeExternalUrl', () => {
  /**
   * O teste que justifica o módulo existir. Um endereço digitado pelo usuário vira o
   * `href` de um link; `javascript:` ali executa no contexto do aplicativo, com acesso ao
   * `localStorage` onde moram catálogo, histórico e estoque.
   */
  it('recusa esquemas que executam código', () => {
    for (const perigoso of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///sdcard/x.html',
    ]) {
      const r = safeExternalUrl(perigoso);
      expect(r.ok, perigoso).toBe(false);
    }
  });

  it('aceita http e https', () => {
    expect(safeExternalUrl('https://voolt3d.com.br/petg/').ok).toBe(true);
    expect(safeExternalUrl('http://exemplo.com.br').ok).toBe(true);
  });

  /**
   * Quem copia de um site copia `voolt3d.com.br/petg`, sem o prefixo. Recusar isso seria
   * um erro que a pessoa não entende, porque o endereço na mão dela está certo.
   */
  it('completa o esquema quando falta', () => {
    const r = safeExternalUrl('voolt3d.com.br/petg/cores-solidas/');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://voolt3d.com.br/petg/cores-solidas/');
  });

  it('preserva caminho, consulta e âncora', () => {
    const r = safeExternalUrl('https://makerworld.com/pt/models/2789940-stormtrooper#profileId-3102186');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toContain('/pt/models/2789940');
      expect(r.url).toContain('#profileId-3102186');
    }
  });

  it('recusa texto vazio', () => {
    expect(safeExternalUrl('   ').ok).toBe(false);
  });

  it('recusa domínio sem ponto, que nenhum navegador resolve', () => {
    const r = safeExternalUrl('loja');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('domínio');
  });

  it('recusa domínio malformado', () => {
    expect(safeExternalUrl('https://.com').ok).toBe(false);
    expect(safeExternalUrl('https://exemplo.').ok).toBe(false);
  });

  it('apara espaços colados junto', () => {
    const r = safeExternalUrl('  https://exemplo.com/a  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://exemplo.com/a');
  });
});

describe('linkLabel', () => {
  it('mostra só o domínio, para caber num botão', () => {
    expect(linkLabel('https://voolt3d.com.br/petg/cores-solidas/')).toBe('voolt3d.com.br');
    expect(linkLabel('https://makerworld.com/pt/models/2789940')).toBe('makerworld.com');
  });

  it('descarta o www, que não distingue nada', () => {
    expect(linkLabel('https://www.dropbox.com/s/abc')).toBe('dropbox.com');
  });

  it('devolve o texto cru quando não dá para interpretar', () => {
    expect(linkLabel('nem endereço')).toBe('nem endereço');
  });
});
