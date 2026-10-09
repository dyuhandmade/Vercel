from pathlib import Path
import re, json
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.utils import ImageReader
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/DYU-Provisional-Handover-Report.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, file in [('Sans','arial.ttf'),('SansBold','arialbd.ttf'),('Display','georgia.ttf'),('Mono','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/' + file))
pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='SansBold', italic='Sans', boldItalic='SansBold')
W,H=A4
M=42
CW=W-2*M
FOREST=HexColor('#293d2d'); INK=HexColor('#27372d'); MUTED=HexColor('#657061')
SAGE=HexColor('#718063'); CREAM=HexColor('#f9f7f1'); PALE=HexColor('#e9eddf')
LINE=HexColor('#d8ddce'); AMBER=HexColor('#a06b2f'); AMBER_PALE=HexColor('#f6edde')
c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1)
c.setTitle('DYUhandmade | Provisional Project Handover Report')
c.setAuthor('DYUhandmade project handover')
c.setSubject('Pre-launch technical handover, audit evidence and pending final acceptance | 4 October 2026')
pages=[]

def clean(s):
    return s.replace('\u2014',' - ').replace('\u2013','-').replace('\u2011','-').replace('\u2019',"'").replace('\u2018',"'").replace('\u201c','"').replace('\u201d','"')

def P(text, x, top, width, size=10.3, leading=15, color=INK, font='Sans', markup=False):
    text=clean(text)
    if not markup: text=escape(text).replace('\n','<br/>')
    p=Paragraph(text, ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,textColor=color,spaceAfter=0))
    _,h=p.wrap(width,H)
    limit=H-12 if top>=H-60 else H-60
    assert top+h < limit, (pages[-1] if pages else 'cover',text[:65],top,h)
    p.drawOn(c,x,H-top-h)
    return top+h

def rect(x,top,w,h,fill=white,stroke=None,r=0):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    if r:c.roundRect(x,H-top-h,w,h,r,fill=1,stroke=bool(stroke))
    else:c.rect(x,H-top-h,w,h,fill=1,stroke=bool(stroke))

def line(x1,t1,x2,t2,color=LINE,width=.7):
    c.setStrokeColor(color);c.setLineWidth(width);c.line(x1,H-t1,x2,H-t2)

def begin(title,kicker='PROVISIONAL HANDOVER',sub=None):
    if pages:c.showPage()
    pages.append(title)
    c.bookmarkPage('p'+str(len(pages)))
    c.addOutlineEntry(title,'p'+str(len(pages)),level=0)
    rect(0,0,W,H,CREAM)
    P('DYUhandmade',M,25,200,10,12,FOREST,'SansBold')
    c.setFillColor(MUTED);c.setFont('Sans',8);c.drawRightString(W-M,H-34,'04 OCT 2026  |  REVIEW ISSUE 1.0')
    line(M,47,W-M,47)
    P(kicker,M,65,CW,8,11,SAGE,'SansBold')
    end=P(title,M,88,CW,25,30,FOREST,'Display')
    if sub:end=P(sub,M,end+11,CW,10.3,15,MUTED)
    line(M,H-37,W-M,H-37)
    P('Provisional - pending final acceptance',M,H-29,350,7.4,9,MUTED)
    c.setFont('SansBold',8);c.setFillColor(MUTED);c.drawRightString(W-M,20,f'{len(pages):02d}')
    return end+23

def source(ids):
    P('Evidence: '+ids+'  |  See evidence index.',M,H-53,CW,7.1,9,MUTED)

def heading(text,top,x=M,w=CW,size=13):
    return P(text,x,top,w,size,size+4,FOREST,'SansBold')+8

def bullet(text,top,x=M,w=CW,size=10.3):
    c.setFillColor(SAGE);c.circle(x+3,H-top-7,2,fill=1,stroke=0)
    return P(text,x+14,top,w-14,size,15)+9

def note(title,text,top,x=M,w=CW,amber=False):
    bg=AMBER_PALE if amber else PALE
    st=ParagraphStyle('n',fontName='Sans',fontSize=10,leading=14,textColor=INK)
    pp=Paragraph(escape(clean(text)),st);_,hh=pp.wrap(w-28,H)
    ht=hh+49
    rect(x,top,w,ht,bg,r=8)
    P(title,x+14,top+12,w-28,10,13,AMBER if amber else FOREST,'SansBold')
    P(text,x+14,top+34,w-28,10,14)
    return top+ht+16

