const base=(process.env.APP_URL||'').replace(/\/$/,'');
const secret=process.env.JOB_SECRET||'';
if(!base||!secret){console.error('APP_URL veya JOB_SECRET eksik.');process.exit(1);}
fetch(`${base}/api/jobs/check-alarms`,{method:'POST',headers:{'x-job-secret':secret}})
  .then(async r=>{const t=await r.text();console.log(r.status,t);if(!r.ok)process.exitCode=1;})
  .catch(e=>{console.error(e);process.exitCode=1;});
