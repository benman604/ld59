import { RoadNetwork } from '../RoadNetwork';
import { Road } from '../Road';
import { Block } from '../Block';
import { GameWrapper, Route } from './GameWrapper';
import { Layers } from '../../types';

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

        this.createGridSprite('opening_ne', 4, -11, { depth: Layers.Openings });
        this.createGridSprite('opening_ne', 5, -11, { depth: Layers.Openings });
        this.createGridSprite('opening_ne', 23, -11, { depth: Layers.Openings });

        this.createGridSprite('opening_hidden', 5, 19, { depth: Layers.Openings });
        this.createGridSprite('opening_hidden', 23, 19, { depth: Layers.Openings });

        this.createGridSprite('opening_nw', -12, 3, { depth: Layers.Openings });
        this.createGridSprite('opening_nw', -12, 9, { depth: Layers.Openings });

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

        const routes: Route[] = [];

        this.pushRoute(routes, northbound, northboundBase, [
            northboundEnd,
            northbound2End,
            westboundEnd
        ]);

        this.pushRoute(routes, southbound, southboundBase, [
            westboundEnd,
            northbound2End
        ]);

        this.pushRoute(routes, northbound2, northbound2Base, [
            northbound2End,
            northboundEnd,
            westboundEnd
        ]);

        this.pushRoute(routes, eastbound, eastboundBase, [
            northbound2End,
            westboundEnd,
            northboundEnd
        ]);

        this.startSpawning(routes, 700, 1600, 60);
    }

    private pushRoute(
        routes: Route[],
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

        routes.push({
            road,
            source,
            destinations: validDestinations
        });
    }
}
