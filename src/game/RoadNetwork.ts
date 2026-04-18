import { Block } from './Block';
import { Intersection } from './Intersection';
import { Road, RoadSpec } from './Road';

type CellData = {
    block: Block;
    directions: Set<'ew' | 'ns'>;
    ewRoads: Set<Road>;
    nsRoads: Set<Road>;
};

export class RoadNetwork {
    private scene: Phaser.Scene;
    private originX: number;
    private originY: number;

    private roads: Road[] = [];
    private intersections: Intersection[] = [];
    private grid: Map<string, CellData> = new Map();

    constructor(scene: Phaser.Scene, originX: number, originY: number) {
        this.scene = scene;
        this.originX = originX;
        this.originY = originY;
    }

    build(roadSpecs: RoadSpec[]): void {
        this.destroy();

        for (const spec of roadSpecs) {
            const road = this.createRoad(spec);
            this.roads.push(road);
            this.registerRoadBlocks(road);
        }

        this.createIntersections();
        this.linkNeighborBlocks();
    }

    getRoads(): Road[] {
        return [...this.roads];
    }

    getIntersections(): Intersection[] {
        return [...this.intersections];
    }

    getFirstRoad(): Road | null {
        return this.roads.length > 0 ? this.roads[0] : null;
    }

    destroy(): void {
        for (const cell of this.grid.values()) {
            cell.block.destroy();
        }

        this.roads = [];
        this.intersections = [];
        this.grid.clear();
    }

    private createRoad(spec: RoadSpec): Road {
        const blocks: Block[] = [];

        if (spec.direction === 'ew') {
            const start = Math.min(spec.startX, spec.endX);
            const end = Math.max(spec.startX, spec.endX);

            for (let gridX = start; gridX <= end; gridX++) {
                const { x, y } = this.gridToWorld(gridX, spec.y);
                blocks.push(new Block(this.scene, x, y, gridX, spec.y, 'laneblock', 0));
            }

            return new Road('ew', blocks);
        }

        const start = Math.min(spec.startY, spec.endY);
        const end = Math.max(spec.startY, spec.endY);

        for (let gridY = start; gridY <= end; gridY++) {
            const { x, y } = this.gridToWorld(spec.x, gridY);
            blocks.push(new Block(this.scene, x, y, spec.x, gridY, 'laneblock', Math.PI / 2));
        }

        return new Road('ns', blocks);
    }

    private registerRoadBlocks(road: Road): void {
        for (const block of road.blocks) {
            const key = this.cellKey(block.gridX, block.gridY);
            const existing = this.grid.get(key);

            if (!existing) {
                const directions = new Set<'ew' | 'ns'>([road.direction]);
                const ewRoads = new Set<Road>();
                const nsRoads = new Set<Road>();

                if (road.direction === 'ew') ewRoads.add(road);
                if (road.direction === 'ns') nsRoads.add(road);

                this.grid.set(key, {
                    block,
                    directions,
                    ewRoads,
                    nsRoads
                });

                continue;
            }

            block.destroy();
            existing.directions.add(road.direction);

            if (road.direction === 'ew') existing.ewRoads.add(road);
            if (road.direction === 'ns') existing.nsRoads.add(road);
        }
    }

    private createIntersections(): void {
        for (const [key, cell] of this.grid.entries()) {
            if (!cell.directions.has('ew') || !cell.directions.has('ns')) {
                continue;
            }

            const [gridX, gridY] = this.parseCellKey(key);
            const { x, y } = this.gridToWorld(gridX, gridY);

            cell.block.destroy();

            const intersection = new Intersection(
                this.scene,
                x,
                y,
                gridX,
                gridY,
                '__WHITE',
                0,
                0x666666
            );

            for (const ewRoad of cell.ewRoads) {
                intersection.addEWRoad(ewRoad);
            }

            for (const nsRoad of cell.nsRoads) {
                intersection.addNSRoad(nsRoad);
            }

            this.intersections.push(intersection);
            cell.block = intersection;
        }
    }

    private linkNeighborBlocks(): void {
        for (const cell of this.grid.values()) {
            const x = cell.block.gridX;
            const y = cell.block.gridY;

            cell.block.setNeighbor('north', this.getBlock(x, y - 1));
            cell.block.setNeighbor('south', this.getBlock(x, y + 1));
            cell.block.setNeighbor('east', this.getBlock(x + 1, y));
            cell.block.setNeighbor('west', this.getBlock(x - 1, y));
        }
    }

    private getBlock(gridX: number, gridY: number): Block | null {
        const key = this.cellKey(gridX, gridY);
        const cell = this.grid.get(key);
        return cell ? cell.block : null;
    }

    private gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
        return {
            x: this.originX + (gridX * Block.SIZE) + (Block.SIZE / 2),
            y: this.originY + (gridY * Block.SIZE) + (Block.SIZE / 2)
        };
    }

    private cellKey(gridX: number, gridY: number): string {
        return `${gridX},${gridY}`;
    }

    private parseCellKey(key: string): [number, number] {
        const [x, y] = key.split(',').map(Number);
        return [x, y];
    }
}
