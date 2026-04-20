import { EventBus } from '../EventBus';
import { RoadNetwork } from '../RoadNetwork';
import { Scene } from 'phaser';
import { Car } from '../Car';
import { Navigator } from '../Navigator';
import { EWRoadSpec, NSRoadSpec, Road, RoadSpec } from '../Road';
import { Block } from '../Block';
import { Layers } from '../../types';
import { Route } from '../Route';
import { Intersection } from '../Intersection';

const COST_PER_BLOCK = 25;
const COST_PER_INTERSECTION = 100;

export type GridPoint = {
    gridX: number;
    gridY: number;
};

type BuildSummary = {
    name: string;
    length: number;
    intersections: number;
    cost: number;
    blockCost: number;
    intersectionCost: number;
};

type RoadSummary = BuildSummary & {
    name: string;
};

type SpritePlacementOptions = {
    depth?: number;
    scale?: number;
    shift?: { x?: number; y?: number };
};

type ArrowOptions = SpritePlacementOptions & {
    gridOffset?: { x?: number; y?: number };
};

type RouteLabelOptions = {
    target?: number;
    labelOffset?: { x?: number; y?: number };
    labelDepth?: number;
    labelStyle?: Phaser.Types.GameObjects.Text.TextStyle;
};

type RouteTracker = {
    route: Route;
    target: number;
    count: number;
    label: Phaser.GameObjects.Text;
};

type BuildingOptions = SpritePlacementOptions & {
    textureKey?: string;
    gridOffset?: { x?: number; y?: number };
};

type RoadInstance = ReturnType<RoadNetwork['getRoads']>[number];

