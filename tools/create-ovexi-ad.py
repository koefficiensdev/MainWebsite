from __future__ import annotations

import asyncio
import math
import subprocess
import wave
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".video-work"
OUT = ROOT / "exports"
W, H, FPS, DURATION = 1080, 1920, 30, 29.5
INK = (5, 17, 29)
MINT = (53, 226, 191)
ORANGE = (255, 158, 68)
WHITE = (246, 249, 248)
MUTED = (172, 193, 201)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return 1 - (1 - value) ** 3


def fade_window(t: float, start: float, end: float, edge: float = .45) -> float:
    return min(ease((t - start) / edge), ease((end - t) / edge), 1.0)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def text_block(draw: ImageDraw.ImageDraw, xy, text, size, fill, width, bold=False, spacing=10, anchor=None):
    words, lines, current = text.split(), [], ""
    face = font(size, bold)
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=face) <= width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    value = "\n".join(lines)
    draw.multiline_text(xy, value, font=face, fill=fill, spacing=spacing, anchor=anchor)
    box = draw.multiline_textbbox(xy, value, font=face, spacing=spacing, anchor=anchor)
    return box


def base_frame(t: float) -> Image.Image:
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    top = np.array([5, 17, 29], dtype=np.float32)[None, None, :]
    bottom = np.array([10, 38, 49], dtype=np.float32)[None, None, :]
    arr = np.repeat(top * (1 - y) + bottom * y, W, axis=1).astype(np.uint8)
    image = Image.fromarray(arr, "RGB")
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    drift = int(math.sin(t * .5) * 70)
    gd.ellipse((620 + drift, -220, 1380 + drift, 540), fill=(53, 226, 191, 38))
    gd.ellipse((-420 - drift, 1080, 420 - drift, 1920), fill=(255, 158, 68, 24))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    return Image.alpha_composite(image.convert("RGBA"), glow)


def capture_site():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--window-size=430,932")
    driver = webdriver.Chrome(options=options)
    try:
        driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 3, "mobile": True})
        driver.get("https://ovexi.hu/ceges-weboldal?video=20260906")
        driver.execute_script("document.documentElement.style.scrollBehavior='auto'")
        driver.save_screenshot(str(WORK / "landing-hero.png"))
        driver.execute_script("document.querySelector('.module-section').scrollIntoView(); window.scrollBy(0,-30)")
        driver.save_screenshot(str(WORK / "landing-module.png"))
    finally:
        driver.quit()


async def narration():
    copy = (
        "A weboldalad csak bemutatkozik? Legyen belőle egy rendszer, ami összegyűjti és rendezi a megkereséseket. "
        "Ajánlatkérés, időpontkérés vagy igényfelvétel, a vállalkozásod működéséhez igazítva. "
        "Egyedi céges weboldal, fix hatvankilencezer-kilencszázkilencven forintért. "
        "Az OVEXI egy év promókóddal az első tizenkét hónap standard pont hu domainjét és egy gigabájt tárhelyét mi álljuk. "
        "Kérj díjmentes, személyre szabott tervet az ovexi pont hu oldalon."
    )
    communicate = edge_tts.Communicate(copy, "hu-HU-NoemiNeural", rate="+10%", pitch="-2Hz")
    await communicate.save(str(WORK / "narration.mp3"))


