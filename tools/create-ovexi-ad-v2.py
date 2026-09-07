from __future__ import annotations

import importlib.util
import math
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".video-work"
OUT = ROOT / "exports"
spec = importlib.util.spec_from_file_location("ovexi_video_base", ROOT / "tools/create-ovexi-ad.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

W, H, FPS, DURATION = 1080, 1920, 30, 32.5
INK, MINT, ORANGE, WHITE, MUTED = base.INK, base.MINT, base.ORANGE, base.WHITE, base.MUTED


def local_fade(t: float, length: float, edge: float = .32) -> float:
    return min(base.ease(t / edge), base.ease((length - t) / edge), 1)


def background(t: float, warm: bool = False) -> Image.Image:
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    top = np.array([5, 16, 27], dtype=np.float32)[None, None, :]
    bottom = np.array(([31, 24, 20] if warm else [7, 43, 48]), dtype=np.float32)[None, None, :]
    arr = np.repeat(top * (1 - y) + bottom * y, W, axis=1).astype(np.uint8)
    image = Image.fromarray(arr, "RGB").convert("RGBA")
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    drift = int(math.sin(t * .7) * 90)
    primary = ORANGE if warm else MINT
    secondary = MINT if warm else ORANGE
    draw.ellipse((600 + drift, -320, 1450 + drift, 520), fill=(*primary, 36))
    draw.ellipse((-450 - drift, 1180, 430 - drift, 2050), fill=(*secondary, 22))
    return Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(100)))


def header(image: Image.Image, logo: Image.Image):
    image.alpha_composite(logo, (62, 60))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.text((1018, 82), "OVEXI.HU", font=base.font(21, True), fill=(133, 157, 165), anchor="ra")


