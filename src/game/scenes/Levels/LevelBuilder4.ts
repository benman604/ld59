import { GameWrapper } from '../GameWrapper';
import { RoadSpec } from '../../Road';
import { RoadNetwork } from '../../RoadNetwork';
import { Layers } from '../../../types';

type GridPoint = { gridX: number; gridY: number };

type RouteLabelPlan = {
    source: GridPoint;
    destination: GridPoint;
    labelOffset: { x: number; y: number };
    target?: number;
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
        const arrowOptions = { depth: Layers.Roads + 5, shift: { x: 0, y: 15 }, scale: 1.5 };
        const arrowOffsets: Record<string, { x?: number; y?: number }> = {
            'Northbound Bottom Left': { y: -2 },
            'Northbound Bottom Right': { y: -2 },
            'Southbound Bottom Left': { y: -2 },
            'Southbound Bottom Right': { y: -2 },
            'Westbound Right Top': { x: -2 },
            'Westbound Right Bottom': { x: -2 },
            'Eastbound Right Top': { x: -2 },
            'Eastbound Right Bottom': { x: -2 }
        };

        for (const spec of this.getInitialRoadSpecs()) {
            this.addArrow(spec, { ...arrowOptions, gridOffset: arrowOffsets[spec.name] });
        }

        const buildings = [
            { gridX: -1, gridY: -1 },
            { gridX: 0, gridY: -1 },
            { gridX: 1, gridY: -1 },
            { gridX: -1, gridY: 0 },
            { gridX: 0, gridY: 0 },
            { gridX: 1, gridY: 0 },
            { gridX: -1, gridY: 1 },
            { gridX: 0, gridY: 1 },
            { gridX: 1, gridY: 1 },
            { gridX: -2, gridY: 0 },
            { gridX: 2, gridY: 0 },
            { gridX: 0, gridY: -2 },
            { gridX: 0, gridY: 2 }
        ];

        for (const building of buildings) {
            this.addBuilding(building.gridX, building.gridY);
        }
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        return [
            { name: 'Northbound Bottom Left', orientation: 'ns', direction: 'n', startY: 9, endY: 10, x: -1 },
            { name: 'Northbound Bottom Right', orientation: 'ns', direction: 'n', startY: 9, endY: 10, x: 1 },
            { name: 'Southbound Bottom Left', orientation: 'ns', direction: 's', startY: 9, endY: 10, x: -2 },
            { name: 'Southbound Bottom Right', orientation: 'ns', direction: 's', startY: 9, endY: 10, x: 2 },
            { name: 'Southbound Top Left', orientation: 'ns', direction: 's', startY: -10, endY: -9, x: -1 },
            { name: 'Southbound Top Right', orientation: 'ns', direction: 's', startY: -10, endY: -9, x: 1 },
            { name: 'Northbound Top Left', orientation: 'ns', direction: 'n', startY: -10, endY: -9, x: -2 },
            { name: 'Northbound Top Right', orientation: 'ns', direction: 'n', startY: -10, endY: -9, x: 2 },
            { name: 'Eastbound Left Top', orientation: 'ew', direction: 'e', startX: -10, endX: -9, y: -1 },
            { name: 'Eastbound Left Bottom', orientation: 'ew', direction: 'e', startX: -10, endX: -9, y: 1 },
            { name: 'Westbound Left Top', orientation: 'ew', direction: 'w', startX: -10, endX: -9, y: -2 },
            { name: 'Westbound Left Bottom', orientation: 'ew', direction: 'w', startX: -10, endX: -9, y: 2 },
            { name: 'Westbound Right Top', orientation: 'ew', direction: 'w', startX: 9, endX: 10, y: -1 },
            { name: 'Westbound Right Bottom', orientation: 'ew', direction: 'w', startX: 9, endX: 10, y: 1 },
            { name: 'Eastbound Right Top', orientation: 'ew', direction: 'e', startX: 9, endX: 10, y: -2 },
            { name: 'Eastbound Right Bottom', orientation: 'ew', direction: 'e', startX: 9, endX: 10, y: 2 }
        ];
    }

    protected getRoutes() {
        const topDests = [
            { gridX: -2, gridY: -10 },
            { gridX: 2, gridY: -10 }
        ];
        const bottomDests = [
            { gridX: -2, gridY: 10 },
            { gridX: 2, gridY: 10 }
        ];
        const leftDests = [
            { gridX: -10, gridY: -2 },
            { gridX: -10, gridY: 2 }
        ];
        const rightDests = [
            { gridX: 10, gridY: -2 },
            { gridX: 10, gridY: 2 }
        ];

        const bottomOffsets = [
            { x: 16, y: -24 },
            { x: 16, y: -8 },
            { x: 16, y: 8 }
        ];
        const topOffsets = [
            { x: 16, y: 8 },
            { x: 16, y: 24 },
            { x: 16, y: 40 }
        ];
        const leftOffsets = [
            { x: 16, y: -24 },
            { x: 16, y: -8 },
            { x: 16, y: 8 }
        ];
        const rightOffsets = [
            { x: -36, y: -24 },
            { x: -36, y: -8 },
            { x: -36, y: 8 }
        ];

        const sources = [
            {
                source: { gridX: -1, gridY: 10 },
                destinations: [topDests[0], leftDests[0], rightDests[0]],
                labelOffsets: bottomOffsets
            },
            {
                source: { gridX: 1, gridY: 10 },
                destinations: [topDests[1], leftDests[1], rightDests[1]],
                labelOffsets: bottomOffsets
            },
            {
                source: { gridX: -1, gridY: -10 },
                destinations: [bottomDests[0], leftDests[0], rightDests[0]],
                labelOffsets: topOffsets
            },
            {
                source: { gridX: 1, gridY: -10 },
                destinations: [bottomDests[1], leftDests[1], rightDests[1]],
                labelOffsets: topOffsets
            },
            {
                source: { gridX: -10, gridY: -1 },
                destinations: [rightDests[0], topDests[0], bottomDests[0]],
                labelOffsets: leftOffsets
            },
            {
                source: { gridX: -10, gridY: 1 },
                destinations: [rightDests[1], topDests[1], bottomDests[1]],
                labelOffsets: leftOffsets
            },
            {
                source: { gridX: 10, gridY: -1 },
                destinations: [leftDests[0], topDests[0], bottomDests[0]],
                labelOffsets: rightOffsets
            },
            {
                source: { gridX: 10, gridY: 1 },
                destinations: [leftDests[1], topDests[1], bottomDests[1]],
                labelOffsets: rightOffsets
            }
        ];

        const plans: RouteLabelPlan[] = [];
        for (const entry of sources) {
            entry.labelOffsets.forEach((labelOffset, index) => {
                const destination = entry.destinations[index];
                if (destination) {
                    plans.push({
                        source: entry.source,
                        destination,
                        labelOffset,
                        target: 15
                    });
                }
            });
        }

        const routes = [];
        for (const plan of plans) {
            const route = this.createRouteFromGrid(plan.source, plan.destination, {
                target: plan.target,
                labelOffset: plan.labelOffset
            });
            if (route) {
                routes.push(route);
            }
        }

        return routes;
    }
}
