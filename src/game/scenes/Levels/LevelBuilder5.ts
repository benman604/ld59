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

export class LevelBuilder5 extends GameWrapper
{
    constructor ()
    {
        super('LevelBuilder5');
    }

    protected isBuilderEnabled(): boolean {
        return true;
    }

    protected buildRoadNetwork(): RoadNetwork {
        return this.buildRoadNetworkFromSpecs();
    }

    protected setupLevel(): void {
        this.setBudget(7000);
        const arrowOptions = { depth: Layers.Roads + 5, shift: { x: 0, y: 15 }, scale: 1.5 };

        for (const spec of this.getInitialRoadSpecs()) {
            this.addArrow(spec, arrowOptions);
        }

        const buildings = [
            { gridX: -2, gridY: 0 },
            { gridX: -2, gridY: 1 },
            { gridX: -2, gridY: -1 },
            { gridX: 6, gridY: 0 },
            { gridX: 6, gridY: 1 },
            { gridX: 6, gridY: -1 },
            { gridX: 5, gridY: 3 },
            { gridX: 12, gridY: 12},
            { gridX: 13, gridY: 12},
            { gridX: 14, gridY: 12},
        ];

        for (const building of buildings) {
            this.addBuilding(building.gridX + 1, building.gridY + 1, { gridOffset: { x: -2, y: -2 } });
        }
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        return [
            { name: 'Center Dest N', orientation: 'ns', direction: 'n', startY: -1, endY: 1, x: 1 },
            { name: 'Center Source S1', orientation: 'ns', direction: 's', startY: -1, endY: 1, x: 2 },
            { name: 'Center Source S2', orientation: 'ns', direction: 's', startY: -1, endY: 1, x: 3 },
            { name: 'Center Source S3', orientation: 'ns', direction: 's', startY: -1, endY: 1, x: 4 },
            { name: 'Right Dest N', orientation: 'ns', direction: 'n', startY: -1, endY: 1, x: 20 },
            { name: 'Right Source S', orientation: 'ns', direction: 's', startY: -1, endY: 1, x: 21 },
            { name: 'West Source', orientation: 'ew', direction: 'w', startX: 5, endX: 3, y: 10 },
            { name: 'East Source', orientation: 'ew', direction: 'e', startX: -10, endX: -8, y: -10 },
            { name: 'Westbound Destination', orientation: 'ew', direction: 'w', startX: 12, endX: 10, y: 20 }
        ];
    }

    protected getRoutes() {
        const centerSources = [
            { gridX: 2, gridY: -1 },
            { gridX: 3, gridY: -1 },
            { gridX: 4, gridY: -1 }
        ];
        const otherSources = [
            { gridX: 21, gridY: -1 },
            { gridX: 5, gridY: 10 },
            { gridX: -10, gridY: -10 }
        ];
        const destinations = [
            { gridX: 1, gridY: -1 },
            { gridX: 20, gridY: -1 },
            { gridX: 10, gridY: 20 }
        ];

        const plans: RouteLabelPlan[] = [];

        const makeOffsets = (source: GridPoint, count: number) => {
            const xOffset = source.gridX > 10 ? -36 : 16;
            const baseY = source.gridY < 0 ? 8 : -24;
            return Array.from({ length: count }, (_value, index) => ({
                x: xOffset,
                y: baseY + (index * 16)
            }));
        };

        for (const source of otherSources) {
            const offsets = makeOffsets(source, destinations.length);
            destinations.forEach((destination, index) => {
                plans.push({
                    source,
                    destination,
                    labelOffset: offsets[index],
                    target: 5
                });
            });
        }

        const farDestination = destinations[2];
        for (const source of centerSources) {
            const offsets = makeOffsets(source, 1);
            plans.push({
                source,
                destination: farDestination,
                labelOffset: offsets[0],
                target: 5
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
