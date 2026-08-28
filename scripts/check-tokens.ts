/**
 * Guarda contra token de design que não existe.
 *
 * `color: var(--color-accent)` com `--color-accent` inexistente NÃO é erro em CSS: a
 * declaração vira inválida e a propriedade herda. O rótulo que devia sair em latão saiu
 * branco e nada reclamou — nem o navegador, nem o lint, nem o compilador. Só apareceu
 * porque fui medir a cor calculada na tela.
 *
 * É defeito que reaparece a cada `.module.css` novo, e são doze telas pela frente.
 *
 * Por que script e não teste: o Vitest não processa CSS, e devolve `{}` para todo
 * `import` de folha de estilo — nem com `?raw`. Ligar o processamento de CSS custaria em
 * cada teste de UI para servir a esta verificação só. Isto aqui é da mesma natureza do
 * lint: olha os arquivos do repositório, não o comportamento do código.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOKENS = 'src/ui/design/tokens.css';

function arquivosCss(raiz: string): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
    const caminho = join(raiz, entrada.name);
    if (entrada.isDirectory()) saida.push(...arquivosCss(caminho));
    else if (entrada.name.endsWith('.css')) saida.push(caminho);
  }
  return saida;
}

const declarados = new Set(
  [...readFileSync(TOKENS, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map(([, nome]) => nome),
);

const orfaos: string[] = [];
for (const arquivo of arquivosCss('src')) {
  const texto = readFileSync(arquivo, 'utf8');
  for (const [, nome] of texto.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
    if (nome === undefined || declarados.has(nome)) continue;
    // Variável declarada no próprio arquivo (escopo local) também vale.
    if (texto.includes(`${nome}:`) || texto.includes(`${nome} :`)) continue;
    orfaos.push(`  ${arquivo}  usa  ${nome}`);
  }
}

if (orfaos.length > 0) {
  console.error(`Variável de CSS usada e não declarada em ${TOKENS}:\n${orfaos.join('\n')}`);
  process.exit(1);
}

console.log(`tokens: ${String(declarados.size)} declarados, nenhum uso órfão.`);
