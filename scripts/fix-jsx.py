from pathlib import Path
p=Path('src/components/CraftJourney.tsx');s=p.read_text(encoding='utf-8').replace('?.focus();}} tabIndex','?.focus();}}} tabIndex');p.write_text(s,encoding='utf-8')
p=Path('src/app/products/[handle]/page.tsx');s=p.read_text(encoding='utf-8-sig').replace('Texture. Light. A human touch.</p></div></div></section>','Texture. Light. A human touch.</p></div></div></div></section>');p.write_text(s,encoding='utf-8')