def shot(path,x,top,w,h,caption=None,crop_top=False):
    path=ROOT/path
    assert path.exists(),path
    iw,ih=Image.open(path).size
    if crop_top:
        sh=w*ih/iw
        c.saveState();p=c.beginPath();p.rect(x,H-top-h,w,h);c.clipPath(p,stroke=0)
        c.drawImage(ImageReader(str(path)),x,H-top-sh,width=w,height=sh,mask='auto')
        c.restoreState();used=h
    else:
        scale=min(w/iw,h/ih);dw=iw*scale;dh=ih*scale
        c.drawImage(ImageReader(str(path)),x+(w-dw)/2,H-top-dh,width=dw,height=dh,mask='auto');used=dh
    c.setStrokeColor(LINE);c.setLineWidth(.6);c.rect(x,H-top-used,w,used,fill=0,stroke=1)
    if caption:P(caption,x,top+used+7,w,8.2,11,MUTED)
    return top+used+(38 if caption else 0)

def table(headers,rows,widths,top,size=9.4):
    style=ParagraphStyle('cell',fontName='Sans',fontSize=size,leading=size+3,textColor=INK)
    hs=ParagraphStyle('hc',fontName='SansBold',fontSize=size,leading=size+3,textColor=white)
    def cell(t,s):return Paragraph(escape(clean(str(t))).replace('\n','<br/>'),s)
    data=[[cell(h,hs) for h in headers]]+[[cell(v,style) for v in row] for row in rows]
    tb=Table(data,colWidths=widths,hAlign='LEFT')
    tb.setStyle(TableStyle([
      ('BACKGROUND',(0,0),(-1,0),FOREST),('VALIGN',(0,0),(-1,-1),'TOP'),
      ('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#f0f1e9')]),
      ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
      ('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),
      ('LINEBELOW',(0,0),(-1,0),.8,FOREST),('LINEBELOW',(0,1),(-1,-1),.4,LINE)
    ]))
    _,hh=tb.wrap(CW,H)
    assert top+hh<H-62,(pages[-1],top,hh)
    tb.drawOn(c,M,H-top-hh)
    return top+hh+16

def card(value,label,x,top,w,detail=None):
    ht=104 if detail else 82
    rect(x,top,w,ht,PALE,r=7)
    P(value,x+14,top+10,w-28,28,33,FOREST,'Display')
    P(label,x+14,top+48,w-28,9,12,FOREST,'SansBold')
    if detail:P(detail,x+14,top+72,w-28,8,11,MUTED)

def arrow(x1,t1,x2,t2,color=SAGE):
    line(x1,t1,x2,t2,color,1.25)
    import math
    a=math.atan2(t2-t1,x2-x1)
    for d in [-.5,.5]:line(x2,t2,x2-7*math.cos(a+d),t2-7*math.sin(a+d),color,1.25)

def node(title,desc,x,top,w,h=70,color=PALE):
    rect(x,top,w,h,color,r=8)
    P(title,x+12,top+11,w-24,11,14,FOREST,'SansBold')
    P(desc,x+12,top+32,w-24,9,12,MUTED)

# 01 - Cover
begin('Provisional Project\nHandover Report','DYUHANDMADE DIGITAL STOREFRONT')
P('Pre-launch technical handover and acceptance review',M,166,CW,13,18,MUTED)
shot('qa/frontend-handover/home-1440-top.png',M,210,CW,360)
P('Website, customer accounts, Shopify content, security and operational readiness',M,584,CW,16,22,FOREST,'Display')
P('Prepared for the DYUhandmade project owner and deployment team. This report records delivered work and supporting evidence, while keeping unfinished business and launch requirements explicit.',M,649,CW,11,16)
rect(M,715,CW,46,PALE,r=7)
P('STATUS: TECHNICAL HANDOVER PREPARED',M+13,726,CW-26,10,14,FOREST,'SansBold')
P('Final acceptance and public launch remain pending.',M+13,743,CW-26,9,12,MUTED)
source('E01, E04. Cover image is a storefront screenshot with illustrative hero artwork')

# 02 - Executive summary
y=begin('Where the project stands','01 / DELIVERY SUMMARY','A functioning custom storefront and account foundation, with traceable checks and clearly identified launch gates.')
gap=12;cw=(CW-2*gap)/3
for i,args in enumerate([('161','Shopify content entries','Expected editor entries found'),('27','Published products','27 variants; 154 media images'),('308','Responsive layouts','77 routes across four widths')]):card(*args[:2],M+i*(cw+gap),y,cw,args[2])
y+=126
y=table(['Workstream','Current status'],[
 ('Storefront & content','Implemented and locally verified. Public pages, catalogue, editorial content, responsive layouts and 3D/product galleries are present.'),
 ('Customer accounts','Live Shopify login and account reads verified. Wishlist persistence tested live; profile/address edits and populated order UI tested with fixtures.'),
 ('Shopify administration','Branding, contact policy and catalogue presentation updated using existing assets and facts.'),
 ('Backend & quality','Security/input fixes, production build, Node 24 compatibility checks and documented CI/deployment preparation completed.'),
 ('Public commerce','Not launch-ready. Paused Shopify selling plan, business approvals, permanent hosting and a completed no-charge order test remain open.')
 ],[128,CW-128],y,9.5)
