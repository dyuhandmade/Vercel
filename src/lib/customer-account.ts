import 'server-only';
import {NextResponse} from 'next/server';
import {getAccountConfig,getCustomerApiUrl,getCustomerSession,clearCustomerSession,isAccountMutationAllowed,type CustomerSession} from './customer-auth';
import {ACCOUNT_NO_STORE} from './account-security';
import {AccountInputError} from './account-validation';
import type {AccountCustomer} from './account-types';
import {customerQueries} from './customer-queries';
import {readJsonObject,RequestBodyError} from './request-body';

export class CustomerAccountError extends Error{constructor(message:string,public status=503){super(message);}}
export function accountJson(value:unknown,status=200){return NextResponse.json(value,{status,headers:{...ACCOUNT_NO_STORE,Vary:'Cookie'}});}
export async function accountFailure(error:unknown){
 if(error instanceof RequestBodyError)return accountJson({error:error.message},error.status);
 if(error instanceof AccountInputError)return accountJson({error:error.message},400);
 if(error instanceof CustomerAccountError){if(error.status===401)await clearCustomerSession();return accountJson({error:error.message},error.status);}
 return accountJson({error:'Your account could not be updated or loaded. Please try again.'},503);
}
export async function requireCustomer(request?:Request){
 if(request&&!isAccountMutationAllowed(request))throw new CustomerAccountError('Invalid request origin.',403);
 const session=await getCustomerSession();
 if(!session)throw new CustomerAccountError('Please sign in to continue.',401);
 return session;
}
export async function accountBody(request:Request):Promise<Record<string,unknown>>{
 return readJsonObject(request);
}
export async function customerRequest<T>(session:CustomerSession,query:string,variables:Record<string,unknown>={}):Promise<T>{
 const config=getAccountConfig();if(!config)throw new CustomerAccountError('Sign-in is temporarily unavailable.');
 const response=await fetch(await getCustomerApiUrl(),{method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:session.accessToken,Origin:config.siteOrigin},body:JSON.stringify({query,variables})});
 if(response.status===401)throw new CustomerAccountError('Your session has expired. Please sign in again.',401);
 if(!response.ok)throw new CustomerAccountError('Your account is temporarily unavailable. Please retry.');
 const result=await response.json();
 if(result.errors?.length||!result.data)throw new CustomerAccountError('We could not load or update your account. Please retry.');
 return result.data as T;
}
type RawCustomer=Omit<AccountCustomer,'email'|'phone'>&{emailAddress:{emailAddress:string|null}|null;phoneNumber:{phoneNumber:string}|null};
export function customerSummary(customer:RawCustomer):AccountCustomer{
 return {id:customer.id,firstName:customer.firstName,lastName:customer.lastName,displayName:customer.displayName,email:customer.emailAddress?.emailAddress||null,phone:customer.phoneNumber?.phoneNumber||null};
}
export async function customerProfile(session:CustomerSession){const data=await customerRequest<{customer:RawCustomer}>(session,customerQueries.profile);return customerSummary(data.customer);}
export type CustomerUserError={message:string;field?:string[];code?:string};
export function checkCustomerErrors(errors:CustomerUserError[]){if(errors.length)throw new CustomerAccountError(errors.map(e=>e.message).join(' ').slice(0,600),400);}
export function safeCustomerUrl(value:unknown):string{try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password?url.toString():'';}catch{return '';}}
