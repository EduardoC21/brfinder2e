# `ui/` — tudo que é React

Depende do `core/`. O contrário nunca acontece.

- `design/` — tokens de cor, fonte e espaço. **O único lugar com valor literal de estilo.**
- `components/` — peças reutilizáveis e burras: recebem props, não buscam dado.
- `screens/` — as telas do briefing (sincronização, busca, detalhe, filtros, paleta).
- `hooks/` — hooks React compartilhados.
