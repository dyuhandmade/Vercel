from pathlib import Path
p=Path('scripts/inspect-references.py');s=p.read_text(encoding='utf-8-sig').replace('import zipfile, fitz','import zipfile\nfrom pypdf import PdfReader')
s=s[:s.index("doc=fitz.open")]+'''doc=PdfReader(r'C:\\Users\\ASUS\\Downloads\\The_Digital_Atelier.pdf');print('Overview pages:',len(doc.pages))
text=[];thumbs=[]
for i,p in enumerate(doc.pages):
    text.append(f'PAGE {i+1}\\n'+p.extract_text())
    for j,img in enumerate(p.images):
        dest=out/f'overview-{i+1}-{j}.png';img.image.save(dest)
        im=img.image.copy();im.thumbnail((460,290));tile=Image.new('RGB',(480,320),'white');tile.paste(im,((480-im.width)//2,25));ImageDraw.Draw(tile).text((10,5),str(i+1),fill='black');thumbs.append(tile)
(out/'overview.txt').write_text('\\n'.join(text),encoding='utf-8')
sheet=Image.new('RGB',(1440,320*((len(thumbs)+2)//3)),'#ddd')
for i,im in enumerate(thumbs):sheet.paste(im,((i%3)*480,(i//3)*320))
if thumbs:sheet.save(out/'overview-contact.jpg')
print('\\n'.join(text))
'''
p.write_text(s,encoding='utf-8')
