// Existing regression suites explicitly sign in to the local demonstration account.
const installed=new WeakSet();
module.exports = page => {
  if(installed.has(page))return;
  installed.add(page);
  const login=async()=>{await page.locator('[data-auth-demo]').click();await page.locator('.auth-screen').waitFor({state:'detached'});};
  const goto=page.goto.bind(page),reload=page.reload.bind(page);
  page.goto=async(...args)=>{const response=await goto(...args);if(response&&new URL(page.url()).pathname==='/')await login();return response;};
  page.reload=async(...args)=>{const response=await reload(...args);await login();return response;};
};
