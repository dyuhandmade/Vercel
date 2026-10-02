// Editorial concepts for the sample collection; these are not product claims.
const intentions:Record<string,{opening:string;ending:string;note:string}>={
 'botanical-face-balm':{opening:'A small object.',ending:'A moment close to you.',note:'Beside the mirror. On the bedside. A little reminder to make room for yourself.'},
 'everyday-body-oil':{opening:'Let the day',ending:'soften its pace.',note:'A familiar corner, an everyday object, and a few moments that belong to you.'},
 'botanical-soap':{opening:'An everyday beginning.',ending:'A little more considered.',note:'By the basin, a small reminder that ordinary moments deserve attention, too.'},
 'scalp-and-hair-oil':{opening:'Take your time.',ending:'Make it your own.',note:'Set a moment aside for a familiar routine, at your own pace.'},
 'evening-body-balm':{opening:'Let the day settle.',ending:'The rest can wait.',note:'A quiet corner. A familiar ritual. Nothing else asking for your time.'},
 'ritual-gift':{opening:'A pause,',ending:'thoughtfully shared.',note:'For someone whose everyday deserves a little room for care.'},
};
export function productIntention(handle:string){return intentions[handle]||{opening:'A little care.',ending:'Room in your everyday.',note:'A moment to slow down and choose with intention.'};}
