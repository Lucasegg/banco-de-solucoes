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
  export function useState<T>(initialValue: T): [T, (value: T) => void];
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
  export const Building2: any;
  export const DatabaseZap: any;
  export const Globe2: any;
  export const MapPin: any;
  export const Network: any;
  export const Sparkles: any;
  export const UsersRound: any;
}

declare module '*.css';

declare interface ImportMeta {
  env: Record<string, string | undefined>;
}

declare const process: { env: Record<string, string | undefined> };

declare module 'vite' {
  export function defineConfig(config: unknown): unknown;
}
