export type ShareStatus = 'shared' | 'copied' | 'manual';

export interface ShareResult {
  status: ShareStatus;
  url: string;
}

export async function shareCurrentHashUrl(title: string, text?: string): Promise<ShareResult> {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { status: 'shared', url };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return { status: 'manual', url };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { status: 'copied', url };
  } catch {
    return { status: 'manual', url };
  }
}
