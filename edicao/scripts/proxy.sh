#!/bin/bash
# uso: proxy.sh NOME  -> gera public/NOME.mp4 (1080p h264) e audio/NOME.wav (16k mono)
set -e
B=/home/user/edicao
n=$1
mkdir -p $B/remotion/public $B/audio
[ -f $B/audio/$n.wav ] || ffmpeg -v error -y -i $B/brutos/$n.MOV -vn -ac 1 -ar 16000 $B/audio/$n.wav
[ -f $B/remotion/public/$n.mp4 ] || ffmpeg -v error -y -i $B/brutos/$n.MOV -map 0:v:0 -map 0:a:0 -vf "scale=1920:-2,format=yuv420p" -r 30 -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 192k -movflags +faststart $B/remotion/public/$n.mp4
echo "proxy ok $n"
