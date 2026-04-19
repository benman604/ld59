export type BuildSummary = {
    length: number;
    intersections: number;
    cost: number;
    blockCost: number;
    intersectionCost: number;
};

export type RoadSummary = BuildSummary & {
    name: string;
};
