import { RoadNetwork } from '../RoadNetwork';
import { GameWrapper } from './GameWrapper';
import { EventBus } from '../EventBus';
import { Layers } from '../../types';
import { RoadSpec } from '../Road';
import { Intersection } from '../Intersection';

const COST_PER_BLOCK = 25;
const COST_PER_INTERSECTION = 100;

type GridPoint = {
    gridX: number;
    gridY: number;
};

type BuildSummary = {
    length: number;
    intersections: number;
    cost: number;
    blockCost: number;
    intersectionCost: number;
};

type RoadSummary = BuildSummary & {
    name: string;
};

type RoadInstance = ReturnType<RoadNetwork['getRoads']>[number];

export class LevelBuilder extends GameWrapper
{
    private buildMode = false;
    private buildState: 'idle' | 'started' | 'confirm' = 'idle';
    private roadStart: GridPoint | null = null;
    private previewEnd: GridPoint | null = null;
    private previewSprites: Phaser.GameObjects.Image[] = [];
    private previewArrows: Phaser.GameObjects.Image[] = [];
    private idleIndicator: Phaser.GameObjects.Image | null = null;
    private pendingSpec: RoadSpec | null = null;
    private roadSpecs: RoadSpec[] = [];
    private modeHint: Phaser.GameObjects.Text | null = null;
    private clickStart: { x: number; y: number } | null = null;
    private selectedRoad: RoadInstance | null = null;
    private selectionSprites: Phaser.GameObjects.Image[] = [];

    private static readonly SELECTION_TEXTURE_KEY = 'road-selection-iso';

    constructor ()
    {
        super('LevelBuilder');
        this.crashDistance = 0;
    }

    create ()
    {
        super.create();
        this.setupBuilderInput();
        this.bindBuilderEvents();
    }

    protected buildRoadNetwork(): RoadNetwork {
        const roadNetwork = new RoadNetwork(this, 400, 120);
        roadNetwork.build(this.roadSpecs);
        return roadNetwork;
    }

    protected setupLevel(): void {
        // const hint = this.add.text(24, 24, 'Build Mode: off', {
        //     fontFamily: 'Georgia',
        //     fontSize: '18px',
        //     color: '#ffffff'
        // }).setScrollFactor(0).setDepth(Layers.UI + 2);
        // this.modeHint = hint;
    }

    private bindBuilderEvents(): void {
        const modeHint = this.modeHint;
        const handleMode = (payload: { enabled: boolean }) => {
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

            this.roadSpecs.push(this.pendingSpec);
            this.pendingSpec = null;
            this.roadNetwork.build(this.roadSpecs);
            this.clearPreview();
            this.resetBuildState();
            EventBus.emit('builder:clear');
        };

        const handleCancel = () => {
            this.cancelBuild();
            EventBus.emit('builder:clear');
        };

        const handleDelete = (payload: { name: string }) => {
            this.roadSpecs = this.roadSpecs.filter((spec) => spec.name !== payload.name);
            this.roadNetwork.build(this.roadSpecs);
            this.clearSelectedRoad();
            EventBus.emit('road:clear');
        };

        EventBus.on('builder:mode', handleMode);
        EventBus.on('builder:confirm', handleConfirm);
        EventBus.on('builder:cancel', handleCancel);
        EventBus.on('road:delete', handleDelete);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.removeListener('builder:mode', handleMode);
            EventBus.removeListener('builder:confirm', handleConfirm);
            EventBus.removeListener('builder:cancel', handleCancel);
            EventBus.removeListener('road:delete', handleDelete);
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
        const summary: BuildSummary = {
            length,
            intersections,
            cost,
            blockCost: COST_PER_BLOCK,
            intersectionCost: COST_PER_INTERSECTION
        };

        if (!this.checkRoadBuild(path.cells)) {
            this.cancelBuild();
            return;
        }

        this.pendingSpec = this.createRoadSpec(this.roadStart, this.previewEnd);
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

    private findRoadAt(grid: GridPoint): RoadInstance | null {
        for (const road of this.roadNetwork.getRoads()) {
            if (road.getBlockAt(grid.gridX, grid.gridY)) {
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
        const buildings: GridPoint[] = [];
        return buildings.length === 0;
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
            const sprite = this.add.image(block.sprite.x, block.sprite.y, LevelBuilder.SELECTION_TEXTURE_KEY);
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
        if (this.textures.exists(LevelBuilder.SELECTION_TEXTURE_KEY)) {
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

        gfx.generateTexture(LevelBuilder.SELECTION_TEXTURE_KEY, 60, 30);
        gfx.destroy();
    }

    private createRoadSpec(start: GridPoint, end: GridPoint): RoadSpec {
        if (start.gridY === end.gridY) {
            return {
                name: `road-ew-${start.gridX}-${end.gridX}-${start.gridY}`,
                orientation: 'ew',
                direction: end.gridX >= start.gridX ? 'e' : 'w',
                startX: start.gridX,
                endX: end.gridX,
                y: start.gridY
            };
        }

        return {
            name: `road-ns-${start.gridY}-${end.gridY}-${start.gridX}`,
            orientation: 'ns',
            direction: end.gridY >= start.gridY ? 's' : 'n',
            startY: start.gridY,
            endY: end.gridY,
            x: start.gridX
        };
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
}
