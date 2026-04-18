import { Block } from './Block';
import { TrafficLight } from './TrafficLight';
import { Road } from './Road';

export class Intersection extends Block {
    private nsRoads: Road[] = [];
    private ewRoads: Road[] = [];
    private trafficLights: TrafficLight[] = [];

    addNSRoad(road: Road): void {
        if (!this.nsRoads.includes(road)) {
            this.nsRoads.push(road);
        }
    }

    addEWRoad(road: Road): void {
        if (!this.ewRoads.includes(road)) {
            this.ewRoads.push(road);
        }
    }

    addTrafficLight(light: TrafficLight): void {
        this.trafficLights.push(light);
    }

    getConnectedRoads(): { ns: Road[]; ew: Road[] } {
        return { ns: [...this.nsRoads], ew: [...this.ewRoads] };
    }

    getTrafficLights(): TrafficLight[] {
        return [...this.trafficLights];
    }
}
