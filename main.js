import loadAudioBuffer from './load-audio-buffer.js';
import { map, polygons } from './data.js';

const audioContext = new AudioContext();

const imageElement = document.getElementById("tapisImage");
await imageElement.decode();
const imageWidth = imageElement.width;
const imageHeight = imageElement.height;
const xOrigin = imageElement.offsetLeft;
const yOrigin = imageElement.offsetTop;
imageElement.style.opacity = 0.3;

const textElement = document.getElementById("text");

await new Promise(resolve => {
  imageElement.addEventListener("click",async (evt) => {
    await audioContext.resume();
    resolve();
  })
});

textElement.innerText = "Chargement...";

const fadeTime = 0.6;
const globalGain = 3.;

// load samples in memory and start 
for (const [name, zone] of Object.entries(map)) {
  const now = audioContext.currentTime;

  zone.buffer = await loadAudioBuffer(`./samples/${zone.file}`, audioContext.sampleRate);

  zone.gain = audioContext.createGain();
  zone.gain.connect(audioContext.destination);

  if (zone.type === "loop") {
    zone.source = audioContext.createBufferSource();
    zone.source.buffer = zone.buffer;
    zone.source.loop = true;
    zone.source.connect(zone.gain);
    zone.source.start(now);
    zone.isPlaying = false;
    zone.gain.gain.setValueAtTime(0., now);
  } else {
    zone.gain.gain.setValueAtTime(zone.volume * globalGain, now);
  }
}

for (const [name, points] of Object.entries(polygons)) {
  const closedPoly = points.concat([points[0],]);
  console.log(name);
  map[name].polygon = turf.polygon([closedPoly,]);
}

imageElement.style.opacity = 1;
textElement.style.opacity = 0;
console.log("--- Ready to play");

const turnOff = (zone, time) => {
    if (map[zone].type == "loop") {
      const value = map[zone].gain.gain.value;
      map[zone].gain.gain.setValueAtTime(value, time);
      map[zone].gain.gain.linearRampToValueAtTime(0.,
        time + fadeTime
      );
    }
};

// main logic: callback when receiving zone information through OSC
var currentZones = [];
imageElement.onmousemove = (evt) => {
  const x = (evt.layerX - xOrigin) / imageWidth;
  const y = (evt.layerY - yOrigin) / imageHeight;

  const newZones = [];
  for (const [name, zone] of Object.entries(map)) {
    const point = turf.point([x, y]);
    if (turf.booleanPointInPolygon(point, zone.polygon)) {
      newZones.push(name);
    }
  }

  const now = audioContext.currentTime;

  // fade out previous zones that were left by user
  currentZones.forEach((zone) => {
    if (!newZones.includes(zone)) {
      turnOff(zone, now);
    }
  });

  // fade in new zones
  newZones.forEach((zone) => {
    if (!currentZones.includes(zone)) {
      if (map[zone].type == "loop") {
        const value = map[zone].gain.gain.value;
        map[zone].gain.gain.setValueAtTime(value, now);
        const gain = map[zone].volume * globalGain;
        map[zone].gain.gain.linearRampToValueAtTime(gain,
          now + fadeTime
        );
      } else {
        if (!map[zone].isPlaying) {
          map[zone].source = audioContext.createBufferSource();
          map[zone].source.buffer = map[zone].buffer;
          map[zone].source.loop = false;
          map[zone].source.connect(map[zone].gain);
          map[zone].source.start(now);
          map[zone].isPlaying = true;
          map[zone].source.onended = () => {
            map[zone].isPlaying = false;
          }
        }
        
      }
    }
  });

  currentZones = newZones;
};

imageElement.onmouseleave = (evt) => {
  const now = audioContext.currentTime;

  currentZones.forEach((zone) => {
    turnOff(zone);
  });

  currentZones = [];
}