import { solutions } from '../../data/mockData';
export const SolutionRepository = { list: () => solutions, findById: (id: string) => solutions.find((item) => item.id === id) ?? null };
