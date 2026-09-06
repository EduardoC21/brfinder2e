import { parseDurationCode } from '@core/browse/index';
import { isRecord } from '@core/json';
import type { BrowseEntity } from '@core/browse/index';
import { strings } from '@i18n/index';

const f = strings.browse.frequency;

/**
 * A frequência de uso de uma entrada: "1× por dia", "1× por hora".
 *
 * Vive aqui, e não dentro do painel de detalhe, porque a lista também a desenha. Copiar a
 * lógica nos dois seria pedir para elas divergirem — o `per` mistura palavra (`day`) com
 * ISO-8601 (`PT1H`), e o cru na tela aparecia como "1 × PT1H".
 *
 * `core/` decodifica a estrutura, o i18n escreve a palavra, e um código que o decodificador
 * não reconhecer aparece CRU de propósito: uma notação nova numa versão futura do sistema
 * fica feia onde se vê, em vez de virar texto plausível e errado.
 *
 * Devolve `null` quando não há frequência — quem chama não precisa saber disso.
 */
export function Frequency({
  entity,
  field,
}: {
  readonly entity: BrowseEntity;
  readonly field: string;
}) {
  const base = entity.base;
  if (!isRecord(base)) return null;
  const value = base[field];
  if (!isRecord(value)) return null;

  const max = Number(value['max']);
  const per = typeof value['per'] === 'string' ? value['per'] : '';
  const duracao = parseDurationCode(per);
  const unidade = duracao === null ? undefined : f.units[duracao.unit];

  return (
    <>
      {f.times(Number.isFinite(max) ? max : 1)}{' '}
      {duracao === null || unidade === undefined ? f.unknown(per) : f.every(duracao.count, unidade)}
    </>
  );
}
