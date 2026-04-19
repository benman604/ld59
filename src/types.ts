export type Dir = 'n' | 's' | 'e' | 'w';
export type LaneDirection = 'ns' | 'sn' | 'ew' | 'we';
export type LaneDirectionNS = 'ns' | 'sn';
export type LaneDirectionEW = 'ew' | 'we';

export const Layers = {
    Grass: 100,
    Roads: 200,
    Cars: 300,
    Openings: 400,
    Buildings: 500,
    TrafficLights: 600,
    UI: 700
} as const;

export function rgb(r: number, g: number, b: number): number {
    return (r << 16) + (g << 8) + b;
}