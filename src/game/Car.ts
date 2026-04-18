import { Road } from './Road';

export type CarDirection = 'sw' | 'se' | 'ne' | 'nw';

export class Car {
    private scene: Phaser.Scene;
    private road: Road;
    private speed: number;
    private sprite: Phaser.GameObjects.Image;
    private path: { x: number; y: number }[] = [];
    private segmentIndex = 0;
    private distanceAlongSegment = 0;

    constructor(scene: Phaser.Scene, road: Road, speed: number) {
        this.scene = scene;
        this.road = road;
        this.speed = speed;
        this.path = road.getPathPoints();

        const start = this.path[0] ?? { x: 0, y: 0 };
        this.sprite = scene.add.image(start.x, start.y, 'car-se');
    }

    update(deltaMs: number): void {
        if (this.path.length < 2) {
            return;
        }

        let remaining = (this.speed * deltaMs) / 1000;

        while (remaining > 0) {
            const current = this.path[this.segmentIndex];
            const nextIndex = (this.segmentIndex + 1) % this.path.length;
            const next = this.path[nextIndex];

            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const segmentLength = Math.hypot(dx, dy);

            if (segmentLength === 0) {
                this.segmentIndex = nextIndex;
                this.distanceAlongSegment = 0;
                continue;
            }

            const remainingOnSegment = segmentLength - this.distanceAlongSegment;
            const step = Math.min(remaining, remainingOnSegment);
            this.distanceAlongSegment += step;
            remaining -= step;

            const t = this.distanceAlongSegment / segmentLength;
            const x = current.x + dx * t;
            const y = current.y + dy * t;

            this.sprite.setPosition(x, y);
            this.updateDirection(dx, dy);

            if (this.distanceAlongSegment >= segmentLength) {
                this.segmentIndex = nextIndex;
                this.distanceAlongSegment = 0;

                if (this.segmentIndex === 0) {
                    this.sprite.setPosition(this.path[0].x, this.path[0].y);
                }
            }
        }
    }

    setSpeed(speed: number): void {
        this.speed = speed;
    }

    private updateDirection(dx: number, dy: number): void {
        const dir = this.getDirectionFromVector(dx, dy);
        this.sprite.setTexture(`car-${dir}`);
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
