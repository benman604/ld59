import { Block } from './Block';
import { Intersection } from './Intersection';
import { Road, RoadSpec } from './Road';
import { TrafficLight } from './TrafficLight';
import { LaneDirectionEW, LaneDirectionNS } from '../types';

const arrowEvery = 4;

type CellData = {
    block: Block;
    directions: Set<'ew' | 'ns'>;
    ewRoads: Set<Road>;
    nsRoads: Set<Road>;
};

export class RoadNetwork {
    private static readonly ISO_TILE_WIDTH = 60;
    private static readonly ISO_TILE_HEIGHT = 30;

    private scene: Phaser.Scene;
    private originX: number;
    private originY: number;

    private roads: Road[] = [];
    private intersections: Intersection[] = [];
    private grid: Map<string, CellData> = new Map();
    private arrowSprites: Phaser.GameObjects.Image[] = [];
    private roadsByName: Map<string, Road> = new Map();

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
            this.roadsByName.set(road.name, road);
            this.registerRoadBlocks(road);
        }

        this.createIntersections();
        this.linkNeighborBlocks();
        this.placeRoadArrows();
        this.configureTrafficLights();
    }

    getRoads(): Road[] {
        return [...this.roads];
    }

    getRoadByName(name: string): Road | undefined {
        return this.roadsByName.get(name);
    }

    configureTrafficLights(): void {
        const hasIncomingSegment = (road: Road, gridX: number, gridY: number) => {
            if (road.orientation === 'ew') {
                const step = road.direction === 'we' ? 1 : -1;
                return !!road.getBlockAt(gridX + step, gridY);
            }

            const step = road.direction === 'sn' ? 1 : -1;
            return !!road.getBlockAt(gridX, gridY + step);
        };

        const hasOutgoingSegment = (road: Road, gridX: number, gridY: number) => {
            if (road.orientation === 'ew') {
                const step = road.direction === 'we' ? -1 : 1;
                return !!road.getBlockAt(gridX + step, gridY);
            }

            const step = road.direction === 'sn' ? -1 : 1;
            return !!road.getBlockAt(gridX, gridY + step);
        };

        const isTerminatingRoad = (road: Road, gridX: number, gridY: number) => {
            return hasIncomingSegment(road, gridX, gridY) && !hasOutgoingSegment(road, gridX, gridY);
        };

        const shouldPlaceEwLight = (intersection: Intersection, ewRoad: Road | undefined, nsRoad: Road | undefined) => {
            if (!ewRoad) {
                return false;
            }

            if (!nsRoad) {
                return true;
            }

            const neighbors = [
                this.getBlockAt(intersection.gridX - 1, intersection.gridY),
                this.getBlockAt(intersection.gridX + 1, intersection.gridY)
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

            if (ewRoad.direction === 'ew') {
                return nsRoad.direction === 'sn';
            }

            return nsRoad.direction === 'ns';
        };

        for (const intersection of this.getIntersections()) {
            const { ns, ew } = intersection.getConnectedRoads();

            const nsRoad = ns[0];
            const ewRoad = ew[0];

            const nsIncoming = !!nsRoad && hasIncomingSegment(nsRoad, intersection.gridX, intersection.gridY);
            const nsTerminating = !!nsRoad && isTerminatingRoad(nsRoad, intersection.gridX, intersection.gridY);

            if (nsRoad && nsIncoming) {
                if (nsRoad.direction === 'sn') {
                    intersection.addTrafficLight('n', new TrafficLight('red'));
                }
                if (nsRoad.direction === 'ns') {
                    intersection.addTrafficLight('s', new TrafficLight('red'));
                }
            }

            const ewIncoming = !!ewRoad && hasIncomingSegment(ewRoad, intersection.gridX, intersection.gridY);

            if (ewRoad && ewIncoming && !nsTerminating && shouldPlaceEwLight(intersection, ewRoad, nsRoad)) {
                if (ewRoad.direction === 'we') {
                    intersection.addTrafficLight('w', new TrafficLight('red'));
                }
                if (ewRoad.direction === 'ew') {
                    intersection.addTrafficLight('e', new TrafficLight('red'));
                }
            }
        }
    }

    getIntersections(): Intersection[] {
        return [...this.intersections];
    }

    getBlockAt(gridX: number, gridY: number): Block | null {
        return this.getBlock(gridX, gridY);
    }

    getGridFromIso(isoX: number, isoY: number): { gridX: number; gridY: number } {
        const world = this.fromIsometric(
            isoX - (RoadNetwork.ISO_TILE_WIDTH / 2),
            isoY - (RoadNetwork.ISO_TILE_HEIGHT / 2)
        );
        const localX = world.x - this.originX;
        const localY = world.y - this.originY;

        return {
            gridX: Math.floor(localX / Block.SIZE),
            gridY: Math.floor(localY / Block.SIZE)
        };
    }

    toIsometric(worldX: number, worldY: number): { x: number; y: number } {
        const localX = worldX - this.originX;
        const localY = worldY - this.originY;

        return {
            x: this.originX + (localX - localY),
            y: this.originY + ((localX + localY) / 2)
        };
    }

    fromIsometric(isoX: number, isoY: number): { x: number; y: number } {
        const localX = isoX - this.originX;
        const localY = isoY - this.originY;

        return {
            x: this.originX + ((localX + (2 * localY)) / 2),
            y: this.originY + (((2 * localY) - localX) / 2)
        };
    }

    getFirstRoad(): Road | null {
        return this.roads.length > 0 ? this.roads[0] : null;
    }

    destroy(): void {
        this.arrowSprites.forEach(sprite => sprite.destroy());
        this.arrowSprites = [];

        for (const cell of this.grid.values()) {
            cell.block.destroy();
        }

        this.roads = [];
        this.intersections = [];
        this.grid.clear();
        this.roadsByName.clear();
    }

    private createRoad(spec: RoadSpec): Road {
        const blocks: Block[] = [];

        if (spec.orientation === 'ew') {
            const start = Math.min(spec.startX, spec.endX);
            const end = Math.max(spec.startX, spec.endX);

            for (let gridX = start; gridX <= end; gridX++) {
                const { x, y } = this.gridToWorld(gridX, spec.y);
                blocks.push(new Block(
                    this.scene,
                    this,
                    x,
                    y,
                    gridX,
                    spec.y,
                    'roadblock-iso',
                    0,
                    undefined,
                    RoadNetwork.ISO_TILE_WIDTH,
                    RoadNetwork.ISO_TILE_HEIGHT
                ));
            }

            const minIndex = Math.min(spec.startX, spec.endX);
            const maxIndex = Math.max(spec.startX, spec.endX);
            return new Road(
                spec.name,
                'ew',
                this.mapDirectionToLane(spec.direction, 'ew'),
                minIndex,
                maxIndex,
                spec.y,
                blocks
            );
        }

        const start = Math.min(spec.startY, spec.endY);
        const end = Math.max(spec.startY, spec.endY);

        for (let gridY = start; gridY <= end; gridY++) {
            const { x, y } = this.gridToWorld(spec.x, gridY);
            blocks.push(new Block(
                this.scene,
                this,
                x,
                y,
                spec.x,
                gridY,
                'roadblock-iso-nesw',
                0,
                undefined,
                RoadNetwork.ISO_TILE_WIDTH,
                RoadNetwork.ISO_TILE_HEIGHT
            ));
        }

        const minIndex = Math.min(spec.startY, spec.endY);
        const maxIndex = Math.max(spec.startY, spec.endY);
        return new Road(
            spec.name,
            'ns',
            this.mapDirectionToLane(spec.direction, 'ns'),
            minIndex,
            maxIndex,
            spec.x,
            blocks
        );
    }

    private registerRoadBlocks(road: Road): void {
        for (const block of road.blocks) {
            const key = this.cellKey(block.gridX, block.gridY);
            const existing = this.grid.get(key);

            if (!existing) {
                const directions = new Set<'ew' | 'ns'>([road.orientation]);
                const ewRoads = new Set<Road>();
                const nsRoads = new Set<Road>();

                if (road.orientation === 'ew') ewRoads.add(road);
                if (road.orientation === 'ns') nsRoads.add(road);

                this.grid.set(key, {
                    block,
                    directions,
                    ewRoads,
                    nsRoads
                });

                continue;
            }

            block.destroy();
            existing.directions.add(road.orientation);

            if (road.orientation === 'ew') existing.ewRoads.add(road);
            if (road.orientation === 'ns') existing.nsRoads.add(road);
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
                this,
                x,
                y,
                gridX,
                gridY
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

    private placeRoadArrows(): void {
        this.arrowSprites.forEach(sprite => sprite.destroy());
        this.arrowSprites = [];

        for (const road of this.roads) {
            for (let i = 0; i < road.blocks.length; i++) {
                if (i % arrowEvery !== 0) {
                    continue;
                }

                const block = road.blocks[i];
                const activeBlock = this.getBlock(block.gridX, block.gridY);
                if (!activeBlock || activeBlock instanceof Intersection) {
                    continue;
                }

                const textureKey = this.getArrowTextureKey(road.direction);
                const sprite = this.scene.add.image(activeBlock.sprite.x, activeBlock.sprite.y, textureKey);
                sprite.setDepth(activeBlock.sprite.depth + 2);
                sprite.setScale(0.8);
                this.arrowSprites.push(sprite);
            }
        }
    }

    private getBlock(gridX: number, gridY: number): Block | null {
        const key = this.cellKey(gridX, gridY);
        const cell = this.grid.get(key);
        return cell ? cell.block : null;
    }

    private gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
        const localX = (gridX * Block.SIZE) + (Block.SIZE / 2);
        const localY = (gridY * Block.SIZE) + (Block.SIZE / 2);
        const iso = this.toIsometric(this.originX + localX, this.originY + localY);

        return {
            x: iso.x + (RoadNetwork.ISO_TILE_WIDTH / 2),
            y: iso.y + (RoadNetwork.ISO_TILE_HEIGHT / 2)
        };
    }

    private cellKey(gridX: number, gridY: number): string {
        return `${gridX},${gridY}`;
    }

    private parseCellKey(key: string): [number, number] {
        const [x, y] = key.split(',').map(Number);
        return [x, y];
    }

    private mapDirectionToLane(direction: 'n' | 's' | 'e' | 'w', orientation: 'ew' | 'ns'): LaneDirectionEW | LaneDirectionNS {
        if (orientation === 'ew') {
            return direction === 'w' ? 'we' : 'ew';
        }

        return direction === 's' ? 'ns' : 'sn';
    }

    private getArrowTextureKey(direction: LaneDirectionEW | LaneDirectionNS): string {
        switch (direction) {
            case 'ew':
                return 'arrow_e';
            case 'we':
                return 'arrow_w';
            case 'ns':
                return 'arrow_s';
            case 'sn':
                return 'arrow_n';
            default:
                return 'arrow_e';
        }
    }
}