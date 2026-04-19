import { EventBus } from '../EventBus';
import { RoadNetwork } from '../RoadNetwork';
import { Scene } from 'phaser';
import { Car } from '../Car';
import { Navigator } from '../Navigator';
import { Road } from '../Road';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    roadNetwork: RoadNetwork;
    cars: Car[] = [];
    navigators: Navigator[] = [];

    constructor ()
    {
        super('Game');
        this.roadNetwork = null as unknown as RoadNetwork;
    }

    create ()
    {
        this.camera = this.cameras.main;
        // this.camera.setBackgroundColor(0x2f9e44);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0);

        const grassTileWidth = 120;
        const grassTileHeight = 60;
        const worldWidth = 8000;
        const worldHeight = 8000;
        const worldX = -worldWidth / 2;
        const worldY = -worldHeight / 2;
        const grassLayerWidth = worldWidth + (grassTileWidth * 2);
        const grassLayerHeight = worldHeight + (grassTileHeight * 2);

        const grassBase = this.add.tileSprite(
            worldX - grassTileWidth,
            worldY - grassTileHeight,
            grassLayerWidth,
            grassLayerHeight,
            'grass-iso-ns'
        );
        grassBase.setOrigin(0, 0);
        grassBase.setDepth(-10);

        const grassOffset = this.add.tileSprite(
            worldX - grassTileWidth / 2,
            worldY - grassTileHeight / 2,
            grassLayerWidth,
            grassLayerHeight,
            'grass-iso-ns'
        );
        grassOffset.setOrigin(0, 0);
        grassOffset.setDepth(-9);

        this.camera.setBounds(worldX, worldY, grassLayerWidth, grassLayerHeight);

        this.roadNetwork = new RoadNetwork(this, 400, 120);
        this.roadNetwork.build([
            { name: 'eastbound', orientation: 'ew', direction: 'e', startX: -11, endX: 24, y: 4 },
            { name: 'westbound', orientation: 'ew', direction: 'w', startX: -11, endX: 24, y: 10 },
            { name: 'southbound', orientation: 'ns', direction: 's', startY: -10, endY: 10, x: 5 },
            { name: 'northbound', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 6 },
            { name: 'northbound2', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 24 }
        ]);


        const eastbound = this.roadNetwork.getRoadByName('eastbound');
        const westbound = this.roadNetwork.getRoadByName('westbound');
        const southbound = this.roadNetwork.getRoadByName('southbound');
        const northbound = this.roadNetwork.getRoadByName('northbound');
        const northbound2 = this.roadNetwork.getRoadByName('northbound2');
        const northboundBase = northbound?.blocks[northbound.blocks.length - 1];
        const northbound2Base = northbound2?.blocks[northbound2.blocks.length - 1];
        const northboundEnd = northbound?.blocks[0];
        const northbound2End = northbound2?.blocks[0];
        const southboundBase = southbound?.blocks[0];
        const westboundEnd = westbound?.blocks[0];
        const eastboundBase = eastbound?.blocks[0];

        const routes = [
            { 
                source: {
                    x: northboundBase?.gridX,
                    y: northboundBase?.gridY,
                    road: 'northbound'
                },
                destinations: [
                    { x: northboundEnd?.gridX, y: northboundEnd?.gridY },
                    { x: northbound2End?.gridX, y: northbound2End?.gridY },
                    { x: westboundEnd?.gridX, y: westboundEnd?.gridY }
                ],
            },
            {
                source: {
                    x: southboundBase?.gridX,
                    y: southboundBase?.gridY,
                    road: 'southbound'
                },
                destinations: [
                    { x: westboundEnd?.gridX, y: westboundEnd?.gridY },
                    { x: northbound2End?.gridX, y: northbound2End?.gridY },
                ]
            },
            {
                source: {
                    x: northbound2Base?.gridX,
                    y: northbound2Base?.gridY,
                    road: 'northbound2'
                },
                destinations: [
                    { x: northbound2End?.gridX, y: northbound2End?.gridY },
                    { x: northboundEnd?.gridX, y: northboundEnd?.gridY },
                    { x: westboundEnd?.gridX, y: westboundEnd?.gridY }
                ]
            },
            {
                source: {
                    x: eastboundBase?.gridX,
                    y: eastboundBase?.gridY,
                    road: 'eastbound'
                },
                destinations: [
                    { x: northbound2End?.gridX, y: northbound2End?.gridY },
                    { x: westboundEnd?.gridX, y: westboundEnd?.gridY },
                    { x: northboundEnd?.gridX, y: northboundEnd?.gridY }
                ]
            }
        ]

        const minSpawnDelayMs = 700;
        const maxSpawnDelayMs = 1600;

        const scheduleSpawn = () => {
            for (const route of routes) {
                const randomDest = Phaser.Utils.Array.GetRandom(route.destinations);
                this.spawnCar(
                    this.roadNetwork.getRoadByName(route.source.road)!,
                    60,
                    { x: route.source.x!, y: route.source.y! },
                    { x: randomDest.x!, y: randomDest.y! }
                );
            }

            const nextDelay = Phaser.Math.Between(minSpawnDelayMs, maxSpawnDelayMs);
            this.time.delayedCall(nextDelay, scheduleSpawn);
        };

        scheduleSpawn();

        this.camera.centerOn(400, 120);

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        const minZoom = 0.4;
        const maxZoom = 2.5;
        const zoomSpeed = 0.0015;

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.leftButtonDown()) {
                return;
            }
            isDragging = true;
            lastX = pointer.x;
            lastY = pointer.y;
        });

        this.input.on('pointerup', () => {
            isDragging = false;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!isDragging) {
                return;
            }
            const dx = pointer.x - lastX;
            const dy = pointer.y - lastY;
            this.camera.scrollX -= dx / this.camera.zoom;
            this.camera.scrollY -= dy / this.camera.zoom;
            lastX = pointer.x;
            lastY = pointer.y;
        });

        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: any, _dx: number, dy: number) => {
            const next = Math.min(maxZoom, Math.max(minZoom, this.camera.zoom - dy * zoomSpeed));
            this.camera.setZoom(next);
        });

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
        for (let i = this.cars.length - 1; i >= 0; i -= 1) {
            const car = this.cars[i];
            if (!car) {
                continue;
            }

            if (car.update(delta)) {
                car.destroy();
                this.cars.splice(i, 1);
                this.navigators.splice(i, 1);
            }
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
