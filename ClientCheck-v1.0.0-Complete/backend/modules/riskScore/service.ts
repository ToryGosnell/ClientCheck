
export function calculateRiskScore(data:{missedPayments:number,noShows:number,disputes:number,latePayments:number}){
  const score = 100
    - (data.missedPayments * 15)
    - (data.noShows * 10)
    - (data.disputes * 12)
    - (data.latePayments * 5);
  return Math.max(score,0);
}
