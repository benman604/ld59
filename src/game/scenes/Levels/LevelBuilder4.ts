import { GameWrapper } from '../GameWrapper';
import { RoadSpec } from '../../Road';
import { RoadNetwork } from '../../RoadNetwork';
import { Layers } from '../../../types';

type GridPoint = { gridX: number; gridY: number };
type StubRole = 'source' | 'destination';

type RouteGroup = {
    source: GridPoint;
    destinations: GridPoint[];
};

export class LevelBuilder4 extends GameWrapper
{
    constructor ()
    {
        super('LevelBuilder4');
    }

    protected isBuilderEnabled(): boolean {
        return true;
    }

    protected buildRoadNetwork(): RoadNetwork {
        return this.buildRoadNetworkFromSpecs();
    }

    protected setupLevel(): void {
        this.setBudget(5200);
        const arrowOptions = { depth: Layers.Roads + 5, shift: { x: 0, y: 15 }, scale: 1.5 };

        for (const spec of this.getInitialRoadSpecs()) {
            this.addArrow(spec, arrowOptions);
        }

        const buildings = [
            { gridX: 2, gridY: 4 },
            { gridX: 2, gridY: 5 },
            { gridX: 11, gridY: 1 },
            { gridX: 11, gridY: 4 },
            { gridX: 13, gridY: 4 },
            { gridX: 6, gridY: 11 },
            { gridX: 5, gridY: 11 },
        ];

        for (const building of buildings) {
            this.addBuilding(building.gridX, building.gridY, { gridOffset: {x: -2, y: -2} });
        }
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        const points = new Map<string, { point: GridPoint; role: StubRole }>();
        const addPoint = (point: GridPoint, role: StubRole) => {
            const key = `${point.gridX},${point.gridY}`;
            const existing = points.get(key);
            if (!existing || (existing.role === 'destination' && role === 'source')) {
                points.set(key, { point, role });
            }
        };

        for (const group of this.getRouteGroups()) {
            addPoint(group.source, 'source');
            group.destinations.forEach((destination) => addPoint(destination, 'destination'));
        }

        const specs: RoadSpec[] = [];
        let index = 1;
        for (const entry of points.values()) {
            specs.push(this.createStubSpec(`Stub ${index}`, entry.point, entry.role));
            index += 1;
        }

        return specs;
    }

    protected getRoutes() {
        const routes = [];
        const target = 4;

        for (const group of this.getRouteGroups()) {
            const offsets = this.makeLabelOffsets(group.source, group.destinations.length);
            group.destinations.forEach((destination, index) => {
                const route = this.createRouteFromGrid(group.source, destination, {
                    target,
                    labelOffset: offsets[index]
                });
                if (route) {
                    routes.push(route);
                }
            });
        }

        return routes;
    }

    private getRouteGroups(): RouteGroup[] {
        return [
            {
                source: { gridX: 6, gridY: 20 },
                destinations: [
                    { gridX: 6, gridY: -10 },
                    { gridX: 24, gridY: -10 },
                    { gridX: -11, gridY: 10 }
                ]
            },
            {
                source: { gridX: 5, gridY: -10 },
                destinations: [
                    { gridX: -11, gridY: 10 },
                    { gridX: 24, gridY: -10 }
                ]
            },
            {
                source: { gridX: 24, gridY: 20 },
                destinations: [
                    { gridX: 24, gridY: -10 },
                    { gridX: 6, gridY: -10 },
                    { gridX: -11, gridY: 10 }
                ]
            },
            {
                source: { gridX: -11, gridY: 4 },
                destinations: [
                    { gridX: 24, gridY: -10 },
                    { gridX: -11, gridY: 10 },
                    { gridX: 6, gridY: -10 }
                ]
            }
        ];
    }

    private createStubSpec(name: string, point: GridPoint, role: StubRole): RoadSpec {
        const length = 3;
        const direction = this.getStubDirection(point);

        if (direction === 'n' || direction === 's') {
            const step = direction === 'n' ? -1 : 1;
            const startY = role === 'source' ? point.gridY : point.gridY - (step * (length - 1));
            const endY = role === 'source' ? point.gridY + (step * (length - 1)) : point.gridY;
            return {
                name,
                orientation: 'ns',
                direction,
                startY,
                endY,
                x: point.gridX
            };
        }

        const step = direction === 'w' ? -1 : 1;
        const startX = role === 'source' ? point.gridX : point.gridX - (step * (length - 1));
        const endX = role === 'source' ? point.gridX + (step * (length - 1)) : point.gridX;
        return {
            name,
            orientation: 'ew',
            direction,
            startX,
            endX,
            y: point.gridY
        };
    }

    private getStubDirection(point: GridPoint): 'n' | 's' | 'e' | 'w' {
        if (point.gridX === 5) {
            return 's';
        }

        if (point.gridX === 6 || point.gridX === 24) {
            return 'n';
        }

        if (point.gridY === 4) {
            return 'e';
        }

        if (point.gridY === 10) {
            return 'w';
        }

        return 'e';
    }

    private makeLabelOffsets(source: GridPoint, count: number): Array<{ x: number; y: number }> {
        const xOffset = source.gridX > 8 ? -36 : 16;
        const baseY = source.gridY < 0 ? 8 : -24;
        return Array.from({ length: count }, (_value, index) => ({
            x: xOffset,
            y: baseY + (index * 16)
        }));
    }
}
