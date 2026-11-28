"""Skleja scenki (1.mp4 … N.mp4 albo 01.mp4 …) w jeden film z przenikaniami.

Użycie:
  python3 scripts/build-story.py WYJSCIE.mp4 FOLDER_ZE_SCENKAMI [--fade 0.4] [--size 640x360]

Na koniec wypisuje JSON z długością i `chapters` — początkami scenek w sekundach
(do wklejenia w src/lib/memes.js). Wymaga ffmpeg w PATH (albo FFMPEG=ścieżka).
"""
import argparse, json, os, re, subprocess

ap = argparse.ArgumentParser()
ap.add_argument('out')
ap.add_argument('src')
ap.add_argument('--fade', type=float, default=0.4, help='przenikanie w sekundach')
ap.add_argument('--size', default='640x360', help='rozdzielczość wyjściowa, np. 1920x1080')
ap.add_argument('--fps', type=int, default=24)
a = ap.parse_args()

FF = os.environ.get('FFMPEG', 'ffmpeg')
W, H = a.size.split('x')
clips = sorted((f for f in os.listdir(a.src) if re.fullmatch(r'\d+\.mp4', f)), key=lambda f: int(f[:-4]))


def video_seconds(path):
    """Dokładna długość OBRAZU (liczba klatek / fps) — kontener bywa dłuższy o dźwięk."""
    out = subprocess.run([FF, '-hide_banner', '-i', path, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    frames = int(re.findall(r'frame=\s*(\d+)', out)[-1])
    return frames / a.fps


durs = [video_seconds(os.path.join(a.src, c)) for c in clips]
T = a.fade
inputs, parts = [], []
for i, (c, d) in enumerate(zip(clips, durs)):
    inputs += ['-i', os.path.join(a.src, c)]
    parts.append(f'[{i}:v]trim=0:{d:.4f},setpts=PTS-STARTPTS,fps={a.fps},'
                 f'scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,'
                 f'setsar=1,format=yuv420p[v{i}]')
    parts.append(f'[{i}:a]atrim=0:{d:.4f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[a{i}]')

acc = durs[0]
vprev, aprev = 'v0', 'a0'
chapters = [0.0]
for i in range(1, len(durs)):
    off = round(acc - T, 3)
    chapters.append(off)
    parts.append(f'[{vprev}][v{i}]xfade=transition=fade:duration={T}:offset={off}[vx{i}]')
    parts.append(f'[{aprev}][a{i}]acrossfade=d={T}:c1=tri:c2=tri[ax{i}]')
    vprev, aprev = f'vx{i}', f'ax{i}'
    acc = acc + durs[i] - T

hd = int(H) >= 1080
cmd = [FF, '-y', '-hide_banner', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(parts),
       '-map', f'[{vprev}]', '-map', f'[{aprev}]',
       '-c:v', 'libx264', '-profile:v', 'high' if hd else 'main', '-level', '4.0' if hd else '3.1',
       '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'medium', '-maxrate', '6M', '-bufsize', '12M',
       '-r', str(a.fps), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', a.out]
subprocess.run(cmd, check=True)
print(json.dumps({'clips': clips, 'total': round(acc, 3), 'chapters': chapters}))
