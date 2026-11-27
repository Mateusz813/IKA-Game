import json, subprocess, sys
FF = 'ffmpeg'
SRC = sys.argv[2] if len(sys.argv) > 2 else 'story-clips'  # folder z 01.mp4 … 12.mp4
OUT = sys.argv[1]
durs = [3, 3, 4, 3, 3, 4, 3, 3, 3, 3, 4, 3]  # długość obrazu każdej scenki (s)
T = 0.4                                       # przenikanie (s)
inputs, parts = [], []
for i, d in enumerate(durs):
    inputs += ['-i', f'{SRC}/{i+1:02d}.mp4']
    parts.append(f'[{i}:v]trim=0:{d},setpts=PTS-STARTPTS,fps=24,scale=640:360,setsar=1,format=yuv420p[v{i}]')
    parts.append(f'[{i}:a]atrim=0:{d},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[a{i}]')
acc = durs[0]; vprev, aprev = 'v0', 'a0'; chapters = [0.0]
for i in range(1, len(durs)):
    off = round(acc - T, 3); chapters.append(off)
    parts.append(f'[{vprev}][v{i}]xfade=transition=fade:duration={T}:offset={off}[vx{i}]')
    parts.append(f'[{aprev}][a{i}]acrossfade=d={T}:c1=tri:c2=tri[ax{i}]')
    vprev, aprev = f'vx{i}', f'ax{i}'
    acc = acc + durs[i] - T
cmd = [FF, '-y', '-hide_banner', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(parts),
       '-map', f'[{vprev}]', '-map', f'[{aprev}]',
       '-c:v', 'libx264', '-profile:v', 'main', '-level', '3.1', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-r', '24',
       '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
print(json.dumps({'total': round(acc, 3), 'chapters': chapters}))
