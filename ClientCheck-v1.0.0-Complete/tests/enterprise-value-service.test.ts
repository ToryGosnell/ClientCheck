import { describe, expect, it } from 'vitest';
import { getDepositRecommendation } from '../server/services/enterprise-value-service';

describe('deposit recommendations', () => {
  it('recommends low-risk completion billing', async () => {
    const result = await getDepositRecommendation({ customerKey: 'a', riskScore: 85 });
    expect(result.riskLevel).toBe('low');
    expect(result.recommendedPaymentPlan).toBe('on_completion');
  });

  it('recommends high-risk milestone billing', async () => {
    const result = await getDepositRecommendation({ customerKey: 'b', riskScore: 10 });
    expect(result.riskLevel).toBe('high');
    expect(result.recommendedDepositPercent).toBe(50);
  });
});
