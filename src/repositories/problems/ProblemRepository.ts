import { problems } from '../../data/mockData';
export const ProblemRepository = { list: () => problems, findById: (id: string) => problems.find((item) => item.id === id) ?? null };
