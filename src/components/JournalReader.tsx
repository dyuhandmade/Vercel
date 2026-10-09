'use client';

import {useRef, type ReactNode} from 'react';
import {motion, useScroll} from 'motion/react';
import styles from '@/app/journal/journal.module.css';

export default function JournalReader({children}: {children: ReactNode}) {
 const ref = useRef<HTMLDivElement>(null);
 const {scrollYProgress} = useScroll({target: ref, offset: ['start 160px', 'end end']});
 return <div ref={ref} className={styles.reader}>
  <div className={styles.readingTrack} aria-hidden="true"><motion.div style={{scaleX: scrollYProgress}}/></div>
  {children}
 </div>;
}

