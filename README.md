# Bloco BR

Jogo mobile de blocos com jornada pelo Brasil, Fôlego BR, Quadrados Culturais, perguntas regionais, desafios diários, música procedural e suporte básico a PWA.

## Link publico

https://thiago789.github.io/bloco-br/

## Como testar localmente

Abra `index.html` direto no navegador ou rode um servidor estático:

```powershell
node local-server.mjs
```

Depois acesse:

```text
http://127.0.0.1:8797/
```

## Testes automáticos

Antes de publicar, rode:

```powershell
node scripts/smoke-test.mjs
```

Para testar o link publicado no Windows, caso o Node reclame de certificado local:

```powershell
node scripts/smoke-test.mjs --url "https://thiago789.github.io/bloco-br/" --insecure
```

No GitHub Actions, o smoke test roda automaticamente sem `--insecure`.

O smoke test cobre arquivos PWA, sintaxe do jogo, manifest, service worker, link publicado, tamanho minimo de toque e rolagem dos paineis Perfil, Configuracoes e Jornada.

O laboratorio de jogadores simulados executa oito perfis sobre a primeira missao, as 16 cidades e a Chuva BR:

```powershell
node scripts/simulate-players.mjs --sessions 10 --seed bloco-br-beta --report SIMULATION_REPORT.md --ci
```

O relatorio mede conclusao, quantidade de jogadas, game over por tempo, Quadrados Culturais, erros provaveis, sequencias e desempenho no modo curto. Ele ajuda a encontrar regressao de equilibrio, mas nao substitui testes com pessoas reais.

Feedback beta pode ser enviado pelo botao dentro de Configuracoes ou pela aba Issues do GitHub.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `bloco-br`.
2. Envie os arquivos desta pasta para a raiz do repositório.
3. No GitHub, abra `Settings > Pages`.
4. Em `Build and deployment`, selecione `GitHub Actions`.
5. Faça push na branch `main`.

O workflow em `.github/workflows/deploy-pages.yml` publica o jogo automaticamente.

## Estrutura

```text
index.html              Jogo completo
manifest.webmanifest    Manifest PWA
sw.js                   Cache offline basico
assets/icon.svg         Icone do app
local-server.mjs        Servidor local simples
scripts/simulate-players.mjs Laboratorio deterministico de jogadores
SIMULATION_REPORT.md    Baseline atual de equilibrio
```

## Observações

- O jogo é pensado primeiro para celular em modo retrato.
- O Fôlego BR começa na primeira jogada, recupera tempo com boas limpezas e pausa quando o app fica oculto.
- Os dez segundos finais usam pulsação, som e percussão progressivos para comunicar urgência.
- Um Quadrado Cultural limpa quatro figuras iguais em 2x2 quando combina células de colocações diferentes.
- Partidas, vitórias, derrotas, duração e replays são medidos somente no `localStorage` e aparecem nos dados beta copiados pelo jogador.
- O áudio depende de interação do usuário por regra dos navegadores mobile.
- O progresso é salvo no `localStorage` do navegador.
- O roteiro para teste beta esta em `TESTING.md`.
