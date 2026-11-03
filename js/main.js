import { map, polygons } from './data.js';
import AudioEngine from './audio.js'

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

// Get text element once loaded
const textElement = document.getElementById("text");

// Await user interaction
await new Promise(resolve => {
  imageElement.addEventListener("click",async (evt) => {
    await audioContext.resume();
    resolve();
  })
});
textElement.innerText = "Chargement...";
const body = document.getElementById('main');
body.style.cursor = "progress";

// Prepare map polygons
for (const [name, points] of Object.entries(polygons)) {
  const closedPoly = points.concat([points[0],]);
  console.log("polygon", name, "ready");
  map[name].polygon = turf.polygon([closedPoly,]);
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
imageElement.onmousemove = (evt) => {
  const x = (evt.layerX - xOrigin) / imageWidth;
  const y = (evt.layerY - yOrigin) / imageHeight;
  const point = turf.point([x, y]);
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

imageElement.onmouseleave = (evt) => {
  audioEngine.turnOffAll();
}