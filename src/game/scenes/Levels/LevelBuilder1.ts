import { GameWrapper } from '../GameWrapper';
import { RoadSpec } from '../../Road';
import { RoadNetwork } from '../../RoadNetwork';
import { Layers } from '../../../types';

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
        const arrowOptions = { depth: Layers.Roads+5, shift: { x: 0, y: 15 }, scale: 1.5 };
        const arrowOffsets: Record<string, { x?: number; y?: number }> = {
            'Northbound 1': { y: -2 },
            'Eastbound 2': { x: -2 }
        };

        for (const spec of this.getInitialRoadSpecs()) {
            this.addArrow(spec, { ...arrowOptions, gridOffset: arrowOffsets[spec.name] });
        }

        this.createText('Connect the roads to let cars pass through!', 220, 300, { fontFamily: 'Pixeled', fontSize: '12px', color: '#f2f2f2' }, { depth: Layers.Grass + 99 });
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        return [
            { name: 'Northbound 1', orientation: 'ns', direction: 'n', startY: 9, endY: 10, x: 0 },
            { name: 'Northbound 2', orientation: 'ns', direction: 'n', startY: -10, endY: -9, x: 0 },
            { name: 'Eastbound 1', orientation: 'ew', direction: 'e', startX: -10, endX: -9, y: 0 },
            { name: 'Eastbound 2', orientation: 'ew', direction: 'e', startX: 9, endX: 10, y: 0 }
        ];
    }

    protected getRoutes() {
        const routes = [];
        const north = this.createRouteFromGrid(
            { gridX: 0, gridY: 10 },
            { gridX: 0, gridY: -10 },
            { target: 10, labelOffset: { x: 16, y: -18 } }
        );
        const northeast = this.createRouteFromGrid(
            { gridX: 0, gridY: 10 },
            { gridX: 10, gridY: 0 },
            { target: 10, labelOffset: { x: 16, y: -2 } }
        );
        const east = this.createRouteFromGrid(
            { gridX: -10, gridY: 0 },
            { gridX: 10, gridY: 0 },
            { target: 10, labelOffset: { x: 16, y: -18 } }
        );
        const southeast = this.createRouteFromGrid(
            { gridX: -10, gridY: 0 },
            { gridX: 0, gridY: -10 },
            { target: 10, labelOffset: { x: 16, y: -2 } }
        );

        if (north) routes.push(north);
        if (northeast) routes.push(northeast);
        if (east) routes.push(east);
        if (southeast) routes.push(southeast);

        return routes;
    }
}
