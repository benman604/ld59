'''
Isometric tile generator using affine shear transformation.

Usage:
# EW (NW-SE)
python scripts/iso_tile.py public/assets/roadblock.png --ew

# NS (NE-SW)
python scripts/iso_tile.py public/assets/roadblock.png --ns

# Custom output path
python scripts/iso_tile.py public/assets/roadblock.png --ew --out public/assets/roadblock_custom.png
'''


#!/usr/bin/env python3
import argparse
import math
from pathlib import Path

from PIL import Image


def build_iso_tile(input_path: Path, output_path: Path, orientation: str) -> None:
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size

    # Forward transform:
    # X = x - y
    # Y = (x + y) / 2
    # Inverse for PIL mapping output -> input:
    # x = (X + 2Y) / 2
    # y = (-X + 2Y) / 2
    corners = [(0, 0), (w, 0), (0, h), (w, h)]
    transformed = [(x - y, (x + y) / 2) for x, y in corners]
    xs = [p[0] for p in transformed]
    ys = [p[1] for p in transformed]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    out_w = int(math.ceil(max_x - min_x))
    out_h = int(math.ceil(max_y - min_y))

    offset_x = -min_x
    offset_y = -min_y

    a = 0.5
    b = 1.0
    c = -0.5 * offset_x - 1.0 * offset_y

    d = -0.5
    e = 1.0
    f = 0.5 * offset_x - 1.0 * offset_y

    matrix = (a, b, c, d, e, f)

    iso = img.transform(
        (out_w, out_h),
        Image.AFFINE,
        matrix,
        resample=Image.BICUBIC,
        fillcolor=(0, 0, 0, 0)
    )

    if orientation == "ew":
        iso = iso.transpose(Image.FLIP_LEFT_RIGHT)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    iso.save(output_path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a square tile into an isometric tile using affine shear."
    )
    parser.add_argument("input_image", help="Path to the input image")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--ew", action="store_true", help="Generate NW-SE isometric tile")
    group.add_argument("--ns", action="store_true", help="Generate NE-SW isometric tile")
    parser.add_argument(
        "--out",
        dest="output",
        default=None,
        help="Optional output file name"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input_image)
    if not input_path.exists():
        raise SystemExit(f"Input image not found: {input_path}")

    orientation = "ns" if args.ns else "ew"

    if args.output:
        output_path = Path(args.output)
    else:
        suffix = input_path.suffix or ".png"
        output_path = input_path.with_name(f"{input_path.stem}_iso_{orientation}{suffix}")

    build_iso_tile(input_path, output_path, orientation)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
