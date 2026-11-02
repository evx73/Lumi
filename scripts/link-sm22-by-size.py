import collections, hashlib, json, sys, zipfile
from pathlib import Path

base = Path(r'C:\Users\evx\Documents\Project\sanmiguelsantacruz\Pictures\2026')
source = Path(sys.argv[1]) if len(sys.argv)>1 else base/'sm22.h5p'
folder = Path(sys.argv[2]) if len(sys.argv)>2 else base
output = Path(sys.argv[3]) if len(sys.argv)>3 else base/'sm22-linked.h5p'
assert source.resolve()!=output.resolve(), 'Never overwrite source'
images = collections.defaultdict(list)
for p in folder.rglob('*'):
    if p.is_file() and p.suffix.lower() in ('.jpg','.jpeg','.png','.gif','.webp') and not {'sm22','index'}.intersection(x.lower() for x in p.relative_to(folder).parts[:-1]):
        images[p.stat().st_size].append(p)
report={'matched':[], 'ambiguous':[], 'unmatched':[]}
with zipfile.ZipFile(source) as archive:
    entries={i.filename:i for i in archive.infolist()}
    data=json.loads(archive.read('content/content.json'))
    def walk(v):
        if isinstance(v,list):
            for item in v: walk(item)
        if not isinstance(v,dict): return
        ref=v.get('path','')
        if isinstance(ref,str) and ref and not ref.startswith('file:') and Path(ref).suffix.lower() in ('.jpg','.jpeg','.png','.gif','.webp'):
            member='content/'+ref.lstrip('/')
            if member not in entries: report['unmatched'].append(ref)
            else:
                candidates=images[entries[member].file_size]
                if len(candidates)>1:
                    digest=hashlib.sha256(archive.read(member)).digest()
                    candidates=[p for p in candidates if hashlib.sha256(p.read_bytes()).digest()==digest]
                if len(candidates)==1:
                    v['path']=candidates[0].resolve().as_uri()
                    report['matched'].append({'reference':ref,'original':str(candidates[0])})
                elif candidates: report['ambiguous'].append({'reference':ref,'candidates':[str(p) for p in candidates]})
                else: report['unmatched'].append(ref)
        for child in v.values(): walk(child)
    walk(data)
    if report['matched']:
        with zipfile.ZipFile(output,'w') as result:
            for entry in archive.infolist():
                content=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode() if entry.filename=='content/content.json' else archive.read(entry.filename)
                result.writestr(entry,content)
report_file=output.with_suffix('.match-report.json')
report_file.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'matched':len(report['matched']),'ambiguous':len(report['ambiguous']),'unmatched':len(report['unmatched']),'output':str(output) if report['matched'] else None,'report':str(report_file)}))
