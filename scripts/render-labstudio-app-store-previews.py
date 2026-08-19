#!/usr/bin/env python3
"""Render Lab Studio App Store marketing previews (CadetCatch template, dark brand)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "app-store/releases/labstudio/screenshots/raw-6-9"
OUT_DIR = ROOT / "app-store/releases/labstudio/screenshots/iphone-6-9"
ICON_PATH = ROOT / "labstudio-app/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

WIDTH = 1320
HEIGHT = 2868

INK = (244, 244, 245)       # near-white headline
MUTED = (161, 161, 170)     # zinc-400
VIOLET = (124, 58, 237)
BG_TOP = (13, 10, 22)
BG_BOTTOM = (24, 24, 27)
FRAME = (39, 39, 42)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFNSRounded.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_BRAND = font(34, True)
FONT_HEAD = font(92, True)
FONT_SUB = font(39)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def gradient_background() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG_BOTTOM)
    pixels = image.load()
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        color = tuple(int(BG_TOP[i] * (1 - t) + BG_BOTTOM[i] * t) for i in range(3))
        for x in range(WIDTH):
            pixels[x, y] = color

    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((-120, 470, WIDTH + 160, 860), radius=170, fill=(255, 255, 255, 10))
    draw.rounded_rectangle((740, -80, WIDTH + 120, 360), radius=120, fill=(124, 58, 237, 30))
    draw.rounded_rectangle((-160, HEIGHT - 470, 520, HEIGHT + 100), radius=180, fill=(124, 58, 237, 16))
    return image


def text_size(draw: ImageDraw.ImageDraw, text: str, typeface: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=typeface)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, typeface: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        attempt = " ".join([*current, word])
        if text_size(draw, attempt, typeface)[0] <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def draw_text_block(draw: ImageDraw.ImageDraw, headline: str, subhead: str) -> None:
    max_width = WIDTH - 180
    y = 205
    for line in wrap_text(draw, headline, FONT_HEAD, max_width):
        draw.text((90, y), line, font=FONT_HEAD, fill=INK)
        y += 105
    y += 22
    for line in wrap_text(draw, subhead, FONT_SUB, max_width):
        draw.text((94, y), line, font=FONT_SUB, fill=MUTED)
        y += 52


def draw_brand(draw: ImageDraw.ImageDraw, canvas: Image.Image) -> None:
    icon_size = 74
    icon = Image.open(ICON_PATH).convert("RGBA").resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    mask = rounded_mask((icon_size, icon_size), 18)
    canvas.paste(icon, (90, 78), mask)
    draw.text((184, 92), "Lab Studio", font=FONT_BRAND, fill=INK)
    draw.rounded_rectangle((1036, 90, 1230, 144), radius=27, fill=VIOLET)
    draw.text((1075, 100), "iPhone", font=font(26, True), fill=(255, 255, 255))


def draw_device(canvas: Image.Image, source_path: Path, y: int = 635) -> None:
    screen = Image.open(source_path).convert("RGB")
    phone_w = 1010
    phone_h = round(phone_w * HEIGHT / WIDTH)
    x = (WIDTH - phone_w) // 2

    shadow = Image.new("RGBA", (phone_w + 110, phone_h + 120), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((55, 48, 55 + phone_w, 48 + phone_h), radius=120, fill=(124, 58, 237, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    canvas.alpha_composite(shadow, (x - 55, y - 48))

    frame = Image.new("RGBA", (phone_w + 32, phone_h + 32), (0, 0, 0, 0))
    frame_draw = ImageDraw.Draw(frame)
    frame_draw.rounded_rectangle((0, 0, phone_w + 31, phone_h + 31), radius=135, fill=FRAME)
    frame_draw.rounded_rectangle((12, 12, phone_w + 19, phone_h + 19), radius=124, fill=(9, 9, 11))
    canvas.alpha_composite(frame, (x - 16, y - 16))

    screen = screen.resize((phone_w, phone_h), Image.Resampling.LANCZOS).convert("RGBA")
    mask = rounded_mask((phone_w, phone_h), 112)
    canvas.paste(screen, (x, y), mask)


def render_one(output_name: str, source_name: str, headline: str, subhead: str) -> None:
    canvas = gradient_background().convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    draw_brand(draw, canvas)
    draw_text_block(draw, headline, subhead)
    draw_device(canvas, RAW_DIR / source_name)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT_DIR / output_name, "PNG", optimize=True)
    print("rendered", output_name)


def main() -> None:
    render_one(
        "01-your-gym-preview-6-9.png", "01-dash.png",
        "Your whole gym in one app",
        "See your next session, coach plan, and progress the moment you sign in.",
    )
    render_one(
        "02-coach-toby-preview-6-9.png", "03-toby.png",
        "Coach Toby, on demand",
        "Toby answers between sessions — training, food, and recovery.",
    )
    render_one(
        "03-book-sessions-preview-6-9.png", "02-book.png",
        "Book your next session",
        "Booking synced with the studio's Google Calendar.",
    )
    render_one(
        "04-passes-memberships-preview-6-9.png", "04-shop.png",
        "Passes and memberships",
        "Day passes to monthly memberships with Stripe checkout.",
    )
    render_one(
        "05-brain-training-preview-6-9.png", "05-games.png",
        "Test your reflexes, earn points",
        "The Reaction Lab speed challenge, points, and the studio leaderboard.",
    )


if __name__ == "__main__":
    main()
