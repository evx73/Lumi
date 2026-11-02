"""Conservative H5P image matching by exact bytes, then visual similarity.
Never changes the source H5P. Requires Pillow.
"""
import collections, hashlib, io, json, sys, zipfile
from pathlib import Path
from PIL import Image, ImageOps, ImageChops, ImageStat

base=Path(r'C:\Users\evx\Documents\Project\sanmiguelsantacruz\Pictures\2026')
source=Path(sys.argv[1]) if len(sys.argv)>1 else base/'sm22.h5p'
folder=Path(sys.argv[2]) if len(sys.argv)>2 else base
output=Path(sys.argv[3]) if len(sys.argv)>3 else base/'sm22-linked-visual.h5p'
if source.resolve()==output.resolve(): raise SystemExit('Refusing to overwrite source')
exts={'.jpg','.jpeg','.png','.gif','.webp'}
originals=[p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in exts]

def signature(image):
    image=ImageOps.exif_transpose(image).convert('RGB')
    return image.size, image.resize((32,32),Image.Resampling.LANCZOS)

def distance(a,b):
    if a.size!=b.size: return 999
    diff=ImageChops.difference(a,b)
    return sum(ImageStat.Stat(diff).mean)/3

catalog=[]
for p in originals:
    try:
        with Image.open(p) as im: dimensions, thumb=signature(im)
        catalog.append((p,dimensions,thumb,p.stat().st_size))
    except Exception: pass
report={'matched':[],'ambiguous':[],'unmatched':[],'already_linked':0}
with zipfile.ZipFile(source) as archive:
    entries={i.filename:i for i in archive.infolist()}
    params=json.loads(archive.read('content/content.json'))
    def walk(value):
        if isinstance(value,list):
            for child in value: walk(child)
            return
        if not isinstance(value,dict): return
        ref=value.get('path')
        if isinstance(ref,str) and ref.startswith('file:///'): report['already_linked']+=1
        elif isinstance(ref,str) and ref and Path(ref).suffix.lower() in exts:
            member='content/'+ref.lstrip('/')
            if member not in entries: report['unmatched'].append({'reference':ref,'reason':'missing package image'})
            else:
                data=archive.read(member)
                exact=[p for p,dim,thumb,size in catalog if size==len(data) and p.read_bytes()==data]
                if len(exact)==1:
                    winner=exact[0]; method='exact bytes'; score=0
                else:
                    winner=None; method=None; score=None
                    try:
                        with Image.open(io.BytesIO(data)) as im: dimensions,thumb=signature(im)
                        ranked=sorted((distance(thumb,candidate),p,dim) for p,dim,candidate,size in catalog)
                        # Strict similarity and clear separation from runner-up.
                        if ranked and ranked[0][0]<=5 and (len(ranked)==1 or ranked[1][0]-ranked[0][0]>=5):
                            winner=ranked[0][1]; method='visual'; score=round(ranked[0][0],2)
                        elif ranked:
                            report['ambiguous'].append({'reference':ref,'best':[(str(p),round(d,2)) for d,p,dim in ranked[:3]]})
                    except Exception as exc: report['unmatched'].append({'reference':ref,'reason':str(exc)})
                if winner:
                    value['path']=winner.resolve().as_uri()
                    report['matched'].append({'reference':ref,'original':str(winner),'method':method,'distance':score})
        for child in value.values(): walk(child)
    walk(params)
    if report['matched']:
        with zipfile.ZipFile(output,'w') as result:
            for info in archive.infolist():
                data=json.dumps(params,ensure_ascii=False,separators=(',',':')).encode('utf-8') if info.filename=='content/content.json' else archive.read(info.filename)
                result.writestr(info,data)
report_file=output.with_suffix('.match-report.json')
report_file.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'matched':len(report['matched']),'visual':sum(m['method']=='visual' for m in report['matched']),'ambiguous':len(report['ambiguous']),'unmatched':len(report['unmatched']),'output':str(output) if report['matched'] else None,'report':str(report_file)}))