y=note('How to read this report','Verified means supported by a saved audit or receipt in the stated environment. Prepared means files or configuration guidance exist. Pending means a decision or live validation is still required. No overall completion percentage is assigned.',y)
P('Navigation: experience 4-7  |  Shopify editing 8-9  |  verification 10-12  |  operations and acceptance 13-16',M,y,CW,9,13,MUTED)
source('E01-E06, E09-E11')

# 03 - Architecture
y=begin('How the system fits together','02 / ARCHITECTURE','Shopify is the system of record. The custom Next.js application provides the storefront and server API layer.')
node('Shopper browser','Public pages, cart UI, account UI\nGuest favourites and history',M,y,202,77)
node('Merchant in Shopify','Products, media, collections\nWebsite content and policies',W-M-202,y,202,77)
arrow(M+101,y+77,M+101,y+104)
arrow(W-M-101,y+77,W-M-101,y+104)
node('Next.js server','Rendering, account sessions, validation, cart/checkout APIs',M,y+104,202,88)
node('Shopify APIs + content','Storefront API, Customer Account API and hosted checkout',W-M-202,y+104,202,88)
arrow(M+205,y+146,W-M-205,y+146)
y+=217
y=table(['Data or capability','Authoritative location / boundary'],[
 ('Products and orders','Shopify owns catalogue, variants, stock, customer records, addresses and order data.'),
 ('Website copy and imagery','Shopify website-content metaobjects plus native product, collection and policy records.'),
 ('Signed-in wishlist','Customer metafield dyu.wishlist. Guest product handles merge after login.'),
 ('Recent browsing history','Browser-local storage only; it does not synchronise across devices.'),
 ('Authentication','Server-validated Shopify OAuth. Encrypted HttpOnly cookies; tokens are not exposed to client JavaScript.'),
 ('Payments','Shopify-hosted checkout and the merchant payment provider. The app does not receive card details.'),
 ('Application database','No separate database is provisioned. Initial deployment supports one persistent Node process.')
 ],[132,CW-132],y,9.4)
P('Stack snapshot: Next.js 16.3.8, React 19.3.0, TypeScript 7.0.2, Three.js 0.186.0 and Playwright 1.63.0. These are the installed project versions, not a claim that they are the latest releases.',M,y,CW,9,13,MUTED)
source('E01, E03, E12, E14')

# 04 - Storefront
y=begin('The storefront experience','03 / EXPERIENCE DELIVERY','The desktop and mobile experience share the same catalogue, brand language and shopping actions.')
shot('qa/frontend-handover/home-1440-top.png',M,y,348,245,'Desktop homepage: four-slide hero, navigation and 3D invitation. [S01]')
shot('qa/frontend-handover/home-390-top.png',M+366,y,CW-366,375,'390px mobile view. [S02]')
left=y+293
left=heading('Delivered interactions',left,w=342)
for t in ['Four editable hero slots with pause and slide controls; reduced motion stops autoplay.','Responsive navigation, search, product filtering/sorting and quick-add controls.','Product availability and prices come from Shopify; sold-out states remain visible.']:
    left=bullet(t,left,w=342,size=10)
y=max(left,y+414)+8
y=note('Responsive evidence','The crawl checked 320, 390, 768 and 1440px widths. No horizontal overflow or broken rendered images was found across the 308 audited layouts. These checks do not certify physical devices or all browsers.',y)
P('Product discovery also includes category heroes, featured collections, ingredient exploration, story/making pages, FAQs and the journal. Header, footer and selected navigation copy are exposed through Shopify content entries.',M,y,CW,10.3,15)
source('E02, E04, E09; screenshot snapshots from the local audit')

