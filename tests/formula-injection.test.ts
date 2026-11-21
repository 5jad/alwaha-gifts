import { describe, it, expect } from 'vitest';

/**
 * Mirror of sanitizeCell in apps-script/Code.gs
 */
function sanitizeCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

describe('Google Sheets Formula Injection Sanitizer', () => {
  it('neutralizes dangerous formula characters by prepending single quote', () => {
    expect(sanitizeCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
    expect(sanitizeCell('-1+1')).toBe("'-1+1");
    expect(sanitizeCell('@IMPORTXML("url")')).toBe("'@IMPORTXML(\"url\")");
    expect(sanitizeCell('\tmalicious')).toBe("'\tmalicious");
    expect(sanitizeCell('\rmalicious')).toBe("'\rmalicious");
  });

  it('leaves benign strings and numbers unchanged', () => {
    expect(sanitizeCell('محمد علي')).toBe('محمد علي');
    expect(sanitizeCell('بغداد - الكرادة')).toBe('بغداد - الكرادة');
    expect(sanitizeCell('12345')).toBe('12345');
    expect(sanitizeCell('ساعة الأناقة')).toBe('ساعة الأناقة');
  });

  it('handles null and undefined gracefully', () => {
    expect(sanitizeCell(null)).toBe('');
    expect(sanitizeCell(undefined)).toBe('');
  });
});
