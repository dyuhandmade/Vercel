'use client';
import {motion,useReducedMotion} from 'motion/react';
export default function Reveal({children,className='',delay=0}:{children:React.ReactNode;className?:string;delay?:number}){const reduce=useReducedMotion();return <motion.div className={className} initial={false} whileInView={reduce?{}:{y:[20,0]}} viewport={{once:true,amount:.1}} transition={{duration:.8,delay,ease:[.2,.65,.3,1]}}>{children}</motion.div>;}
