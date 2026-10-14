#!/usr/bin/env python3
# This file is part of Moodle - http://moodle.org/
#
# Moodle is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Moodle is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Moodle.  If not, see <http://www.gnu.org/licenses/>.
"""Finish the README screenshots: compose the two strip styles, then recompress every PNG.

styles-ring.png and styles-pulse.png (capture.mjs ring / pulse) become calendar-styles.png,
side by side under a caption each, and the two parts are removed. Every PNG in the directory is
then re-encoded losslessly at the highest zlib level. Needs Pillow.

Usage: python3 finish.py [directory]   (default: docs/screenshots, the parent of this script)

@copyright  2026 Anderson Blaine
@license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = ['/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']


def caption_font(size):
    """The first available system font, or Pillow's default."""
    for path in FONTS:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def compose(directory):
    """Put the ring and pulse captures side by side, captioned, on white."""
    parts = [('Ring', 'styles-ring.png'), ('Pulse bars', 'styles-pulse.png')]
    paths = [os.path.join(directory, name) for _, name in parts]
    if not all(os.path.exists(path) for path in paths):
        return
    images = [Image.open(path).convert('RGB') for path in paths]
    gap, caption, margin = 64, 72, 24
    width = sum(image.width for image in images) + gap + 2 * margin
    height = max(image.height for image in images) + caption + margin
    sheet = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(sheet)
    font = caption_font(34)
    x = margin
    for (label, _), image in zip(parts, images):
        draw.text((x + 24, 22), label, fill=(33, 37, 41), font=font)
        sheet.paste(image, (x, caption))
        x += image.width + gap
    sheet.save(os.path.join(directory, 'calendar-styles.png'), optimize=True)
    for path in paths:
        os.remove(path)


def recompress(directory):
    """Re-encode every PNG losslessly, keeping the smaller file."""
    for name in sorted(os.listdir(directory)):
        if not name.endswith('.png'):
            continue
        path = os.path.join(directory, name)
        before = os.path.getsize(path)
        image = Image.open(path)
        image.load()
        if image.mode == 'RGBA' and image.getextrema()[3] == (255, 255):
            image = image.convert('RGB')
        image.save(path + '.tmp', format='PNG', optimize=True, compress_level=9)
        after = os.path.getsize(path + '.tmp')
        if after < before:
            os.replace(path + '.tmp', path)
        else:
            os.remove(path + '.tmp')
        print(f'{name}: {image.width}x{image.height}, {before} -> {min(before, after)} bytes')


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(HERE)
    compose(target)
    recompress(target)
