"""Manage visitor links and access reports for the deployed Cloudflare D1 database."""
import json, os, secrets, shutil, subprocess, sys
from pathlib import Path

root=Path(__file__).parent

def sql(query):
    npx = 'npx.cmd' if os.name == 'nt' else 'npx'
    p=subprocess.run([npx,'--yes','wrangler','d1','execute','lumi-visitors','--remote','--json','--command='+query],cwd=root,capture_output=True,text=True,encoding='utf-8',errors='replace')
    if p.returncode: raise SystemExit(p.stderr or p.stdout)
    try:
        response=json.loads(p.stdout[p.stdout.find('['):])
        return response[0].get('results',[])
    except Exception: print(p.stdout); return []

def quoted(s): return "'"+s.replace("'","''")+"'"

if len(sys.argv)<2:
    raise SystemExit('Usage: py visitors.py add "Name" | list | visits | summary | disable KEY')
cmd=sys.argv[1]
if cmd=='add' and len(sys.argv)==3:
    name=sys.argv[2]; key=secrets.token_urlsafe(24)
    sql('INSERT INTO visitors (key,name) VALUES ('+quoted(key)+','+quoted(name)+')')
    print(name+': https://evx73.github.io/sm22/?key='+key)
elif cmd=='list':
    for v in sql('SELECT name,key,active FROM visitors ORDER BY name'): print(v['name'], 'ACTIVE' if v['active'] else 'DISABLED',v['key'])
elif cmd=='visits':
    for v in sql('SELECT v.name,l.page,l.visited_at FROM visits l JOIN visitors v ON v.key=l.key ORDER BY l.id DESC LIMIT 100'): print(v['visited_at'],v['name'],v['page'])
elif cmd=='summary':
    for v in sql('SELECT v.name,COUNT(l.id) AS visits,MAX(l.visited_at) AS last_visit FROM visitors v LEFT JOIN visits l ON l.key=v.key GROUP BY v.key ORDER BY last_visit DESC'): print(v['name'],v['visits'],v['last_visit'] or 'Never')
elif cmd=='disable' and len(sys.argv)==3:
    sql('UPDATE visitors SET active=0 WHERE key='+quoted(sys.argv[2])); print('Key disabled')
else: raise SystemExit('Usage: py visitors.py add "Name" | list | visits | summary | disable KEY')
