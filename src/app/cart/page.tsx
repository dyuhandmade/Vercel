import Bag from '@/components/Bag';
export const metadata={title:'Your bag',robots:{index:false,follow:false}};
export default function Cart(){return <div className="page-shell narrow"><header className="page-intro compact"><p className="eyebrow">YOUR EVERYDAY RITUALS</p><h1>Your <em>bag.</em></h1></header><Bag/></div>;}
