import fs from 'node:fs';
import { createServerClient } from '@supabase/ssr';
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const base=process.env.QA_BASE_URL||'http://localhost:3011';
const paths=process.argv.slice(2);
if(paths.length!==2)throw new Error('Deux fichiers de comptes QA sont requis.');
async function session(path){
  const account=JSON.parse(fs.readFileSync(path,'utf8'));
  if(!account.email?.startsWith('qa-')||!account.email.endsWith('@example.com'))throw new Error('Compte QA uniquement.');
  let cookies=[];
  const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{cookies=values}}});
  const {error}=await client.auth.signInWithPassword({email:account.email,password:account.password});
  if(error)throw new Error('Connexion QA impossible.');
  const get=path=>fetch(base+path,{headers:{Cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; ')},redirect:'manual'});
  const response=await get('/api/orders');
  if(response.status!==200)throw new Error('Lecture commandes QA impossible.');
  const orders=await response.json();
  if(!Array.isArray(orders)||!orders.length)throw new Error('Une commande QA est nécessaire dans chaque boutique.');
  return {get,orders};
}
const [a,b]=await Promise.all(paths.map(session));
const checks=[];
for(const [label,own,other]of[['A',a,b],['B',b,a]]){
 for(const order of own.orders){
  checks.push({test:`${label}: own order listed`,ok:!other.orders.some(o=>o.id===order.id)});
 }
 const id=other.orders[0].id;
 for(const path of [`/api/orders/${id}`,`/api/orders/${id}/document?format=a4`,`/api/orders/${id}/document?format=58mm`,`/api/orders/${id}/document?format=80mm`]){
  const response=await own.get(path);
  checks.push({test:`${label}: other shop order refused`,path:path.replace(id,'OTHER_QA_ORDER'),status:response.status,ok:[403,404].includes(response.status)});
 }
 for(const format of ['a4','58mm','80mm']){
  const response=await own.get(`/api/orders/${own.orders[0].id}/document?format=${format}`);
  const body=Buffer.from(await response.arrayBuffer());
  checks.push({test:`${label}: own PDF ${format}`,status:response.status,ok:response.status===200&&response.headers.get('content-type')?.includes('application/pdf')&&body.subarray(0,5).toString()==='%PDF-'});
 }
}
const result={checkedAt:new Date().toISOString(),scope:'Deux boutiques QA, lectures HTTP uniquement, aucun token enregistré.',checks};
fs.writeFileSync('docs/reports/launch-qa/isolation-post-sql.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.ok).length,failures:checks.filter(c=>!c.ok)}));
process.exitCode=checks.every(c=>c.ok)?0:1;