def make_music():
    rate = 48000
    seconds = DURATION + .5
    t = np.arange(int(rate * seconds), dtype=np.float32) / rate
    progression = [(110.0, 138.59, 164.81), (87.31, 110.0, 130.81), (98.0, 123.47, 146.83), (82.41, 103.83, 123.47)]
    audio = np.zeros_like(t)
    for index, start in enumerate(np.arange(0, seconds, 4.0)):
        chord = progression[index % len(progression)]
        gate = np.clip((t - start) / .35, 0, 1) * np.clip((start + 4.0 - t) / .7, 0, 1)
        for frequency in chord:
            audio += np.sin(2 * np.pi * frequency * t + index * .3) * gate * .055
        audio += np.sin(2 * np.pi * chord[0] * 2 * t) * gate * .018
    for hit in np.arange(0, seconds, 2.0):
        pulse_t = np.maximum(t - hit, 0)
        audio += np.sin(2 * np.pi * (58 + 25 * np.exp(-pulse_t * 18)) * pulse_t) * np.exp(-pulse_t * 12) * (t >= hit) * .10
    audio *= np.clip(t / 1.2, 0, 1) * np.clip((seconds - t) / 1.5, 0, 1)
    stereo = np.stack([audio, audio], axis=1)
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(str(WORK / "music.wav"), "wb") as handle:
        handle.setnchannels(2); handle.setsampwidth(2); handle.setframerate(rate); handle.writeframes(pcm.tobytes())


