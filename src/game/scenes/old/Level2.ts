import { RoadNetwork } from '../../RoadNetwork';
import { Road } from '../../Road';
import { Block } from '../../Block';
import { GameWrapper } from '../GameWrapper';
import { Layers } from '../../../types';
import { Car } from '../../Car';
import { Route } from '../../Route';

export class Level2 extends GameWrapper
{
    private nsCount = 0;
    private ewCount = 0;
    private nsTarget = 10;
    private ewTarget = 10;
    private countsText: Phaser.GameObjects.Text;
    private carRoutes: Map<Car, 'ns' | 'ew'> = new Map();

    constructor ()
    {
        super('Level2');
    }

    protected isBuilderEnabled(): boolean {
        return true;
    }

    protected buildRoadNetwork(): RoadNetwork {
        const roadNetwork = new RoadNetwork(this, 400, 120);
        roadNetwork.build([
            { name: 'northbound', orientation: 'ns', direction: 'n', startY: -10, endY: 10, x: 1 },
            { name: 'southbound', orientation: 'ns', direction: 's', startY: -10, endY: 10, x: 0 },
            { name: 'eastbound', orientation: 'ew', direction: 'e', startX: -10, endX: 10, y: 1 },
            { name: 'westbound', orientation: 'ew', direction: 'w', startX: -10, endX: 10, y: 0 }
        ]);

        return roadNetwork;
    }

    protected setupLevel(): void {
        const northbound = this.roadNetwork.getRoadByName('northbound');
        const southbound = this.roadNetwork.getRoadByName('southbound');
        const eastbound = this.roadNetwork.getRoadByName('eastbound');
        const westbound = this.roadNetwork.getRoadByName('westbound');

        const northboundBase = northbound?.getBase();
        const northboundEnd = northbound?.getEnd();
        const southboundBase = southbound?.getBase();
        const southboundEnd = southbound?.getEnd();
        const eastboundBase = eastbound?.getBase();
        const eastboundEnd = eastbound?.getEnd();
        const westboundBase = westbound?.getBase();
        const westboundEnd = westbound?.getEnd();

        if (northbound && northboundBase) {
            const routes = this.createRouteGroup(northbound, northboundBase, [northboundEnd, eastboundEnd, westboundEnd]);
            this.scheduleRouteGroupSpawning(routes, 'ns');
        }

        if (southbound && southboundBase) {
            const routes = this.createRouteGroup(southbound, southboundBase, [southboundEnd, eastboundEnd, westboundEnd]);
            this.scheduleRouteGroupSpawning(routes, 'ns');
        }

        if (eastbound && eastboundBase) {
            const routes = this.createRouteGroup(eastbound, eastboundBase, [northboundEnd, southboundEnd, eastboundEnd]);
            this.scheduleRouteGroupSpawning(routes, 'ew');
        }

        if (westbound && westboundBase) {
            const routes = this.createRouteGroup(westbound, westboundBase, [northboundEnd, southboundEnd, westboundEnd]);
            this.scheduleRouteGroupSpawning(routes, 'ew');
        }


        this.countsText = this.add.text(24, 24, '', {
            fontFamily: 'Georgia',
            fontSize: '20px',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(Layers.UI + 2);

        this.updateCountsText();
    }

    protected onCarFinished(car: Car): void {
        const route = this.carRoutes.get(car);
        if (!route) {
            return;
        }

        if (route === 'ns') {
            this.nsCount += 1;
        }

        if (route === 'ew') {
            this.ewCount += 1;
        }

        this.carRoutes.delete(car);
        this.updateCountsText();
    }

    private scheduleRouteGroupSpawning(routes: Route[], routeKey: 'ns' | 'ew'): void {
        if (!routes.length) {
            return;
        }

        const spawnOnce = () => {
            const route = Phaser.Utils.Array.GetRandom(routes);
            const car = this.spawnCar(route.road, 60, route.source, route.destination);
            if (car) {
                this.carRoutes.set(car, routeKey);
            }

            const nextDelay = Phaser.Math.Between(800, 1800);
            this.time.delayedCall(nextDelay, spawnOnce);
        };

        spawnOnce();
    }

    private createRouteGroup(
        road: Road,
        source: Block,
        destinations: Array<Block | undefined>
    ): Route[] {
        return destinations
            .filter((dest): dest is Block => !!dest)
            .map((destination) => new Route(this, this.roadNetwork, road, source, destination));
    }

    private updateCountsText(): void {
        const nsLine = `South -> North: ${this.nsCount} / ${this.nsTarget}`;
        const ewLine = `West -> East: ${this.ewCount} / ${this.ewTarget}`;
        this.countsText.setText([nsLine, ewLine]);
    }
}
