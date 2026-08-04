import { expect, type Page } from '@playwright/test';

export type OverflowDiagnostic = {
  selector: string;
  tag: string;
  classes: string;
  width: number;
  left: number;
  right: number;
  clientWidth: number;
  scrollWidth: number;
};

export async function assertNoHorizontalOverflow(page: Page, context: string) {
  const { overflow, elements }: { overflow: number; elements: OverflowDiagnostic[] } = await page.evaluate(() => {
    const rootWidth = document.documentElement.clientWidth;
    const selectorFor = (element: Element) => {
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && current !== document.documentElement) {
        const parent: Element | null = current.parentElement;
        const siblings = parent ? [...parent.children].filter(sibling => sibling.tagName === current?.tagName) : [];
        const position = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : '';
        parts.unshift(`${current.tagName.toLowerCase()}${position}`);
        current = parent;
      }
      return parts.join(' > ');
    };
    const elements = [...document.querySelectorAll('*')].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const htmlElement = element as HTMLElement;
      if (rect.right <= rootWidth && rect.left >= 0 && htmlElement.scrollWidth <= htmlElement.clientWidth) return [];
      return [{
        selector: selectorFor(element), tag: element.tagName.toLowerCase(), classes: element.getAttribute('class') ?? '',
        width: rect.width, left: rect.left, right: rect.right,
        clientWidth: htmlElement.clientWidth, scrollWidth: htmlElement.scrollWidth,
      }];
    });
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, elements };
  });
  expect(overflow, `overflow horizontal em ${context}; elementos: ${JSON.stringify(elements)}`).toBeLessThanOrEqual(1);
}
