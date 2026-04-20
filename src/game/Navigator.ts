import { Car } from './Car';
import { RoadNetwork } from './RoadNetwork';
import { Block } from './Block';

export class Navigator {
    private car: Car;
    private roadNetwork: RoadNetwork;
    private source: Block;
    private destination: Block;

    constructor(car: Car, roadNetwork: RoadNetwork, source: Block, destination: Block) {
        this.car = car;
        this.roadNetwork = roadNetwork;
        this.source = source;
        this.destination = destination;

        this.computeRoute();
    }

    static canReach(roadNetwork: RoadNetwork, source: Block, destination: Block): boolean {
        const graph = roadNetwork.getDirectedGraph();
        const startKey = Navigator.cellKey(source.gridX, source.gridY);
        const endKey = Navigator.cellKey(destination.gridX, destination.gridY);

        if (!graph.has(startKey) || !graph.has(endKey)) {
            return false;
        }

        const queue: string[] = [startKey];
        const visited = new Set<string>([startKey]);

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current === endKey) {
                return true;
            }

            const neighbors = graph.get(current) ?? [];
            for (const next of neighbors) {
                if (visited.has(next)) {
                    continue;
                }
                visited.add(next);
                queue.push(next);
            }
        }

        return false;
    }

    computeRoute(): void {
        const blocks = this.findRoute(
            { gridX: this.source.gridX, gridY: this.source.gridY },
            { gridX: this.destination.gridX, gridY: this.destination.gridY }
        );
        this.car.setRoute(blocks, false);
    }

    private findRoute(source: { gridX: number; gridY: number }, destination: { gridX: number; gridY: number }): Block[] {
        const graph = this.roadNetwork.getDirectedGraph();
        const startKey = Navigator.cellKey(source.gridX, source.gridY);
        const endKey = Navigator.cellKey(destination.gridX, destination.gridY);

        if (!graph.has(startKey) || !graph.has(endKey)) {
            throw new Error('Source or destination is not on a road within this network.');
        }

        const queue: string[] = [startKey];
        const visited = new Set<string>([startKey]);
        const prev = new Map<string, string | null>();
        prev.set(startKey, null);

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current === endKey) {
                break;
            }

            const neighbors = graph.get(current) ?? [];
            for (const next of neighbors) {
                if (visited.has(next)) {
                    continue;
                }
                visited.add(next);
                prev.set(next, current);
                queue.push(next);
            }
        }

        if (!prev.has(endKey)) {
            throw new Error('No directed route found between source and destination.');
        }

        const pathKeys: string[] = [];
        let cursor: string | null = endKey;
        while (cursor) {
            pathKeys.push(cursor);
            cursor = prev.get(cursor) ?? null;
        }
        pathKeys.reverse();

        const blocks: Block[] = [];
        for (const key of pathKeys) {
            const [x, y] = Navigator.parseCellKey(key);
            const block = this.roadNetwork.getBlockAt(x, y);
            if (block) {
                blocks.push(block);
            }
        }

        return blocks;
    }

    private static cellKey(gridX: number, gridY: number): string {
        return `${gridX},${gridY}`;
    }

    private static parseCellKey(key: string): [number, number] {
        const [x, y] = key.split(',').map(Number);
        return [x, y];
    }
}
