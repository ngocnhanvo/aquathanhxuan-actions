'use strict';
/** Live negative-path probes. Never request a real user's reset email or change a password. */
const assert = require('node:assert/strict');
const WP='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
(async()=>{
  const fake='aqua-recovery-negative-qa-'+Date.now()+'@example.invalid';
  const post=async(url,data)=>{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    return {status:r.status,data:await r.json()};
  };
  const invalidEntry=await post(WP+'/wp-json/custom/v1/lost-password',{user_login:[]});
  assert.equal(invalidEntry.status,400,'WordPress should reject malformed account');
  assert.equal(invalidEntry.data.success,false);
  console.log('RECOVERY_LIVE_BACKEND_INPUT_VALIDATION_PASS');

  // The fabricated address uses the reserved .invalid TLD; no real account and no mail.
  const unknown=await post(WP+'/wp-json/custom/v1/lost-password',{user_login:fake});
  assert.equal(unknown.status,200,'Unknown account should receive privacy-preserving generic response');
  assert.equal(unknown.data.success,true);
  assert(!JSON.stringify(unknown.data).includes(fake),'Unknown account must not be echoed in response');
  console.log('RECOVERY_LIVE_BACKEND_UNKNOWN_ACCOUNT_PRIVACY_PASS');

  const astro=await post(FRONT+'/api/user/lostpass',{user_login:fake});
  assert.equal(astro.status,200,'Astro password request proxy should use WordPress handler');
  assert.equal(astro.data.ok,true);
  console.log('RECOVERY_LIVE_ASTRO_PROXY_PASS');

  const invalidToken={key:'not-a-valid-wordpress-key',login:fake,password:'NoRealPasswordChange123!'};
  const reset=await post(WP+'/wp-json/custom/v1/reset-password',invalidToken);
  assert.equal(reset.status,400,'Invalid reset token must not update a password');
  assert.equal(reset.data.success,false);
  console.log('RECOVERY_LIVE_BACKEND_INVALID_TOKEN_REJECTED_PASS');

  const astroReset=await post(FRONT+'/api/user/resetpass',invalidToken);
  assert.equal(astroReset.status,400,'Astro must reject invalid backend reset token');
  assert.equal(astroReset.data.ok,false);
  console.log('RECOVERY_LIVE_ASTRO_INVALID_TOKEN_REJECTED_PASS');
  console.log('AQUA_PASSWORD_RECOVERY_LIVE_BACKEND_QA_PASS no_real_email=true no_password_change=true');
})().catch(e=>{console.error('AQUA_PASSWORD_RECOVERY_LIVE_BACKEND_QA_FAIL='+String(e.message||e));process.exitCode=1;});
