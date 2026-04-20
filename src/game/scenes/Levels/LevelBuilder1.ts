import { LevelBuilder, RoutePairSpec } from '../LevelBuilder';
import { RoadSpec } from '../../Road';

export class LevelBuilder1 extends LevelBuilder
{
    constructor ()
    {
        super('LevelBuilder1');
    }

    protected getInitialRoadSpecs(): RoadSpec[] {
        return [
            { name: 'Northbound 1', orientation: 'ns', direction: 'n', startY: 9, endY: 10, x: 0 },
            { name: 'Northbound 2', orientation: 'ns', direction: 'n', startY: -10, endY: -9, x: 0 },
            { name: 'Eastbound 1', orientation: 'ew', direction: 'e', startX: -10, endX: -9, y: 0 },
            { name: 'Eastbound 2', orientation: 'ew', direction: 'e', startX: 9, endX: 10, y: 0 }
        ];
    }

    protected getRoutePairs(): RoutePairSpec[] {
        return [
            { source: { gridX: 0, gridY: 10 }, destination: { gridX: 0, gridY: -10 } },
            { source: { gridX: -10, gridY: 0 }, destination: { gridX: 10, gridY: 0 } }
        ];
    }
}
