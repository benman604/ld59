import { GameWrapper } from './GameWrapper';
import { RoadNetwork } from '../RoadNetwork';

export class LevelBuilder extends GameWrapper
{
    constructor ()
    {
        super('LevelBuilder');
        this.crashDistance = 0;
    }

    protected isBuilderEnabled(): boolean {
        return true;
    }

    protected buildRoadNetwork(): RoadNetwork {
        return this.buildRoadNetworkFromSpecs();
    }

    protected setupLevel(): void {
    }
}
