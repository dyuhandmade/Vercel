from PIL import Image,ImageDraw
from pathlib import Path
files=list(Path('qa/references').glob('atelier-*.png'));sheet=Image.new('RGB',(1440,320*((len(files)+2)//3)),'#ddd')
for i,p in enumerate(sorted(files)):
 im=Image.open(p);im.thumbnail((460,285));sheet.paste(im,((i%3)*480+10,(i//3)*320+25));ImageDraw.Draw(sheet).text(((i%3)*480+10,(i//3)*320+5),p.name,fill='black')
sheet.save('qa/references/overview-rendered.jpg')
