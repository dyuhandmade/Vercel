from pathlib import Path
import zipfile
from pypdf import PdfReader
from PIL import Image,ImageOps,ImageDraw
out=Path('qa/references')
with zipfile.ZipFile(r'C:\Users\ASUS\Downloads\DYU_Handmade_Product_Requirements_Document_PRD.docx') as z:
    files=[n for n in z.namelist() if n.startswith('word/media/')]
    thumbs=[]
    for n in files:
        p=out/Path(n).name;p.write_bytes(z.read(n))
        try:
            im=Image.open(p);im.thumbnail((380,300));tile=Image.new('RGB',(400,335),'white');tile.paste(im,((400-im.width)//2,25));ImageDraw.Draw(tile).text((10,5),p.name,fill='black');thumbs.append(tile)
        except: pass
    sheet=Image.new('RGB',(1600,335*((len(thumbs)+3)//4)),'#ddd')
    for i,im in enumerate(thumbs):sheet.paste(im,((i%4)*400,(i//4)*335))
    sheet.save(out/'prd-contact.jpg')
doc=PdfReader(r'C:\Users\ASUS\Downloads\The_Digital_Atelier.pdf');print('Overview pages:',len(doc.pages))
text=[];thumbs=[]
for i,p in enumerate(doc.pages):
    text.append(f'PAGE {i+1}\n'+p.extract_text())
    for j,img in enumerate(p.images):
        dest=out/f'overview-{i+1}-{j}.png';img.image.save(dest)
        im=img.image.copy();im.thumbnail((460,290));tile=Image.new('RGB',(480,320),'white');tile.paste(im,((480-im.width)//2,25));ImageDraw.Draw(tile).text((10,5),str(i+1),fill='black');thumbs.append(tile)
(out/'overview.txt').write_text('\n'.join(text),encoding='utf-8')
sheet=Image.new('RGB',(1440,320*((len(thumbs)+2)//3)),'#ddd')
for i,im in enumerate(thumbs):sheet.paste(im,((i%3)*480,(i//3)*320))
if thumbs:sheet.save(out/'overview-contact.jpg')
print('\n'.join(text))