# 05 - Product experience
y=begin('Product imagery and 3D','04 / PRODUCT PRESENTATION','Native product photographs remain the source for gallery content and image-derived previews.')
y=shot('qa/product-gallery-split-desktop.png',M,y,CW,280,'Photo/3D split-view screenshot. The approximation disclosure is part of the product experience. [S03]')
y=table(['Delivered','Behavior and practical limits'],[
 ('Product gallery','Native photographs, thumbnails, image navigation and a 3D viewing option. Shopify media order is preserved.'),
 ('Image-derived models','Soap, bottle and container forms use the product imagery. Sides and depth are inferred; previews are not manufacturing-accurate scans.'),
 ('Performance and access','Three.js loads on demand where supported. Demand rendering and reduced-motion behavior limit unnecessary animation.'),
 ('Purchase controls','Single-option products no longer show Shopify\'s internal Default Title. Pending and sold-out actions are guarded.'),
 ('Description formatting','Shopify paragraphs, line breaks and lists remain readable as escaped display text. Merchant copy and plain SEO/search descriptions are preserved.')
 ],[130,CW-130],y,9.4)
P('Preserved: product IDs, handles, prices, inventory, image URLs and ordering. Existing benefit and suitability claims were retained, not independently substantiated.',M,y,CW,9.2,13,MUTED)
source('E01-E04, E08, E10, E14')

# 06 - Editorial
y=begin('Editorial content and typography','05 / CONTENT PRESENTATION','Unintended line breaks and punctuation were corrected while preserving deliberate editorial styling.')
y=shot('qa/handover/final-journal.png',M,y,CW,270,'Wide journal viewport excerpt: “A pause for perspective.” fits one line when the layout has room. [S04]',crop_top=True)
shot('qa/frontend-handover/journal-390-top.png',M,y,130,248,'Responsive mobile wrapping. [S05]')
tx=M+151;tw=CW-151
yy=heading('What changed',y,x=tx,w=tw)
for t in ['The forced break was removed; inline italic emphasis remains. Narrow layouts wrap naturally.','Journal categories, search, articles and onward-reading panels are implemented.','Product punctuation and separator spacing were corrected where the intent was unambiguous.','Branded spellings such as Lavendar and Trip were preserved for merchant review.']:
    yy=bullet(t,yy,x=tx,w=tw,size=9.7)
source('E02, E04, E08; journal and typography audit screenshots')

# 07 - Accounts
y=begin('Customer accounts','06 / ACCOUNT DELIVERY','Passwordless Shopify login connects a personal account area with saved products and order access.')
shot('qa/account-ui/overview-1440.png',M,y,CW,240,'Representative authenticated UI using test fixtures (Mira / example.test). No real customer or completed order is shown. [S06]',crop_top=True)
y+=284
y=table(['Feature','Delivered behavior','Evidence level'],[
 ('Sign in / sign out','Shopify email-code login; secure callback/session and logout handling.','Live login verified'),
 ('Overview and orders','Account overview, order list, pagination and order details.','Live empty read; populated fixtures'),
 ('Profile and addresses','Name/address management; email and phone updates remain in Shopify\'s hosted portal.','Live reads; writes mocked'),
 ('Wishlist','Guest persistence, merge after login, signed-in add/remove and persistence.','Live round trip verified'),
 ('Recently viewed','Local browsing history with clear controls.','Automated coverage'),
 ('Session expiry','Private UI clears on expiry/sign-out; cross-tab logout clears saved account state.','Automated coverage')
 ],[99,265,CW-364],y,8.9)
P('The live test account had no previous orders. Order lifecycle, refunds, live profile/address changes, live token refresh and two-customer isolation still need final acceptance checks.',M,y,CW,9.6,14,AMBER)
source('E01-E03, E05-E07; fixture screenshot source S06')

# 08 - Editing
y=begin('Editing the website in Shopify','07 / MERCHANT GUIDE','Content → Metaobjects → DYU • Website content is the main editor for this custom storefront. Keep entry handles stable.')
labels=['home-hero','Hero slide 2','Hero slide 3','Hero slide 4']
bw=(CW-30)/4
for i,label in enumerate(labels):
    node(label,'Image + optional\ncopy / mobile art',M+i*(bw+10),y,bw,72)
y+=89
y=table(['Website area','Where to edit','What the control changes'],[
 ('Hero banner','home-hero + home-hero-slide-2/3/4','Images, alt text, crop, order, visibility and supported text/buttons. Blank text on slides 2-4 inherits from slide 1.'),
 ('Autoplay / sections','home-hero; home-layout; section enabled','Autoplay, 2-20 second timing, supported section order and visibility.'),
 ('Category / collection hero','shop-hero[-category]; native Collections; collection-[handle]','Uploaded artwork, selected product, image/3D mode, collection title and introduction.'),
 ('Product pages','Products + dyu metafields; product-* entries','Media, prices, variants, native descriptions, ingredients, usage/care and shared panel text.'),
 ('Editorial / support','story-*, craft-*, ritual*, journal-*, article-*, faq-*','Story, making, rituals, article bodies, imagery, categories, supported ordering and FAQs.'),
 ('Header / footer / logo','announcement, brand, nav-*, header-*, footer*, site-seo','Selected site navigation, logo, sharing defaults and common content.'),
 ('Store policies','Settings → Policies','Native policy records take precedence over section fallback text.')
 ],[100,165,CW-265],y,8.7)
