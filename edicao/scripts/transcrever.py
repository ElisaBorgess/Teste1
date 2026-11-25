import sys, json, os, wave, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
for n in sys.argv[1:]:
    out = f"/home/user/edicao/transcricoes/{n}.json"
    if os.path.exists(out): continue
    wf = wave.open(f"/home/user/edicao/audio/{n}.wav"); a = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32)/32768
    segs, _ = m.transcribe(a, language="pt", word_timestamps=True, vad_filter=True)
    words = [{"w": w.word.strip(), "s": round(w.start,2), "e": round(w.end,2)} for s in segs for w in s.words]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(words, open(out,"w"), ensure_ascii=False)
    print("ok", n, len(words), flush=True)
