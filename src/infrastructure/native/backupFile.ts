import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Entrega um backup ao usuário.
 *
 * No Android o arquivo vai para o cache e sobe na folha de compartilhamento nativa —
 * é de lá que a pessoa escolhe Drive, WhatsApp ou salvar em Arquivos. No navegador,
 * um download comum, que é o que funciona ali.
 */
export async function exportBackupFile(fileName: string, json: string): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  await Filesystem.writeFile({
    path: fileName,
    data: json,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  await Share.share({
    title: 'Backup do PrintForge',
    files: [uri],
  });
}

/**
 * Abre o seletor de arquivos e devolve o conteúdo escolhido, ou `null` se o usuário
 * desistir. Usa `<input type="file">` porque funciona igual na WebView e no navegador,
 * sem plugin adicional.
 */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };

    // Sem evento de cancelamento confiável na WebView; a promise fica pendente e é
    // descartada com a tela, o que é aceitável para uma ação iniciada pelo usuário.
    input.click();
  });
}
