declare namespace JSX {
  type Element = unknown;
  interface IntrinsicAttributes {
    key?: string | number;
  }
  interface IntrinsicElements {
    [elementName: string]: unknown;
  }
}

declare module 'react' {
  export type ReactNode = unknown;
  export type FormEvent<T = Element> = { preventDefault(): void; currentTarget: T };
  export type ChangeEvent<T = Element> = { target: T; currentTarget: T };
  export type ContextType<T> = T extends { Provider: (props: { value: infer V; children?: ReactNode }) => JSX.Element } ? V : never;
  export function useState<T>(initialValue: T | (() => T)): [T, (value: T | ((current: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps?: unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: unknown[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function createContext<T>(defaultValue: T): { Provider: (props: { value: T; children?: ReactNode }) => JSX.Element };
  export function useContext<T>(context: { Provider: unknown }): T;
  const React: { StrictMode: (props: { children?: ReactNode }) => JSX.Element };
  export default React;
  export const StrictMode: (props: { children?: ReactNode }) => JSX.Element;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: unknown, props: unknown, key?: string): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: string): JSX.Element;
  export const Fragment: unknown;
}

declare module 'react-dom/client' {
  const ReactDOM: {
    createRoot(element: Element): { render(node: unknown): void };
  };
  export default ReactDOM;
}

declare module 'lucide-react' {
  export const ArrowRight: any;
  export const Calendar: any;
  export const Building2: any;
  export const CheckCircle2: any;
  export const Gauge: any;
  export const Lightbulb: any;
  export const Bookmark: any;
  export const DatabaseZap: any;
  export const Eye: any;
  export const ExternalLink: any;
  export const GitBranch: any;
  export const Globe2: any;
  export const Heart: any;
  export const MapPin: any;
  export const MessageCircle: any;
  export const Network: any;
  export const Plus: any;
  export const Search: any;
  export const Share2: any;
  export const SlidersHorizontal: any;
  export const Sparkles: any;
  export const UsersRound: any;
  export const X: any;
  export const LogIn: any;
  export const LockKeyhole: any;
  export const UserPlus: any;
  export const Award: any;
  export const BarChart3: any;
  export const Bell: any;
  export const LogOut: any;
  export const Mail: any;
  export const ShieldCheck: any;
}

declare module '*.css';

declare interface ImportMeta {
  env: Record<string, string | undefined>;
}

declare const process: { env: Record<string, string | undefined> };

declare module 'vite' {
  export function defineConfig(config: unknown): unknown;
}

declare module '@supabase/supabase-js' {
  export function createClient(url: string, anonKey: string, options?: unknown): unknown;
}
