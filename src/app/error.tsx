'use client';
export default function Error({reset}:{reset:()=>void}){return <div className="empty-state"><p className="eyebrow">A MOMENT PLEASE</p><h1>A little interruption.</h1><p>We couldn’t load this page. Your bag has been kept safe.</p><button className="button" onClick={reset}>Try again</button></div>;}
