function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');
}

function draw() {
  background(255);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
