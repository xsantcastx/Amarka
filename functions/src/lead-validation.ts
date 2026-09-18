/** Public lead data helpers, kept independent of Firebase for regression tests. */
export function escapeLeadHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]!));
}

export function validLeadUploadPath(path: unknown, category = 'enquiries'): path is string {
  return typeof path === 'string' && new RegExp(`^private/${category}/[a-zA-Z0-9._-]+\\.(pdf|ai|dwg|jpg|jpeg|png|svg)$`, 'i').test(path);
}

export function validSubmissionId(id: unknown): boolean {
  return id === undefined || (typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id));
}

export function validEnquiry(data: any): boolean {
  const required = ['fullName', 'email', 'role', 'projectType', 'projectDescription'];
  return !!data && required.every(key => typeof data[key] === 'string' && data[key].trim().length > 0 && data[key].length <= 10000)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    && data.projectDescription.trim().length >= 20
    && ['standard', 'trade'].includes(data.type)
    && (data.type !== 'trade' || (typeof data.company === 'string' && !!data.company.trim() && typeof data.businessType === 'string' && !!data.businessType.trim()))
    && validSubmissionId(data.submissionId);
}

/** Compare only submitted content, excluding server-managed delivery/status fields. */
export function sameEnquiryContent(saved: Record<string, unknown>, incoming: Record<string, unknown>): boolean {
  const fields = ['type', 'fullName', 'company', 'email', 'role', 'projectType',
    'preferredMaterial', 'estimatedQuantity', 'targetTimeline', 'businessType',
    'orderVolume', 'projectDescription', 'fileUploads', 'sourcePage', 'leadTags', 'designProject'];
  const stable = (value: any): any => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined)
        .map(key => [key, stable(value[key])]));
    }
    return value;
  };
  const content = (value: Record<string, unknown>) => Object.fromEntries(fields.map(key => [key, value[key]]));
  return JSON.stringify(stable(content(saved))) === JSON.stringify(stable(content(incoming)));
}
