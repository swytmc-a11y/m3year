"""Renders the سمو road mark into the PNG assets Expo needs.

Drawn at 4x and downsampled so the strokes get real antialiasing — PIL's
line drawing has none of its own, and a 1024px icon with jagged diagonals
looks broken on a phone.
"""
from PIL import Image, ImageDraw

INK = (17, 17, 19, 255)      # lightTokens.text
PAPER = (246, 246, 244, 255)  # lightTokens.bg
NIGHT = (11, 11, 12, 255)     # darkTokens.bg
BONE = (241, 241, 239, 255)   # darkTokens.text

SS = 4  # supersample factor


def draw_mark(draw, cx, cy, unit, color):
    """The mark from components/logo.tsx, in a 24x24 space scaled by `unit`."""
    def pt(x, y):
        return (cx + (x - 12) * unit, cy + (y - 12) * unit)

    def w_of(units):
        return max(1, int(round(units * unit)))

    for a, b, w in [
        ((5, 20.5), (10.2, 5.5), w_of(2)),      # left verge
        ((19, 20.5), (13.8, 5.5), w_of(2)),     # right verge
        ((12, 20.6), (12, 16.9), w_of(2)),      # centre line: shorter AND
        ((12, 14.7), (12, 12.1), w_of(1.6)),    # thinner as it recedes
        ((12, 10.3), (12, 8.9), w_of(1.2)),
    ]:
        draw.line([pt(*a), pt(*b)], fill=color, width=w)
        # PIL has no round caps; a dot at each end supplies them.
        for q in (pt(*a), pt(*b)):
            r = w / 2
            draw.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=color)


def render(path, size, bg, fg, mark_fraction, rounded=False, transparent_bg=False):
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0) if transparent_bg else bg)
    d = ImageDraw.Draw(img)

    if rounded and not transparent_bg:
        img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.22), fill=bg)

    unit = (big * mark_fraction) / 24
    draw_mark(d, big / 2, big / 2, unit, fg)

    img.resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path)


base = "assets/"
# Store icon: full bleed, no rounding (the OS masks it itself).
render(base + "icon.png", 1024, INK, BONE, 0.66)
# Android adaptive foreground must keep clear of the mask's safe area.
render(base + "android-icon-foreground.png", 1024, INK, BONE, 0.44, transparent_bg=True)
render(base + "android-icon-monochrome.png", 1024, INK, (255, 255, 255, 255), 0.44, transparent_bg=True)
Image.new("RGBA", (1024, 1024), INK).save(base + "android-icon-background.png")
print("wrote", base + "android-icon-background.png")
# Splash mark sits on the app background, so it is the ink colour on paper.
render(base + "splash-icon.png", 512, PAPER, INK, 0.55, transparent_bg=True)
render(base + "favicon.png", 96, INK, BONE, 0.66, rounded=True)