def phone_mock(source: Image.Image, x: int, y: int, width: int, height: int, alpha: int = 255) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (width + 80, height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((40, 35, width + 35, height + 35), radius=55, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    layer.alpha_composite(shadow, (x - 40, y - 35))
    frame = Image.new("RGBA", (width, height), (8, 18, 28, alpha))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle((0, 0, width - 1, height - 1), radius=50, fill=(7, 15, 23, alpha), outline=(150, 174, 180, alpha), width=2)
    inner = source.convert("RGB")
    ratio = max((width - 24) / inner.width, (height - 24) / inner.height)
    inner = inner.resize((int(inner.width * ratio), int(inner.height * ratio)), Image.Resampling.LANCZOS)
    left = (inner.width - width + 24) // 2
    top = max(0, (inner.height - height + 24) // 2)
    inner = inner.crop((left, top, left + width - 24, top + height - 24)).convert("RGBA")
    inner.putalpha(rounded_mask(inner.size, 40).point(lambda value: value * alpha // 255))
    frame.alpha_composite(inner, (12, 12))
    fd.rounded_rectangle((width // 2 - 55, 15, width // 2 + 55, 29), radius=8, fill=(2, 8, 12, alpha))
    layer.alpha_composite(frame, (x, y))
    return layer


def brand(draw: ImageDraw.ImageDraw, logo: Image.Image):
    draw.bitmap((70, 70), logo, fill=None)
    draw.text((1010, 92), "HIRDETÉS", font=font(22, True), fill=(137, 160, 169), anchor="ra")


def scene_hook(image, draw, t):
    a = int(255 * fade_window(t, 0, 4.2))
    slide = int(70 * (1 - ease(t / .7)))
    draw.text((70, 340 + slide), "A WEBOLDALAD", font=font(33, True), fill=(*MINT, a))
    text_block(draw, (70, 410 + slide), "csak bemutatkozik?", 106, (*WHITE, a), 900, True, 4)
    y = 740
    for i, value in enumerate(("Név", "E-mail", "Üzenet")):
        x = 70 + i * 315
        draw.rounded_rectangle((x, y, x + 280, y + 160), radius=24, outline=(105, 132, 143, a), width=2)
        draw.text((x + 24, y + 28), value, font=font(26), fill=(*MUTED, a))
        draw.line((x + 24, y + 105, x + 245, y + 105), fill=(77, 102, 113, a), width=3)
    draw.text((70, 1025), "A megkeresés ettől még szétszórt marad.", font=font(31), fill=(*MUTED, a))
    line_width = int(700 * ease((t - 2.6) / .8))
    draw.rounded_rectangle((70, 1110, 70 + line_width, 1122), radius=6, fill=(*ORANGE, a))


def scene_system(image, draw, t, shot):
    local = t - 4.0
    a = int(255 * fade_window(t, 4.0, 9.2))
    text_block(draw, (70, 245), "Legyen belőle rendszer.", 78, (*WHITE, a), 600, True, 4)
    text_block(draw, (70, 435), "A látogató egyszerű felületet lát. Te rendezett, használható információt kapsz.", 35, (*MUTED, a), 610, False, 10)
    x = int(710 + 260 * (1 - ease(local / .9)))
    image.alpha_composite(phone_mock(shot, x, 260, 335, 1260, a))
    draw.rounded_rectangle((70, 770, 590, 900), radius=22, fill=(14, 54, 62, a), outline=(*MINT, a), width=2)
    draw.text((100, 796), "WEBOLDAL  →  RENDEZETT IGÉNY", font=font(25, True), fill=(*MINT, a))
    draw.text((100, 846), "Minden következő lépés látható.", font=font(27), fill=(*WHITE, a))


def scene_modules(image, draw, t):
    a = int(255 * fade_window(t, 8.9, 15.1))
    draw.text((70, 255), "A TE MŰKÖDÉSEDHEZ", font=font(28, True), fill=(*MINT, a))
    text_block(draw, (70, 320), "Nem egy újabb sablon.", 72, (*WHITE, a), 920, True, 5)
    cards = [
        ("01", "Ajánlatkérés", "A szükséges adatok már érkezéskor együtt vannak."),
        ("02", "Időpontkérés", "A kérés a vállalkozó jóváhagyására vár."),
        ("03", "Igényfelvétel", "A rendszer a válaszok alapján rendezi a feladatot."),
    ]
    for i, (num, title, copy) in enumerate(cards):
        appear = ease((t - (9.6 + i * .55)) / .7)
        y = int(570 + i * 300 + 70 * (1 - appear))
        ca = int(a * appear)
        draw.rounded_rectangle((70, y, 1010, y + 245), radius=30, fill=(12, 39, 51, ca), outline=(45, 82, 92, ca), width=2)
        draw.rounded_rectangle((100, y + 42, 190, y + 132), radius=22, fill=(*MINT, ca))
        draw.text((145, y + 87), num, font=font(29, True), fill=(*INK, ca), anchor="mm")
        draw.text((225, y + 42), title, font=font(39, True), fill=(*WHITE, ca))
        text_block(draw, (225, y + 101), copy, 28, (*MUTED, ca), 710, False, 8)


def scene_flow(image, draw, t, shot):
    a = int(255 * fade_window(t, 14.8, 20.7))
    draw.text((70, 235), "NÁLAD MARAD A DÖNTÉS", font=font(28, True), fill=(*ORANGE, a))
    text_block(draw, (70, 300), "A rendszer rendezi. Te jóváhagyod.", 70, (*WHITE, a), 930, True, 5)
    progress = ease((t - 15.5) / 3.7)
    y = 755
    labels = ["BEÉRKEZETT", "ÁTNÉZÉS", "JÓVÁHAGYÁS"]
    for i, label in enumerate(labels):
        x = 100 + i * 330
        active = progress >= i / 3
        color = MINT if active else (64, 91, 100)
        draw.ellipse((x, y, x + 68, y + 68), fill=(*color, a))
        if i < 2:
            length = max(0, min(1, progress * 3 - i))
            draw.line((x + 68, y + 34, x + 330, y + 34), fill=(55, 75, 84, a), width=8)
            draw.line((x + 68, y + 34, x + 68 + 262 * length, y + 34), fill=(*MINT, a), width=8)
        draw.text((x + 34, y + 115), label, font=font(19, True), fill=(*WHITE, a), anchor="mm")
    crop = shot.crop((0, 330, shot.width, min(shot.height, 1950)))
    image.alpha_composite(phone_mock(crop, 260, 1030, 560, 690, int(a * .96)))


def scene_offer(image, draw, t):
    a = int(255 * fade_window(t, 20.3, 25.2))
    draw.text((70, 260), "CÉGES WEBOLDAL + ALAPMODUL", font=font(27, True), fill=(*MINT, a))
    draw.text((70, 370), "69 990 Ft", font=font(112, True), fill=(*WHITE, a))
    draw.text((75, 515), "egyszeri, fizetendő végösszeg", font=font(31), fill=(*MUTED, a))
    draw.rounded_rectangle((70, 680, 1010, 1100), radius=34, fill=(247, 244, 234, a))
    draw.text((120, 745), "OVEXI1EV", font=font(76, True), fill=(*INK, a))
    draw.text((120, 855), "ELSŐ 12 HÓNAP", font=font(29, True), fill=(*ORANGE, a))
    text_block(draw, (120, 910), "standard .hu domain + 1 GB webtárhely díját mi álljuk", 34, (*INK, a), 800, True, 8)
    text_block(draw, (70, 1215), "A promóció a fejlesztési díjat nem csökkenti. A részletes feltételek az ÁSZF-ben találhatók.", 24, (137, 159, 167, a), 920, False, 6)


def scene_cta(image, draw, t, logo_big):
    a = int(255 * fade_window(t, 24.8, 29.5, .5))
    pulse = 1 + .025 * math.sin((t - 25) * 4)
    lw, lh = int(620 * pulse), int(145 * pulse)
    logo = logo_big.resize((lw, lh), Image.Resampling.LANCZOS)
    logo.putalpha(logo.getchannel("A").point(lambda v: v * a // 255))
    image.alpha_composite(logo, ((W - lw) // 2, 320))
    text_block(draw, (540, 630), "Kérj díjmentes, személyre szabott tervet.", 65, (*WHITE, a), 900, True, 8, "ma")
    button_y = 1050
    draw.rounded_rectangle((120, button_y, 960, button_y + 145), radius=25, fill=(*MINT, a))
    draw.text((540, button_y + 72), "OVEXI.HU/CEGES-WEBOLDAL", font=font(31, True), fill=(*INK, a), anchor="mm")
    draw.text((540, 1310), "Weboldal, ami dolgozik is.", font=font(34), fill=(*MUTED, a), anchor="ma")


def render_video():
    logo_big = Image.open(ROOT / "assets/images/logo.png").convert("RGBA")
    logo_small = logo_big.resize((205, 48), Image.Resampling.LANCZOS)
    hero = Image.open(WORK / "landing-hero.png").convert("RGBA")
    module = Image.open(WORK / "landing-module.png").convert("RGBA")
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    silent = WORK / "silent.mp4"
    command = [ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-vcodec", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(silent)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for frame_index in range(int(FPS * DURATION)):
        t = frame_index / FPS
        image = base_frame(t)
        draw = ImageDraw.Draw(image, "RGBA")
        brand(draw, logo_small)
        if t < 4.35: scene_hook(image, draw, t)
        if 3.9 < t < 9.35: scene_system(image, draw, t, hero)
        if 8.85 < t < 15.25: scene_modules(image, draw, t)
        if 14.65 < t < 20.85: scene_flow(image, draw, t, module)
        if 20.15 < t < 25.35: scene_offer(image, draw, t)
        if t > 24.65: scene_cta(image, draw, t, logo_big)
        process.stdin.write(image.tobytes())
    process.stdin.close()
    stderr = process.stderr.read().decode("utf-8", errors="replace")
    if process.wait() != 0:
        raise RuntimeError(stderr[-4000:])
    output = OUT / "OVEXI-hirdetes-9x16.mp4"
    mux = [ffmpeg, "-y", "-i", str(silent), "-i", str(WORK / "narration.mp3"), "-i", str(WORK / "music.wav"), "-filter_complex", f"[1:a]atempo=1.08,aresample=48000,aformat=channel_layouts=stereo,volume=1.0,apad=pad_dur={DURATION}[voice];[2:a]volume=0.30[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]", "-map", "0:v", "-map", "[a]", "-t", str(DURATION), "-c:v", "copy", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k", "-movflags", "+faststart", str(output)]
    subprocess.run(mux, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return output


def main():
    WORK.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    capture_site()
    asyncio.run(narration())
    make_music()
    output = render_video()
    print(output)


if __name__ == "__main__":
    main()
