import {accountBody,accountFailure,accountJson,checkCustomerErrors,customerRequest,customerSummary,requireCustomer,type CustomerUserError} from '@/lib/customer-account';
import {profileInput} from '@/lib/account-validation';
import {customerQueries} from '@/lib/customer-queries';
export async function PATCH(request:Request){try{
 const session=await requireCustomer(request),input=profileInput(await accountBody(request));
 const result=await customerRequest<{customerUpdate:{customer:Parameters<typeof customerSummary>[0]|null;userErrors:CustomerUserError[]}}>(session,customerQueries.updateProfile,{input});
 checkCustomerErrors(result.customerUpdate.userErrors);
 if(!result.customerUpdate.customer)throw new Error('No customer returned');
 return accountJson({customer:customerSummary(result.customerUpdate.customer)});
}catch(error){return accountFailure(error);}}
