import loadAudioBuffer from './load-audio-buffer.js';
import whiteNoiseNode from './white-noise.js';
import lowpassFilter from './filters.js';

export default class AudioEngine {
    constructor(audioContext, map, path) {
        this.audioContext = audioContext;
        this.path = path
        this.map = map;
        this.currentZones = []; 
        this.fadeTime = 0.6;
        this.globalGain = 3.;
        this.isDistanceValid = false;
        this.position = turf.point([0, 0]);
        this.positionTime = 0.;
        this.speedFilter = new lowpassFilter(3);
        this.speed = 0.;
        this.speedTime = 0.;
    }

    async initialize() {
        // load samples in memory and start 
        for (const [name, zone] of Object.entries(this.map)) {
          const now = this.audioContext.currentTime;
          console.log(zone.file);
          const path = new URL(`../assets/samples/${zone.file}`, import.meta.url);
          zone.buffer = await loadAudioBuffer(path, this.audioContext.sampleRate);
        
          zone.gain = this.audioContext.createGain();
          zone.gain.connect(this.audioContext.destination);
        
          if (zone.type === "loop") {
            zone.source = this.audioContext.createBufferSource();
            zone.source.buffer = zone.buffer;
            zone.source.loop = true;
            zone.source.connect(zone.gain);
            zone.source.start(now);
            zone.isPlaying = false;
            zone.gain.gain.setValueAtTime(0., now);
          } else {
            zone.gain.gain.setValueAtTime(zone.volume * this.globalGain, now);
          }
        }

        // create and start white noise
        const bpFilter = this.audioContext.createBiquadFilter();
        bpFilter.type = "bandpass"
        bpFilter.frequency.value = 600;
        bpFilter.connect(this.audioContext.destination);

        this.noiseFilter = this.audioContext.createBiquadFilter();
        this.noiseFilter.frequency.value = 200;
        this.noiseFilter.connect(bpFilter);

        this.noiseGain = this.audioContext.createGain();
        this.noiseGain.connect(this.noiseFilter);
        this.noiseGain.gain.value = 0.;

        this.noise = whiteNoiseNode(this.audioContext)
        this.noise.loop = true;
        this.noise.start(0);
        this.noise.connect(this.noiseGain);

        // setInterval(this.noiseParametersUpdate.bind(this), 10);
    }

    noiseParametersUpdate() {
        const now = this.audioContext.currentTime;
        const dt = now - this.speedTime;

        const filteredSpeed = this.speedFilter.apply(this.speed, dt);
        console.log(filteredSpeed);
        const frequency = Math.min(20000 * filteredSpeed / 400, 20000);
        const gain = filteredSpeed / 800;
        this.noiseFilter.frequency.setValueAtTime(this.noiseFilter.frequency.value, now);
        this.noiseFilter.frequency.linearRampToValueAtTime(frequency, now + 0.002);
        this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
        this.noiseGain.gain.linearRampToValueAtTime(gain, now + 0.002);

        this.speedLast = now;
    }

    positionUpdate(point) {
        const now = this.audioContext.currentTime;
        const dt = now - this.positionTime;
        const distance = turf.distance(point, this.position);
        var speed = 0;
        if (this.isDistanceValid) {
            this.speed = distance / dt;
        } else {
            this.isDistanceValid = true;
        }
        this.positionTime = now;
        this.position = point;
    } 

    zoneUpdate(zones) {
        const now = this.audioContext.currentTime;

        // fade out previous zones that were left by user
        this.currentZones.forEach((zone) => {
            if (!zones.includes(zone)) {
                this.turnOff(zone);
            }
        });

        // fade in new zones
        zones.forEach((zone) => {
            if (!this.currentZones.includes(zone)) {
                if (this.map[zone].type == "loop") {
                    const value = this.map[zone].gain.gain.value;
                    this.map[zone].gain.gain.setValueAtTime(value, now);
                    const gain = this.map[zone].volume * this.globalGain;
                    this.map[zone].gain.gain.linearRampToValueAtTime(gain,
                    now + this.fadeTime
                    );
                } else {
                    if (!this.map[zone].isPlaying) {
                        this.map[zone].source = this.audioContext.createBufferSource();
                        this.map[zone].source.buffer = this.map[zone].buffer;
                        this.map[zone].source.loop = false;
                        this.map[zone].source.connect(this.map[zone].gain);
                        this.map[zone].source.start(now);
                        this.map[zone].isPlaying = true;
                        this.map[zone].source.onended = () => {
                            this.map[zone].isPlaying = false;
                        }
                    }
                    
                }
            }
        });

        this.currentZones = zones;
    }

    turnOff(zone) {
        const now = this.audioContext.currentTime;
        if (this.map[zone].type == "loop") {
            const value = this.map[zone].gain.gain.value;
            this.map[zone].gain.gain.setValueAtTime(value, now);
            this.map[zone].gain.gain.linearRampToValueAtTime(0.,
            now + this.fadeTime
            );
        }
    }

    turnOffAll() {
        this.currentZones.forEach((zone) => {
            this.turnOff(zone);
        });

        const now = this.audioContext.currentTime;
        this.noiseFilter.frequency.setValueAtTime(this.noiseFilter.frequency.value, now);
        this.noiseFilter.frequency.linearRampToValueAtTime(0., now + 0.001);
        this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
        this.noiseGain.gain.linearRampToValueAtTime(0., now + 0.001);

        this.currentZones = [];
        this.isDistanceValid = false;
        this.position = turf.point([0, 0]);
    }
}