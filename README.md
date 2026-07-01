# Bloco BR

Jogo mobile de blocos com jornada pelo Brasil, perguntas regionais, desafios diários, música procedural e suporte básico a PWA.

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
```

## Observações

- O jogo é pensado primeiro para celular em modo retrato.
- O áudio depende de interação do usuário por regra dos navegadores mobile.
- O progresso é salvo no `localStorage` do navegador.
- O roteiro para teste beta esta em `TESTING.md`.
