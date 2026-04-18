import { Block } from './Block';

export type RoadDirection = 'ew' | 'ns';

export interface EWRoadSpec {
    direction: 'ew';
    startX: number;
    endX: number;
    y: number;
}

export interface NSRoadSpec {
    direction: 'ns';
    startY: number;
    endY: number;
    x: number;
}

export type RoadSpec = EWRoadSpec | NSRoadSpec;

export class Road {
    readonly direction: RoadDirection;
    readonly blocks: Block[];

    constructor(direction: RoadDirection, blocks: Block[]) {
        this.direction = direction;
        this.blocks = blocks;
    }

    getPathPoints(): { x: number; y: number }[] {
        return this.blocks.map((block) => ({ x: block.sprite.x, y: block.sprite.y }));
    }
}
