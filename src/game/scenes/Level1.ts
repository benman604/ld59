import { RoadNetwork } from '../RoadNetwork';
import { GameWrapper } from './GameWrapper';
import { Layers } from '../../types';
import { Car } from '../Car';
import { Route } from '../Route';

export class Level1 extends GameWrapper
{
    private nsCount = 0;
    private ewCount = 0;
    private nsTarget = 10;
    private ewTarget = 10;
    private countsText: Phaser.GameObjects.Text;
    private carRoutes: Map<Car, 'ns' | 'ew'> = new Map();

    constructor ()
    {
        super('Level1');
    }

    protected buildRoadNetwork(): RoadNetwork {
        const roadNetwork = new RoadNetwork(this, 400, 120);
        roadNetwork.build([
            { name: 'northbound', orientation: 'ns', direction: 'n', startY: -10, endY: 10, x: 0 },
            { name: 'eastbound', orientation: 'ew', direction: 'e', startX: -10, endX: 10, y: 0 }
        ]);

        return roadNetwork;
    }

    protected setupLevel(): void {
        const northbound = this.roadNetwork.getRoadByName('northbound');
        const eastbound = this.roadNetwork.getRoadByName('eastbound');

        const northboundBase = northbound?.getBase();
        const northboundEnd = northbound?.getEnd();
        const eastboundBase = eastbound?.getBase();
        const eastboundEnd = eastbound?.getEnd();

        if (northbound && northboundBase && northboundEnd) {
            const route = new Route(this, this.roadNetwork, northbound, northboundBase, northboundEnd);
            this.scheduleRouteSpawning(route, 'ns');
        }

        if (eastbound && eastboundBase && eastboundEnd) {
            const route = new Route(this, this.roadNetwork, eastbound, eastboundBase, eastboundEnd);
            this.scheduleRouteSpawning(route, 'ew');
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

    private scheduleRouteSpawning(route: Route, routeKey: 'ns' | 'ew'): void {
        const spawnOnce = () => {
            const car = this.spawnCar(route.road, 60, route.source, route.destination);
            if (car) {
                this.carRoutes.set(car, routeKey);
            }

            const nextDelay = Phaser.Math.Between(800, 1800);
            this.time.delayedCall(nextDelay, spawnOnce);
        };

        spawnOnce();
    }

    private updateCountsText(): void {
        const nsLine = `South -> North: ${this.nsCount} / ${this.nsTarget}`;
        const ewLine = `West -> East: ${this.ewCount} / ${this.ewTarget}`;
        this.countsText.setText([nsLine, ewLine]);
    }
}
