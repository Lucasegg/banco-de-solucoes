import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ProblemRepository } from '../repositories/problems';
import { SolutionRepository } from '../repositories/solutions';
import { useAuth } from '../hooks/useAuth';
import { ImageUploadField } from '../components/forms/ImageUploadField';
import { ImageUploadRepository, type UploadProgress } from '../repositories/images';
import { TaxonomyMultiSelect, TaxonomySelect } from '../components/taxonomy/TaxonomySelect';
import { TaxonomyProposalForm } from '../components/taxonomy/TaxonomyProposalForm';
import { useTranslation } from '../i18n/I18nProvider';
import { problemStatusKeys, solutionStatusKeys, maturityLevelKeys, difficultyKeys, impactLevelKeys } from '../i18n/presentation';
import type { ImplementationDifficulty, ImpactLevel, Problem, ProblemCategory, ProblemStatus, SolutionMaturityLevel, SolutionStatus } from '../types/domain';

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
const problemStatuses: ProblemStatus[] = ['Reportado', 'Em análise', 'Em vistoria', 'Planejado', 'Licitado', 'Em execução', 'Parcialmente resolvido', 'Resolvido', 'Arquivado', 'Reaberto'];
const solutionStatuses: SolutionStatus[] = ['Proposta', 'Em teste', 'Implementada', 'Validada', 'Arquivada'];
const maturityLevels: SolutionMaturityLevel[] = ['Ideia', 'Protótipo', 'Piloto', 'Em operação', 'Escalável'];
const difficulties: ImplementationDifficulty[] = ['Baixa', 'Média', 'Alta'];
const initialProblem = { title: '', summary: '', description: '', category: '', city: '', state: '', country: 'Brasil', image: '', status: 'Reportado', impactLevel: 'local', tags: [] as string[] };
const initialSolution = { title: '', summary: '', description: '', category: '', image: '', organization: '', location: '', country: 'Brasil', status: 'Proposta', maturityLevel: 'Ideia', implementationDifficulty: 'Baixa', estimatedCost: '', implementationTime: '', impactMetric: '', tags: [] as string[], evidenceLinks: '', relatedProblemIds: [] as string[] };

type TextChangeEvent = { target: { value: string } };
let fieldIdSequence = 0;

