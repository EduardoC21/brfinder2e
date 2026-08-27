/**
 * O relatório de não mapeados — briefing, seção 5.1.
 *
 * "O autor audita a lista em vez de acreditar no agente." O relatório existe para ser
 * lido por você, então a formatação importa tanto quanto o conteúdo.
 *
 * Campo novo numa versão futura do Foundry aparece aqui sozinho, sem ninguém programar
 * nada — porque a lista é a diferença entre o que o documento tem e o que a receita leu.
 */

import type { Recipe } from './recipe';

export interface UnmappedPath {
  readonly path: string;
  /** Em quantos documentos daquele tipo o caminho aparece. */
  readonly count: number;
  readonly example: unknown;
}

export interface ReasonedPath {
  readonly path: string;
  readonly reason: string;
}

export interface NormalizationReport {
  readonly type: string;
  readonly documents: number;
  readonly unmapped: readonly UnmappedPath[];
  readonly ignored: readonly ReasonedPath[];
  readonly deferred: readonly ReasonedPath[];
}

export function buildReport(
  recipe: Recipe,
  documents: number,
  unmapped: readonly UnmappedPath[],
): NormalizationReport {
  return {
    type: recipe.type,
    documents,
    // Do mais frequente para o mais raro: o que aparece em todos é decisão de projeto;
    // o que aparece em três é a exceção que costuma esconder mecânica.
    unmapped: [...unmapped].sort((a, b) => b.count - a.count || a.path.localeCompare(b.path)),
    ignored: toReasonedPaths(recipe.ignore),
    deferred: toReasonedPaths(recipe.defer),
  };
}

function toReasonedPaths(map: Readonly<Record<string, string>>): ReasonedPath[] {
  return Object.entries(map)
    .map(([path, reason]) => ({ path, reason }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** `true` quando não sobrou nada por decidir. É o critério de "relatório limpo". */
export function isClean(report: NormalizationReport): boolean {
  return report.unmapped.length === 0;
}

function preview(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `[…${String(value.length)}]`;
  switch (typeof value) {
    case 'string': {
      const trimmed = value.length > 46 ? `${value.slice(0, 46)}…` : value;
      return JSON.stringify(trimmed);
    }
    case 'number':
      return String(value);
    case 'boolean':
      return String(value);
    case 'undefined':
      return 'ausente';
    case 'object':
      return '{}';
    default:
      return typeof value;
  }
}

function padEnd(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

/** Formata o relatório para leitura no terminal. */
export function formatReport(report: NormalizationReport): string {
  const lines: string[] = [];
  const total = String(report.documents);

  lines.push('');
  lines.push(`NÃO MAPEADOS — existem no documento e a receita não leu`);
  if (report.unmapped.length === 0) {
    lines.push('  (nenhum — relatório limpo)');
  } else {
    const width = Math.max(...report.unmapped.map((item) => item.path.length), 8);
    lines.push(`  ${padEnd('caminho', width)}  ${padEnd('freq', 9)}  exemplo`);
    for (const item of report.unmapped) {
      const freq = `${String(item.count)}/${total}`;
      lines.push(`  ${padEnd(item.path, width)}  ${padEnd(freq, 9)}  ${preview(item.example)}`);
    }
  }

  for (const [title, entries] of [
    ['IGNORADOS — com motivo', report.ignored],
    ['ADIADOS — ficam em raw/, decidir depois', report.deferred],
  ] as const) {
    lines.push('');
    lines.push(title);
    if (entries.length === 0) {
      lines.push('  (nenhum)');
      continue;
    }
    const width = Math.max(...entries.map((entry) => entry.path.length), 8);
    for (const entry of entries) {
      lines.push(`  ${padEnd(entry.path, width)}  ${entry.reason}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
