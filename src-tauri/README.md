# `src-tauri/` — a casca nativa

Ainda **não compila nesta máquina**: o Rust não está instalado (briefing, seção 8).
Isso é proposital. Todas as etapas de 1 a 13 rodam no navegador com `npm run dev`,
que é mais rápido para iterar.

Quando chegarmos na Etapa 15 (empacotamento), instale:

1. `rustup` — https://rustup.rs
2. Visual Studio Build Tools com o componente "Desktop development with C++" (o linker MSVC)
3. WebView2 — já vem no Windows 11

Depois `npm run tauri dev` abre a janela nativa apontando para o mesmo servidor Vite.

Pendência conhecida: `bundle.icon` está vazio em `tauri.conf.json`. O instalador precisa
dos ícones (32x32.png, 128x128.png, icon.ico) em `icons/`. Gere com `npm run tauri icon`
na Etapa 15.
