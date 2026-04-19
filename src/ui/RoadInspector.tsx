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
            <pre>{
                `Road: ${summary.name}\n` +
                `${summary.length} blocks\n` +
                `${summary.intersections} intersections\n` +
                `$${summary.blockCost} x ${summary.length} + $${summary.intersectionCost} x ${summary.intersections} = $${summary.cost}`
            }</pre>
            <div>
                <button className="button" onClick={() => onDelete(summary.name)}>Delete</button>
            </div>
        </div>
    );
}
