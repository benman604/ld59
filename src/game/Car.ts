import { Road } from './Road';
import { RoadNetwork } from './RoadNetwork';
import { Block } from './Block';
import { Intersection } from './Intersection';
import { Dir, Layers } from '../types';

export type CarDirection = 'sw' | 'se' | 'ne' | 'nw';

export class Car {
    private speed: number;
    private sprite: Phaser.GameObjects.Image;
    private roadNetwork: RoadNetwork;
    private path: { x: number; y: number }[] = [];
    private blockPath: Block[] = [];
    private segmentIndex = 0;
    private distanceAlongSegment = 0;
    private loop = true;
    private finished = false;
    private occupiedBlock: Block | null = null;
    private stopPadding: number;

    constructor(scene: Phaser.Scene, roadNetwork: RoadNetwork, road: Road, speed: number, stopPadding: number = 8) {
        this.speed = speed;
        this.roadNetwork = roadNetwork;
        this.stopPadding = stopPadding;
        this.path = road.getPathPoints();

        const start = this.path[0] ?? { x: 0, y: 0 };
        this.sprite = scene.add.image(start.x, start.y, 'car-se');
        this.sprite.setDepth(Layers.Cars);
    }

    setRoute(blocks: Block[], loop: boolean = false): void {
        this.blockPath = blocks;
        this.setPathPoints(blocks.map((block) => ({ x: block.sprite.x, y: block.sprite.y })), loop);

        if (blocks.length > 0) {
            this.setOccupiedBlock(blocks[0]);
        } else {
            this.clearOccupiedBlock();
        }
    }

    private setPathPoints(points: { x: number; y: number }[], loop: boolean = false): void {
        this.path = points;
        this.segmentIndex = 0;
        this.distanceAlongSegment = 0;
        this.loop = loop;
        this.finished = false;

        if (this.path.length > 0) {
            this.sprite.setPosition(this.path[0].x, this.path[0].y);
        }
    }

    update(deltaMs: number): boolean {
        if (this.path.length < 2) {
            return this.finished;
        }

        if (this.finished) {
            return true;
        }

        let remaining = (this.speed * deltaMs) / 1000;

        while (remaining > 0) {
            const current = this.path[this.segmentIndex];
            const nextIndex = this.segmentIndex + 1;

            if (!this.loop && nextIndex >= this.path.length) {
                this.finished = true;
                return true;
            }

            const resolvedNextIndex = this.loop
                ? nextIndex % this.path.length
                : nextIndex;
            const next = this.path[resolvedNextIndex];

            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const segmentLength = Math.hypot(dx, dy);

            if (segmentLength === 0) {
                this.segmentIndex = nextIndex;
                this.distanceAlongSegment = 0;
                continue;
            }

            const holdIndex = this.getHoldIndex(this.segmentIndex);
            const shouldHold = holdIndex !== null && this.segmentIndex === holdIndex;
            const remainingOnSegment = segmentLength - this.distanceAlongSegment;
            const holdDistance = shouldHold
                ? Math.min(this.stopPadding, segmentLength)
                : segmentLength;

            if (shouldHold && this.distanceAlongSegment >= holdDistance) {
                this.updateDirection(dx, dy);
                break;
            }

            const maxAdvance = shouldHold
                ? Math.max(0, Math.min(remainingOnSegment, holdDistance - this.distanceAlongSegment))
                : remainingOnSegment;
            if (shouldHold && maxAdvance <= 0) {
                this.updateDirection(dx, dy);
                break;
            }
            const step = Math.min(remaining, maxAdvance);
            this.distanceAlongSegment += step;
            remaining -= step;

            const t = this.distanceAlongSegment / segmentLength;
            const x = current.x + dx * t;
            const y = current.y + dy * t;

            this.sprite.setPosition(x, y);
            this.updateDirection(dx, dy);

            if (this.distanceAlongSegment >= segmentLength) {
                this.segmentIndex = resolvedNextIndex;
                this.distanceAlongSegment = 0;

                const nextBlockReached = this.blockPath[this.segmentIndex] ?? null;
                if (nextBlockReached) {
                    this.setOccupiedBlock(nextBlockReached);
                }

                if (this.loop && this.segmentIndex === 0) {
                    this.sprite.setPosition(this.path[0].x, this.path[0].y);
                }
            } else if (shouldHold && this.distanceAlongSegment >= holdDistance) {
                this.updateDirection(dx, dy);
                break;
            }
        }

        return this.finished;
    }

    setSpeed(speed: number): void {
        this.speed = speed;
    }

    destroy(): void {
        this.clearOccupiedBlock();
        this.sprite.destroy();
    }

    getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    private setOccupiedBlock(block: Block): void {
        if (this.occupiedBlock && this.occupiedBlock.gridX === block.gridX && this.occupiedBlock.gridY === block.gridY) {
            return;
        }

        this.clearOccupiedBlock();
        this.occupiedBlock = block;
        this.roadNetwork.occupy(block.gridX, block.gridY);
    }

    private clearOccupiedBlock(): void {
        if (!this.occupiedBlock) {
            return;
        }

        this.roadNetwork.release(this.occupiedBlock.gridX, this.occupiedBlock.gridY);
        this.occupiedBlock = null;
    }

    private updateDirection(dx: number, dy: number): void {
        const dir = this.getDirectionFromVector(dx, dy);
        this.sprite.setTexture(`car-${dir}`);
    }

    private getHoldIndex(startIndex: number): number | null {
        for (let i = startIndex + 1; i < this.blockPath.length; i += 1) {
            const block = this.blockPath[i];
            if (!block) {
                continue;
            }

            if (this.isOccupiedByOther(block)) {
                return Math.max(i - 1, startIndex);
            }

            if (!(block instanceof Intersection)) {
                continue;
            }

            const prev = this.blockPath[i - 1] ?? null;
            if (!prev) {
                continue;
            }

            const approach = this.getApproachDirection(prev, block);
            if (!approach) {
                return null;
            }

            const state = block.getTrafficLightState(approach);
            if (!state) {
                return null;
            }

            if (state !== 'red') {
                return null;
            }

            return Math.max(i - 1, startIndex);
        }

        return null;
    }

    private isOccupiedByOther(block: Block): boolean {
        if (this.occupiedBlock && this.occupiedBlock.gridX === block.gridX && this.occupiedBlock.gridY === block.gridY) {
            return false;
        }

        return this.roadNetwork.isOccupied(block.gridX, block.gridY);
    }

    private getApproachDirection(current: Block, next: Block): Dir | null {
        if (next.gridY > current.gridY) {
            return 'n';
        }

        if (next.gridY < current.gridY) {
            return 's';
        }

        if (next.gridX > current.gridX) {
            return 'w';
        }

        if (next.gridX < current.gridX) {
            return 'e';
        }

        return null;
    }

    private getDirectionFromVector(dx: number, dy: number): CarDirection {
        if (dx >= 0 && dy >= 0) {
            return 'se';
        }

        if (dx >= 0 && dy < 0) {
            return 'ne';
        }

        if (dx < 0 && dy >= 0) {
            return 'sw';
        }

        return 'nw';
    }
}