export function ProblemForm() {
  const { t } = useTranslation();
  const [values, setValues] = useState(initialProblem);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackIsSuccess, setFeedbackIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const submissionLock = useRef(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [imageError, setImageError] = useState('');
  const { user } = useAuth();
  const required = Object.entries(values).filter(([key]) => !['image', 'tags'].includes(key));
  const hasErrors = required.some(([, value]) => typeof value === 'string' && !value.trim());
  const setField = (field: keyof typeof values, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const submitProblem = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    if (!user) { setFeedbackIsSuccess(false); setFeedback(t('forms.signInProblem')); return; }
    if (!ProblemRepository) { setFeedbackIsSuccess(false); setFeedback(t('forms.saveUnavailable')); return; }
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSaving(true);
    setImageError('');
    let uploadedUrl = values.image;
    try {
      if (imageFile) {
        if (!ImageUploadRepository) { setImageError(t('forms.uploadUnavailable')); return; }
        const upload = await ImageUploadRepository.uploadImage('problem-images', user.id, imageFile, setUploadProgress);
        if (!upload.ok) { setImageError(upload.message); return; }
        uploadedUrl = upload.url;
      }
      const result = await ProblemRepository.create({ ...values, image: imageRemoved ? '' : uploadedUrl, authorId: user.id, author: user.name, summary: values.summary || values.description.slice(0, 160), category: values.category as ProblemCategory, status: values.status as ProblemStatus, impactLevel: values.impactLevel as ImpactLevel, tags: values.tags });
      if (!result.ok && imageFile && uploadedUrl) await ImageUploadRepository?.removeImage('problem-images', user.id, uploadedUrl);
      setFeedbackIsSuccess(result.ok);
      setFeedback(result.ok ? t('forms.problemSuccess') : result.message);
    } catch {
      setFeedbackIsSuccess(false);
      setFeedback(t('forms.saveUnavailable'));
    } finally {
      submissionLock.current = false;
      setSaving(false);
      setUploadProgress(null);
    }
  };
  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white p-8 shadow-sm"><h1 className="mt-2 text-4xl font-semibold tracking-tight">{t('forms.problem.title')}</h1><p className="mt-3 text-muted">{t('forms.problem.description')}</p><aside className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-slate-700">{t('forms.problemGuidance')}</aside><form className="mt-8 grid gap-4" onSubmit={submitProblem}><Field label={t('forms.title')} value={values.title} onChange={(value) => setField('title', value)} required submitted={submitted} /><Field label={t('forms.summary')} value={values.summary} onChange={(value) => setField('summary', value)} required submitted={submitted} /><label className="grid gap-2 text-sm font-medium" htmlFor="problem-description">{t('forms.description')} *<textarea id="problem-description" aria-invalid={submitted && !values.description ? true : undefined} aria-describedby={submitted && !values.description ? 'problem-description-error' : undefined} className={`${inputClass} min-h-32`} value={values.description} onChange={(event: TextChangeEvent) => setField('description', event.target.value)} placeholder={t('forms.descriptionPlaceholder')} />{submitted && !values.description && <Error id="problem-description-error" />}</label><div className="grid gap-4 md:grid-cols-2"><TaxonomySelect kind="category" scope="problem" label={t('filter.category')} required value={values.category} onChange={(value) => setField('category', value)} /><TaxonomyProposalForm kind="category" scope="problem" /><label className="grid gap-2 text-sm font-medium">{t('forms.status')} *<select className={inputClass} value={values.status} onChange={(event: TextChangeEvent) => setField('status', event.target.value)}>{problemStatuses.map((status) => <option key={status} value={status}>{t(problemStatusKeys[status])}</option>)}</select></label><Field label={t('forms.city')} value={values.city} onChange={(value) => setField('city', value)} required submitted={submitted} /><Field label={t('forms.state')} value={values.state} onChange={(value) => setField('state', value)} required submitted={submitted} /><Field label={t('forms.country')} value={values.country} onChange={(value) => setField('country', value)} required submitted={submitted} /><ReadOnlyField label={t('forms.author')} value={user?.name ?? t('forms.signInAuthor')} /></div><ImageUploadField label={t('forms.problemImage')} currentUrl={values.image} value={imageFile} removed={imageRemoved} uploading={saving && Boolean(uploadProgress)} progress={uploadProgress?.progress} error={imageError} alt={t('forms.problemImageAlt')} onChange={(file) => { setImageFile(file); setImageRemoved(false); }} onRemove={() => { setImageFile(null); setImageRemoved(true); setField('image', ''); }} /><OptionSelect label={t('forms.impact')} value={values.impactLevel} values={['local', 'regional', 'national', 'global']} labels={impactLevelKeys} onChange={(value) => setField('impactLevel', value)} /><TaxonomyMultiSelect scope="problem" value={values.tags} onChange={(value) => setValues(current=>({...current,tags:value}))}/><TaxonomyProposalForm kind="tag" scope="problem" /><button className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={saving}>{t(saving ? 'forms.saving' : 'forms.save')}</button>{submitted && hasErrors && <p className="text-sm text-red-600">{t('forms.requiredFields')}</p>}{feedback && <p role={feedbackIsSuccess ? 'status' : 'alert'} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">{feedback}</p>}</form></section>
  );
}

export function SolutionForm() {
  const { t } = useTranslation();
  const [values, setValues] = useState(initialSolution);
  const [submitted, setSubmitted] = useState(false);
  const [problemOptions, setProblemOptions] = useState<Problem[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackIsSuccess, setFeedbackIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const submissionLock = useRef(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [imageError, setImageError] = useState('');
  const { user } = useAuth();
  const hasErrors = !values.title.trim() || !values.summary.trim() || !values.description.trim() || !values.category || !values.organization.trim() || !values.location.trim() || !values.country.trim() || !values.impactMetric.trim();
  useEffect(() => { void (async () => { if (ProblemRepository) { const result = await ProblemRepository.list(); if (result.ok) setProblemOptions(result.data); } })(); }, []);
  const setField = (field: keyof typeof initialSolution, value: string | string[]) => setValues((current) => ({ ...current, [field]: value }));
  const toggleProblem = (id: string) => setValues((current) => ({ ...current, relatedProblemIds: current.relatedProblemIds.includes(id) ? current.relatedProblemIds.filter((item) => item !== id) : [...current.relatedProblemIds, id] }));
  const submitSolution = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    if (!user) { setFeedbackIsSuccess(false); setFeedback(t('forms.signInSolution')); return; }
    if (!SolutionRepository) { setFeedbackIsSuccess(false); setFeedback(t('forms.saveUnavailable')); return; }
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSaving(true);
    setImageError('');
    let uploadedUrl = values.image;
    try {
      if (imageFile) {
        if (!ImageUploadRepository) { setImageError(t('forms.uploadUnavailable')); return; }
        const upload = await ImageUploadRepository.uploadImage('solution-images', user.id, imageFile, setUploadProgress);
        if (!upload.ok) { setImageError(upload.message); return; }
        uploadedUrl = upload.url;
      }
      const result = await SolutionRepository.create({ ...values, image: imageRemoved ? '' : uploadedUrl, authorId: user.id, author: user.name, category: values.category as ProblemCategory, status: values.status as SolutionStatus, maturityLevel: values.maturityLevel as SolutionMaturityLevel, implementationDifficulty: values.implementationDifficulty as ImplementationDifficulty, tags: values.tags, evidenceLinks: values.evidenceLinks.split(',').map((link) => link.trim()).filter(Boolean) });
      if (!result.ok && imageFile && uploadedUrl) await ImageUploadRepository?.removeImage('solution-images', user.id, uploadedUrl);
      setFeedbackIsSuccess(result.ok);
      setFeedback(result.ok ? t('forms.solutionSuccess') : result.message);
    } catch {
      setFeedbackIsSuccess(false);
      setFeedback(t('forms.saveUnavailable'));
    } finally {
      submissionLock.current = false;
      setSaving(false);
      setUploadProgress(null);
    }
  };
  return (
    <section className="mx-auto max-w-4xl rounded-[2rem] border border-teal-100 bg-white p-8 shadow-sm"><h1 className="mt-2 text-4xl font-semibold tracking-tight">{t('forms.solution.title')}</h1><p className="mt-3 text-muted">{t('forms.solution.description')}</p><aside className="mt-5 rounded-2xl bg-teal-50 p-4 text-sm leading-6 text-slate-700">{t('forms.solutionGuidance')}</aside><form className="mt-8 grid gap-4" onSubmit={submitSolution}><Field label={t('forms.title')} value={values.title} onChange={(value) => setField('title', value)} required submitted={submitted} /><Field label={t('forms.summary')} value={values.summary} onChange={(value) => setField('summary', value)} required submitted={submitted} /><label className="grid gap-2 text-sm font-medium" htmlFor="solution-description">{t('forms.description')} *<textarea id="solution-description" aria-invalid={submitted && !values.description ? true : undefined} aria-describedby={submitted && !values.description ? 'solution-description-error' : undefined} className={`${inputClass} min-h-36`} value={values.description} onChange={(event: TextChangeEvent) => setField('description', event.target.value)} />{submitted && !values.description && <Error id="solution-description-error" />}</label><div className="grid gap-4 md:grid-cols-2"><TaxonomySelect kind="category" scope="solution" label={t('filter.category')} required value={values.category} onChange={(value) => setField('category', value)} /><TaxonomyProposalForm kind="category" scope="solution" /><ImageUploadField label={t('forms.solutionImage')} currentUrl={values.image} value={imageFile} removed={imageRemoved} uploading={saving && Boolean(uploadProgress)} progress={uploadProgress?.progress} error={imageError} alt={t('forms.solutionImageAlt')} onChange={(file) => { setImageFile(file); setImageRemoved(false); }} onRemove={() => { setImageFile(null); setImageRemoved(true); setField('image', ''); }} /><Field label={t('forms.organization')} value={values.organization} onChange={(value) => setField('organization', value)} required submitted={submitted} /><ReadOnlyField label={t('forms.author')} value={user?.name ?? t('forms.signInAuthor')} /><Field label={t('forms.location')} value={values.location} onChange={(value) => setField('location', value)} required submitted={submitted} /><Field label={t('forms.country')} value={values.country} onChange={(value) => setField('country', value)} required submitted={submitted} /><OptionSelect label={t('forms.status')} value={values.status} values={solutionStatuses} labels={solutionStatusKeys} onChange={(value) => setField('status', value)} /><OptionSelect label={t('forms.maturity')} value={values.maturityLevel} values={maturityLevels} labels={maturityLevelKeys} onChange={(value) => setField('maturityLevel', value)} /><OptionSelect label={t('forms.difficulty')} value={values.implementationDifficulty} values={difficulties} labels={difficultyKeys} onChange={(value) => setField('implementationDifficulty', value)} /><Field label={t('forms.cost')} value={values.estimatedCost} onChange={(value) => setField('estimatedCost', value)} submitted={submitted} /><Field label={t('forms.time')} value={values.implementationTime} onChange={(value) => setField('implementationTime', value)} submitted={submitted} /><Field label={t('forms.impactMetric')} value={values.impactMetric} onChange={(value) => setField('impactMetric', value)} required submitted={submitted} /></div><TaxonomyMultiSelect scope="solution" value={values.tags} onChange={(value) => setValues(current=>({...current,tags:value}))}/><TaxonomyProposalForm kind="tag" scope="solution" /><Field label={t('forms.evidenceLinks')} value={values.evidenceLinks} onChange={(value) => setField('evidenceLinks', value)} submitted={submitted} /><fieldset className="grid gap-3 rounded-3xl border border-line p-4"><legend className="px-2 text-sm font-semibold">{t('forms.relatedProblems')} <span className="font-normal text-muted">({t('forms.optional')})</span></legend><div className="grid gap-2 md:grid-cols-2">{problemOptions.map((problem) => <label key={problem.id} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={values.relatedProblemIds.includes(problem.id)} onChange={() => toggleProblem(problem.id)} /><span>{problem.title}</span></label>)}</div></fieldset><button className="mt-4 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={saving}>{t(saving ? 'forms.saving' : 'forms.save')}</button>{submitted && hasErrors && <p className="text-sm text-red-600">{t('forms.requiredFields')}</p>}{feedback && <p role={feedbackIsSuccess ? 'status' : 'alert'} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">{feedback}</p>}</form></section>
  );
}

function Field({ label, value, onChange, required = false, submitted }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; submitted: boolean }) {
  const { t } = useTranslation();
  const [id] = useState(() => `contribution-field-${++fieldIdSequence}`);
  const invalid = submitted && required && !value;
  const errorId = `${id}-error`;
  return <label className="grid gap-2 text-sm font-medium" htmlFor={id}>{label}{required ? ' *' : ''}<input id={id} className={inputClass} aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? errorId : undefined} value={value} onChange={(event: TextChangeEvent) => onChange(event.target.value)} placeholder={t('forms.placeholder', { label: label.toLocaleLowerCase() })} />{invalid && <Error id={errorId} />}</label>;
}
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<input className={`${inputClass} bg-slate-50 text-slate-600`} value={value} readOnly /></label>; }
function OptionSelect({ label, value, values, labels, onChange }: { label: string; value: string; values: readonly string[]; labels?: Record<string, import('../i18n/resources').TranslationKey>; onChange: (value: string) => void }) { const { t } = useTranslation(); return <label className="grid gap-2 text-sm font-medium">{label} *<select className={inputClass} value={value} onChange={(event: TextChangeEvent) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{labels?.[item] ? t(labels[item]) : item}</option>)}</select></label>; }
function Error({ id }: { id?: string }) { const { t } = useTranslation(); return <span id={id} role="alert" className="text-xs text-red-600">{t('forms.required')}</span>; }
