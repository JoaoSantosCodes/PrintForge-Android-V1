import { describe, expect, it } from 'vitest';
import { looksLikeImage, naoEhImagem, normalizeImageUrl, sniffImage } from './imageUrl';

const bytes = (...valores: number[]) => new Uint8Array([...valores, ...Array(12).fill(0)]);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const HTML = new Uint8Array([...'<!DOCTYPE html>'].map((c) => c.charCodeAt(0)));

describe('normalizeImageUrl', () => {
  it('recusa texto vazio', () => {
    expect(normalizeImageUrl('   ').ok).toBe(false);
  });

  it('recusa o que não é endereço, dizendo como um endereço começa', () => {
    const r = normalizeImageUrl('minha foto.jpg');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('https://');
  });

  it('recusa protocolo que não seja http ou https', () => {
    expect(normalizeImageUrl('ftp://exemplo.com/a.jpg').ok).toBe(false);
    expect(normalizeImageUrl('file:///sdcard/a.jpg').ok).toBe(false);
  });

  /**
   * O caso que motivou o módulo: o link que o Drive oferece em "compartilhar" é uma
   * página com visualizador, não o arquivo. Sem converter, o download traz HTML.
   */
  it('converte o link de compartilhar do Drive para o endereço da imagem', () => {
    const r = normalizeImageUrl('https://drive.google.com/file/d/1AbC-dEf_23/view?usp=sharing');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://lh3.googleusercontent.com/d/1AbC-dEf_23');
  });

  it('converte também o formato antigo, com id na query', () => {
    const r = normalizeImageUrl('https://drive.google.com/open?id=1AbC-dEf_23');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toContain('1AbC-dEf_23');
  });

  it('explica que link de pasta do Drive não serve, e o que fazer', () => {
    const r = normalizeImageUrl('https://drive.google.com/drive/folders/1AbC');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('pasta');
  });

  it('faz o Dropbox servir o arquivo em vez do visualizador', () => {
    const r = normalizeImageUrl('https://www.dropbox.com/s/abc/peca.jpg?dl=0');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toContain('raw=1');
      expect(r.url).not.toContain('dl=0');
    }
  });

  it('deixa passar um endereço direto de imagem sem mexer', () => {
    const r = normalizeImageUrl('https://exemplo.com/fotos/peca.jpg');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://exemplo.com/fotos/peca.jpg');
  });

  it('apara espaços colados junto com o link', () => {
    const r = normalizeImageUrl('  https://exemplo.com/a.png  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://exemplo.com/a.png');
  });
});

describe('sniffImage', () => {
  it('reconhece JPEG e PNG pelos primeiros bytes', () => {
    expect(sniffImage(JPEG)).toBe('jpeg');
    expect(sniffImage(PNG)).toBe('png');
  });

  it('reconhece WEBP, que precisa dos dois blocos', () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImage(webp)).toBe('webp');
  });

  it('não confunde RIFF de outro formato com WEBP', () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
    expect(sniffImage(wav)).toBeNull();
  });

  it('não reconhece HTML', () => {
    expect(sniffImage(HTML)).toBeNull();
  });

  it('não estoura com entrada curta demais para ter assinatura', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe('looksLikeImage', () => {
  /**
   * O `content-type` sozinho enganaria nos dois sentidos: um arquivo privado do Drive
   * responde 200 com HTML, e um servidor mal configurado manda octet-stream para um
   * JPEG legítimo.
   */
  it('aceita JPEG mesmo com content-type genérico', () => {
    expect(looksLikeImage('application/octet-stream', JPEG)).toBe(true);
  });

  it('recusa HTML mesmo que o servidor diga que é imagem', () => {
    expect(looksLikeImage('image/jpeg', HTML)).toBe(false);
  });

  it('recusa quando o content-type é texto', () => {
    expect(looksLikeImage('text/html; charset=utf-8', JPEG)).toBe(false);
  });
});

describe('naoEhImagem', () => {
  it('aponta permissão quando veio do Drive, que é a causa mais comum', () => {
    expect(naoEhImagem('https://lh3.googleusercontent.com/d/1AbC')).toContain('permissão');
  });

  it('fica genérico para outros endereços', () => {
    expect(naoEhImagem('https://exemplo.com/a.jpg')).not.toContain('Drive');
  });
});
