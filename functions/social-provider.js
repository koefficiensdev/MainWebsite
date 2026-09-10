"use strict";
const {fail}=require('./social-domain');
function provider(key,fetcher=fetch){return async(path,{method='GET',body,requestId}={})=>{
 if(!key)fail('Előbb csatlakoztasd a publikálási szolgáltatót.','failed-precondition');
 let response;
 try{response=await fetcher('https://zernio.com/api/v1'+path,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(requestId?{'x-request-id':requestId}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(method==='POST'?240000:25000),redirect:'error'});}catch{throw Object.assign(new Error('A szolgáltatói válasz nem érkezett meg. A közzétételt ellenőrizni kell; nem indítjuk újra automatikusan.'),{code:'unavailable',uncertain:method!=='GET'});}
 let data;try{data=await response.json();}catch{throw Object.assign(new Error('Nem értelmezhető szolgáltatói válasz.'),{code:'unavailable',uncertain:method!=='GET'});}
 if(!response.ok)throw Object.assign(new Error(response.status===401?'A szolgáltatói kulcs érvénytelen.':response.status===402?'A szolgáltatói előfizetés vagy keret ellenőrzést igényel.':response.status===403?'A szolgáltatói jogosultság ellenőrzést igényel.':`A publikálási szolgáltató hibát jelzett (${response.status}).`),{code:'failed-precondition',httpStatus:response.status,uncertain:method!=='GET',existingPostId:typeof data.existingPostId==='string'?data.existingPostId:null});
 return data;
};}
module.exports={provider};
