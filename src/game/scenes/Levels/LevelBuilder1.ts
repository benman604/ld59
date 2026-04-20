import { GameWrapper } from '../GameWrapper';
import { RoadSpec } from '../../Road';
import { RoadNetwork } from '../../RoadNetwork';
import { Layers } from '../../../types';
import { Route } from '../../Route';

export class LevelBuilder1 extends GameWrapper
{
    constructor ()
    {
        super('LevelBuilder1');
    }

    protected isBuilderEnabled(): boolean {
        return true;
    }

    protected buildRoadNetwork(): RoadNetwork {
        return this.buildRoadNetworkFromSpecs();
    }

    protected setupLevel(): void {
        this.createGridSprite('arrow_e', -9, -1, { depth: Layers.Buildings, shift: { x: 0, y: 15 }, scale: 1.5 });
        this.createGridSprite('arrow_n', -2, 5, { depth: Layers.Buildings, shift: { x: 0, y: 15 }, scale: 1.5 });
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        return [
            { name: 'Northbound 1', orientation: 'ns', direction: 'n', startY: 9, endY: 10, x: 0 },
            { name: 'Northbound 2', orientation: 'ns', direction: 'n', startY: -10, endY: -9, x: 0 },
            { name: 'Eastbound 1', orientation: 'ew', direction: 'e', startX: -10, endX: -9, y: 0 },
            { name: 'Eastbound 2', orientation: 'ew', direction: 'e', startX: 9, endX: 10, y: 0 }
        ];
    }

    protected getRoutes(): Route[] {
        const routes: Route[] = [];
        const north = this.createRouteFromGrid({ gridX: 0, gridY: 10 }, { gridX: 0, gridY: -10 });
        if (north) {
            routes.push(north);
        }

        const east = this.createRouteFromGrid({ gridX: -10, gridY: 0 }, { gridX: 10, gridY: 0 });
        if (east) {
            routes.push(east);
        }

        return routes;
    }
}
