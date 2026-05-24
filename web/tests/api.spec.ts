import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'https://siteanalyser-api-gjcef3cjdpgqbjh6.australiaeast-01.azurewebsites.net';

test.describe('API — history endpoint', () => {
  test('returns a valid JSON array', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/history?url=https://webdesignbyryan.com`
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('returns audit records with expected shape', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/history?url=https://webdesignbyryan.com`
    );

    const audits = await response.json();

    if (audits.length > 0) {
      const audit = audits[0];
      expect(audit).toHaveProperty('url');
      expect(audit).toHaveProperty('performance');
      expect(audit).toHaveProperty('accessibility');
      expect(audit).toHaveProperty('createdAt');
    }
  });
});