def browser_card(source: Image.Image, x: int, y: int, width: int, height: int, zoom: float = 1.0):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (width + 100, height + 100), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((50, 40, width + 40, height + 40), radius=42, fill=(0, 0, 0, 145))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(32)), (x - 50, y - 40))
    panel = Image.new("RGBA", (width, height), (246, 244, 236, 255))
    draw = ImageDraw.Draw(panel)
    draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=38, fill=(246, 244, 236), outline=(118, 145, 151), width=2)
    draw.rectangle((0, 0, width, 82), fill=(9, 26, 37))
    for i, color in enumerate(((255, 118, 91), (255, 190, 75), MINT)):
        draw.ellipse((28 + i * 38, 28, 48 + i * 38, 48), fill=color)
    draw.rounded_rectangle((160, 19, width - 32, 60), radius=18, fill=(19, 46, 58))
    draw.text((185, 39), "ovexi.hu/ceges-weboldal", font=base.font(19), fill=(186, 207, 211), anchor="lm")
    inner_w, inner_h = width - 16, height - 98
    ratio = max(inner_w / source.width, inner_h / source.height) * zoom
    scaled = source.resize((int(source.width * ratio), int(source.height * ratio)), Image.Resampling.LANCZOS)
    left = max(0, (scaled.width - inner_w) // 2)
    top = max(0, (scaled.height - inner_h) // 2)
    crop = scaled.crop((left, top, left + inner_w, top + inner_h))
    panel.alpha_composite(crop, (8, 90))
    mask = base.rounded_mask(panel.size, 38)
    panel.putalpha(mask)
    layer.alpha_composite(panel, (x, y))
    return layer


def scene_hook(image, draw, t):
    a = int(255 * local_fade(t, 5.0))
    draw.text((70, 310), "ISMERŐS?", font=base.font(29, True), fill=(*ORANGE, a))
    base.text_block(draw, (70, 390), "Van weboldalad.", 86, (*WHITE, a), 920, True, 5)
    offset = int(50 * (1 - base.ease((t - .8) / .7)))
    base.text_block(draw, (70, 660 + offset), "Mégis az üzenetekből kell kibogoznod mindent.", 67, (*MUTED, a), 920, True, 6)
    if t > 2.2:
        width = int(820 * base.ease((t - 2.2) / .8))
        draw.rounded_rectangle((70, 1120, 70 + width, 1133), radius=7, fill=(*MINT, a))
        draw.text((70, 1190), "Erre van jobb megoldás.", font=base.font(34), fill=(*WHITE, a))


def scene_site(image, draw, t, shot):
    a = int(255 * local_fade(t, 5.0))
    slide = int(160 * (1 - base.ease(t / .7)))
    image.alpha_composite(browser_card(shot, 120, 420 + slide, 840, 1280, 1.0))
    draw.text((70, 205), "NEM CSAK BEMUTAT.", font=base.font(30, True), fill=(*MINT, a))
    draw.text((70, 265), "Rendet is tesz.", font=base.font(72, True), fill=(*WHITE, a))


def scene_modules(image, draw, t):
    a = int(255 * local_fade(t, 4.0))
    draw.text((70, 235), "AMIRE TÉNYLEG SZÜKSÉGED VAN", font=base.font(26, True), fill=(*MINT, a))
    labels = [("Ajánlatkérés", "pontosabb adatok"), ("Időpontkérés", "jóváhagyható kérés"), ("Igényfelvétel", "rendezett feladat")]
    for i, (title, small) in enumerate(labels):
        appear = base.ease((t - i * .42) / .55)
        y = int(405 + i * 355 + (1 - appear) * 90)
        alpha = int(a * appear)
        draw.rounded_rectangle((70, y, 1010, y + 285), radius=34, fill=(12, 42, 53, alpha), outline=(48, 88, 96, alpha), width=2)
        draw.text((120, y + 62), f"0{i + 1}", font=base.font(26, True), fill=(*ORANGE, alpha))
        draw.text((120, y + 120), title, font=base.font(50, True), fill=(*WHITE, alpha))
        draw.text((120, y + 195), small, font=base.font(29), fill=(*MUTED, alpha))
        draw.rounded_rectangle((780, y + 99, 938, y + 159), radius=30, fill=(*MINT, alpha))
        draw.text((859, y + 129), "RENDBEN", font=base.font(19, True), fill=(*INK, alpha), anchor="mm")


def scene_flow(image, draw, t):
    a = int(255 * local_fade(t, 4.0))
    draw.text((70, 260), "A RENDSZER SEGÍT.", font=base.font(30, True), fill=(*MINT, a))
    base.text_block(draw, (70, 335), "A döntés nálad marad.", 78, (*WHITE, a), 920, True, 6)
    labels = ["BEÉRKEZETT", "ÁTNÉZÉS", "JÓVÁHAGYÁS"]
    progress = base.ease((t - .4) / 2.6)
    for i, label in enumerate(labels):
        y = 790 + i * 255
        reached = progress >= i / 2.5
        color = MINT if reached else (51, 76, 85)
        draw.ellipse((90, y, 168, y + 78), fill=(*color, a))
        if i < 2:
            segment = max(0, min(1, progress * 2.5 - i))
            draw.line((129, y + 78, 129, y + 255), fill=(49, 72, 82, a), width=10)
            draw.line((129, y + 78, 129, y + 78 + 177 * segment), fill=(*MINT, a), width=10)
        draw.text((215, y + 39), label, font=base.font(32, True), fill=(*WHITE, a), anchor="lm")
        status = ("Az adatok együtt vannak", "Te megnyitod és ellenőrzöd", "Csak ezután lesz végleges")[i]
        draw.text((215, y + 92), status, font=base.font(25), fill=(*MUTED, a))


def scene_price(image, draw, t):
    a = int(255 * local_fade(t, 3.0))
    draw.text((70, 390), "CÉGES WEBOLDAL + ALAPMODUL", font=base.font(28, True), fill=(*MINT, a))
    scale = .92 + .08 * base.ease(t / .65)
    face = base.font(int(120 * scale), True)
    draw.text((70, 560), "69 990 Ft", font=face, fill=(*WHITE, a))
    draw.text((75, 730), "egyszeri, fizetendő végösszeg", font=base.font(32), fill=(*MUTED, a))
    draw.rounded_rectangle((70, 905, 1010, 1080), radius=28, fill=(12, 48, 56, a), outline=(*MINT, a), width=2)
    draw.text((540, 992), "Egyedi oldal. Követhető működés.", font=base.font(34, True), fill=(*WHITE, a), anchor="mm")


def scene_promo(image, draw, t):
    a = int(255 * local_fade(t, 6.0))
    tilt = math.sin(t * 2) * 1.2
    card = Image.new("RGBA", (900, 730), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card, "RGBA")
    cd.rounded_rectangle((0, 0, 899, 729), radius=45, fill=(247, 244, 234, a))
    cd.text((62, 62), "PROMÓKÓD", font=base.font(24, True), fill=(*ORANGE, a))
    cd.text((62, 140), "OVEXI1EV", font=base.font(85, True), fill=(*INK, a))
    cd.text((62, 290), "AZ ELSŐ ÉVBEN MI ÁLLJUK", font=base.font(27, True), fill=(*INK, a))
    base.text_block(cd, (62, 355), "a standard .hu domain és 1 GB tárhely díját", 42, (*INK, a), 770, True, 8)
    cd.text((62, 610), "Részletes feltételek: ovexi.hu/aszf", font=base.font(22), fill=(86, 105, 111, a))
    card = card.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
    image.alpha_composite(card, ((W - card.width) // 2, 520))
    draw.text((70, 260), "INDULJ KÖNNYEBBEN.", font=base.font(58, True), fill=(*WHITE, a))


def scene_cta(image, draw, t, logo_big):
    a = int(255 * local_fade(t, 5.5, .45))
    logo = logo_big.resize((650, 152), Image.Resampling.LANCZOS)
    logo.putalpha(logo.getchannel("A").point(lambda value: value * a // 255))
    image.alpha_composite(logo, ((W - logo.width) // 2, 320))
    base.text_block(draw, (540, 650), "Nézd meg, hogyan működne nálad.", 62, (*WHITE, a), 900, True, 8, "ma")
    pulse = 1 + .018 * math.sin(t * 5)
    bw, bh = int(890 * pulse), int(150 * pulse)
    bx, by = (W - bw) // 2, 1090
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=30, fill=(*MINT, a))
    draw.text((540, by + bh // 2), "OVEXI.HU/CEGES-WEBOLDAL", font=base.font(32, True), fill=(*INK, a), anchor="mm")
    draw.text((540, 1355), "Díjmentes, személyre szabott terv", font=base.font(29), fill=(*MUTED, a), anchor="ma")


def make_music():
    rate = 48000
    t = np.arange(int(rate * DURATION), dtype=np.float32) / rate
    audio = np.zeros_like(t)
    chords = [(98, 123.47, 146.83), (110, 138.59, 164.81), (82.41, 103.83, 123.47), (87.31, 110, 130.81)]
    for index, start in enumerate(np.arange(0, DURATION, 4)):
        env = np.clip((t - start) / .25, 0, 1) * np.clip((start + 4 - t) / .65, 0, 1)
        for frequency in chords[index % 4]:
            audio += np.sin(2 * np.pi * frequency * t + index * .2) * env * .045
    for hit in np.arange(0, DURATION, 1.0):
        dt = np.maximum(t - hit, 0)
        audio += np.sin(2 * np.pi * (54 + 40 * np.exp(-dt * 20)) * dt) * np.exp(-dt * 15) * (t >= hit) * .11
    for hit in (5, 10, 14, 18, 21, 27):
        dt = t - hit
        mask = (dt >= -.18) & (dt <= .22)
        sweep = np.sin(2 * np.pi * (220 + 1100 * (dt + .18)) * dt)
        audio += sweep * np.exp(-((dt) / .11) ** 2) * mask * .065
    audio *= np.clip(t / .8, 0, 1) * np.clip((DURATION - t) / 1.2, 0, 1)
    stereo = np.stack((audio, audio), axis=1)
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(str(WORK / "music-v2.wav"), "wb") as handle:
        handle.setnchannels(2); handle.setsampwidth(2); handle.setframerate(rate); handle.writeframes(pcm.tobytes())


def render():
    hero = Image.open(WORK / "landing-hero.png").convert("RGBA")
    logo_big = Image.open(ROOT / "assets/images/logo.png").convert("RGBA")
    logo_small = logo_big.resize((205, 48), Image.Resampling.LANCZOS)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    silent = WORK / "silent-v2.mp4"
    proc = subprocess.Popen([ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(silent)], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for index in range(int(FPS * DURATION)):
        t = index / FPS
        image = background(t, 21 <= t < 27)
        draw = ImageDraw.Draw(image, "RGBA")
        header(image, logo_small)
        if t < 5: scene_hook(image, draw, t)
        elif t < 10: scene_site(image, draw, t - 5, hero)
        elif t < 14: scene_modules(image, draw, t - 10)
        elif t < 18: scene_flow(image, draw, t - 14)
        elif t < 21: scene_price(image, draw, t - 18)
        elif t < 27: scene_promo(image, draw, t - 21)
        else: scene_cta(image, draw, t - 27, logo_big)
        proc.stdin.write(image.tobytes())
    proc.stdin.close()
    error = proc.stderr.read().decode(errors="replace")
    if proc.wait() != 0:
        raise RuntimeError(error[-4000:])
    make_music()
    output = OUT / "OVEXI-hirdetes-V2-9x16.mp4"
    filters = f"[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.06,apad=pad_dur={DURATION}[voice];[2:a]volume=.24[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]"
    subprocess.run([ffmpeg, "-y", "-i", str(silent), "-i", str(WORK / "narration-v2.mp3"), "-i", str(WORK / "music-v2.wav"), "-filter_complex", filters, "-map", "0:v", "-map", "[a]", "-t", str(DURATION), "-c:v", "copy", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k", "-movflags", "+faststart", str(output)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    print(output)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    render()
