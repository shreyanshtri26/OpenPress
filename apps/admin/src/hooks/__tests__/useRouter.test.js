import { describe, expect, it } from 'vitest';
import { buildQuery } from '../useRouter';

describe('router query', () => {
  it('exposes the query string, so the password-reset link carries its token', () => {
    expect(buildQuery('?token=abc123&email=a%40b.com', {})).toEqual({ token: 'abc123', email: 'a@b.com' });
  });

  it('merges path parameters, which win over a query string of the same name', () => {
    expect(buildQuery('?storyId=from-query&tab=1', { storyId: 'from-path' })).toEqual({ storyId: 'from-path', tab: '1' });
  });

  it('is empty when there is neither', () => {
    expect(buildQuery('', {})).toEqual({});
  });
});
