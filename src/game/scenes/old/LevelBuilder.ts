import { GameWrapper } from '../GameWrapper';
import { RoadNetwork } from '../../RoadNetwork';
import { EventBus } from '../../EventBus';
import { RoadSpec } from '../../Road';
import { Navigator } from '../../Navigator';

export class LevelBuilder extends GameWrapper
{
    private tool: 'road' | 'source' | 'destination' = 'road';
    private sourceKeys = new Set<string>();
    private destinationKeys = new Set<string>();
    private stubIndex = 0;

    constructor ()
    {
        super('LevelBuilder');
        this.crashDistance = 0;
    }

    create ()
    {
        this.bindLevelBuilderEvents();
        super.create();
    }

    protected isBuilderEnabled(): boolean {
        return true;
    }

    protected buildRoadNetwork(): RoadNetwork {
        return this.buildRoadNetworkFromSpecs();
    }

    protected setupLevel(): void {
    }

    protected getRoutes() {
        return [];
    }

    private bindLevelBuilderEvents(): void {
        const handleTool = (payload: { tool: 'road' | 'source' | 'destination' }) => {
            this.tool = payload.tool;
        };

        const handleConfirm = () => {
            if (this.tool === 'road') {
                return;
            }

            const pendingSpec = (this as any).pendingSpec as RoadSpec | null;
            if (!pendingSpec) {
                return;
            }

            if ((this as any).buildState === 'confirming') {
                return;
            }

            if ((this as any).canAffordPendingBuild && !(this as any).canAffordPendingBuild()) {
                return;
            }

            const stubName = `${this.tool === 'source' ? 'Source' : 'Destination'} Stub ${this.stubIndex + 1}`;
            this.stubIndex += 1;
            const stubSpec: RoadSpec = {
                ...pendingSpec,
                name: stubName
            };

            const baseRoads = (this as any).baseRoadSpecs as RoadSpec[];
            const playerRoads = (this as any).playerRoadSpecs as RoadSpec[];
            baseRoads.push(stubSpec);

            if (typeof (this as any).pendingCost === 'number' && (this as any).spendBudget) {
                (this as any).spendBudget((this as any).pendingCost);
            }

            (this as any).pendingSpec = null;
            (this as any).pendingCost = null;
            (this as any).buildState = 'idle';
            (this as any).clearPreview?.();
            (this as any).clearIdleIndicator?.();

            this.roadNetwork.build([...baseRoads, ...playerRoads]);

            const stubRoad = this.roadNetwork.getRoadByName(stubName);
            const endpoint = this.tool === 'source' ? stubRoad?.getBase() : stubRoad?.getEnd();
            if (endpoint) {
                const key = `${endpoint.gridX},${endpoint.gridY}`;
                if (this.tool === 'source') {
                    this.sourceKeys.add(key);
                } else {
                    this.destinationKeys.add(key);
                }
            }

            EventBus.emit('builder:clear');
        };

        const handleSimulationStart = () => {
            const routes = this.buildDynamicRoutes();
            if ((this as any).clearRouteTrackers) {
                (this as any).clearRouteTrackers();
            }
            (this as any).builderRoutes = routes;

            if (!routes.length) {
                (this as any).simulationRunning = true;
                (this as any).notifyUi?.('No routes found');
                this.time.delayedCall(0, () => {
                    (this as any).simulationRunning = false;
                });
            }
        };

        EventBus.on('builder:tool', handleTool);
        EventBus.on('builder:confirm', handleConfirm);
        EventBus.on('simulation:start', handleSimulationStart);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.removeListener('builder:tool', handleTool);
            EventBus.removeListener('builder:confirm', handleConfirm);
            EventBus.removeListener('simulation:start', handleSimulationStart);
        });
    }

    private buildDynamicRoutes() {
        const routes = [];
        const sources = Array.from(this.sourceKeys).map((key) => {
            const [x, y] = key.split(',').map(Number);
            return { gridX: x, gridY: y };
        });
        const destinations = Array.from(this.destinationKeys).map((key) => {
            const [x, y] = key.split(',').map(Number);
            return { gridX: x, gridY: y };
        });

        for (const source of sources) {
            const sourceBlock = this.roadNetwork.getBlockAt(source.gridX, source.gridY);
            if (!sourceBlock) {
                continue;
            }

            for (const destination of destinations) {
                if (destination.gridX === source.gridX && destination.gridY === source.gridY) {
                    continue;
                }

                const destinationBlock = this.roadNetwork.getBlockAt(destination.gridX, destination.gridY);
                if (!destinationBlock) {
                    continue;
                }

                if (!Navigator.canReach(this.roadNetwork, sourceBlock, destinationBlock)) {
                    continue;
                }

                const route = this.createRouteFromGrid(source, destination);
                if (route) {
                    routes.push(route);
                }
            }
        }

        return routes;
    }
}
