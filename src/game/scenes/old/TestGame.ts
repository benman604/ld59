import { RoadNetwork } from '../../RoadNetwork';
import { Road } from '../../Road';
import { Block } from '../../Block';
import { GameWrapper } from '../GameWrapper';
import { Route } from '../../Route';
import { Layers } from '../../../types';

export class TestGame extends GameWrapper
{
    constructor ()
    {
        super('TestGame');
    }

    protected buildRoadNetwork(): RoadNetwork {
        const roadNetwork = new RoadNetwork(this, 400, 120);
        roadNetwork.build([
            { name: 'eastbound', orientation: 'ew', direction: 'e', startX: -11, endX: 24, y: 4 },
            { name: 'westbound', orientation: 'ew', direction: 'w', startX: -11, endX: 24, y: 10 },
            { name: 'southbound', orientation: 'ns', direction: 's', startY: -10, endY: 10, x: 5 },
            { name: 'northbound', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 6 },
            { name: 'northbound2', orientation: 'ns', direction: 'n', startY: -10, endY: 20, x: 24 }
        ]);
        return roadNetwork;
    }

    protected setupLevel(): void {
        this.createGridSprite('skyscraper', 2, 4, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 2, 5, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 11, 1, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 11, 4, { depth: Layers.Buildings });
        this.createGridSprite('skyscraper', 13, 4, { depth: Layers.Buildings });

        const eastbound = this.roadNetwork.getRoadByName('eastbound');
        const westbound = this.roadNetwork.getRoadByName('westbound');
        const southbound = this.roadNetwork.getRoadByName('southbound');
        const northbound = this.roadNetwork.getRoadByName('northbound');
        const northbound2 = this.roadNetwork.getRoadByName('northbound2');

        const northboundBase = northbound?.getBase();
        const northbound2Base = northbound2?.getBase();
        const northboundEnd = northbound?.getEnd();
        const northbound2End = northbound2?.getEnd();
        const southboundBase = southbound?.getBase();
        const westboundEnd = westbound?.getEnd();
        const eastboundBase = eastbound?.getBase();

        const routeGroups: Route[][] = [];

        this.pushRouteGroup(routeGroups, northbound, northboundBase, [
            northboundEnd,
            northbound2End,
            westboundEnd
        ]);

        this.pushRouteGroup(routeGroups, southbound, southboundBase, [
            westboundEnd,
            northbound2End
        ]);

        this.pushRouteGroup(routeGroups, northbound2, northbound2Base, [
            northbound2End,
            northboundEnd,
            westboundEnd
        ]);

        this.pushRouteGroup(routeGroups, eastbound, eastboundBase, [
            northbound2End,
            westboundEnd,
            northboundEnd
        ]);

        this.startSpawning(routeGroups, 700, 1600, 60);
    }

    private pushRouteGroup(
        routeGroups: Route[][],
        road: Road | undefined,
        source: Block | undefined,
        destinations: Array<Block | undefined>
    ): void {
        if (!road || !source) {
            return;
        }

        const validDestinations = destinations.filter((dest): dest is Block => !!dest);
        if (!validDestinations.length) {
            return;
        }

        const routes = validDestinations.map(destination => new Route(this, this.roadNetwork, road, source, destination));
        routeGroups.push(routes);
    }
}
