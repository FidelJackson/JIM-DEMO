import { map, polygons } from "./data.js";
import AudioEngine from "./audio.js";

const ws = new WebSocket("ws://localhost:8765");

// Create audioContext
const audioContext = new AudioContext();

// Wait for image to be fully loaded, get properties and apply opacity
const imageElement = document.getElementById("tapisImage");
await imageElement.decode();
const imageWidth = imageElement.width;
const imageHeight = imageElement.height;
const xOrigin = imageElement.offsetLeft;
const yOrigin = imageElement.offsetTop;
imageElement.style.opacity = 0.3;
const dot = document.getElementById("dot");
function moveDot(x_rel, y_rel) {
  const x = x_rel * imageWidth + xOrigin
  const y = y_rel * imageHeight + yOrigin
  dot.style.left = `${x}px`;
  dot.style.top = `${y}px`;
}

// Get text element once loaded
const textElement = document.getElementById("text");

// Await user interaction
await new Promise((resolve) => {
  imageElement.addEventListener("click", async (evt) => {
    await audioContext.resume();
    resolve();
  });
});
textElement.innerText = "Chargement...";
const body = document.getElementById("main");
body.style.cursor = "progress";

// Prepare map polygons
for (const [name, points] of Object.entries(polygons)) {
  const closedPoly = points.concat([points[0]]);
  console.log("polygon", name, "ready");
  map[name].polygon = turf.polygon([closedPoly]);
}

// Initialize audio engine
const audioEngine = new AudioEngine(audioContext, map);
await audioEngine.initialize();

// Update UI when ready to play
imageElement.style.opacity = 1;
textElement.remove();
body.style.cursor = "grab";
console.log("--- Ready to play");

// Main logic: callback when receiving zone information through OSC
ws.onmessage = (event) => {
  const [x, y] = event.data.split(",").map(Number);
  const point = turf.point([x, y]);
  moveDot(x, y);
  const newZones = [];
  for (const [name, zone] of Object.entries(map)) {
    if (turf.booleanPointInPolygon(point, zone.polygon)) {
      // console.log(name, turf.pointToPolygonDistance(point, zone.polygon));
      newZones.push(name);
    }
  }
  audioEngine.zoneUpdate(newZones);
  audioEngine.positionUpdate(point);
};

// imageElement.onmouseleave = (evt) => {
//   audioEngine.turnOffAll();
// }
