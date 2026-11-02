import * as fs from 'fs-extra';
import * as path from 'path';
import { randomBytes } from 'crypto';

/** Casual visitor-key gate for GitHub Pages, not server-side access control. */
export default async function protectHtmlExport(filePath: string): Promise<void> {
  const original = await fs.readFile(filePath, 'utf8');
  const filename = `content-${randomBytes(18).toString('hex')}.html`;
  const destination = path.join(path.dirname(filePath), filename);
  // Keep media paths relative to the same export directory.
  await fs.writeFile(destination, original, 'utf8');
  const gate = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>SM22</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:none}</style></head><body><iframe id="content" title="Presentation"></iframe><script>
(async()=>{const deny=()=>location.replace('https://evx73.github.io/sm22/404.html');const key=new URLSearchParams(location.search).get('key');if(!key){deny();return;}try{const r=await fetch('https://lumi-visitor-gate.evx73.workers.dev',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,page:location.pathname})});if(!r.ok){deny();return;}const frame=document.getElementById('content');frame.src=${JSON.stringify('./'+filename)};frame.style.display='block';}catch(e){deny();}})();
</script></body></html>`;
  await fs.writeFile(filePath, gate, 'utf8');
  // Clean up only old generated content files after the new gate is safely written.
  // Restrict deletion to this export directory and the generated naming convention.
  const directory = path.dirname(filePath);
  const entries = await fs.readdir(directory);
  for (const entry of entries) {
    if (/^content-[a-f0-9]{36}\.html$/.test(entry) && entry !== filename) {
      await fs.remove(path.join(directory, entry));
    }
  }
}
