export interface BusyLease { accountId: string; token: number }

/** Coordinates async UI operations across logout/account changes. */
export class AsyncBusyController {
  private current: BusyLease | null = null;
  private nextToken = 0;
  begin(accountId: string, onBusy: (busy: boolean) => void) {
    if (this.current) return null;
    const lease = { accountId, token: ++this.nextToken };
    this.current = lease;
    onBusy(true);
    return lease;
  }
  owns(lease: BusyLease) { return this.current?.token === lease.token && this.current.accountId === lease.accountId; }
  finish(lease: BusyLease, onBusy: (busy: boolean) => void) {
    if (!this.owns(lease)) return;
    this.current = null;
    onBusy(false);
  }
  reset(onBusy: (busy: boolean) => void) { this.current = null;this.nextToken++;onBusy(false); }
  get busy() { return this.current !== null; }
}
