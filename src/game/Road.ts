import { Block } from './Block';
import { LaneDirectionEW, LaneDirectionNS } from '../types';

export type RoadOrientation = 'ew' | 'ns';

export interface EWRoadSpec {
    name: string;
    orientation: 'ew';
    direction: 'e' | 'w';
    startX: number;
    endX: number;
    y: number;
}

export interface NSRoadSpec {
    name: string;
    orientation: 'ns';
    direction: 'n' | 's';
    startY: number;
    endY: number;
    x: number;
}

export type RoadSpec = EWRoadSpec | NSRoadSpec;

export class Road {
    readonly name: string;
    readonly orientation: RoadOrientation;
    readonly direction: LaneDirectionNS | LaneDirectionEW;
    readonly blocks: Block[];
    readonly minIndex: number;
    readonly maxIndex: number;
    readonly fixedCoord: number;
    private blockMap: Map<string, Block>;

    constructor(
        name: string,
        orientation: RoadOrientation,
        direction: LaneDirectionNS | LaneDirectionEW,
        minIndex: number,
        maxIndex: number,
        fixedCoord: number,
        blocks: Block[]
    ) {
        this.name = name;
        this.orientation = orientation;
        this.direction = direction;
        this.minIndex = minIndex;
        this.maxIndex = maxIndex;
        this.fixedCoord = fixedCoord;
        this.blocks = blocks;
        this.blockMap = new Map(blocks.map((block) => [`${block.gridX},${block.gridY}`, block]));
    }

    getBlock(index: number): Block | undefined {
        return this.blocks[index];
    }

    getBlockAt(gridX: number, gridY: number): Block | undefined {
        return this.blockMap.get(`${gridX},${gridY}`);
    }

    getBase(): Block | undefined {
        if (this.blocks.length === 0) {
            return undefined;
        }

        const last = this.blocks.length - 1;
        if (this.orientation === 'ew') {
            return this.direction === 'ew' ? this.blocks[0] : this.blocks[last];
        }

        return this.direction === 'ns' ? this.blocks[0] : this.blocks[last];
    }

    getEnd(): Block | undefined {
        if (this.blocks.length === 0) {
            return undefined;
        }

        const last = this.blocks.length - 1;
        if (this.orientation === 'ew') {
            return this.direction === 'ew' ? this.blocks[last] : this.blocks[0];
        }

        return this.direction === 'ns' ? this.blocks[last] : this.blocks[0];
    }

    getPathPoints(): { x: number; y: number }[] {
        return this.blocks.map((block) => ({ x: block.sprite.x, y: block.sprite.y }));
    }

    getLength(): number {
        return this.blocks.length;
    }
}
