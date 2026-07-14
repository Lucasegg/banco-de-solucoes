import { useState } from 'react';
import type { ProblemCategory, ProblemStatus } from '../types/domain';

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-slate-400';
const categories: ProblemCategory[] = ['Infraestrutura', 'Educação', 'Saúde', 'Segurança', 'Tecnologia', 'Mobilidade', 'Meio Ambiente', 'Assistência Social', 'Outros'];
const statuses: ProblemStatus[] = ['Aberto', 'Em andamento', 'Resolvido'];
const initialProblem = { title: '', description: '', category: '', city: '', state: '', country: 'Brasil', image: '', author: '', status: 'Aberto' };

type TextChangeEvent = { target: { value: string } };

export function ProblemForm() {
  const [values, setValues] = useState(initialProblem);
  const [submitted, setSubmitted] = useState(false);
  const required = Object.entries(values).filter(([key]) => key !== 'image');
  const hasErrors = required.some(([, value]) => !value.trim());
  const setField = (field: keyof typeof values, value: string) => setValues((current) => ({ ...current, [field]: value }));

  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white p-8 shadow-sm">
      <span className="text-sm font-medium text-muted">/problems/new</span>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Cadastrar problema</h1>
      <p className="mt-3 text-muted">Registre um desafio com contexto suficiente para que outras pessoas possam pesquisar e propor soluções.</p>
      <form className="mt-8 grid gap-4" onSubmit={(event: { preventDefault: () => void }) => { event.preventDefault(); setSubmitted(true); }}>
        <Field label="Título" value={values.title} onChange={(value) => setField('title', value)} required submitted={submitted} />
        <label className="grid gap-2 text-sm font-medium">
          Descrição *
          <textarea className={`${inputClass} min-h-32`} value={values.description} onChange={(event: TextChangeEvent) => setField('description', event.target.value)} placeholder="Descreva contexto, impactos e evidências" />
          {submitted && !values.description && <Error />}
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Categoria *
            <select className={inputClass} value={values.category} onChange={(event: TextChangeEvent) => setField('category', event.target.value)}>
              <option value="">Selecione</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
            {submitted && !values.category && <Error />}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Status *
            <select className={inputClass} value={values.status} onChange={(event: TextChangeEvent) => setField('status', event.target.value)}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <Field label="Cidade" value={values.city} onChange={(value) => setField('city', value)} required submitted={submitted} />
          <Field label="Estado" value={values.state} onChange={(value) => setField('state', value)} required submitted={submitted} />
          <Field label="País" value={values.country} onChange={(value) => setField('country', value)} required submitted={submitted} />
          <Field label="Autor" value={values.author} onChange={(value) => setField('author', value)} required submitted={submitted} />
        </div>
        <Field label="URL da imagem" value={values.image} onChange={(value) => setField('image', value)} submitted={submitted} />
        <button className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">Salvar rascunho local</button>
        {submitted && (hasErrors ? <p className="text-sm text-red-600">Preencha todos os campos obrigatórios.</p> : <p className="text-sm text-emerald-700">Rascunho validado localmente. A persistência será conectada ao Supabase futuramente.</p>)}
      </form>
    </section>
  );
}

export function SolutionForm() {
  return <FormShell title="Cadastrar solução" description="Documente uma proposta, piloto ou iniciativa validada e relacione-a aos problemas que ela resolve." fields={['Título da solução', 'Organização responsável', 'Maturidade', 'Problemas relacionados', 'Métrica de impacto', 'Descrição da solução']} />;
}

function Field({ label, value, onChange, required = false, submitted }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; submitted: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}{required ? ' *' : ''}
      <input className={inputClass} value={value} onChange={(event: TextChangeEvent) => onChange(event.target.value)} placeholder={`Informe: ${label.toLowerCase()}`} />
      {submitted && required && !value && <Error />}
    </label>
  );
}

function Error() {
  return <span className="text-xs text-red-600">Campo obrigatório.</span>;
}

function FormShell({ title, description, fields }: { title: string; description: string; fields: string[] }) {
  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white p-8 shadow-sm">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-muted">{description}</p>
      <form className="mt-8 grid gap-4" onSubmit={(event: { preventDefault: () => void }) => event.preventDefault()}>
        {fields.map((field) => field.includes('Descrição') || field.includes('Resumo') || field.includes('Métrica') ? (
          <label key={field} className="grid gap-2 text-sm font-medium">
            {field}
            <textarea className={`${inputClass} min-h-28`} placeholder={`Informe: ${field.toLowerCase()}`} />
          </label>
        ) : (
          <label key={field} className="grid gap-2 text-sm font-medium">
            {field}
            <input className={inputClass} placeholder={`Informe: ${field.toLowerCase()}`} />
          </label>
        ))}
        <button className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">Salvar rascunho local</button>
        <p className="text-xs text-muted">Nesta fase, o formulário não persiste dados. A integração será feita futuramente com Supabase.</p>
      </form>
    </section>
  );
}