export abstract class GameWrapper extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    roadNetwork: RoadNetwork;
    cars: Car[] = [];
    navigators: Navigator[] = [];
    protected crashDistance = 10;
    private crashTriggered = false;
    private failureUi: Phaser.GameObjects.Container | null = null;
    private completionUi: Phaser.GameObjects.Container | null = null;
    private completionTriggered = false;

    private buildMode = false;
    private buildState: 'idle' | 'started' | 'confirm' = 'idle';
    private roadStart: GridPoint | null = null;
    private previewEnd: GridPoint | null = null;
    private previewSprites: Phaser.GameObjects.Image[] = [];
    private previewArrows: Phaser.GameObjects.Image[] = [];
    private idleIndicator: Phaser.GameObjects.Image | null = null;
    private pendingSpec: RoadSpec | null = null;
    private pendingCost: number | null = null;
    private baseRoadSpecs: RoadSpec[] = [];
    private playerRoadSpecs: RoadSpec[] = [];
    private builderRoutes: RouteTracker[] = [];
    private simulationRunning = false;
    private simulationPaused = false;
    private simulationToken = 0;
    private budgetTotal: number | null = null;
    private budgetRemaining: number | null = null;
    private modeHint: Phaser.GameObjects.Text | null = null;
    private clickStart: { x: number; y: number } | null = null;
    private selectedRoad: RoadInstance | null = null;
    private selectionSprites: Phaser.GameObjects.Image[] = [];
    private carRouteMap: Map<Car, RouteTracker> = new Map();
    private buildingCells: Set<string> = new Set();
    private buildingSprites: Phaser.GameObjects.Image[] = [];

    private static readonly SELECTION_TEXTURE_KEY = 'road-selection-iso';
    private static readonly LEVEL_SEQUENCE = [
        'LevelBuilder1',
        'LevelBuilder2',
        'LevelBuilder3',
        'LevelBuilder4',
        'LevelBuilder5'
    ];

    constructor (key: string)
    {
        super(key);
        this.roadNetwork = null as unknown as RoadNetwork;
    }

    init(): void {
        this.crashTriggered = false;
        this.failureUi = null;
        this.completionUi = null;
        this.completionTriggered = false;
        this.cars = [];
        this.navigators = [];

        this.buildMode = false;
        this.buildState = 'idle';
        this.roadStart = null;
        this.previewEnd = null;
        this.previewSprites = [];
        this.previewArrows = [];
        this.idleIndicator = null;
        this.pendingSpec = null;
        this.pendingCost = null;
        this.baseRoadSpecs = this.isBuilderEnabled() ? this.getInitialRoadSpecs() : [];
        this.playerRoadSpecs = [];
        this.builderRoutes = [];
        this.simulationRunning = false;
        this.simulationPaused = false;
        this.simulationToken = 0;
        this.budgetTotal = null;
        this.budgetRemaining = null;
        this.modeHint = null;
        this.clickStart = null;
        this.selectedRoad = null;
        this.selectionSprites = [];
        this.carRouteMap.clear();
        this.buildingCells.clear();
        this.buildingSprites.forEach((sprite) => sprite.destroy());
        this.buildingSprites = [];

        if (this.isBuilderEnabled()) {
            EventBus.emit('builder:clear');
            EventBus.emit('road:clear');
            EventBus.emit('simulation:stopped');
        }
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

        if (this.isBuilderEnabled()) {
            this.rebuildRoutes();
            this.setupBuilderInput();
            this.bindBuilderEvents();
        }

        EventBus.emit('current-scene-ready', this);
    }

    protected abstract buildRoadNetwork(): RoadNetwork;

    protected abstract setupLevel(): void;

    protected isBuilderEnabled(): boolean {
        return false;
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        return [];
    }

    protected getRoutes(): RouteTracker[] {
        return [];
    }

    protected createRouteFromGrid(
        source: GridPoint,
        destination: GridPoint,
        options: RouteLabelOptions = {}
    ): RouteTracker | null {
        const sourceBlock = this.roadNetwork.getBlockAt(source.gridX, source.gridY);
        const destinationBlock = this.roadNetwork.getBlockAt(destination.gridX, destination.gridY);
        if (!sourceBlock || !destinationBlock) {
            return null;
        }

        const sourceRoad = this.findRoadAt(source, true);
        if (!sourceRoad) {
            return null;
        }

        const route = new Route(this, this.roadNetwork, sourceRoad, sourceBlock, destinationBlock);
        const target = options.target ?? 10;
        const labelOffset = options.labelOffset ?? { x: 16, y: -18 };
        const labelStyle = options.labelStyle ?? {
            fontFamily: 'Pixeled',
            fontSize: '12px',
            color: '#f2f2f2'
        };
        const labelDepth = options.labelDepth ?? (Layers.Buildings + 5);

        const label = this.createGridText(
            `0/${target}`,
            source.gridX,
            source.gridY,
            labelStyle,
            { depth: labelDepth, shift: labelOffset }
        );

        return {
            route,
            target,
            count: 0,
            label
        };
    }

    protected getRoadNetworkOrigin(): { x: number; y: number } {
        return { x: 400, y: 120 };
    }

    protected buildRoadNetworkFromSpecs(): RoadNetwork {
        const origin = this.getRoadNetworkOrigin();
        const roadNetwork = new RoadNetwork(this, origin.x, origin.y);
        roadNetwork.build(this.getAllRoadSpecs());
        return roadNetwork;
    }

    protected setBudget(total: number): void {
        this.budgetTotal = Math.max(0, Math.floor(total));
        this.budgetRemaining = this.budgetTotal;
        this.emitBudgetUpdate();
    }

    protected startSpawning(routeGroups: Route[][], minDelayMs: number, maxDelayMs: number, speed: number): void {
        const scheduleSpawn = () => {
            for (const group of routeGroups) {
                if (!group.length) {
                    continue;
                }

                const route = Phaser.Utils.Array.GetRandom(group);
                this.spawnCar(route.road, speed, route.source, route.destination);
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

    createSprite(
        textureKey: string,
        x: number,
        y: number,
        options: SpritePlacementOptions = {}
    ): Phaser.GameObjects.Image {
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

    createText(
        text: string,
        x: number,
        y: number,
        style: Phaser.Types.GameObjects.Text.TextStyle = {},
        options: SpritePlacementOptions = {}
    ): Phaser.GameObjects.Text {
        const label = this.add.text(
            x + (options.shift?.x || 0),
            y + (options.shift?.y || 0) + 15,
            text,
            style
        );

        if (typeof options.scale === 'number') {
            label.setScale(options.scale);
        }
        if (typeof options.depth === 'number') {
            label.setDepth(options.depth);
        }

        return label;
    }

    createGridSprite(
        textureKey: string,
        gridX: number,
        gridY: number,
        options: SpritePlacementOptions = {}
    ): Phaser.GameObjects.Image {
        const { x, y } = this.roadNetwork.getWorldFromGrid(gridX, gridY);
        return this.createSprite(textureKey, x, y, options);
    }

    createGridText(
        text: string,
        gridX: number,
        gridY: number,
        style: Phaser.Types.GameObjects.Text.TextStyle = {},
        options: SpritePlacementOptions = {}
    ): Phaser.GameObjects.Text {
        const { x, y } = this.roadNetwork.getWorldFromGrid(gridX, gridY);
        return this.createText(text, x, y, style, options);
    }

    protected addBuilding(gridX: number, gridY: number, options: BuildingOptions = {}): Phaser.GameObjects.Image {
        const textureKey = options.textureKey ?? 'skyscraper';
        const renderGridX = gridX + (options.gridOffset?.x ?? 0);
        const renderGridY = gridY + (options.gridOffset?.y ?? 0);
        const sprite = this.createGridSprite(textureKey, renderGridX, renderGridY, options);

        if (typeof options.depth !== 'number') {
            sprite.setDepth(Layers.Buildings + 2 + (sprite.y / 1000));
        }

        this.buildingCells.add(this.buildingKey(gridX, gridY));
        this.buildingSprites.push(sprite);
        return sprite;
    }

    addArrow(spec: RoadSpec, options: ArrowOptions = {}): Phaser.GameObjects.Image {
        let gridX = 0;
        let gridY = 0;
        let textureKey = 'arrow_e';

        if (spec.orientation === 'ew') {
            const minX = Math.min(spec.startX, spec.endX);
            const maxX = Math.max(spec.startX, spec.endX);
            const innerX = Math.abs(minX) <= Math.abs(maxX) ? minX : maxX;
            gridX = innerX;
            gridY = spec.y - 1;
            textureKey = spec.direction === 'e' ? 'arrow_e' : 'arrow_w';
        } else {
            const minY = Math.min(spec.startY, spec.endY);
            const maxY = Math.max(spec.startY, spec.endY);
            const innerY = Math.abs(minY) <= Math.abs(maxY) ? minY : maxY;
            gridX = spec.x - 1;
            gridY = innerY;
            textureKey = spec.direction === 's' ? 'arrow_s' : 'arrow_n';
        }

        gridX += options.gridOffset?.x ?? 0;
        gridY += options.gridOffset?.y ?? 0;

        const { gridOffset, ...spriteOptions } = options;
        return this.createGridSprite(textureKey, gridX, gridY, spriteOptions);
    }

    update (_time: number, delta: number)
    {
        this.positionFailureUi();
        this.positionCompletionUi();
        if (this.crashTriggered || this.completionTriggered) {
            return;
        }

        for (let i = this.cars.length - 1; i >= 0; i -= 1) {
            const car = this.cars[i];
            if (!car) {
                continue;
            }

            if (car.update(delta)) {
                const tracker = this.carRouteMap.get(car);
                if (tracker) {
                    tracker.count += 1;
                    this.updateRouteLabel(tracker);
                    this.carRouteMap.delete(car);
                    this.checkLevelComplete();
                }
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
        EventBus.emit('simulation:lock', { locked: true });
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
            fontFamily: 'Pixeled',
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(Layers.UI + 11);

        const buttonText = this.add.text(0, 40, 'Restart', {
            fontFamily: 'Pixeled',
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
        this.stopSimulation();
        this.crashTriggered = false;
        this.completionTriggered = false;
        if (this.failureUi) {
            this.failureUi.destroy(true);
            this.failureUi = null;
        }
        if (this.completionUi) {
            this.completionUi.destroy(true);
            this.completionUi = null;
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

    private positionCompletionUi(): void {
        if (!this.completionUi) {
            return;
        }

        const cam = this.cameras.main;
        const scale = cam.zoom === 0 ? 1 : (1 / cam.zoom);
        this.completionUi.setPosition(this.scale.width / 2, this.scale.height / 2);
        this.completionUi.setScale(scale);
    }

    private bindBuilderEvents(): void {
        const modeHint = this.modeHint;
        const handleMode = (payload: { enabled: boolean }) => {
            if (payload.enabled && this.simulationRunning) {
                this.buildMode = false;
                modeHint?.setText('Build Mode: off');
                this.cancelBuild();
                EventBus.emit('builder:clear');
                return;
            }
            this.buildMode = payload.enabled;
            modeHint?.setText(`Build Mode: ${payload.enabled ? 'on' : 'off'}`);
            if (!this.buildMode) {
                this.cancelBuild();
            }
        };

        const handleConfirm = () => {
            if (!this.pendingSpec) {
                return;
            }

            if (!this.canAffordPendingBuild()) {
                return;
            }

            this.mergeRoadSpec(this.pendingSpec);
            if (typeof this.pendingCost === 'number') {
                this.spendBudget(this.pendingCost);
            }
            this.pendingSpec = null;
            this.pendingCost = null;
            this.roadNetwork.build(this.getAllRoadSpecs());
            this.rebuildRoutes();
            this.clearPreview();
            this.resetBuildState();
            EventBus.emit('builder:clear');
        };

        const handleCancel = () => {
            this.cancelBuild();
            EventBus.emit('builder:clear');
        };

        const handleDelete = (payload: { name: string }) => {
            if (this.isBaseRoad(payload.name)) {
                this.clearSelectedRoad();
                EventBus.emit('road:clear');
                return;
            }

            const road = this.roadNetwork.getRoadByName(payload.name);
            if (road) {
                const summary = this.getRoadSummary(road);
                this.refundBudget(summary.cost);
            }

            this.playerRoadSpecs = this.playerRoadSpecs.filter((spec) => spec.name !== payload.name);
            this.roadNetwork.build(this.getAllRoadSpecs());
            this.rebuildRoutes();
            this.clearSelectedRoad();
            EventBus.emit('road:clear');
        };

        const handleSimulationStart = () => {
            this.startSimulation();
        };

        const handleSimulationStop = () => {
            this.stopSimulation();
        };

        const handleSimulationPause = () => {
            this.pauseSimulation();
        };

        const handleSimulationResume = () => {
            this.resumeSimulation();
        };

        const handleSimulationRestart = () => {
            this.restartScene();
        };

        EventBus.on('builder:mode', handleMode);
        EventBus.on('builder:confirm', handleConfirm);
        EventBus.on('builder:cancel', handleCancel);
        EventBus.on('road:delete', handleDelete);
        EventBus.on('simulation:start', handleSimulationStart);
        EventBus.on('simulation:stop', handleSimulationStop);
        EventBus.on('simulation:pause', handleSimulationPause);
        EventBus.on('simulation:resume', handleSimulationResume);
        EventBus.on('simulation:restart', handleSimulationRestart);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.removeListener('builder:mode', handleMode);
            EventBus.removeListener('builder:confirm', handleConfirm);
            EventBus.removeListener('builder:cancel', handleCancel);
            EventBus.removeListener('road:delete', handleDelete);
            EventBus.removeListener('simulation:start', handleSimulationStart);
            EventBus.removeListener('simulation:stop', handleSimulationStop);
            EventBus.removeListener('simulation:pause', handleSimulationPause);
            EventBus.removeListener('simulation:resume', handleSimulationResume);
            EventBus.removeListener('simulation:restart', handleSimulationRestart);
        });
    }

    private setupBuilderInput(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.clickStart = { x: pointer.x, y: pointer.y };
            if (!this.buildMode || !pointer.leftButtonDown()) {
                return;
            }

            const grid = this.getGridFromPointer(pointer);
            if (!grid) {
                return;
            }

            if (this.buildState === 'idle') {
                this.roadStart = grid;
                this.previewEnd = grid;
                this.buildState = 'started';
                this.updatePreview(grid);
                return;
            }

            if (this.buildState === 'started' && this.roadStart) {
                this.previewEnd = this.getAxisEnd(this.roadStart, grid);
                this.updatePreview(this.previewEnd);
                this.finishBuildAttempt();
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            const grid = this.getGridFromPointer(pointer);
            if (!grid) {
                return;
            }

            if (!this.buildMode) {
                return;
            }

            if (this.buildState === 'idle') {
                this.updateIdleIndicator(grid);
                return;
            }

            if (this.buildState !== 'started' || !this.roadStart) {
                return;
            }

            this.previewEnd = this.getAxisEnd(this.roadStart, grid);
            this.updatePreview(this.previewEnd);
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.buildMode || !this.clickStart || pointer.button !== 0) {
                this.clickStart = null;
                return;
            }

            const dragDistance = Phaser.Math.Distance.Between(
                this.clickStart.x,
                this.clickStart.y,
                pointer.x,
                pointer.y
            );
            this.clickStart = null;

            if (dragDistance > 6) {
                return;
            }

            if (this.isTrafficLightClick(pointer)) {
                return;
            }

            this.inspectRoadAtPointer(pointer);
        });
    }

    private getGridFromPointer(pointer: Phaser.Input.Pointer): GridPoint | null {
        if (!this.roadNetwork) {
            return null;
        }

        const grid = this.roadNetwork.getGridFromIso(pointer.worldX ?? pointer.x, pointer.worldY ?? pointer.y);
        return { gridX: grid.gridX, gridY: grid.gridY };
    }

    private getAxisEnd(start: GridPoint, current: GridPoint): GridPoint {
        const dx = current.gridX - start.gridX;
        const dy = current.gridY - start.gridY;

        if (Math.abs(dx) >= Math.abs(dy)) {
            return { gridX: current.gridX, gridY: start.gridY };
        }

        return { gridX: start.gridX, gridY: current.gridY };
    }

    private updatePreview(end: GridPoint): void {
        if (!this.roadStart) {
            return;
        }

        this.clearIdleIndicator();
        this.clearPreview();
        const path = this.getPathCells(this.roadStart, end);
        const textureKey = path.orientation === 'ew' ? 'roadblock-iso' : 'roadblock-iso-nesw';
        const arrowKey = this.getArrowTextureKey(path.orientation, this.roadStart, end);

        for (let i = 0; i < path.cells.length; i += 1) {
            const cell = path.cells[i];
            const { x, y } = this.roadNetwork.getWorldFromGrid(cell.gridX, cell.gridY);
            const sprite = this.add.image(x, y, textureKey);
            sprite.setAlpha(0.65);
            sprite.setDepth(Layers.Roads + 5 + (sprite.y / 1000));
            this.previewSprites.push(sprite);

            if (i % 4 === 0) {
                const arrow = this.add.image(x, y, arrowKey);
                arrow.setAlpha(0.7);
                arrow.setScale(0.8);
                arrow.setDepth(Layers.Roads + 6 + (arrow.y / 1000));
                this.previewArrows.push(arrow);
            }
        }
    }

    private updateIdleIndicator(cell: GridPoint): void {
        const { x, y } = this.roadNetwork.getWorldFromGrid(cell.gridX, cell.gridY);
        if (!this.idleIndicator) {
            this.idleIndicator = this.add.image(x, y, 'roadblock-iso');
            this.idleIndicator.setAlpha(0.55);
            this.idleIndicator.setDepth(Layers.Roads + 99 + (y / 1000));
            return;
        }

        this.idleIndicator.setPosition(x, y);
        this.idleIndicator.setDepth(Layers.Roads + 99 + (y / 1000));
    }

    private clearPreview(): void {
        this.previewSprites.forEach(sprite => sprite.destroy());
        this.previewSprites = [];
        this.previewArrows.forEach(sprite => sprite.destroy());
        this.previewArrows = [];
    }

    private clearIdleIndicator(): void {
        if (!this.idleIndicator) {
            return;
        }

        this.idleIndicator.destroy();
        this.idleIndicator = null;
    }

    private finishBuildAttempt(): void {
        if (!this.roadStart || !this.previewEnd) {
            return;
        }

        const path = this.getPathCells(this.roadStart, this.previewEnd);
        const length = path.cells.length;
        if (!length) {
            this.cancelBuild();
            return;
        }

        const intersections = this.countNewIntersections(path.cells, path.orientation);
        const cost = (COST_PER_BLOCK * length) + (COST_PER_INTERSECTION * intersections);
        const pendingSpec = this.createRoadSpec(this.roadStart, this.previewEnd);
        const summary: BuildSummary = {
            name: pendingSpec.name,
            length,
            intersections,
            cost,
            blockCost: COST_PER_BLOCK,
            intersectionCost: COST_PER_INTERSECTION
        };

        if (!this.checkRoadBuild(path.cells)) {
            this.notifyUi('Road intersects a building.');
            this.cancelBuild();
            return;
        }

        this.pendingSpec = pendingSpec;
        this.pendingCost = cost;
        this.buildState = 'confirm';
        EventBus.emit('builder:proposal', summary);
    }

    private cancelBuild(): void {
        this.clearIdleIndicator();
        this.clearPreview();
        this.resetBuildState();
    }

    private resetBuildState(): void {
        this.roadStart = null;
        this.previewEnd = null;
        this.pendingSpec = null;
        this.pendingCost = null;
        this.buildState = 'idle';
    }

    private getArrowTextureKey(orientation: 'ew' | 'ns', start: GridPoint, end: GridPoint): string {
        if (orientation === 'ew') {
            return end.gridX >= start.gridX ? 'arrow_e' : 'arrow_w';
        }

        return end.gridY >= start.gridY ? 'arrow_s' : 'arrow_n';
    }

    private inspectRoadAtPointer(pointer: Phaser.Input.Pointer): void {
        const grid = this.getGridFromPointer(pointer);
        if (!grid) {
            return;
        }

        const road = this.findRoadAt(grid);
        if (!road) {
            this.clearSelectedRoad();
            EventBus.emit('road:clear');
            return;
        }

        this.selectRoad(road);
        const summary = this.getRoadSummary(road);
        EventBus.emit('road:inspect', summary);
    }

    private findRoadAt(grid: GridPoint, allowBase: boolean = false): RoadInstance | null {
        for (const road of this.roadNetwork.getRoads()) {
            if (road.getBlockAt(grid.gridX, grid.gridY)) {
                if (!allowBase && this.isBaseRoad(road.name)) {
                    return null;
                }
                return road;
            }
        }

        return null;
    }

    private getRoadSummary(road: RoadInstance): RoadSummary {
        const intersections = this.countRoadIntersections(road);
        const length = road.blocks.length;
        const cost = (COST_PER_BLOCK * length) + (COST_PER_INTERSECTION * intersections);

        return {
            name: road.name,
            length,
            intersections,
            cost,
            blockCost: COST_PER_BLOCK,
            intersectionCost: COST_PER_INTERSECTION
        };
    }

    private countRoadIntersections(road: RoadInstance): number {
        let count = 0;

        for (const block of road.blocks) {
            const existing = this.roadNetwork.getBlockAt(block.gridX, block.gridY);
            if (existing instanceof Intersection) {
                count += 1;
            }
        }

        return count;
    }

    private checkRoadBuild(_cells: GridPoint[]): boolean {
        return _cells.every((cell) => !this.buildingCells.has(this.buildingKey(cell.gridX, cell.gridY)));
    }

    private isTrafficLightClick(pointer: Phaser.Input.Pointer): boolean {
        const hits = this.input.hitTestPointer(pointer);
        return hits.some((hit) => (hit as Phaser.GameObjects.GameObject).getData?.('trafficLight'));
    }

    private selectRoad(road: RoadInstance): void {
        if (this.selectedRoad?.name === road.name) {
            return;
        }

        this.clearSelectedRoad();
        this.selectedRoad = road;
        this.ensureSelectionTexture();

        for (const block of road.blocks) {
            const sprite = this.add.image(block.sprite.x, block.sprite.y, GameWrapper.SELECTION_TEXTURE_KEY);
            sprite.setAlpha(0.35);
            sprite.setDepth(Layers.Roads + 20 + (sprite.y / 1000));
            this.selectionSprites.push(sprite);
        }
    }

    private clearSelectedRoad(): void {
        this.selectionSprites.forEach(sprite => sprite.destroy());
        this.selectionSprites = [];
        this.selectedRoad = null;
    }

    private ensureSelectionTexture(): void {
        if (this.textures.exists(GameWrapper.SELECTION_TEXTURE_KEY)) {
            return;
        }

        const gfx = this.add.graphics();
        gfx.fillStyle(0xffffff, 1);
        gfx.lineStyle(1, 0xffffff, 1);

        const points = [
            { x: 30, y: 0 },
            { x: 60, y: 15 },
            { x: 30, y: 30 },
            { x: 0, y: 15 }
        ];

        gfx.beginPath();
        gfx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            gfx.lineTo(points[i].x, points[i].y);
        }
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();

        gfx.generateTexture(GameWrapper.SELECTION_TEXTURE_KEY, 60, 30);
        gfx.destroy();
    }

    private createRoadSpec(start: GridPoint, end: GridPoint): RoadSpec {
        const directionLabel = this.getDirectionLabel(start, end);
        const index = this.countDirectionRoads(directionLabel) + 1;
        const name = `${directionLabel} ${index}`;

        if (start.gridY === end.gridY) {
            return {
                name,
                orientation: 'ew',
                direction: end.gridX >= start.gridX ? 'e' : 'w',
                startX: start.gridX,
                endX: end.gridX,
                y: start.gridY
            };
        }

        return {
            name,
            orientation: 'ns',
            direction: end.gridY >= start.gridY ? 's' : 'n',
            startY: start.gridY,
            endY: end.gridY,
            x: start.gridX
        };
    }

    private countDirectionRoads(directionLabel: string): number {
        return this.getAllRoadSpecs().filter((spec) => this.getDirectionLabelFromSpec(spec) === directionLabel).length;
    }

    private getDirectionLabel(start: GridPoint, end: GridPoint): string {
        if (start.gridY === end.gridY) {
            return end.gridX >= start.gridX ? 'Eastbound' : 'Westbound';
        }

        return end.gridY >= start.gridY ? 'Southbound' : 'Northbound';
    }

    private getDirectionLabelFromSpec(spec: RoadSpec): string {
        if (spec.orientation === 'ew') {
            return spec.direction === 'e' ? 'Eastbound' : 'Westbound';
        }

        return spec.direction === 's' ? 'Southbound' : 'Northbound';
    }

    private mergeRoadSpec(newSpec: RoadSpec): void {
        const matches = this.getAllRoadSpecs().filter((spec) => this.canMergeRoadSpecs(spec, newSpec));
        if (!matches.length) {
            this.playerRoadSpecs.push(newSpec);
            return;
        }

        const baseMatches = this.baseRoadSpecs.filter((spec) => matches.includes(spec));
        const playerMatches = this.playerRoadSpecs.filter((spec) => matches.includes(spec));
        const primary = baseMatches[0] ?? playerMatches[0] ?? newSpec;
        const merged = this.buildMergedSpec(primary, newSpec, matches);

        this.baseRoadSpecs = this.baseRoadSpecs.filter((spec) => !baseMatches.includes(spec));
        this.playerRoadSpecs = this.playerRoadSpecs.filter((spec) => !playerMatches.includes(spec));

        if (baseMatches.length > 0) {
            this.baseRoadSpecs.push(merged);
        } else {
            this.playerRoadSpecs.push(merged);
        }
    }

    private canMergeRoadSpecs(existing: RoadSpec, incoming: RoadSpec): boolean {
        if (existing.orientation !== incoming.orientation) {
            return false;
        }

        if (existing.direction !== incoming.direction) {
            return false;
        }

        if (existing.orientation === 'ew') {
            const existingEW = existing as EWRoadSpec;
            const incomingEW = incoming as EWRoadSpec;
            if (existingEW.y !== incomingEW.y) {
                return false;
            }

            const rangeA = this.getRoadSpecRange(existing);
            const rangeB = this.getRoadSpecRange(incoming);
            return rangeA.min <= rangeB.max + 1 && rangeA.max >= rangeB.min - 1;
        }

        const existingNS = existing as NSRoadSpec;
        const incomingNS = incoming as NSRoadSpec;
        if (existingNS.x !== incomingNS.x) {
            return false;
        }

        const rangeA = this.getRoadSpecRange(existing);
        const rangeB = this.getRoadSpecRange(incoming);
        return rangeA.min <= rangeB.max + 1 && rangeA.max >= rangeB.min - 1;
    }

    private buildMergedSpec(primary: RoadSpec, incoming: RoadSpec, matches: RoadSpec[]): RoadSpec {
        const allSpecs = [...matches, incoming];
        const ranges = allSpecs.map((spec) => this.getRoadSpecRange(spec));
        const min = Math.min(...ranges.map((range) => range.min));
        const max = Math.max(...ranges.map((range) => range.max));

        if (primary.orientation === 'ew') {
            const primaryEW = primary as EWRoadSpec;
            const startX = primary.direction === 'e' ? min : max;
            const endX = primary.direction === 'e' ? max : min;
            return {
                name: primary.name,
                orientation: 'ew',
                direction: primary.direction,
                startX,
                endX,
                y: primaryEW.y
            };
        }

        const primaryNS = primary as NSRoadSpec;
        const startY = primary.direction === 's' ? min : max;
        const endY = primary.direction === 's' ? max : min;
        return {
            name: primary.name,
            orientation: 'ns',
            direction: primary.direction,
            startY,
            endY,
            x: primaryNS.x
        };
    }

    private getRoadSpecRange(spec: RoadSpec): { min: number; max: number } {
        if (spec.orientation === 'ew') {
            return {
                min: Math.min(spec.startX, spec.endX),
                max: Math.max(spec.startX, spec.endX)
            };
        }

        return {
            min: Math.min(spec.startY, spec.endY),
            max: Math.max(spec.startY, spec.endY)
        };
    }

    private getAllRoadSpecs(): RoadSpec[] {
        return [...this.baseRoadSpecs, ...this.playerRoadSpecs];
    }

    private isBaseRoad(name: string): boolean {
        return this.baseRoadSpecs.some((spec) => spec.name === name);
    }

    private rebuildRoutes(): void {
        this.clearRouteTrackers();
        this.builderRoutes = this.getRoutes().filter((route): route is RouteTracker => !!route);
    }

    private startSimulation(): void {
        if (this.simulationRunning || this.completionTriggered) {
            return;
        }

        if (!this.builderRoutes.length || !this.areRoutesConnected(this.builderRoutes)) {
            this.notifyUi('Not all routes connected!');
            return;
        }

        this.simulationRunning = true;
        this.simulationPaused = false;
        this.simulationToken += 1;
        const token = this.simulationToken;
        EventBus.emit('simulation:started');

        if (this.buildMode) {
            this.buildMode = false;
            this.cancelBuild();
            EventBus.emit('builder:clear');
        }

        const sourceGroups = this.groupRoutesBySource(this.builderRoutes);
        for (const group of sourceGroups.values()) {
            const spawnOnce = () => {
                if (!this.simulationRunning || this.simulationToken !== token) {
                    return;
                }
                const tracker = Phaser.Utils.Array.GetRandom(group);
                if (tracker) {
                    const car = this.spawnCar(tracker.route.road, 60, tracker.route.source, tracker.route.destination);
                    if (car) {
                        this.carRouteMap.set(car, tracker);
                    }
                }

                const nextDelay = Phaser.Math.Between(800, 1800);
                this.time.delayedCall(nextDelay, spawnOnce);
            };

            spawnOnce();
        }
    }

    private stopSimulation(): void {
        if (!this.simulationRunning) {
            return;
        }

        this.simulationRunning = false;
        this.simulationToken += 1;

        if (this.simulationPaused) {
            this.simulationPaused = false;
            this.scene.resume(this.scene.key);
        }

        this.cars.forEach((car) => car.destroy());
        this.cars = [];
        this.navigators = [];
        this.carRouteMap.clear();

        EventBus.emit('simulation:stopped');
    }

    private pauseSimulation(): void {
        if (!this.simulationRunning || this.simulationPaused || this.crashTriggered || this.completionTriggered) {
            return;
        }

        this.simulationPaused = true;
        this.scene.pause(this.scene.key);
        EventBus.emit('simulation:paused');
    }

    private resumeSimulation(): void {
        if (!this.simulationRunning || !this.simulationPaused) {
            return;
        }

        this.simulationPaused = false;
        this.scene.resume(this.scene.key);
        EventBus.emit('simulation:resumed');
    }

    private areRoutesConnected(routes: RouteTracker[]): boolean {
        return routes.every((tracker) => Navigator.canReach(
            this.roadNetwork,
            tracker.route.source,
            tracker.route.destination
        ));
    }

    private updateRouteLabel(tracker: RouteTracker): void {
        tracker.label.setText(`${tracker.count}/${tracker.target}`);
    }

    private groupRoutesBySource(routes: RouteTracker[]): Map<string, RouteTracker[]> {
        const groups = new Map<string, RouteTracker[]>();

        for (const tracker of routes) {
            const key = `${tracker.route.source.gridX},${tracker.route.source.gridY}`;
            const list = groups.get(key);
            if (list) {
                list.push(tracker);
            } else {
                groups.set(key, [tracker]);
            }
        }

        return groups;
    }

    private checkLevelComplete(): void {
        if (this.completionTriggered || !this.builderRoutes.length) {
            return;
        }

        const complete = this.builderRoutes.every((tracker) => tracker.count >= tracker.target);
        if (!complete) {
            return;
        }

        this.triggerCompletion();
    }

    private triggerCompletion(): void {
        this.stopSimulation();
        EventBus.emit('simulation:lock', { locked: true });

        if (this.buildMode) {
            this.buildMode = false;
            this.cancelBuild();
            EventBus.emit('builder:clear');
        }

        this.completionTriggered = true;
        this.showCompletionUi();
    }

    private showCompletionUi(): void {
        if (this.completionUi) {
            return;
        }

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const nextScene = this.getNextSceneKey();
        const isFinal = !nextScene;

        const panel = this.add.rectangle(0, 0, 520, 240, 0x0f0f0f, 0.85)
            .setStrokeStyle(2, 0xffffff, 0.7)
            .setScrollFactor(0)
            .setDepth(Layers.UI + 14);

        const title = this.add.text(0, -60, isFinal ? 'All levels complete!' : 'Level complete!', {
            fontFamily: 'Pixeled',
            fontSize: '26px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(Layers.UI + 15);

        const leftLabel = isFinal ? 'Main menu' : 'Next Level';
        const rightLabel = 'Again?';

        const left = this.createCompletionButton(-120, 40, rightLabel, () => this.restartScene());

        const right = this.createCompletionButton(120, 40, leftLabel, () => {
            if (nextScene) {
                this.scene.start(nextScene);
            } else {
                this.scene.start('MainMenu');
            }
        });

        this.completionUi = this.add.container(centerX, centerY, [
            panel,
            title,
            left.bg,
            left.text,
            right.bg,
            right.text
        ]);
        this.completionUi.setScrollFactor(0);
        this.completionUi.setDepth(Layers.UI + 16);
        this.positionCompletionUi();
    }

    private createCompletionButton(x: number, y: number, label: string, onClick: () => void): { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
        const text = this.add.text(x, y, label, {
            fontFamily: 'Pixeled',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(Layers.UI + 16);

        const bg = this.add.rectangle(x, y, 190, 48, 0x1b1b1b, 0.8)
            .setStrokeStyle(2, 0xffffff, 0.7)
            .setScrollFactor(0)
            .setDepth(Layers.UI + 15);

        const setHover = (active: boolean) => {
            bg.setFillStyle(0x2a2a2a, active ? 0.95 : 0.8);
            text.setColor(active ? '#ffd36a' : '#ffffff');
        };

        bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => setHover(true))
            .on('pointerout', () => setHover(false))
            .on('pointerdown', onClick);

        text.setInteractive({ useHandCursor: true })
            .on('pointerover', () => setHover(true))
            .on('pointerout', () => setHover(false))
            .on('pointerdown', onClick);

        return { bg, text };
    }

    private getNextSceneKey(): string | null {
        const current = this.scene.key;
        const index = GameWrapper.LEVEL_SEQUENCE.indexOf(current);
        if (index === -1) {
            return null;
        }

        return GameWrapper.LEVEL_SEQUENCE[index + 1] ?? null;
    }

    private clearRouteTrackers(): void {
        this.builderRoutes.forEach((tracker) => tracker.label.destroy());
        this.builderRoutes = [];
        this.carRouteMap.clear();
    }

    private buildingKey(gridX: number, gridY: number): string {
        return `${gridX},${gridY}`;
    }

    private notifyUi(message: string, durationMs: number = 3000): void {
        EventBus.emit('ui:notify', { message, durationMs });
    }

    private emitBudgetUpdate(): void {
        if (this.budgetRemaining === null || this.budgetTotal === null) {
            return;
        }

        EventBus.emit('budget:update', {
            remaining: this.budgetRemaining,
            total: this.budgetTotal
        });
    }

    private spendBudget(cost: number): void {
        if (this.budgetRemaining === null) {
            return;
        }

        this.budgetRemaining = Math.max(0, this.budgetRemaining - cost);
        this.emitBudgetUpdate();
    }

    private refundBudget(amount: number): void {
        if (this.budgetRemaining === null) {
            return;
        }

        const cap = this.budgetTotal ?? Number.POSITIVE_INFINITY;
        this.budgetRemaining = Math.min(cap, this.budgetRemaining + amount);
        this.emitBudgetUpdate();
    }

    private canAffordPendingBuild(): boolean {
        if (this.budgetRemaining === null || this.pendingCost === null) {
            return true;
        }

        if (this.pendingCost <= this.budgetRemaining) {
            return true;
        }

        this.notifyUi(`Over budget: $${this.pendingCost} > $${this.budgetRemaining}`);
        return false;
    }

    private getPathCells(start: GridPoint, end: GridPoint): { cells: GridPoint[]; orientation: 'ew' | 'ns' } {
        const cells: GridPoint[] = [];

        if (start.gridY === end.gridY) {
            const step = end.gridX >= start.gridX ? 1 : -1;
            for (let x = start.gridX; step > 0 ? x <= end.gridX : x >= end.gridX; x += step) {
                cells.push({ gridX: x, gridY: start.gridY });
            }
            return { cells, orientation: 'ew' };
        }

        const step = end.gridY >= start.gridY ? 1 : -1;
        for (let y = start.gridY; step > 0 ? y <= end.gridY : y >= end.gridY; y += step) {
            cells.push({ gridX: start.gridX, gridY: y });
        }

        return { cells, orientation: 'ns' };
    }

    private countNewIntersections(cells: GridPoint[], orientation: 'ew' | 'ns'): number {
        const intersections = new Set<string>();

        for (const cell of cells) {
            const existing = this.roadNetwork.getBlockAt(cell.gridX, cell.gridY);
            if (existing instanceof Intersection) {
                continue;
            }

            for (const road of this.roadNetwork.getRoads()) {
                if (road.orientation === orientation) {
                    continue;
                }

                if (road.getBlockAt(cell.gridX, cell.gridY)) {
                    intersections.add(`${cell.gridX},${cell.gridY}`);
                    break;
                }
            }
        }

        return intersections.size;
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
