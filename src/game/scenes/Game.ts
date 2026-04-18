import { EventBus } from '../EventBus';
import { RoadNetwork } from '../RoadNetwork';
import { Scene } from 'phaser';
import { TrafficLight } from '../TrafficLight';
import { Car } from '../Car';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    roadNetwork: RoadNetwork;
    car: Car | null;

    constructor ()
    {
        super('Game');
        this.roadNetwork = null as unknown as RoadNetwork;
        this.car = null;
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x2f9e44);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.15);

        this.roadNetwork = new RoadNetwork(this, 120, 120);
        this.roadNetwork.build([
            { direction: 'ew', startX: 0, endX: 18, y: 4 },
            { direction: 'ew', startX: 0, endX: 18, y: 10 },
            { direction: 'ns', startY: 0, endY: 14, x: 6 },
            { direction: 'ns', startY: 0, endY: 14, x: 12 }
        ]);

        // Sample traffic lights attached to intersections (rendering logic can be added later).
        for (const intersection of this.roadNetwork.getIntersections()) {
            intersection.addTrafficLight(new TrafficLight('red'));
            intersection.addTrafficLight(new TrafficLight('green'));
        }

        const firstRoad = this.roadNetwork.getFirstRoad();
        if (firstRoad) {
            this.car = new Car(this, firstRoad, 60);
        }

        EventBus.emit('current-scene-ready', this);
    }

    update (_time: number, delta: number)
    {
        if (this.car) {
            this.car.update(delta);
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
