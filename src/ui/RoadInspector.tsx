import type { RoadSummary } from './types';

type RoadInspectorProps = {
    summary: RoadSummary | null;
    onDelete: (name: string) => void;
};

export function RoadInspector({ summary, onDelete }: RoadInspectorProps) {
    if (!summary) {
        return null;
    }

    return (
        <div className="spritePosition">
            <div>{summary.name}</div>
            <div>{summary.length} blocks</div>
            <div>{summary.intersections} intersections</div>
            <div>
                ${summary.blockCost} x {summary.length} + ${summary.intersectionCost} x {summary.intersections} = ${summary.cost}
            </div>
            <div>
                <button
                    className="button button--text"
                    onClick={() => onDelete(summary.name)}
                    aria-label="Delete road"
                    title="Delete road"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}
