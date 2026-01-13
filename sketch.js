function setup() {
  createCanvas(windowWidth, windowHeight);
  console.log("App created with size:", windowWidth, "x", windowHeight);
  frameRate(30); // rigeligt
  fill(0);
  textSize(16); 
}

function draw() {
  background(255);
  ellipse(mouseX, mouseY, 40);
  text(Math.round(frameRate()) + " FPS", 10, 20);
}