y=note('Limits that matter','The four hero slots are wired explicitly; a fifth needs development. Typography, colours, 3D geometry, secure account messages and layout remain code-managed. Shopify Theme Customizer controls a separate theme. Native Brand colours do not recolour this custom Next.js site.',y)
P('Save, then check the preview after roughly two minutes and subsequent requests. A signed cache webhook can refresh sooner when configured; none was registered in this audit. Blank fields inherit defaults; use supported visibility switches to hide content.',M,y,CW,9.3,13)
source('E04, E09, E14. Full field map remains in README.md')

# 09 - Shopify changes
y=begin('Shopify changes completed','08 / LIVE ADMINISTRATION','Changes used the existing brand assets and established store facts. Billing, stock, tax and payment settings were preserved.')
shot('qa/handover/shopify-brand-settings.jpg',M,y,168,288,'Saved native brand settings. [S07]')
tx=M+189;tw=CW-189
yy=heading('Saved and verified',y,x=tx,w=tw)
for t in ['Store display name: My Store → DYUhandmade. Legal entity details were preserved.','Default logo, forest/cream palette, existing slogan and short description added to Shopify Brand settings.','The website brand content entry now references the same uploaded logo, so the site image is Shopify-editable.','Contact information policy published from existing public details. Automated privacy policy preserved.']:
    yy=bullet(t,yy,x=tx,w=tw,size=9.5)
y=max(y+330,yy)+11
y=shot('qa/handover/featured-collection.jpg',M,y,CW,190,'Featured collection: customer-facing title, factual introduction and the existing Damask Rose product photograph. [S08]')
P('The collection URL, membership, publications and sorting were retained. This is a presentation update, not a change to the catalogue structure.',M,y,CW,9.5,14)
source('E08, E11; native Brand and website-content controls are separate')

# 10 - Catalogue quality
y=begin('Catalogue quality and cleanup','09 / CATALOGUE AUDIT','The audit separated safe copy cleanup from product facts that require merchant approval.')
card('154 / 154','Product images now have alt text',M,y,248,'Labels identify product and gallery position')
card('26 / 27','Native product descriptions',M+263,y,CW-263,'Moringa Facial Oil remains incomplete')
y+=126
y=heading('Native product-image alt labels',y)
for label,val,top in [('Before cleanup',0,y),('After cleanup',154,y+35)]:
    P(label,M,top,130,10,14)
    rect(M+140,top+2,280,15,LINE,r=3)
    if val:rect(M+140,top+2,280*val/154,15,SAGE,r=3)
    P(str(val)+' / 154',M+432,top,CW-432,10,14,FOREST,'SansBold')
y+=84
y=table(['Verified cleanup','Count / preserved boundary'],[
 ('Native title spacing','4 fields corrected across the cleanup set.'),
 ('Native description punctuation','3 fields corrected; 6 products affected by title/description cleanup.'),
 ('Related short stories','2 fields corrected to match established native wording.'),
 ('Product imagery','154 previously empty native alt fields filled. These are identity labels, not individually authored scene descriptions.'),
 ('Catalogue references','Product handles, prices, inventory, image sequence and native product image URLs preserved.'),
 ('Content editor inventory','161 expected website-content entries found, with no unresolved image references at verification.')
 ],[156,CW-156],y,9.3)
y=note('Merchant content still required','Moringa lacks a native description and short story. Complete approved ingredients, directions, care and claims are still needed. Possible duplicate Ubtan listings and deliberate product naming remain unchanged. Only 1 of 27 variants was available via Storefront; this does not establish the stock quantity or reason for unavailability.',y,amber=True)
source('E04, E08, E09. Initial audit counts are historical; follow-up receipts take precedence')

# 11 - QA
y=begin('Verification and test evidence','10 / QUALITY ASSURANCE','Results are grouped by environment. Overlapping suites are not added into a single pass total.')
for i,width in enumerate([320,390,768,1440]):
    ww=(CW-27)/4;x=M+i*(ww+9)
    rect(x,y,ww,69,PALE,r=6)
    P(str(width)+'px',x+10,y+9,ww-20,17,22,FOREST,'SansBold')
    P('77 route layouts',x+10,y+39,ww-20,9,12,MUTED)
