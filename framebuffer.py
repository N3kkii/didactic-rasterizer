import numpy as np
import io
from PIL import Image, ImageDraw

class Framebuffer:
    def __init__(self, width: int, height: int, gridsize: int):
        self.width, self.height = width, height
        self.gridsize = gridsize
        self._pixels = np.zeros((height*gridsize, width*gridsize), dtype=np.float32)
        self.grid_visible = True

    def __setitem__(self, pt, val):

        x, y = pt
        if not (0 <= x < self.width and 0 <= y < self.height):
            raise IndexError("Coordinates out of bounds")
        
        x = x * self.gridsize
        y = y * self.gridsize

        self._pixels[y:y+self.gridsize, x:x+self.gridsize] = np.clip(val, 0.0, 1.0)

    def __getitem__(self, pt):
        x, y = pt
        return self._pixels[y, x] if (0 <= x < self.width and 0 <= y < self.height) else 0.0

    def clear(self):
        self._pixels.fill(0.0)

    def show_grid(self):
        self.grid_visible = True

    def hide_grid(self):
        self.grid_visible = False

    def _repr_png_(self):
        
        img = Image.fromarray((self._pixels * 255).astype(np.uint8)).convert("RGBA")
        draw = ImageDraw.Draw(img)

        gs = self.gridsize

        if self.grid_visible:
            for x in range(self.width + 1):
                draw.line([(x * gs, 0), (x * gs, self.height * gs)], fill=(50, 50, 50, 100), width=1)
            for y in range(self.height + 1):
                draw.line([(0, y * gs), (self.width * gs, y * gs)], fill=(50, 50, 50, 100), width=1)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()