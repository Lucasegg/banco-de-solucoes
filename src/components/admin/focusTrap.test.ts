import assert from 'node:assert/strict';
import test from 'node:test';
import { focusInitialElement, handleModalKeyDown, restoreFocus, trapFocus } from './focusTrap.ts';

type FakeElement = { tabIndex: number; focus: () => void; hasAttribute: (name: string) => boolean };
function fixture() {
  let focused = '';
  const first: FakeElement = { tabIndex: 0, focus: () => { focused = 'first'; }, hasAttribute: () => false };
  const last: FakeElement = { tabIndex: 0, focus: () => { focused = 'last'; }, hasAttribute: () => false };
  const container = { querySelectorAll: () => [first, last] as unknown as NodeListOf<HTMLElement>, contains: (element: unknown) => element === first || element === last, focus: () => { focused = 'container'; } };
  const event = (shiftKey = false) => { let prevented = false; return { key: 'Tab', shiftKey, preventDefault: () => { prevented = true; }, get prevented() { return prevented; } }; };
  return { first, last, container, event, focused: () => focused };
}
test('focus trap posiciona o foco inicial no primeiro controle do diálogo', () => { const value = fixture(); focusInitialElement(value.container); assert.equal(value.focused(), 'first'); });
test('focus trap circula Tab do último para o primeiro', () => { const value = fixture(); const event = value.event(); trapFocus(event, value.container, value.last as never); assert.equal(event.prevented, true); assert.equal(value.focused(), 'first'); });
test('focus trap circula Shift+Tab do primeiro para o último', () => { const value = fixture(); const event = value.event(true); trapFocus(event, value.container, value.first as never); assert.equal(event.prevented, true); assert.equal(value.focused(), 'last'); });
test('Escape fecha o diálogo quando não está salvando', () => { const value = fixture(); let closed = false; handleModalKeyDown({ key: 'Escape', shiftKey: false, preventDefault: () => assert.fail('Escape não deve ser prevenido') }, value.container, false, () => { closed = true; }); assert.equal(closed, true); });
test('Escape não fecha o diálogo enquanto está salvando', () => { const value = fixture(); let closed = false; handleModalKeyDown({ key: 'Escape', shiftKey: false, preventDefault: () => assert.fail('Escape não deve ser prevenido') }, value.container, true, () => { closed = true; }); assert.equal(closed, false); });
test('restaura o foco ao elemento que abriu o diálogo', () => { let restored = false; restoreFocus({ focus: () => { restored = true; } }); assert.equal(restored, true); });