y+=88
P('308 layouts: 0 horizontal-overflow findings, broken rendered images, broken internal navigation or runtime errors in the stable-source crawl. Five missing-route recovery cases were also checked.',M,y,CW,10.1,15)
y+=61
y=table(['Evidence group','Result','Environment / limit'],[
 ('Core suite','86 / 86 passed','Windows, bundled Node 24.19.0. Offline fixtures; no Shopify access.'),
 ('Account/API subset','9 / 9 passed','Windows Node 25.2.1; existing local server. Account writes mocked.'),
 ('Health-probe tests','5 / 5 passed','Node 24.19.0. Local probe logic, not hosted monitoring.'),
 ('Final built-preview regression','4 / 4 passed','Two pointer + two description-layout checks; cart requests mocked.'),
 ('Anonymous preview inspection','12 check records passed','Real built app: private paths, anonymous account-access protection, health and preview indexing.'),
 ('Metadata follow-up','24 / 24 passed','Description/status/preview-robots/canonical rechecks after the initial crawl.'),
 ('Build / TypeScript','Passed','Local production build; Node 24 follow-up typecheck. No hosted Linux build verified.')
 ],[150,89,CW-239],y,8.9)
y=note('Residual observation and coverage limits','One development run saw a Next router-initialization error. Repeated focused and production checks passed, but its original caller is unresolved; stack capture remains. The broad suite needed focused repairs/rechecks, not one uninterrupted green run. Physical devices, Safari/Firefox and formal assistive-technology certification remain unverified.',y,amber=True)
source('E02, E05, E06, E10. Tests are evidence of the stated checks, not a security or accessibility certification')

# 12 - Security
y=begin('Backend and data safeguards','11 / SECURITY REVIEW','Implemented controls protect API inputs, customer sessions, private responses and Shopify integration boundaries.')
nw=(CW-30)/4
for i,(t,d) in enumerate([('Origin','Reject cross-site\nmutations'),('Input','Bounded bodies\nand valid IDs'),('Session','Shopify customer\nownership'),('Response','Private/no-store\nand safe errors')]):
    node(t,d,M+i*(nw+10),y,nw,71)
y+=91
y=table(['Area','Implemented and reviewed behavior'],[
 ('Login and session','PKCE, state, nonce and signed-token validation. Encrypted HttpOnly cookies; Secure and __Host- on HTTPS. Server-side token refresh.'),
 ('Request validation','Streaming input reader rejects oversized/chunked or malformed bodies. Cart/account JSON capped at 20,000 bytes; webhooks at 4 MiB.'),
 ('Account ownership','Customer token scopes account access. Callers cannot supply arbitrary customer ownership IDs for profile, addresses or wishlist.'),
 ('Cart / checkout','Allowed actions, IDs and quantities validated. Fresh checkout URL requested after buyer identity is rebound or cleared for a guest.'),
 ('Wishlist consistency','Malformed/over-capacity stored lists are rejected before write; compare-digest retries protect concurrent updates.'),
 ('Cache webhook','HMAC checked against bounded exact raw bytes. Cache invalidation cannot create orders or settle payments.'),
 ('Readiness and diagnostics','Health returns 503 when catalogue readiness fails. Errors are bounded/redacted; authentication tokens are never exposed to client JavaScript.')
 ],[129,CW-129],y,9.1)
y=note('Scope of this assurance','The scoped review left no confirmed P0/P1 issue, but it is not a penetration-test certificate. Source/bundle checks and anonymous endpoint tests do not replace live two-customer isolation, refresh, host/proxy or payment acceptance. Horizontal scaling requires shared refresh coordination or a revised session design.',y)
source('E03, E05, E06, E10, E12')

# 13 - Commerce
y=begin('Checkout: verified up to handoff','12 / COMMERCE READINESS','A real Shopify cart was exercised without submitting an order or entering payment details.')
steps=[('1','Add item','INR 449'),('2','Quantity 2','INR 898'),('3','Checkout','Handoff reached'),('4','Order','Blocked by plan')]
sw=(CW-30)/4
for i,(n,t,d) in enumerate(steps):
    node(n+'  '+t,d,M+i*(sw+10),y,sw,64,AMBER_PALE if i==3 else PALE)
y+=86
shot('qa/handover/plan-options.jpg',M,y,172,294,'Observed plan selector; no plan purchased. [S09]')
xx=M+194;ww=CW-194
yy=heading('Store configuration',y,x=xx,w=ww)
for t in ['Current plan: Pause and Build, INR 680/month. Checkout displayed that the store is not set up to receive orders.','Basic was offered at INR 1,994/month. No free selling option was shown. Final bill, tax or proration was not verified.','India Standard shipping: free. International Standard: INR 1,700 for a 28-country zone, subject to market activation.','India Manual Tax is configured; prices exclude tax. Registration, classification and destination totals still need merchant verification.']:
    yy=bullet(t,yy,x=xx,w=ww,size=9.5)
