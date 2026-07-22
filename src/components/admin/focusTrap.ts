const focusableSelector = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'object',
  'embed', '[contenteditable]', '[tabindex]:not([tabindex="-1"])',
].join(',');

export type FocusTrapEvent = { key: string; shiftKey: boolean; preventDefault: () => void };
type FocusableContainer = Pick<HTMLElement, 'querySelectorAll' | 'contains' | 'focus'>;
type FocusableElement = HTMLElement;

export function getFocusableElements(container: FocusableContainer): FocusableElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0);
}

export function focusInitialElement(container: FocusableContainer) {
  const [first] = getFocusableElements(container);
  (first ?? container).focus();
}

export function trapFocus(event: FocusTrapEvent, container: FocusableContainer, activeElement: Element | null = document.activeElement) {
  if (event.key !== 'Tab') return;
  const elements = getFocusableElements(container);
  if (!elements.length) { event.preventDefault(); container.focus(); return; }
  const first = elements[0]!;
  const last = elements[elements.length - 1]!;
  const activeInsideDialog = Boolean(activeElement && container.contains(activeElement));
  if (event.shiftKey && (activeElement === first || !activeInsideDialog)) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && (activeElement === last || !activeInsideDialog)) { event.preventDefault(); first.focus(); }
}

export function handleModalKeyDown(event: FocusTrapEvent, container: FocusableContainer, busy: boolean, onClose: () => void, activeElement?: Element | null) {
  if (event.key === 'Escape') { if (!busy) onClose(); return; }
  trapFocus(event, container, activeElement ?? document.activeElement);
}

export function restoreFocus(element: Pick<HTMLElement, 'focus'> | null) { element?.focus(); }
