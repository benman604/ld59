import { EventBus } from '../EventBus';
import { RoadNetwork } from '../RoadNetwork';
import { Scene } from 'phaser';
import { Car } from '../Car';
import { Navigator } from '../Navigator';
import { Road } from '../Road';
import { Block } from '../Block';
import { Layers } from '../../types';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    roadNetwork: RoadNetwork;
    cars: Car[] = [];
    navigators: Navigator[] = [];
    private crashTriggered = false;
    private crashDistance = 20;

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
        grassBase.setDepth(Layers.Grass);

        const grassOffset = this.add.tileSprite(
            worldX - grassTileWidth / 2,
            worldY - grassTileHeight / 2,
            grassLayerWidth,
            grassLayerHeight,
            'grass-iso-ns'
        );
        grassOffset.setOrigin(0, 0);
        grassOffset.setDepth(Layers.Grass + 1);

        this.camera.setBounds(worldX, worldY, grassLayerWidth, grassLayerHeight);

        this.roadNetwork = new RoadNetwork(this, 400, 120);
        this.roadNetwork.build([
            { name: 'eastbound', orientation: 'ew', direction: 'e', startX: -11, endX: 24, y: 4 },
            { name: 'westbound', orientation: 'ew', direction: 'w', startX: -11, endX: 24, y: 10 },
            { name: 'southbound', orientation: 'ns', direction: 's', startY: -10, endY: 10, x: 5 },
            { name: 'northbound', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 6 },
            { name: 'northbound2', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 24 }
        ]);

        this.createGridSprite('skyscraper', 2, 4, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 2, 5, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 11, 1, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 11, 4, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 13, 4, { depth: Layers.Buildings });

        this.createGridSprite('opening_ne', 4, -11, { depth: Layers.Openings });
        this.createGridSprite('opening_ne', 5, -11, { depth: Layers.Openings });
        this.createGridSprite('opening_ne', 23, -11, { depth: Layers.Openings });

        this.createGridSprite('opening_hidden', 5, 19, { depth: Layers.Openings });
        this.createGridSprite('opening_hidden', 23, 19, { depth: Layers.Openings });

        this.createGridSprite('opening_nw', -12, 3, { depth: Layers.Openings });
        this.createGridSprite('opening_nw', -12, 9, { depth: Layers.Openings });


        const eastbound = this.roadNetwork.getRoadByName('eastbound');
        const westbound = this.roadNetwork.getRoadByName('westbound');
        const southbound = this.roadNetwork.getRoadByName('southbound');
        const northbound = this.roadNetwork.getRoadByName('northbound');
        const northbound2 = this.roadNetwork.getRoadByName('northbound2');
        const northboundBase = northbound?.getBase();
        const northbound2Base = northbound2?.getBase();
        const northboundEnd = northbound?.getEnd();
        const northbound2End = northbound2?.getEnd();
        const southboundBase = southbound?.getBase();
        const westboundEnd = westbound?.getEnd();
        const eastboundBase = eastbound?.getBase();


        const routes: Array<{ road?: Road; source?: Block; destinations: Array<Block | undefined> }> = [
            {
                road: northbound,
                source: northboundBase,
                destinations: [
                    northboundEnd,
                    northbound2End,
                    westboundEnd
                ]
            },
            {
                road: southbound,
                source: southboundBase,
                destinations: [
                    westboundEnd,
                    northbound2End
                ]
            },
            {
                road: northbound2,
                source: northbound2Base,
                destinations: [
                    northbound2End,
                    northboundEnd,
                    westboundEnd
                ]
            },
            {
                road: eastbound,
                source: eastboundBase,
                destinations: [
                    northbound2End,
                    westboundEnd,
                    northboundEnd
                ]
            }
        ];

        const minSpawnDelayMs = 700;
        const maxSpawnDelayMs = 1600;

        const scheduleSpawn = () => {
            for (const route of routes) {
                if (!route.road || !route.source) {
                    continue;
                }

                const availableDestinations = route.destinations.filter((dest): dest is Block => !!dest);
                if (availableDestinations.length === 0) {
                    continue;
                }

                const randomDest = Phaser.Utils.Array.GetRandom(availableDestinations);
                this.spawnCar(
                    route.road,
                    60,
                    route.source,
                    randomDest
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

    private spawnCar(road: Road, speed: number, sourceBlock: Block, destinationBlock: Block): void {
        if (this.isSpawnBlocked(road, sourceBlock)) {
            return;
        }

        const car = new Car(this, this.roadNetwork, road, speed);
        const navigator = new Navigator(
            car,
            this.roadNetwork,
            sourceBlock,
            destinationBlock
        );

        this.cars.push(car);
        this.navigators.push(navigator);
    }

    private isSpawnBlocked(road: Road, sourceBlock: Block): boolean {
        if (this.roadNetwork.isOccupied(sourceBlock.gridX, sourceBlock.gridY)) {
            return true;
        }

        const step = road.orientation === 'ew'
            ? (road.direction === 'we' ? -1 : 1)
            : (road.direction === 'sn' ? -1 : 1);

        const nextX = road.orientation === 'ew' ? sourceBlock.gridX + step : sourceBlock.gridX;
        const nextY = road.orientation === 'ns' ? sourceBlock.gridY + step : sourceBlock.gridY;
        const nextBlock = this.roadNetwork.getBlockAt(nextX, nextY);

        return !!nextBlock && this.roadNetwork.isOccupied(nextX, nextY);
    }

    createGridSprite(
        textureKey: string,
        gridX: number,
        gridY: number,
        options: { depth?: number; scale?: number, shift?: { x?: number; y?: number } } = {}
    ): Phaser.GameObjects.Image {
        const { x, y } = this.roadNetwork.getWorldFromGrid(gridX, gridY);
        const sprite = this.add.image(x + (options.shift?.x || 0), y + (options.shift?.y || 0) + 15, textureKey);

        if (typeof options.scale === 'number') {
            sprite.setScale(options.scale);
        }
        if (typeof options.depth === 'number') {
            sprite.setDepth(options.depth);
        }

        return sprite;
    }

    update (_time: number, delta: number)
    {
        if (this.crashTriggered) {
            return;
        }

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

        this.checkForCrash();
    }

    private checkForCrash(): void {
        for (let i = 0; i < this.cars.length; i += 1) {
            const carA = this.cars[i];
            if (!carA) {
                continue;
            }
            const posA = carA.getPosition();

            for (let j = i + 1; j < this.cars.length; j += 1) {
                const carB = this.cars[j];
                if (!carB) {
                    continue;
                }

                const posB = carB.getPosition();
                const dx = posA.x - posB.x;
                const dy = posA.y - posB.y;
                const distance = Math.hypot(dx, dy);

                if (distance <= this.crashDistance) {
                    this.triggerCrash((posA.x + posB.x) / 2, (posA.y + posB.y) / 2);
                    return;
                }
            }
        }
    }

    private triggerCrash(x: number, y: number): void {
        this.crashTriggered = true;

        this.camera.pan(x, y, 200, 'Sine.easeInOut');
        this.camera.zoomTo(2.2, 200, 'Sine.easeInOut');

        const boom = this.add.circle(x, y, 12, 0xffa500, 1);
        boom.setDepth(Layers.UI + 10);

        let crashPaused = false;
        this.tweens.add({
            targets: boom,
            scale: { from: 0.6, to: 6 },
            alpha: { from: 1, to: 0.6 },
            duration: 3000,
            ease: 'Quad.easeOut',
            onUpdate: (tween) => {
                if (crashPaused) {
                    return;
                }
                if (tween.progress >= 0.5) {
                    crashPaused = true;
                    this.scene.pause();
                }
            }
        });
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
