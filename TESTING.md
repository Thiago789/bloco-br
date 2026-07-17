# Roteiro de teste do Bloco BR

Link publico:

https://thiago789.github.io/bloco-br/

## Teste rapido no celular

1. Abrir o link no navegador do celular.
2. Confirmar se o jogo aparece em modo retrato sem cortes.
3. Tocar na tela e verificar se os sons/musica iniciam.
4. Abrir Perfil, Configuracoes e Jornada.
5. Confirmar se todas as telas rolam quando necessario.
6. Jogar ate completar ou perder uma missao.
7. Testar o quiz regional quando aparecer.
8. Fechar e abrir de novo para conferir se progresso/moedas continuam salvos.
9. Usar a opcao "Adicionar a tela inicial" e abrir como app.
10. Abrir Configuracoes e usar "Copiar dados beta" antes de enviar um relato.
11. Usar "Enviar feedback beta" para registrar a experiencia.

## Teste automatico antes de enviar feedback

No computador, dentro da pasta do projeto:

```powershell
node scripts/smoke-test.mjs
```

Para validar o site publicado:

```powershell
node scripts/smoke-test.mjs --url "https://thiago789.github.io/bloco-br/" --insecure
```

## Jogadores simulados

Para executar 80 sessoes reproduziveis com oito perfis:

```powershell
node scripts/simulate-players.mjs --sessions 10 --seed bloco-br-beta --report SIMULATION_REPORT.md --ci
```

Perfis incluidos: Novato, Aleatorio, Cauteloso, Cacador de linhas, Estrategista de combos, Especialista, Impaciente e Caotico.

Cada sessao cobre a primeira missao, uma cidade distribuida e uma rodada da Chuva BR. O modo `--ci` falha quando a primeira missao cai abaixo de 70%, passa de 25 jogadas em media, as missoes ficam abaixo de 35% ou a Chuva BR deixa de pontuar.

O laboratorio testa regras e equilibrio provavel. Diversao, clareza percebida, audio real, vibracao e vontade de jogar novamente ainda precisam de pessoas.

## O que observar

- Algum botao ficou escondido ou dificil de tocar?
- Algum texto ficou cortado?
- A musica ficou agradavel ou repetitiva?
- A primeira missao ficou clara?
- O jogo parece facil, dificil ou confuso nos primeiros 3 minutos?
- A vontade foi de jogar mais uma partida?

## Feedback sugerido

Ao pedir feedback, use estas perguntas:

1. Em qual celular/navegador voce testou?
2. O jogo carregou rapido?
3. Voce entendeu o objetivo da primeira missao?
4. Alguma tela travou ou nao rolou?
5. O som funcionou depois do primeiro toque?
6. De 0 a 10, quanta vontade deu de jogar novamente?
7. O que voce mudaria primeiro?

Tambem da para pedir que o testador use "Copiar dados beta" e cole essas informacoes no relato enviado pelo botao "Enviar feedback beta".
