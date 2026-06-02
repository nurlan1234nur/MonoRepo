from PIL import Image, ImageDraw, ImageFont
import os

ROSE = (232, 96, 122)
BLUSH = (245, 198, 206)
CREAM = (253, 246, 240)
DEEP = (45, 31, 46)


def heart(draw, cx, cy, s, color):
    # simple heart from two circles + triangle
    r = s * 0.27
    draw.ellipse([cx - s * 0.5, cy - s * 0.35, cx - s * 0.5 + 2 * r, cy - s * 0.35 + 2 * r], fill=color)
    draw.ellipse([cx + s * 0.5 - 2 * r, cy - s * 0.35, cx + s * 0.5, cy - s * 0.35 + 2 * r], fill=color)
    draw.polygon([
        (cx - s * 0.5 + 0.04 * s, cy - 0.02 * s),
        (cx + s * 0.5 - 0.04 * s, cy - 0.02 * s),
        (cx, cy + s * 0.5),
    ], fill=color)


def make(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # rounded-ish background via full bleed for maskable, rounded for normal
    pad = 0
    if maskable:
        bg_box = [0, 0, size, size]
    else:
        radius = int(size * 0.22)
        d.rounded_rectangle([0, 0, size, size], radius=radius, fill=ROSE)
        bg_box = None
    if maskable:
        d.rectangle(bg_box, fill=ROSE)
    # heart in cream, scaled and centered (smaller for maskable safe zone)
    scale = 0.42 if maskable else 0.5
    heart(d, size / 2, size * 0.46, size * scale, CREAM)
    return img


sizes = [(192, "icon-192.png"), (512, "icon-512.png")]
for s, name in sizes:
    make(s).save(name)
    print("wrote", name)

make(512, maskable=True).save("icon-maskable-512.png")
print("wrote icon-maskable-512.png")

# apple touch icon 180
make(180).save("apple-touch-icon.png")
print("wrote apple-touch-icon.png")

# favicon
make(64).save("favicon.png")
print("wrote favicon.png")
