import anywidget
import traitlets
from framebuffer import Framebuffer

class lineRasterizer(anywidget.AnyWidget):

    _esm = "rasterizer.js"
    _css = "rasterizer.css"

    width = traitlets.Int(20).tag(sync=True)
    height = traitlets.Int(20).tag(sync=True)
    grid_size = traitlets.Int(25).tag(sync=True)
    steps = traitlets.List([]).tag(sync=True)
    vertices = traitlets.List().tag(sync=True)
    animate = traitlets.Bool().tag(sync=True)

    def __init__(self, algorithm, vertices, width=20, height=20, grid_size = 25):
        super().__init__()
        self.width = width
        self.height = height
        self.grid_size = grid_size
        self.algorithm = algorithm
        self.vertices = [list(v) for v in vertices]
        self.animate = True
        self._run()
        self.observe(self._run, names="vertices")

    def _run(self, change=None):
        history = []

        def snapshot(fb):
            history.append({
                "pixels": fb._painted(),
                "lines": [],
                "points": [],
            })

        fb = Framebuffer(self.width, self.height, on_write=snapshot)
        (x1, y1), (x2, y2) = self.vertices
        self.algorithm(fb, round(x1), round(y1), round(x2), round(y2))
        self.steps = history