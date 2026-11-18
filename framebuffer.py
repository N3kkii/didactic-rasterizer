import numpy as np
import io
from PIL import Image, ImageDraw

class Framebuffer:
    def __init__(self, width: int, height: int, gridsize: int = 20, on_write = None):
        self.width, self.height = width, height
        self.gs = gridsize
        self._pixels = np.full((height, width, 3), 255, dtype=np.uint8)
        self._points = []
        self._lines = []
        self.grid_visible = True
        self.steps = []
        self._on_write = on_write  

    # Drawing
    def __setitem__(self, pt, val):
        x, y = pt
        if not (0 <= x < self.width and 0 <= y < self.height):
            raise IndexError("Coordinates out of bounds")
        
        self._pixels[y, x] = val

        if self._on_write:
            self._on_write(self)

    def __getitem__(self, pt):
        x, y = pt
        if not (0 <= x < self.width and 0 <= y < self.height):
            raise IndexError("Index out of image")
        
        return self._pixels[y, x]

    def clear(self):
        self._pixels.fill(255)
        self._points.clear()
        self._lines.clear() 
        self.steps.clear()

    def addPoint(self, x, y, ratio = 0.2, c = (0,0,0)):
        self._points.append((x, y, ratio, c))

    def addLine(self, x0, y0, x1, y1, c=(0,0,0), width=2):
        self._lines.append((x0, y0, x1, y1, c, width))

    # Grid
    def show_grid(self):
        self.grid_visible = True

    def hide_grid(self):
        self.grid_visible = False

    def _painted(self):
        ys, xs = np.nonzero((self._pixels != 255).any(axis=2))
        return [[int(x), int(y), *map(int, self._pixels[y, x])] for y, x in zip(ys, xs)]


    def record_step(self):
        self.steps.append({
            "pixels": self._painted(),
            "lines": [
                {"p0": [l[0], l[1]], "p1": [l[2], l[3]], "c": l[4], "w": l[5]} 
                for l in self._lines
            ],
            "points": [
                {"x": p[0], "y": p[1], "ratio": p[2], "c": p[3]} 
                for p in self._points
            ],
        })

    # Output
    def _repr_png_(self):
        return
        img = Image.fromarray(self._pixels, mode="RGB").convert("RGBA")
        draw = ImageDraw.Draw(img)

        gs = self.gs
        h, w = self.height, self.width

        # Draw a grid
        if self.grid_visible:
            for x in range(w + 1):
                draw.line([(x * gs, 0), (x * gs, h * gs)], fill=(50, 50, 50, 100), width=1)
            for y in range(h + 1):
                draw.line([(0, y * gs), (w * gs, y * gs)], fill=(50, 50, 50, 100), width=1)

        # Draw points
        for x, y, ratio, c in self._points:
            cx = (x + 0.5) * gs
            cy = (y + 0.5) * gs
            r = gs * ratio
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0,0,0), width=1)

        # Draw lines
        for x0, y0, x1, y1, c, w in self._lines:
            p0 = ((x0 + 0.5) * gs, (y0 + 0.5) * gs)
            p1 = ((x1 + 0.5) * gs, (y1 + 0.5) * gs)
            draw.line([p0, p1], fill=c, width=w)


        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()