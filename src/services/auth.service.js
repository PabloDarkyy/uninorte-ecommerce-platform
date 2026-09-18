// Local-only credentials for the academic demo. This is not server authentication.
const KEY='globalizat.auth.demo.v1';
export function createAuthService(storage,onLogin=async()=>{}) {
  let current=null;
  const read=()=>{try{const records=JSON.parse(storage?.getItem(KEY)||'[]');return Array.isArray(records)?records.filter(record=>record&&typeof record.email==='string'&&typeof record.salt==='string'&&typeof record.digest==='string'):[]}catch{return[]}};
  const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  async function derive(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:120000,hash:'SHA-256'},key,256)));}
  const identity=record=>({id:record.id,firstName:record.firstName,lastName:record.lastName,email:record.email});
  async function enter(user){await onLogin(user);current=identity(user);return {...current};}
  return {
    async getCurrentUser(){return current?{...current}:null;},
    async login(email,password){const normalized=String(email||'').trim().toLowerCase(),record=read().find(u=>u.email===normalized);if(!record || await derive(String(password||''),record.salt)!==record.digest)throw new Error('authInvalid');return enter(record);},
    async register({firstName,lastName,email,password}){
      firstName=String(firstName||'').trim();lastName=String(lastName||'').trim();email=String(email||'').trim().toLowerCase();
      if(!firstName||!lastName||firstName.length>80||lastName.length>80||!/^\S+@\S+\.\S+$/.test(email)||email.length>160||typeof password!=='string'||password.length<8||password.length>128)throw new Error('authFields');
      if(read().some(u=>u.email===email))throw new Error('authExists');
      const salt=hex(crypto.getRandomValues(new Uint8Array(16))),digest=await derive(password,salt),records=read();
      if(records.some(u=>u.email===email))throw new Error('authExists');
      const record={id:crypto.randomUUID(),firstName,lastName,email,salt,digest};
      try{if(!storage)throw new Error();storage.setItem(KEY,JSON.stringify([...records,record]));}catch{throw new Error('authStorage');}
      return enter(record);
    },
    async loginDemo(){return enter({id:'customer-demo',firstName:'Lucía',lastName:'Benítez',email:'lucia.benitez@example.com'});},
    async logout(){current=null;},
  };
}
let storage;try{storage=globalThis.localStorage;}catch{/* Registration explains unavailable storage. */}
export const authService=createAuthService(storage,async user=>{const{activateAccount}=await import('../features/account/services/index.js');activateAccount(user);});
