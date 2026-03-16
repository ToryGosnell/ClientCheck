
export function detectFraud(reviewsLastHour:number){
 if(reviewsLastHour > 5){
   return {flag:true,reason:"High review velocity"};
 }
 return {flag:false};
}
