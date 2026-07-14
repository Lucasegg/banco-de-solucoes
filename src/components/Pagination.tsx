import { ArrowRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function getPages(currentPage: number, totalPages: number) {
  const pages: Array<number | 'ellipsis'> = [];
  const add = (page: number) => {
    if (!pages.includes(page)) pages.push(page);
  };

  add(1);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) add(page);
  }
  if (totalPages > 1) add(totalPages);

  return pages.reduce<Array<number | 'ellipsis'>>((acc, page) => {
    const previous = acc[acc.length - 1];
    if (typeof page === 'number' && typeof previous === 'number' && page - previous > 1) acc.push('ellipsis');
    acc.push(page);
    return acc;
  }, []);
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems <= itemsPerPage) {
    return <p className="text-sm font-medium text-slate-600">Mostrando {start}–{end} de {totalItems} resultados.</p>;
  }

  return (
    <nav className="flex flex-col gap-4 rounded-[2rem] border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação">
      <p className="text-sm font-medium text-slate-600">Mostrando {start}–{end} de {totalItems} resultados.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Ir para a página anterior" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-300">← Anterior</button>
        {getPages(currentPage, totalPages).map((page, index) => page === 'ellipsis' ? <span key={`ellipsis-${index}`} className="px-2 text-slate-400" aria-hidden="true">…</span> : (
          <button key={page} type="button" onClick={() => onPageChange(page)} aria-label={`Ir para a página ${page}`} aria-current={page === currentPage ? 'page' : undefined} className={`h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-300 ${page === currentPage ? 'bg-slate-950 text-white' : 'border border-line text-slate-700 hover:bg-slate-50'}`}>{page}</button>
        ))}
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Ir para a próxima página" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-300">Próxima <ArrowRight size={16} /></button>
      </div>
    </nav>
  );
}
