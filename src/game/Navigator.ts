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

    computeRoute(): void {
        const blocks = this.findRoute(
            { gridX: this.source.gridX, gridY: this.source.gridY },
            { gridX: this.destination.gridX, gridY: this.destination.gridY }
        );
        this.car.setRoute(blocks, false);
    }

    private findRoute(source: { gridX: number; gridY: number }, destination: { gridX: number; gridY: number }): Block[] {
        const graph = this.buildDirectedGraph();
        const startKey = this.cellKey(source.gridX, source.gridY);
        const endKey = this.cellKey(destination.gridX, destination.gridY);

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
            const [x, y] = this.parseCellKey(key);
            const block = this.roadNetwork.getBlockAt(x, y);
            if (block) {
                blocks.push(block);
            }
        }

        return blocks;
    }

    private buildDirectedGraph(): Map<string, string[]> {
        const graph = new Map<string, string[]>();

        for (const road of this.roadNetwork.getRoads()) {
            const step = road.orientation === 'ew'
                ? (road.direction === 'we' ? -1 : 1)
                : (road.direction === 'sn' ? -1 : 1);

            if (road.orientation === 'ew') {
                const start = step > 0 ? road.minIndex : road.maxIndex;
                const end = step > 0 ? road.maxIndex : road.minIndex;

                for (let x = start; step > 0 ? x <= end : x >= end; x += step) {
                    const block = road.getBlockAt(x, road.fixedCoord);
                    if (!block) {
                        continue;
                    }

                    const currentKey = this.cellKey(block.gridX, block.gridY);
                    if (!graph.has(currentKey)) {
                        graph.set(currentKey, []);
                    }

                    const nextX = x + step;
                    if (step > 0 ? nextX > end : nextX < end) {
                        continue;
                    }

                    const nextBlock = road.getBlockAt(nextX, road.fixedCoord);
                    if (!nextBlock) {
                        continue;
                    }

                    const nextKey = this.cellKey(nextBlock.gridX, nextBlock.gridY);
                    graph.get(currentKey)!.push(nextKey);

                    if (!graph.has(nextKey)) {
                        graph.set(nextKey, []);
                    }
                }
            } else {
                const start = step > 0 ? road.minIndex : road.maxIndex;
                const end = step > 0 ? road.maxIndex : road.minIndex;

                for (let y = start; step > 0 ? y <= end : y >= end; y += step) {
                    const block = road.getBlockAt(road.fixedCoord, y);
                    if (!block) {
                        continue;
                    }

                    const currentKey = this.cellKey(block.gridX, block.gridY);
                    if (!graph.has(currentKey)) {
                        graph.set(currentKey, []);
                    }

                    const nextY = y + step;
                    if (step > 0 ? nextY > end : nextY < end) {
                        continue;
                    }

                    const nextBlock = road.getBlockAt(road.fixedCoord, nextY);
                    if (!nextBlock) {
                        continue;
                    }

                    const nextKey = this.cellKey(nextBlock.gridX, nextBlock.gridY);
                    graph.get(currentKey)!.push(nextKey);

                    if (!graph.has(nextKey)) {
                        graph.set(nextKey, []);
                    }
                }
            }
        }

        return graph;
    }

    private cellKey(gridX: number, gridY: number): string {
        return `${gridX},${gridY}`;
    }

    private parseCellKey(key: string): [number, number] {
        const [x, y] = key.split(',').map(Number);
        return [x, y];
    }
}
