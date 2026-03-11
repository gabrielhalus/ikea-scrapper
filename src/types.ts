export interface Watch {
  url: string;
  store: string;
  label?: string;
}

export interface CheckResult {
  url: string;
  store: string;
  label?: string;
  available: boolean;
  statusText: string;
  checkedAt: string;
}
