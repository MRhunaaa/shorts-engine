import sys,glob,re
from PIL import Image,ImageDraw
fs=sorted(glob.glob(sys.argv[1]+'*.jpg'),key=lambda p:int(re.findall(r'(\d+)\.jpg',p)[0]))
w,h=270,480; cols=5; rows=(len(fs)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),'black'); d=ImageDraw.Draw(S)
for i,f in enumerate(fs):
    im=Image.open(f).resize((w,h)); S.paste(im,((i%cols)*w,(i//cols)*h)); d.text(((i%cols)*w+6,(i//cols)*h+6),re.findall(r'(\d+)\.jpg',f)[0],fill='yellow')
S.save(sys.argv[2],quality=88)
