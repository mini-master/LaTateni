let canvas;

function setup() {
  // Put canvas in the specific container
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');
  
  frameRate(60);
  noStroke();
}

function draw() {
  // Clear with a very slight opacity for trail effect, or solid for clean
  // Using a dark background to match the theme
  background(10, 10, 10, 50); // r, g, b, alpha for trail
  
  // Dynamic accent color
  let accent = color(99, 102, 241); // #6366f1
  fill(accent);
  
  // Interactive element
  // Lerp interactivity for smoothness
  let x = lerp(width/2, mouseX, 0.1);
  let y = lerp(height/2, mouseY, 0.1);
  
  // Draw a glowing orb
  drawingContext.shadowBlur = 30;
  drawingContext.shadowColor = accent;
  ellipse(mouseX, mouseY, 50);
  drawingContext.shadowBlur = 0;
  
  // Update FPS in the UI
  let fps = Math.round(frameRate());
  let fpsElement = document.getElementById('fps-counter');
  if (fpsElement) {
    fpsElement.innerText = `FPS: ${fps}`;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
