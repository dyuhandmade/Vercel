import SavedProductsView from '@/components/SavedProductsView';

export const metadata = {title: 'My wishlist'};
export default function WishlistPage() { return <SavedProductsView kind="wishlist"/>; }
