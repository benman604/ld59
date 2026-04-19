export type TrafficLightState = 'red' | 'yellow' | 'green';

export class TrafficLight {
    private currentState: TrafficLightState = 'red';
    private yellowTimeout: number = 1000; // Duration of yellow light in milliseconds
    private scene?: Phaser.Scene;
    private sprite?: Phaser.GameObjects.Image;
    private yellowTimer?: Phaser.Time.TimerEvent;
    private hoverBorder?: Phaser.GameObjects.Graphics;
    private static readonly HOVER_PADDING = 2;

    constructor(initialState: TrafficLightState = 'red') {
        this.currentState = initialState;
    }

    private setCurrentState(state: TrafficLightState): void {
        this.currentState = state;
        this.updateSprite();
    }

    getCurrentState(): TrafficLightState {
        return this.currentState;
    }

    getImagePath(): string {
        return `assets/traffic_light_${this.currentState}.png`;
    }

    getTextureKey(): string {
        return `traffic-light-${this.currentState}`;
    }

    setState(state: TrafficLightState): void {
        if (this.yellowTimer) {
            this.yellowTimer.remove(false);
            this.yellowTimer = undefined;
        }
        this.setCurrentState(state);
    }

    cycleToNextState(): void {
        if (this.currentState === 'yellow') {
            return;
        }

        if (this.currentState === 'red') {
            this.setCurrentState('green');
            return;
        }

        const targetState: TrafficLightState = 'red';
        this.setCurrentState('yellow');

        if (this.yellowTimer) {
            this.yellowTimer.remove(false);
        }

        if (this.scene) {
            this.yellowTimer = this.scene.time.delayedCall(this.yellowTimeout, () => {
                this.setCurrentState(targetState);
            });
        } else {
            setTimeout(() => {
                this.setCurrentState(targetState);
            }, this.yellowTimeout);
        }
    }

    render(scene: Phaser.Scene, x: number, y: number, depth: number, scale: number): void {
        if (!this.scene) {
            this.scene = scene;
        }

        if (!this.sprite) {
            this.sprite = scene.add.image(x, y, this.getTextureKey());
            this.sprite.setData('trafficLight', true);
            this.sprite.setInteractive({ useHandCursor: true });
            this.sprite.on('pointerdown', () => {
                this.cycleToNextState();
            });
            this.sprite.on('pointerover', () => {
                if (this.hoverBorder) {
                    this.hoverBorder.setVisible(true);
                }
            });
            this.sprite.on('pointerout', () => {
                if (this.hoverBorder) {
                    this.hoverBorder.setVisible(false);
                }
            });
        }

        if (!this.hoverBorder) {
            this.hoverBorder = scene.add.graphics();
            this.hoverBorder.setVisible(false);
        }

        this.sprite.setPosition(x, y);
        this.sprite.setDepth(depth);
        this.sprite.setScale(scale);
        this.sprite.setTexture(this.getTextureKey());

        const width = this.sprite.displayWidth + (TrafficLight.HOVER_PADDING * 2);
        const height = this.sprite.displayHeight + (TrafficLight.HOVER_PADDING * 2);
        this.hoverBorder.setDepth(depth + 1);
        this.hoverBorder.clear();
        this.hoverBorder.lineStyle(2, 0xffffff, 1);
        this.hoverBorder.strokeRect(
            x - (width / 2),
            y - (height / 2),
            width,
            height
        );
    }

    private updateSprite(): void {
        if (this.sprite) {
            this.sprite.setTexture(this.getTextureKey());
        }
    }

    destroy(): void {
        if (this.yellowTimer) {
            this.yellowTimer.remove(false);
            this.yellowTimer = undefined;
        }

        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = undefined;
        }

        if (this.hoverBorder) {
            this.hoverBorder.destroy();
            this.hoverBorder = undefined;
        }

        this.scene = undefined;
    }
}