y=max(yy,y+331)+5
y=note('Test state restored','The test bag was emptied and the test wishlist restored. No order, charge, settlement, refund or fulfillment was completed. A working account screen and checkout handoff are not proof of a completed purchase.',y,amber=True)
P('Razorpay was explicitly excluded from follow-up work. No provider installation, activation or payment configuration was performed. Final payment acceptance belongs to the merchant-approved test process after checkout is enabled.',M,y,CW,10,15)
source('E01, E07, E10, E11. Shipping/tax entries are observed settings, not a compliance assessment')

# 14 - Operations
y=begin('Deployment and operations','13 / DEVELOPER HANDOVER','Deployment preparation is delivered. The current HTTPS preview is temporary and runs from the workstation.')
y=table(['Prepared asset','Use during deployment'],[
 ('docs/deployment.md','Host selection, environment injection, single-process setup, cutover, verification and rollback.'),
 ('deploy/dyu.service','Optional Linux service template with restart/shutdown behavior; not installed.'),
 ('deploy/nginx.conf.template','Optional trusted HTTPS proxy, body/rate controls and restricted logging; not deployed or target-validated.'),
 ('deploy/healthcheck.mjs','Bounded anonymous readiness probe. Five logic tests pass; no recurring monitor was created.'),
 ('.env.example','Variable names and purposes. Actual secrets must be transferred through secure storage.'),
 ('.github/workflows/check.yml','Node 24/Ubuntu CI prepared. Hosted execution and clean Linux build remain unverified.')
 ],[190,CW-190],y,9.4)
y=heading('Release sequence',y)
for n,t in enumerate([
 'Choose a persistent Node host and a stable HTTPS origin; a provider hostname can avoid purchasing a custom domain.',
 'Deploy one Node process. Inject secrets privately; use the same permanent origin for storefront and customer accounts.',
 'Register matching Shopify callback, logout and JavaScript origin URLs. Build and validate on the actual target host.',
 'Repeat login, account, wishlist, cart, no-charge purchase and proxy checks. Keep indexing off during acceptance.',
 'After merchant acceptance, enable indexing, rebuild, verify canonical/robots/sitemap and agree monitoring ownership.'
 ],1):
    y=bullet(str(n)+'. '+t,y,size=9.8)
y=note('Operational ownership','Keep backups of approved content and the last working build. Roll back app releases independently of inventory/orders. Transfer secrets separately; exclude local environment files, customer data and workstation logs from the handover archive. Retest after domain, OAuth, gateway or deployment changes.',y)
source('E01, E05, E12, E14')

# 15 - Punch list
y=begin('Open items before final acceptance','14 / OUTSTANDING ACTION REGISTER','These items require merchant facts, a deployment target or live acceptance. No deadlines have been assumed.')
y=table(['Priority / owner','Outstanding action','Closure evidence'],[
 ('Launch gate\nMerchant','Review billing and enable an appropriate Shopify selling plan.','Checkout accepts a test flow; owner confirms the selected billing terms.'),
 ('Launch gate\nMerchant','Confirm actual stock, missing product facts and approved product claims. Resolve naming/duplicate-listing decisions.','Approved catalogue, ingredients, usage/care and correct availability.'),
 ('Launch gate\nMerchant','Approve shipping destinations/rates, tax setup, legal identity and shipping/refund/terms policies.','Saved approved settings and policies; destination totals checked.'),
 ('Launch gate\nDeployer','Select permanent hosting, secure secrets, configure the stable origin, proxy and OAuth URLs.','Target build, health, login/logout, caching and private-path checks pass.'),
 ('Launch gate\nMerchant + QA','Complete an explicitly no-charge order test with a verified test payment method. Razorpay work remains excluded.','Order appears in Shopify and account history; totals match; relevant failure/recovery paths pass.'),
 ('Acceptance\nQA + deployer','Repeat device/browser/accessibility checks and the guarded carousel interaction on the final host.','No blocking defects; remaining observations documented and accepted.'),
 ('Launch gate\nOwner + deployer','Approve final release and search indexing; confirm operations owner, backup and alert process.','Recorded acceptance and successful public-origin release checks.')
 ],[104,234,CW-338],y,9)
y=note('What is not implied by this handover','This report does not grant launch approval, certify compliance or confirm payment readiness. The one-page remaining-steps PDF provides the short owner checklist; this report supplies the evidence and technical context.',y,amber=True)
source('E01-E07, E11-E13')

