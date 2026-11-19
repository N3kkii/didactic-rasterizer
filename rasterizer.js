function render({ model, el }) {
  // Set up the widget surroundings and canvas
  const container = document.createElement("div");
  container.className = "rasterizer-container";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const controls = document.createElement("div");
  controls.className = "rasterizer-controls";

  const btnPrev = document.createElement("button");
  btnPrev.textContent = "◀";
  const btnNext = document.createElement("button");
  btnNext.textContent = "▶";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.value = "0";

  const animLabel = document.createElement("label");
  const animCheckbox = document.createElement("input");
  animCheckbox.type = "checkbox";
  animCheckbox.checked = model.get("animate");
  animLabel.append(animCheckbox, " Animate");

  controls.append(btnPrev, slider, btnNext, animLabel);
  container.append(canvas, controls);
  el.appendChild(container);


  let currentStep = 0; // Current step of an algorithm
  
  // Helper function that updates the slider element
  function updateSlider() {
    const steps = model.get("steps") || [];
    const max = Math.max(0, steps.length - 1);
    slider.max = max;
    currentStep = Math.min(currentStep, max);
    slider.value = currentStep;
  }

  const w = model.get("width");
  const h = model.get("height");
  const gs = model.get("grid_size");

  // Main draw function
  function draw() {
    // Get model parameters
    const lines = model.get("lines") || [];
    const vertices = model.get("vertices") || [];
    const steps = model.get("steps") || [];

    canvas.width = w * gs;
    canvas.height = h * gs;
    
    // Clear the canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get current algorithm step
    const step = steps[currentStep];

    if (step) {
      // Draw pixels
      for (const [x, y, r, g, b] of step.pixels) {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x * gs, y * gs, gs, gs);
      }

      // Draw lines
      for (const l of step.lines) {
        ctx.strokeStyle = `rgb(${l.c[0]}, ${l.c[1]}, ${l.c[2]})`;
        ctx.lineWidth = l.w;
        ctx.beginPath();
        ctx.moveTo((l.p0[0] + 0.5) * gs, (l.p0[1] + 0.5) * gs);
        ctx.lineTo((l.p1[0] + 0.5) * gs, (l.p1[1] + 0.5) * gs);
        ctx.stroke();
      }
    }
    
    // Draw grid
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x++) {
      ctx.beginPath(); ctx.moveTo(x * gs, 0); ctx.lineTo(x * gs, h * gs); ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * gs); ctx.lineTo(w * gs, y * gs); ctx.stroke();
    }

    // Draw points
    ctx.fillStyle = `rgb(255, 0, 0)`;
    ctx.strokeStyle = `rgb(118, 58, 58)`;
    ctx.lineWidth = 3;
    for (const [x, y] of vertices) {
      console.log("adding point");
      ctx.beginPath();
      ctx.arc((x + 0.5) * gs, (y + 0.5) * gs, gs * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Animate the algorithm steps
  let timer = null;
  function stopAnimation() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function play(delay = 50) {
    stopAnimation();
    const animate = model.get("animate");
    const max = parseInt(slider.max, 10);

    if (!animate) {
      currentStep = max;
      slider.value = max;
      draw();
      return;
    }

    currentStep = 0;
    slider.value = 0;
    draw();
    if (max === 0) return;

    timer = setInterval(() => {
      if (currentStep >= max) {
        stopAnimation();
        return;
      }
      currentStep++;
      slider.value = currentStep;
      draw();
    }, delay);
  }

  // Redraw when moving slider
  slider.addEventListener("input", () => {
    currentStep = parseInt(slider.value, 10);
    draw();
  });

  // Redraw when clicking buttons
  btnPrev.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      slider.value = currentStep;
      draw();
    }
  });

  btnNext.addEventListener("click", () => {
    const max = parseInt(slider.max, 10);
    if (currentStep < max) {
      currentStep++;
      slider.value = currentStep;
      draw();
    }   
  });

  let isDragging = false;
  let currentVertIndex = 0;

  function hitTestCircle(mx, my, vertices) {
    const r2 = (gs * 0.5) * (gs * 0.5);
    let best = -1, bestD2 = r2;
    vertices.forEach(([vx, vy], i) => {
      const dx = (vx + 0.5) * gs - mx;          // everything in canvas pixels
      const dy = (vy + 0.5) * gs - my;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) { best = i; bestD2 = d2; }
    });
    return best;
  }

  canvas.onmousedown = (event) => {
    console.log("Clicked inside the canvas");
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    const vertices = model.get("vertices") || [];
    const vertIndex = hitTestCircle(mx, my, vertices)
    if (vertIndex >= 0) {
      isDragging = true;
      currentVertIndex = vertIndex;
    }
    else {
      isDragging = false;
      currentVertIndex = -1;
    }
  }

  canvas.onmouseup = (event) => {
    isDragging = false;
    currentVertIndex = -1;
  }

  canvas.onmousemove = (event) => {
    if (isDragging && currentVertIndex >= 0) {
      const rect = canvas.getBoundingClientRect();
      let mx = event.clientX - rect.left;
      let my = event.clientY - rect.top;

      let vx = mx / gs - 0.5;
      let vy = my / gs - 0.5;
      vx = Math.min(w - 0.5, Math.max(-0.5, vx));
      vy = Math.min(h - 0.5, Math.max(-0.5, vy));

      const vertices = model.get("vertices") || [];
      const next = vertices.map((v, i) => (i === currentVertIndex ? [vx, vy] : v));
      model.set("vertices", next);
      model.save_changes();
      draw();
    }
  }


  window.addEventListener("mouseup", () => { isDragging = false; currentVertIndex = -1; });

  // Redraw when steps changes (when algorithm is recalculated)
  model.on("change:steps", () => {
    updateSlider();
    play();
  });

  model.on("change:vertices", draw);

  animCheckbox.addEventListener("change", () => {
    model.set("animate", animCheckbox.checked);
    model.save_changes();
  });

  model.on("change:animate", () => {
    animCheckbox.checked = model.get("animate");
    play();
  });


  updateSlider();
  play();
}

export default { render };