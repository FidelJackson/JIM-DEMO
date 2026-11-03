
export default function whiteNoiseNode(audioContext) {
    var bufferSize = 2 * audioContext.sampleRate,
        noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate),
        output = noiseBuffer.getChannelData(0);

    for (var i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    var whiteNoise = audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    return whiteNoise
}
