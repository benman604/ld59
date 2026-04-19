import { EventBus } from '../EventBus';
import { RoadNetwork } from '../RoadNetwork';
import { Scene } from 'phaser';
import { Car } from '../Car';
import { Navigator } from '../Navigator';
import { Road } from '../Road';
import { Block } from '../Block';
import { Layers } from '../../types';

export type Route = {
    road: Road;
    source: Block;
    destinations: Block[];
};

export abstract class GameWrapper extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    roadNetwork: RoadNetwork;
    cars: Car[] = [];
    navigators: Navigator[] = [];
    protected crashDistance = 20;
    private crashTriggered = false;
    private failureUi: Phaser.GameObjects.Container | null = null;

    constructor (key: string)
    {
        super(key);
        this.roadNetwork = null as unknown as RoadNetwork;
    }

    init(): void {
        this.crashTriggered = false;
        this.failureUi = null;
        this.cars = [];
        this.navigators = [];
    }

    create ()
    {
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.removeAllListeners();
            this.time.removeAllEvents();
        });

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

        this.roadNetwork = this.buildRoadNetwork();
        this.setupLevel();

        this.camera.centerOn(400, 120);
        this.setupInput();

        EventBus.emit('current-scene-ready', this);
    }

    protected abstract buildRoadNetwork(): RoadNetwork;

    protected abstract setupLevel(): void;

    protected startSpawning(routes: Route[], minDelayMs: number, maxDelayMs: number, speed: number): void {
        const scheduleSpawn = () => {
            for (const route of routes) {
                if (!route.destinations.length) {
                    continue;
                }

                const randomDest = Phaser.Utils.Array.GetRandom(route.destinations);
                this.spawnCar(route.road, speed, route.source, randomDest);
            }

            const nextDelay = Phaser.Math.Between(minDelayMs, maxDelayMs);
            this.time.delayedCall(nextDelay, scheduleSpawn);
        };

        scheduleSpawn();
    }

    protected spawnCar(road: Road, speed: number, sourceBlock: Block, destinationBlock: Block): Car | null {
        if (this.isSpawnBlocked(road, sourceBlock)) {
            return null;
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

        return car;
    }

    protected onCarFinished(_car: Car): void {
    }

    protected isSpawnBlocked(road: Road, sourceBlock: Block): boolean {
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
        options: { depth?: number; scale?: number; shift?: { x?: number; y?: number } } = {}
    ): Phaser.GameObjects.Image {
        const { x, y } = this.roadNetwork.getWorldFromGrid(gridX, gridY);
        const sprite = this.add.image(
            x + (options.shift?.x || 0),
            y + (options.shift?.y || 0) + 15,
            textureKey
        );

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
        this.positionFailureUi();
        if (this.crashTriggered) {
            return;
        }

        for (let i = this.cars.length - 1; i >= 0; i -= 1) {
            const car = this.cars[i];
            if (!car) {
                continue;
            }

            if (car.update(delta)) {
                this.onCarFinished(car);
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
                    tween.pause();
                    this.showFailureUi();
                }
            }
        });
    }

    private showFailureUi(): void {
        if (this.failureUi) {
            return;
        }

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const panel = this.add.rectangle(0, 0, 420, 220, 0x0f0f0f, 0.85)
            .setStrokeStyle(2, 0xffffff, 0.7)
            .setScrollFactor(0)
            .setDepth(Layers.UI + 10);

        const title = this.add.text(0, -50, 'Level Failed', {
            fontFamily: 'Georgia',
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(Layers.UI + 11);

        const buttonText = this.add.text(0, 40, 'Restart', {
            fontFamily: 'Georgia',
            fontSize: '22px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(Layers.UI + 12);

        const buttonBg = this.add.rectangle(0, 40, 160, 48, 0x1b1b1b, 0.8)
            .setStrokeStyle(2, 0xffffff, 0.7)
            .setScrollFactor(0)
            .setDepth(Layers.UI + 11);

        const setHover = (active: boolean) => {
            buttonBg.setFillStyle(0x2a2a2a, active ? 0.95 : 0.8);
            buttonText.setColor(active ? '#ffd36a' : '#ffffff');
        };

        buttonBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => setHover(true))
            .on('pointerout', () => setHover(false))
            .on('pointerdown', () => this.restartScene());

        buttonText.setInteractive({ useHandCursor: true })
            .on('pointerover', () => setHover(true))
            .on('pointerout', () => setHover(false))
            .on('pointerdown', () => this.restartScene());

        this.failureUi = this.add.container(centerX, centerY, [panel, title, buttonBg, buttonText]);
        this.failureUi.setScrollFactor(0);
        this.failureUi.setDepth(Layers.UI + 12);
        this.positionFailureUi();
    }

    private restartScene(): void {
        this.crashTriggered = false;
        if (this.failureUi) {
            this.failureUi.destroy(true);
            this.failureUi = null;
        }

        this.scene.restart();
    }

    private positionFailureUi(): void {
        if (!this.failureUi) {
            return;
        }

        const cam = this.cameras.main;
        const scale = cam.zoom === 0 ? 1 : (1 / cam.zoom);
        this.failureUi.setPosition(this.scale.width / 2, this.scale.height / 2);
        this.failureUi.setScale(scale);
    }

    private setupInput(): void {
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
    }
}
