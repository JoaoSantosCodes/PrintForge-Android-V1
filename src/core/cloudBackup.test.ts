import { describe, expect, it } from 'vitest';
import {
  cloudPath,
  cloudPhotoPath,
  describeStatus,
  ownerOf,
} from './cloudBackup';

describe('caminhos na nuvem', () => {
  /**
   * A política de segurança no banco compara o primeiro segmento do caminho com o dono
   * da sessão. Se este formato mudar sem a política mudar junto, a regra deixa de valer
   * sem que nada quebre visivelmente — que é o pior jeito de uma permissão falhar.
   */
  it('põe o dono no primeiro segmento, que é o que a política inspeciona', () => {
    expect(cloudPath('u-1', 'backup.json')).toBe('u-1/backup.json');
    expect(cloudPhotoPath('u-1', 'foto-9.jpg')).toBe('u-1/fotos/foto-9.jpg');
  });

  it('lê o dono de volta a partir do caminho', () => {
    expect(ownerOf('u-1/backup.json')).toBe('u-1');
    expect(ownerOf('u-1/fotos/foto-9.jpg')).toBe('u-1');
  });

  it('recusa caminho sem dono, em vez de devolver algo parecido com um', () => {
    expect(ownerOf('backup.json')).toBeNull();
    expect(ownerOf('')).toBeNull();
    expect(ownerOf('/backup.json')).toBeNull();
  });
});

describe('describeStatus', () => {
  it('convida a entrar quando não há sessão', () => {
    expect(describeStatus({ state: 'signed-out' })).toContain('Entre na sua conta');
  });

  it('diz claramente quando nunca houve envio', () => {
    expect(describeStatus({ state: 'never-sent', email: 'a@b.com' })).toContain('Nenhuma cópia');
  });

  it('mostra data e contagem de fotos', () => {
    const texto = describeStatus({ state: 'sent', email: 'a@b.com', at: '2026-09-08T14:32:00.000Z', photos: 3 });
    expect(texto).toContain('2026');
    expect(texto).toContain('3 fotos');
  });

  it('usa singular para uma foto', () => {
    const texto = describeStatus({ state: 'sent', email: 'a@b.com', at: '2026-09-08T14:32:00.000Z', photos: 1 });
    expect(texto).toContain('1 foto');
    expect(texto).not.toContain('1 fotos');
  });

  it('diz "sem fotos" em vez de "0 fotos"', () => {
    const texto = describeStatus({ state: 'sent', email: 'a@b.com', at: '2026-09-08T14:32:00.000Z', photos: 0 });
    expect(texto).toContain('sem fotos');
  });

  it('não estoura com data inválida vinda do servidor', () => {
    const texto = describeStatus({ state: 'sent', email: 'a@b.com', at: 'qualquer coisa', photos: 0 });
    expect(texto).toContain('desconhecida');
  });
});


