export default class lowpassFilter {
    constructor(frequency) {
        this.frequency = frequency;
        this.previousOutput = 0.;
        this.alpha = frequency / Math.PI;
    }

    apply(value, dt) {
        const alpha = 2 * Math.PI * this.frequency * dt / (2 * Math.PI * this.frequency * dt + 1);
        console.log('dt', dt);
        const filteredValue = alpha * value - (1 - alpha) * this.previousOutput;
        this.previousOutput = filteredValue;
        return filteredValue
    }
}