# 16 - Acceptance and evidence
y=begin('Acceptance record and evidence index','15 / HANDOVER PACKAGE','This issue is a provisional record. Final acceptance remains pending and is not signed or implied.')
y=table(['Review area','Record for final handover'],[
 ('Merchant approval','Product information, stock, policies, shipping/tax and intended trading configuration.'),
 ('Technical acceptance','Permanent build, host/proxy controls, OAuth, account behavior and documented residual issues.'),
 ('Commerce acceptance','No-charge order result, account order history and approved recovery checks.'),
 ('Final release record','Approved origin, release revision, acceptance date and named operational owner - all pending.')
 ],[145,CW-145],y,9.3)
y=heading('Evidence index',y)
refs=[
 ('E01','HANDOVER.md - consolidated status and boundaries'),
 ('E02','docs/audit-frontend.md - routes, interactions and remaining coverage'),
 ('E03','docs/audit-backend.md - fixes and security review limits'),
 ('E04','docs/audit-content.md - content/editor audit; read follow-ups for current values'),
 ('E05','qa/handover/ci-verification.json; docs/testing.md - environment-specific tests'),
 ('E06','qa/accounts/shopify-setup.json - actual login and wishlist verification'),
 ('E07','qa/handover/shopify-audit.json - live cart/checkout; historical name snapshot'),
 ('E08','shopify/handover-cleanup/ - mutations, backups, rollback and Storefront reads'),
 ('E09','qa/content/ - catalogue and 161-entry editor verification'),
 ('E10','qa/handover/verification.json; preview-verification.json - build and checks'),
 ('E11','qa/handover/admin-followup.json - current brand, policies and plan observations'),
 ('E12','docs/deployment.md; deploy/ - deployment preparation and limits'),
 ('E13','output/pdf/DYU-remaining-steps.pdf - concise owner action list'),
 ('E14','README.md; package.json - editing instructions, architecture and versions')
]
for key,txt in refs:
    P(key,M,y,35,8.4,11,FOREST,'SansBold');end=P(txt,M+36,y,CW-36,8.4,11,MUTED);y=end+4
y+=7
P('Paths are relative to the handover repository. Source receipts contain the detailed audit history. Test groups overlap; no combined pass percentage is asserted. Prices are the values displayed during the dated audit.',M,y,CW,8.6,12,MUTED)
source('Prepared from saved project evidence; credentials and live customer records are omitted')

# 17 - Screenshot register / getting started
y=begin('Screenshot register and next use','APPENDIX / VISUAL EVIDENCE','Screenshots are dated audit snapshots of the implemented project. They are not evidence of a permanent public launch.')
rows=[
 ('S01','Desktop homepage','qa/frontend-handover/home-1440-top.png','Public UI; hero artwork is illustrative.'),
 ('S02','Mobile homepage','qa/frontend-handover/home-390-top.png','390px viewport; browser emulation.'),
 ('S03','Product photo / 3D','qa/product-gallery-split-desktop.png','Image-derived approximation, not a product scan.'),
 ('S04','Wide journal heading','qa/handover/final-journal.png','Verified inline headline and italic emphasis.'),
 ('S05','Mobile journal','qa/frontend-handover/journal-390-top.png','Responsive wrapping at narrower width.'),
 ('S06','Account overview','qa/account-ui/overview-1440.png','Synthetic fixture identity, not a live customer record.'),
 ('S07','Native brand settings','qa/handover/shopify-brand-settings.jpg','Saved Shopify administration changes.'),
 ('S08','Featured collection','qa/handover/featured-collection.jpg','Real catalogue photograph and latest Shopify logo.'),
 ('S09','Selling-plan options','qa/handover/plan-options.jpg','Read-only billing evidence; no selection purchased.')
]
y=table(['ID / view','Repository image path','Interpretation'],[(a+'\n'+b,p,d) for a,b,p,d in rows],[111,232,CW-343],y,8.6)
y=heading('Using the package',y)
for t in ['Merchant: start with the one-page checklist, then use page 8 and README.md for day-to-day editing.','Developer: start with HANDOVER.md, the deployment runbook and the environment/test boundaries on pages 10-14.','Final handover: attach the completed acceptance evidence and a release revision once the launch gates close.']:
    y=bullet(t,y,size=9.5)
source('S01-S09 retain their source pixels; pages 6-7 show labelled viewport excerpts')

c.save()
manifest={'output':str(OUT),'pageCount':len(pages),'pageTitles':pages,'issue':'1.0','status':'provisional','evidenceDate':'2026-10-04','screenshots':9,'includesRealCustomerRecords':False}
(ROOT/'tmp/pdfs/provisional-report-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'path':str(OUT),'pages':len(pages)},indent=2))
