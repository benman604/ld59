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

export class LevelBuilder2 extends GameWrapper
{
    constructor ()
    {
        super('LevelBuilder2');
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

        this.createText(
            'Is something flipped?',
            350,
            300,
            { fontFamily: 'Pixeled', fontSize: '12px', color: '#f2f2f2' },
            { depth: Layers.Grass + 99 }
        );
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
        const sources = [
            {
                source: { gridX: 0, gridY: 10 },
                labelOffsets: [
                    { x: 16, y: -28 },
                    { x: 16, y: -12 },
                    { x: 16, y: 4 },
                    { x: 16, y: 20 }
                ]
            },
            {
                source: { gridX: 0, gridY: -10 },
                labelOffsets: [
                    { x: 16, y: 4 },
                    { x: 16, y: 20 },
                    { x: 16, y: 36 },
                    { x: 16, y: 52 }
                ]
            },
            {
                source: { gridX: -10, gridY: 0 },
                labelOffsets: [
                    { x: 16, y: -28 },
                    { x: 16, y: -12 },
                    { x: 16, y: 4 },
                    { x: 16, y: 20 }
                ]
            },
            {
                source: { gridX: 10, gridY: 0 },
                labelOffsets: [
                    { x: -36, y: -28 },
                    { x: -36, y: -12 },
                    { x: -36, y: 4 },
                    { x: -36, y: 20 }
                ]
            }
        ];

        const destinations = [
            { gridX: 1, gridY: -10 },
            { gridX: 1, gridY: 10 },
            { gridX: -10, gridY: 1 },
            { gridX: 10, gridY: 1 }
        ];

        const plans: RouteLabelPlan[] = [];
        for (const entry of sources) {
            entry.labelOffsets.forEach((labelOffset, index) => {
                const destination = destinations[index];
                if (destination) {
                    plans.push({
                        source: entry.source,
                        destination,
                        labelOffset,
                        target: 10
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
