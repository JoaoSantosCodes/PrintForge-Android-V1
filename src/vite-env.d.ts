/// <reference types="vite/client" />

/**
 * Variáveis de ambiente do aplicativo.
 *
 * Declaradas aqui, e não deixadas implícitas, para que um nome escrito errado vire erro
 * de compilação em vez de `undefined` em tempo de execução — que é como uma configuração
 * de nuvem ausente se pareceria com uma configuração de nuvem errada.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
