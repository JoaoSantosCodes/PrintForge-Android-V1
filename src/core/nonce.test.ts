import { describe, expect, it } from 'vitest';
import { createNonce, sha256Hex } from './nonce';

describe('sha256Hex', () => {
  /**
   * Vetor conhecido, e não um teste de "devolve alguma coisa": o Supabase compara este
   * hash byte a byte com o que veio dentro do ID token. Um formato quase certo — base64,
   * hexadecimal maiúsculo, um zero à esquerda comido — falha lá, não aqui.
   */
  it('bate com o vetor conhecido de "abc"', async () => {
    expect(await sha256Hex('abc'))
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('bate com o vetor da string vazia', async () => {
    expect(await sha256Hex(''))
      .toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('tem 64 caracteres hexadecimais minúsculos', async () => {
    const hash = await sha256Hex(crypto.randomUUID());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('createNonce', () => {
  it('o que vai para o Google é o hash do que vai para o Supabase', async () => {
    const nonce = await createNonce();
    expect(nonce.paraOGoogle).toBe(await sha256Hex(nonce.paraOSupabase));
  });

  it('os dois valores são diferentes entre si', async () => {
    // Se um dia virarem iguais, alguém removeu o hash e o login para de funcionar
    // apenas em produção, onde o Supabase confere de verdade.
    const nonce = await createNonce();
    expect(nonce.paraOGoogle).not.toBe(nonce.paraOSupabase);
  });

  it('não repete entre chamadas', async () => {
    const [a, b] = await Promise.all([createNonce(), createNonce()]);
    expect(a.paraOSupabase).not.toBe(b.paraOSupabase);
  });
});
