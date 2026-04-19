import type { BuildSummary } from './types';

type BuildPanelProps = {
    isBuilderScene: boolean;
    buildMode: boolean;
    buildSummary: BuildSummary | null;
    onToggleBuildMode: () => void;
    onConfirmBuild: () => void;
    onCancelBuild: () => void;
};

export function BuildPanel({
    isBuilderScene,
    buildMode,
    buildSummary,
    onToggleBuildMode,
    onConfirmBuild,
    onCancelBuild
}: BuildPanelProps) {
    return (
        <div>
            <div>
                <button className="button" disabled={!isBuilderScene} onClick={onToggleBuildMode}>
                    {buildMode ? 'Nav Mode' : 'Build Mode'}
                </button>
            </div>
            {buildSummary && (
                <div className="spritePosition">
                    <pre>{
                        `Road Preview\n` +
                        `${buildSummary.length} blocks\n` +
                        `${buildSummary.intersections} intersections\n` +
                        `$${buildSummary.blockCost} x ${buildSummary.length} + $${buildSummary.intersectionCost} x ${buildSummary.intersections} = $${buildSummary.cost}`
                    }</pre>
                    <div>
                        <button className="button" onClick={onConfirmBuild}>Build</button> <br />
                        <button className="button" onClick={onCancelBuild}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
