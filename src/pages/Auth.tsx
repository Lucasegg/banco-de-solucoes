import { FormEvent, type ChangeEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

export function Login({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('marina@bancodesolucoes.dev');
  const [password, setPassword] = useState('solucoes123');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.message ?? 'Não foi possível entrar.');
      return;
    }
    onNavigate('profile');
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"><LockKeyhole size={16} /> Acesso mockado</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Entre para acompanhar suas contribuições.</h1>
        <p className="mt-4 leading-7 text-muted">A autenticação usa dados locais e localStorage, mantendo uma arquitetura simples para futura troca por um provedor real.</p>
        <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-muted">
          <strong className="text-slate-900">Conta de demonstração:</strong>
          <p className="mt-2">marina@bancodesolucoes.dev · senha: solucoes123</p>
        </div>
      </div>
      <form onSubmit={submit} className="rounded-[2rem] border border-line bg-white p-8 shadow-soft">
        <h2 className="text-2xl font-semibold">Login</h2>
        <label className="mt-6 grid gap-2 text-sm font-medium">E-mail<input className={inputClass} type="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} required /></label>
        <label className="mt-4 grid gap-2 text-sm font-medium">Senha<input className={inputClass} type="password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} required /></label>
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">Entrar <ArrowRight size={16} /></button>
        <button className="mt-3 w-full rounded-full border border-line px-5 py-3 text-sm font-semibold" type="button" onClick={() => onNavigate('register')}>Criar conta</button>
      </form>
    </section>
  );
}

export function Register({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', organization: '', city: '', state: '' });
  const [error, setError] = useState('');

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.password.length < 6) {
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }
    const result = await register(form);
    if (!result.ok) {
      setError(result.message ?? 'Não foi possível criar a conta.');
      return;
    }
    onNavigate('profile');
  };

  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white p-8 shadow-soft">
      <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800"><UserPlus size={16} /> Cadastro local</span>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">Crie seu perfil de colaborador.</h1>
      <p className="mt-3 text-muted">Os dados serão salvos apenas no navegador para validar a experiência sem backend.</p>
      <form onSubmit={submit} className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium md:col-span-2">Nome completo<input className={inputClass} value={form.name} onChange={(event: ChangeEvent<HTMLInputElement>) => update('name', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium">E-mail<input className={inputClass} type="email" value={form.email} onChange={(event: ChangeEvent<HTMLInputElement>) => update('email', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium">Senha<input className={inputClass} type="password" value={form.password} onChange={(event: ChangeEvent<HTMLInputElement>) => update('password', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium">Organização<input className={inputClass} value={form.organization} onChange={(event: ChangeEvent<HTMLInputElement>) => update('organization', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-medium">Cidade<input className={inputClass} value={form.city} onChange={(event: ChangeEvent<HTMLInputElement>) => update('city', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-medium">Estado<input className={inputClass} value={form.state} onChange={(event: ChangeEvent<HTMLInputElement>) => update('state', event.target.value)} /></label>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">{error}</p>}
        <div className="flex flex-wrap gap-3 md:col-span-2"><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">Cadastrar</button><button className="rounded-full border border-line px-5 py-3 text-sm font-semibold" type="button" onClick={() => onNavigate('login')}>Já tenho conta</button></div>
      </form>
    </section>
  );
}
