import { Car } from './Car';
import { RoadNetwork } from './RoadNetwork';
import { Block } from './Block';

export class Navigator {
    private car: Car;
    private roadNetwork: RoadNetwork;
    private source: Block;
    private destination: Block;

    constructor(car: Car, roadNetwork: RoadNetwork, source: Block, destination: Block) {
        this.car = car;
        this.roadNetwork = roadNetwork;
        this.source = source;
        this.destination = destination;

        this.computeRoute();
    }

    computeRoute(): void {
        const points = this.roadNetwork.findRoutePointsBlocks(this.source, this.destination);
        this.car.setPathPoints(points, false);
    }
}
