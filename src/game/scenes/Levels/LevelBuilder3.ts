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

export class LevelBuilder3 extends GameWrapper
{
    constructor ()
    {
        super('LevelBuilder3');
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
            'Northbound Bottom': { y: -2 },
            'Southbound Bottom': { y: -2 },
            'Westbound Right': { x: -2 },
            'Eastbound Right': { x: -2 }
        };

        for (const spec of this.getInitialRoadSpecs()) {
            this.addArrow(spec, { ...arrowOptions, gridOffset: arrowOffsets[spec.name] });
        }
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        return [
            { name: 'Northbound Bottom', orientation: 'ns', direction: 'n', startY: 7, endY: 10, x: 0 },
            { name: 'Southbound Bottom', orientation: 'ns', direction: 's', startY: 7, endY: 10, x: 1 },
            { name: 'Southbound Top', orientation: 'ns', direction: 's', startY: -10, endY: -9, x: 0 },
            { name: 'Northbound Top', orientation: 'ns', direction: 'n', startY: -10, endY: -9, x: 1 },
            { name: 'Eastbound Left', orientation: 'ew', direction: 'e', startX: -10, endX: -7, y: 0 },
            { name: 'Westbound Left', orientation: 'ew', direction: 'w', startX: -10, endX: -7, y: 1 },
            { name: 'Westbound Right', orientation: 'ew', direction: 'w', startX: 7, endX: 10, y: 0 },
            { name: 'Eastbound Right', orientation: 'ew', direction: 'e', startX: 7, endX: 10, y: 1 }
        ];
    }

    protected getRoutes() {
        const destinations = {
            top: { gridX: 1, gridY: -10 },
            bottom: { gridX: 1, gridY: 10 },
            left: { gridX: -10, gridY: 1 },
            right: { gridX: 10, gridY: 1 }
        };

        const sources = [
            {
                source: { gridX: 0, gridY: 10 },
                destinations: [destinations.top, destinations.left, destinations.right],
                labelOffsets: [
                    { x: 16, y: -24 },
                    { x: 16, y: -8 },
                    { x: 16, y: 8 }
                ]
            },
            {
                source: { gridX: 0, gridY: -10 },
                destinations: [destinations.bottom, destinations.left, destinations.right],
                labelOffsets: [
                    { x: 16, y: 8 },
                    { x: 16, y: 24 },
                    { x: 16, y: 40 }
                ]
            },
            {
                source: { gridX: -10, gridY: 0 },
                destinations: [destinations.top, destinations.bottom, destinations.right],
                labelOffsets: [
                    { x: 16, y: -24 },
                    { x: 16, y: -8 },
                    { x: 16, y: 8 }
                ]
            },
            {
                source: { gridX: 10, gridY: 0 },
                destinations: [destinations.top, destinations.bottom, destinations.left],
                labelOffsets: [
                    { x: -36, y: -24 },
                    { x: -36, y: -8 },
                    { x: -36, y: 8 }
                ]
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
                        target: 2
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
