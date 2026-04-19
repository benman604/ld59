type Position = {
    x: number;
    y: number;
};

type PositionPanelProps = {
    mousePosition: Position;
    gridPosition: Position;
};

export function PositionPanel({ mousePosition, gridPosition }: PositionPanelProps) {
    return (
        <div>
            <div className="spritePosition">Mouse Position:
                <pre>{`{\n  x: ${mousePosition.x}\n  y: ${mousePosition.y}\n}`}</pre>
            </div>
            <div className="spritePosition">Grid Segment:
                <pre>{`{\n  x: ${gridPosition.x}\n  y: ${gridPosition.y - 1}\n}`}</pre>
            </div>
        </div>
    );
}
