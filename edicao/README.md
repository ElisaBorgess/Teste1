# Edição dos vídeos (Remotion)

Estilo: legendas brancas em caixa alta (Montserrat Black, 1 a 3 palavras, palavras-chave em amarelo), zoom alternado de 13% a cada corte, pausas cortadas (>0,3 s), inserts ilustrados em traço fino sobre papel bege (Higgsfield), cartelas serifadas (Playfair) com órbitas, listas numeradas, whoosh nos inserts e música baixa (6%).

Fluxo:
1. Baixar os .MOV do Drive para `brutos/`.
2. `scripts/proxy.sh NOME` gera o proxy 1080p e o áudio.
3. `python3 scripts/transcrever.py NOMES...` (faster-whisper medium, com timestamps por palavra).
4. Escrever `plano.json` (takes escolhidos, inserts, destaques, correções); ver `planos/`.
5. `python3 scripts/montar.py` gera `remotion/public/edl.json`.
6. `npx remotion render src/index.ts Video saida.mp4 --props='{"edl":"edl.json"}'`.

Mídia (vídeos, imagens, sons, fontes) fica fora do Git.
