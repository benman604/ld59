export type TrafficLightState = 'red' | 'yellow' | 'green';

export class TrafficLight {
    private currentState: TrafficLightState = 'red';
    private states: TrafficLightState[] = ['red', 'yellow', 'green'];
    private stateIndex: number = 0;

    constructor(initialState: TrafficLightState = 'red') {
        this.setCurrentState(initialState);
    }

    private setCurrentState(state: TrafficLightState) {
        this.currentState = state;
        this.stateIndex = this.states.indexOf(state);
    }

    getCurrentState(): TrafficLightState {
        return this.currentState;
    }

    getImagePath(): string {
        return `assets/traffic_light_${this.currentState}.png`;
    }

    cycleToNextState(): TrafficLightState {
        this.stateIndex = (this.stateIndex + 1) % this.states.length;
        this.currentState = this.states[this.stateIndex];
        return this.currentState;
    }
}
