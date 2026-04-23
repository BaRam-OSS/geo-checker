import type { AuditReport } from '../types.js';

export function toJson(report: AuditReport, pretty = true): string {
  return pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);
}
