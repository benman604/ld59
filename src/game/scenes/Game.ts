import { EventBus } from '../EventBus';
import { RoadNetwork } from '../RoadNetwork';
import { Scene } from 'phaser';
import { TrafficLight } from '../TrafficLight';
import { Car } from '../Car';
import { Navigator } from '../Navigator';
import { Road } from '../Road';
import { Intersection } from '../Intersection';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    roadNetwork: RoadNetwork;
    cars: Car[] = [];
    navigators: Navigator[] = [];
    trafficLights: TrafficLight[] = [];

    constructor ()
    {
        super('Game');
        this.roadNetwork = null as unknown as RoadNetwork;
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x2f9e44);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.15);

        const grassTileWidth = 120;
        const grassTileHeight = 60;
        const grassLayerWidth = this.scale.width + (grassTileWidth * 2);
        const grassLayerHeight = this.scale.height + (grassTileHeight * 2);

        const grassBase = this.add.tileSprite(
            -grassTileWidth,
            -grassTileHeight,
            grassLayerWidth,
            grassLayerHeight,
            'grass-iso-ns'
        );
        grassBase.setOrigin(0, 0);
        grassBase.setDepth(-10);

        const grassOffset = this.add.tileSprite(
            -grassTileWidth / 2,
            -grassTileHeight / 2,
            grassLayerWidth,
            grassLayerHeight,
            'grass-iso-ns'
        );
        grassOffset.setOrigin(0, 0);
        grassOffset.setDepth(-9);

        this.roadNetwork = new RoadNetwork(this, 400, 120);
        this.roadNetwork.build([
            { name: 'eastbound', orientation: 'ew', direction: 'e', startX: -11, endX: 24, y: 4 },
            { name: 'westbound', orientation: 'ew', direction: 'w', startX: -11, endX: 24, y: 10 },
            { name: 'southbound', orientation: 'ns', direction: 's', startY: -10, endY: 10, x: 5 },
            { name: 'northbound', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 6 },
            { name: 'northbound2', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 24 }
        ]);

        const isStub = (road: Road, gridX: number, gridY: number) => {
            if (road.orientation === 'ew') {
                const step = road.direction === 'we' ? -1 : 1;
                return !road.getBlockAt(gridX + step, gridY);
            }

            const step = road.direction === 'sn' ? -1 : 1;
            return !road.getBlockAt(gridX, gridY + step);
        };

        const shouldPlaceEwLight = (intersection: Intersection, ewRoad: Road | undefined, nsRoad: Road | undefined) => {
            if (!ewRoad) {
                return false;
            }

            if (!nsRoad) {
                return true;
            }

            const neighbors = [
                this.roadNetwork.getBlockAt(intersection.gridX - 1, intersection.gridY),
                this.roadNetwork.getBlockAt(intersection.gridX + 1, intersection.gridY)
            ];

            const hasAdjacentOppositeNs = neighbors.some((neighbor) => {
                if (!neighbor || !(neighbor instanceof Intersection)) {
                    return false;
                }
                const { ns, ew } = neighbor.getConnectedRoads();
                const adjNs = ns[0];
                const adjEw = ew[0];

                return adjNs && adjEw && adjEw.name === ewRoad.name && adjNs.direction !== nsRoad.direction;
            });

            if (!hasAdjacentOppositeNs) {
                return true;
            }

            // For paired NS/SN, place EW lights on the intersection in the travel direction.
            if (ewRoad.direction === 'ew') {
                return nsRoad.direction === 'sn';
            }

            return nsRoad.direction === 'ns';
        };

        // Add traffic lights based on lane directions for each connected road.
        for (const intersection of this.roadNetwork.getIntersections()) {
            const { ns, ew } = intersection.getConnectedRoads();

            const nsRoad = ns[0];
            const ewRoad = ew[0];

            if (nsRoad && !isStub(nsRoad, intersection.gridX, intersection.gridY)) {
                if (nsRoad.direction === 'sn') {
                    intersection.addTrafficLight('n', new TrafficLight('red'));
                }
                if (nsRoad.direction === 'ns') {
                    intersection.addTrafficLight('s', new TrafficLight('red'));
                }
            }

            if (ewRoad && !isStub(ewRoad, intersection.gridX, intersection.gridY) && shouldPlaceEwLight(intersection, ewRoad, nsRoad)) {
                if (ewRoad.direction === 'we') {
                    intersection.addTrafficLight('w', new TrafficLight('red'));
                }
                if (ewRoad.direction === 'ew') {
                    intersection.addTrafficLight('e', new TrafficLight('red'));
                }
            }
        }

        const northbound = this.roadNetwork.getRoadByName('northbound');
        const southbound = this.roadNetwork.getRoadByName('southbound');
        const eastboundRoad = this.roadNetwork.getRoadByName('eastbound');

        let src = northbound?.getBlock(northbound.blocks.length - 1);
        let dest = eastboundRoad?.getBlock(eastboundRoad.blocks.length - 1);
        if (northbound && src && dest) {
            this.spawnCar(
                northbound,
                60,
                { x: src.gridX, y: src.gridY },
                { x: dest.gridX, y: dest.gridY }
            );
        }

        src = southbound?.getBlock(0);
        if (southbound && src) {
            dest = eastboundRoad?.getBlock(eastboundRoad.blocks.length - 1);
            if (dest) {
                this.spawnCar(
                    southbound,
                    60,
                    { x: src.gridX, y: src.gridY },
                    { x: dest.gridX, y: dest.gridY }
                );
            }
        }

        this.trafficLights.push(...this.roadNetwork.getIntersections().flatMap(i => i.getTrafficLights()));

        EventBus.emit('current-scene-ready', this);
    }

    private spawnCar(road: Road, speed: number, source: { x: number; y: number }, destination: { x: number; y: number }): void {
        const sourceBlock = this.roadNetwork.getBlockAt(source.x, source.y);
        const destinationBlock = this.roadNetwork.getBlockAt(destination.x, destination.y);

        if (!sourceBlock || !destinationBlock) {
            return;
        }

        const car = new Car(this, road, speed);
        const navigator = new Navigator(
            car,
            this.roadNetwork,
            sourceBlock,
            destinationBlock
        );

        this.cars.push(car);
        this.navigators.push(navigator);
    }

    update (_time: number, delta: number)
    {
        this.cars.forEach((car) => car.update(delta));
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
