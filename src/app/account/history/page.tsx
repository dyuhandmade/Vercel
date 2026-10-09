import SavedProductsView from '@/components/SavedProductsView';

export const metadata = {title: 'Recently viewed'};
export default function HistoryPage() { return <SavedProductsView kind="history"/>; }
