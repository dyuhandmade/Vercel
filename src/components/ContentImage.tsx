import Image,{getImageProps,type ImageProps} from 'next/image';

/** Keep the existing image layout while letting Shopify supply mobile artwork. */
export default function ContentImage({mobileSrc,...props}:ImageProps&{mobileSrc?:string}){
 if(!mobileSrc)return <Image {...props}/>;
 const {preload,priority,...imageProps}=props;
 const shared={...imageProps,loading:preload||priority?'eager' as const:imageProps.loading,fetchPriority:preload||priority?'high' as const:imageProps.fetchPriority};
 const {props:desktop}=getImageProps(shared);
 const {props:mobile}=getImageProps({...shared,src:mobileSrc});
 return <picture style={{display:'contents'}}>
  <source media="(max-width: 540px)" srcSet={mobile.srcSet||mobile.src} sizes={mobile.sizes}/>
  <img {...desktop}/>
 </picture>;
}
