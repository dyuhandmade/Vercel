'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Check, Heart, History, Home, Leaf, LoaderCircle, LogOut, MapPin, Package, Plus, ShieldCheck, UserRound, X} from 'lucide-react';
import {money} from '@/lib/types';
import type {ContentSection} from '@/lib/content-safety';
import {useSiteContent} from './SiteContentProvider';
import {useAccountText} from './useAccountText';
import type {AccountCustomer as Customer, AccountState, AccountOrders as OrdersResponse, AccountOrder, AccountOrderDetail as OrderDetail, AccountAddresses as AddressesResponse, AccountAddress, AccountAddressInput} from '@/lib/account-types';
import styles from '@/app/account/account.module.css';

type AccountContextValue = {account: AccountState | null; loading: boolean; error: string; refresh: (invalidate?: boolean) => Promise<void>};
const AccountContext = createContext<AccountContextValue | null>(null);

const navigation = [
  {href: '/account', label: 'Overview', key: 'nav-overview', icon: Home},
  {href: '/account/orders', label: 'My orders', key: 'nav-orders', icon: Package},
  {href: '/account/wishlist', label: 'Wishlist', key: 'nav-wishlist', icon: Heart},
  {href: '/account/history', label: 'Recently viewed', key: 'nav-history', icon: History},
  {href: '/account/profile', label: 'My profile', key: 'nav-profile', icon: UserRound},
  {href: '/account/addresses', label: 'Addresses', key: 'nav-addresses', icon: MapPin},
];

export async function accountRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {cache: 'no-store', ...init, headers: {'Content-Type': 'application/json', ...init?.headers}});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && url !== '/api/account') window.dispatchEvent(new CustomEvent('dyu:account-changed', {detail: {type: 'expired'}}));
    throw new Error(data.error || 'We couldn’t complete that request. Please try again.');
  }
  return data as T;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('AccountShell is required.');
  return context;
}

export function AccountShell({children}: {children: ReactNode}) {
  const t = useAccountText();
  const pathname = usePathname();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const navigationRef = useRef<HTMLElement>(null);
  const refresh = useCallback(async (invalidate = true) => {
    const version = ++requestVersion.current;
    if (invalidate) { setAccount(null); setLoading(true); }
    setError('');
    try { const state = await accountRequest<AccountState>('/api/account'); if (version === requestVersion.current) setAccount(state); }
    catch (cause) { if (version === requestVersion.current) { setAccount(null); setError(cause instanceof Error ? cause.message : 'We couldn’t load your account.'); } }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, []);
  const invalidate = useCallback(() => { requestVersion.current++; setAccount(null); setLoading(true); setError(''); }, []);
  useEffect(() => { void refresh(); }, [pathname, refresh]);
  useEffect(() => {
    const nav = navigationRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && current && nav.scrollWidth > nav.clientWidth) nav.scrollTo({left: current.offsetLeft - nav.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2});
  }, [pathname]);
  useEffect(() => {
    const focus = () => void refresh();
    const changed = (event: Event) => { if ((event as CustomEvent).detail?.type === 'logout') invalidate(); else void refresh(); };
    const storage = (event: StorageEvent) => { if (event.key !== 'dyu:account-event') return; try { if (JSON.parse(event.newValue || '{}').type === 'logout') { invalidate(); return; } } catch {} void refresh(); };
    window.addEventListener('focus', focus); window.addEventListener('dyu:account-changed', changed); window.addEventListener('storage', storage);
    return () => { requestVersion.current++; window.removeEventListener('focus', focus); window.removeEventListener('dyu:account-changed', changed); window.removeEventListener('storage', storage); };
  }, [refresh, invalidate]);
  function signingOut() {
    try { localStorage.setItem('dyu:account-event', JSON.stringify({type: 'logout', at: Date.now()})); } catch {}
  }
  const active = navigation.find(item => item.href !== '/account' && pathname.startsWith(item.href));
  const displayName = account?.customer?.displayName?.trim();
  const name = account?.customer?.firstName?.trim() || (displayName && !displayName.includes('@') ? displayName.split(/\s+/)[0] : undefined);
  const authenticated = account?.authenticated === true;
  return <AccountContext.Provider value={{account, loading, error, refresh}}>
    <div className={styles.account}>
      <header className={styles.masthead}>
        <div><p className={styles.eyebrow}>{t("masthead-eyebrow", "YOUR DYU CORNER")}</p><h1>{active ? t(active.key, active.label) : authenticated ? <>{name ? `${t("welcome", "Welcome")}, ${name}` : t("welcome-back", "Welcome back")}. <em>{t("welcome-emphasis", "Make yourself at home.")}</em></> : <>{t("masthead-title", "A little space.")} <em>{t("masthead-emphasis", "Just for you.")}</em></>}</h1></div>
        <p className={styles.mastheadNote}>{active ? t("masthead-detail-note", "The little details that make your everyday feel more like you.") : t("masthead-note", "Your favourite rituals, thoughtful discoveries, and everything along the way.")}</p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.identity}><span className={styles.avatar}>{authenticated && name ? name.slice(0, 1).toUpperCase() : <Leaf size={23} strokeWidth={1.2}/>}</span><div><strong>{authenticated ? name || t("identity-title", "Your account") : t("identity-guest-title", "A slower kind of care")}</strong><span>{authenticated ? account?.customer?.email || t("identity-welcome", "Welcome to your account") : t("identity-guest-note", "A place for your everyday")}</span></div></div>
          <nav ref={navigationRef} aria-label={t("navigation-label", "Account navigation")} className={styles.navigation}>{navigation.map(({href, label, key, icon: Icon}) => <Link key={href} href={href} aria-current={pathname === href || href !== '/account' && pathname.startsWith(`${href}/`) ? 'page' : undefined}><Icon size={18} strokeWidth={1.35}/><span>{t(key, label)}</span><ArrowUpRight size={15} className={styles.navArrow}/></Link>)}</nav>
          {authenticated && <form action="/api/auth/logout" method="post" onSubmit={signingOut}><button className={styles.signOut} type="submit"><LogOut size={17} strokeWidth={1.35}/>{t("sign-out", "Sign out")}</button></form>}
          <div className={styles.sidebarNote}><ShieldCheck size={20} strokeWidth={1.2}/><p>{t("sidebar-note", "A private space for your orders and the things you love.")}</p></div>
        </aside>
        <div className={styles.content}>
          {error ? <AccountError message={error} retry={() => void refresh()}/> : loading ? <AccountLoading/> : children}
        </div>
      </div>
      <div className={styles.help}><span><Leaf size={19} strokeWidth={1.2}/>{t("help-note", "A little care goes a long way.")}</span><Link href="/contact">{t("contact-link", "Need a hand? Get in touch")} <ArrowUpRight size={16}/></Link></div>
    </div>
  </AccountContext.Provider>;
}

export function AccountLoading({label}: {label?: string}) {
  const t = useAccountText();
  return <div className={styles.loading} role="status"><LoaderCircle size={25} strokeWidth={1.3} className={styles.spinner}/><p>{label || t("loading", "Opening your space…")}</p></div>;
}

export function AccountError({message, retry}: {message: string; retry?: () => void}) {
  const t = useAccountText();
  return <div className={styles.message} role="alert"><h2>{t("error-title", "A small pause.")}</h2><p>{message}</p>{retry && <button onClick={retry} className={styles.secondary}>{t("try-again", "Try again")} <ArrowRight size={16}/></button>}</div>;
}

export function AccountGate({children}: {children: ReactNode}) {
  const {account} = useAccount();
  return account?.authenticated ? <>{children}</> : <AccountWelcome compact/>;
}

function AccountWelcome({compact = false}: {compact?: boolean}) {
  const {account} = useAccount();
  const pathname = usePathname();
  const [authError, setAuthError] = useState(false);
  useEffect(() => { setAuthError(new URLSearchParams(window.location.search).has('error')); }, []);
  return <AccountWelcomeContent compact={compact} configured={account?.configured === true} pathname={pathname} authError={authError}/>;
}

/** Presentation stays separate from the account session so merchant content cannot change authentication. */
export function AccountWelcomeContent({compact = false, configured, pathname, authError = false}: {compact?: boolean; configured: boolean; pathname: string; authError?: boolean}) {
  const t = useAccountText();
  const content = useSiteContent();
  const welcome: ContentSection = content.sections['account-welcome']?.enabled === false ? {handle: 'account-welcome'} : content.sections['account-welcome'] || {handle: 'account-welcome'};
  return <>
    <section className={`${styles.welcome} ${compact ? styles.compactWelcome : ''}`}>
      <div className={styles.welcomeCopy}>
        <span className={styles.miniMark}><Leaf size={29} strokeWidth={1}/></span>
        <p className={styles.eyebrow}>{welcome.eyebrow || 'MAKE YOURSELF AT HOME'}</p>
        <h2>{welcome.title || 'Your rituals.'}<br/><em>{welcome.titleEmphasis || 'All in one place.'}</em></h2>
        <p>{welcome.body || 'Sign in to keep your orders, everyday favourites, and personal details close at hand.'}</p>
        {authError && <p className={styles.inlineError} role="alert">{t("sign-in-error", "We couldn’t finish signing you in. Please try again.")}</p>}
        {configured ? <><a className={styles.primary} href={`/api/auth/login?returnTo=${encodeURIComponent(pathname)}`}>{welcome.linkLabel || 'Sign in or create an account'} <ArrowRight size={17}/></a><p className={styles.finePrint}><ShieldCheck size={15}/>{welcome.note || 'A secure code sent to your email. No password to remember.'}</p></> : <div className={styles.availability}><p>{t("sign-in-unavailable", "Account sign-in isn’t available just yet. You can still explore the collection and check out as a guest.")}</p><Link href="/shop" className={styles.primary}>{t("explore-collection", "Explore the collection")} <ArrowRight size={17}/></Link></div>}
        {configured && <Link href={welcome.secondaryUrl || "/shop"} className={styles.textLink}>{welcome.secondaryLabel || 'Continue exploring'} <ArrowUpRight size={15}/></Link>}
      </div>
      {!compact && <div className={styles.welcomeArt}><picture>{welcome.mobileImage && <source media="(max-width: 700px)" srcSet={welcome.mobileImage}/>}<img src={welcome.image || "/images/atelier-ritual-v2.webp"} alt={welcome.imageAlt || "A quiet moment with botanical care and natural textures"} style={{objectPosition: welcome.imagePosition || "59% center"}}/></picture><span>{welcome.caption || "A little closer to your everyday."}</span></div>}
    </section>
    {!compact && <div className={styles.benefits}>{[{icon: Package, title: 'Follow your rituals', text: 'Find order details and follow every delivery.'}, {icon: Heart, title: 'Keep what you love', text: 'Gather your favourites for another little pause.'}, {icon: UserRound, title: 'Make it yours', text: 'Keep your details and delivery addresses up to date.'}].map(({icon: Icon, title, text}, index) => {const benefit = content.sections[`account-benefit-${index + 1}`]; return benefit?.enabled === false ? null : <article key={index}><Icon size={24} strokeWidth={1.15}/><h3>{benefit?.title || title}</h3><p>{benefit?.body || text}</p></article>;})}</div>}
  </>;
}

export function AccountOverview() {
  const t = useAccountText();
  const content = useSiteContent();
  const overview = content.sections['account-overview'];
  const {account} = useAccount();
  if (!account?.authenticated) return <AccountWelcome/>;
  return <>
    {overview?.enabled !== false && <section className={styles.overviewIntro}><p className={styles.eyebrow}>{overview?.eyebrow || "IT’S GOOD TO HAVE YOU HERE"}</p><h2>{overview?.title || "A familiar ritual."}<br/><em>{overview?.titleEmphasis || "A fresh discovery."}</em></h2><p>{overview?.body || "Pick up where you left off, find something you love, or make a little room for something new."}</p><Link href={overview?.linkUrl || "/shop"} className={styles.primary}>{overview?.linkLabel || t("explore-collection", "Explore the collection")} <ArrowUpRight size={17}/></Link><Leaf className={styles.overviewLeaf} strokeWidth={.6} aria-hidden="true"/></section>}
    <div className={styles.quickLinks}>{navigation.slice(1).map(({href, label, key, icon: Icon}) => <Link key={href} href={href}><Icon size={25} strokeWidth={1.15}/><div><h2>{t(key, label)}</h2><p>{href.endsWith('orders') ? t("quick-orders", "Order details, updates, and deliveries") : href.endsWith('wishlist') ? t("quick-wishlist", "The little things you have your eye on") : href.endsWith('history') ? t("quick-history", "Rediscover your recent favourites") : href.endsWith('profile') ? t("quick-profile", "The details that make this space yours") : t("quick-addresses", "A home for your next delivery")}</p></div><ArrowUpRight size={19}/></Link>)}</div>
  </>;
}

export function AccountProfile() {
  const {account} = useAccount();
  return <AccountGate>{account?.customer && <ProfileForm key={account.customer.id} customer={account.customer}/>}</AccountGate>;
}

function ProfileForm({customer}: {customer: Customer}) {
  const t = useAccountText();
  const {account, refresh} = useAccount();
  const [firstName, setFirstName] = useState(customer.firstName || '');
  const [lastName, setLastName] = useState(customer.lastName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try { await accountRequest('/api/account/profile', {method: 'PATCH', body: JSON.stringify({firstName: firstName.trim(), lastName: lastName.trim()})}); setSaved(true); await refresh(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your details could not be saved.'); }
    finally { setBusy(false); }
  }
  return <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>{t("profile-eyebrow", "THE PERSONAL DETAILS")}</p><h2>{t("profile-title", "A little more")} <em>{t("profile-emphasis", "you.")}</em></h2></div><UserRound size={29} strokeWidth={1}/></div><form className={styles.form} onSubmit={save}>
    <div className={styles.formGrid}><label>{t("first-name", "First name")}<input name="given-name" autoComplete="given-name" maxLength={100} value={firstName} onChange={event => {setFirstName(event.target.value); setSaved(false);}}/></label><label>{t("last-name", "Last name")}<input name="family-name" autoComplete="family-name" maxLength={100} value={lastName} onChange={event => {setLastName(event.target.value); setSaved(false);}}/></label></div>
    <div className={styles.readOnlyDetails}><div><span>{t("email", "Email address")}</span><strong>{customer.email || t("not-provided", "Not provided")}</strong></div><div><span>{t("phone", "Phone number")}</span><strong>{customer.phone || t("not-provided", "Not provided")}</strong></div></div>
    <p className={styles.note}>{t("profile-email-note", "Your email is used for sign-in and order updates.")} {account?.accountUrl ? <a href={account.accountUrl}>{t("profile-settings-link", "Manage your email and account settings")} <ArrowUpRight size={14}/></a> : <>{t("profile-contact-note", "For help with email or account changes,")} <Link href="/contact">{t("profile-contact-link", "get in touch with us")}</Link>.</>}</p>
    {error && <p className={styles.inlineError} role="alert">{error}</p>}
    <div className={styles.formFooter}><button className={styles.primary} type="submit" disabled={busy}>{busy ? t("saving", "Saving…") : t("profile-save", "Save changes")}{busy ? <LoaderCircle className={styles.spinner} size={17}/> : <Check size={17}/>}</button><span role="status">{saved ? t("profile-saved", "Your details have been saved.") : ''}</span></div>
  </form></section>;
}

function readableStatus(status: string | null) {
  return status ? status.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()) : 'Processing';
}
function orderDate(date: string) { return new Intl.DateTimeFormat('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}).format(new Date(date)); }
function webUrl(value?: string | null) {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined; } catch { return undefined; }
}

export function AccountOrders() { return <AccountGate><OrdersList/></AccountGate>; }

function OrdersList() {
  const t = useAccountText();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (after?: string | null) => {
    setBusy(true); setError('');
    try { const result = await accountRequest<OrdersResponse>(`/api/account/orders${after ? `?after=${encodeURIComponent(after)}` : ''}`); setData(current => after && current ? {orders: {...result.orders, nodes: [...current.orders.nodes, ...result.orders.nodes]}} : result); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t load your orders.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (busy && !data) return <AccountLoading label={t("orders-loading", "Finding your orders…")}/>;
  if (error && !data) return <AccountError message={error} retry={() => void load()}/>;
  if (!data?.orders.nodes.length) return <div className={styles.empty}><Package size={38} strokeWidth={1}/><h2>{t("orders-empty-title", "Your next ritual")} <em>{t("orders-empty-emphasis", "awaits.")}</em></h2><p>{t("orders-empty-body", "You haven’t placed an order with this account yet. When you do, you’ll find its details here.")}</p><Link href="/shop" className={styles.primary}>{t("orders-empty-link", "Find something you love")} <ArrowRight size={17}/></Link></div>;
  return <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>{t("orders-eyebrow", "FROM OUR HANDS TO YOURS")}</p><h2>{t("orders-title", "Your orders,")} <em>{t("orders-emphasis", "at a glance.")}</em></h2></div><Package size={28} strokeWidth={1}/></div><div className={styles.orderList}>{data.orders.nodes.map(order => <OrderRow key={order.id} order={order}/>)}</div>{error && <p className={styles.inlineError} role="alert">{error}</p>}{data.orders.pageInfo.hasNextPage && <div className={styles.loadMore}><button disabled={busy} className={styles.secondary} onClick={() => void load(data.orders.pageInfo.endCursor)}>{busy ? t("loading-more", "Loading…") : t("orders-load-more", "Load more orders")}<ArrowRight size={16}/></button></div>}<p className={styles.orderNote}>{t("orders-help-note", "Looking for an order placed with a different email?")} <Link href="/contact">{t("orders-help-link", "We’re here to help.")}</Link></p></section>;
}

function OrderRow({order}: {order: AccountOrder}) {
  return <Link className={styles.orderRow} href={`/account/orders/${encodeURIComponent(order.id)}`}><div><span className={styles.orderName}>{order.name}</span><span className={styles.orderDate}>{orderDate(order.processedAt)}</span></div><div className={styles.orderStatuses}><span className={styles.status}>{order.cancelledAt ? 'Cancelled' : readableStatus(order.fulfillmentStatus)}</span><span className={styles.paymentStatus}>{readableStatus(order.financialStatus)}</span></div><span className={styles.orderPrice}>{money(order.totalPrice)}</span><ArrowUpRight size={19}/></Link>;
}

export function AccountOrderDetails({id}: {id: string}) { return <AccountGate><OrderDetails id={id}/></AccountGate>; }

function OrderDetails({id}: {id: string}) {
  const t = useAccountText();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (after?: string | null) => {
    setBusy(true); setError('');
    try { const result = await accountRequest<{order: OrderDetail}>(`/api/account/orders/${encodeURIComponent(id)}${after ? `?after=${encodeURIComponent(after)}` : ''}`); setOrder(current => after && current ? {...result.order, lineItems: {...result.order.lineItems, nodes: [...current.lineItems.nodes, ...result.order.lineItems.nodes]}} : result.order); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t load this order.'); }
    finally { setBusy(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (busy && !order) return <AccountLoading label={t("order-loading", "Opening your order…")}/>;
  if (!order) return <><Link className={styles.back} href="/account/orders"><ArrowLeft size={16}/>{t("orders-back", "All orders")}</Link><AccountError message={error || 'This order could not be found.'} retry={() => void load()}/></>;
  const statusUrl = webUrl(order.statusPageUrl);
  return <>
    <Link className={styles.back} href="/account/orders"><ArrowLeft size={16}/>{t("orders-back", "All orders")}</Link>
    <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>{t("order-placed", "PLACED")} {orderDate(order.processedAt).toUpperCase()}</p><h2>{t("order-heading", "Order")} <em>{order.name}</em></h2></div><span className={styles.status}>{order.cancelledAt ? 'Cancelled' : readableStatus(order.fulfillmentStatus)}</span></div>
      <div className={styles.orderItems}>{order.lineItems.nodes.map(line => <article key={line.id} className={styles.orderItem}>{line.image ? <img src={line.image.url} alt={line.image.altText || line.name}/> : <span className={styles.itemPlaceholder}><Leaf size={24} strokeWidth={1}/></span>}<div><h3>{line.name}</h3>{line.variantTitle && line.variantTitle !== 'Default Title' && <p>{line.variantTitle}</p>}<p>{t("order-quantity", "Quantity")} {line.quantity}</p></div><span>{line.totalPrice ? money(line.totalPrice) : line.price ? money(line.price) : ''}</span></article>)}</div>
      {error && <p className={styles.inlineError} role="alert">{error}</p>}
      {order.lineItems.pageInfo.hasNextPage && <div className={styles.loadMore}><button className={styles.secondary} disabled={busy} onClick={() => void load(order.lineItems.pageInfo.endCursor)}>{busy ? t("loading-more", "Loading…") : t("order-items-more", "View more items")}</button></div>}
      <div className={styles.orderSummary}>{order.shippingAddress && <div><p className={styles.eyebrow}>{t("order-delivering-to", "DELIVERING TO")}</p><address>{order.shippingAddress.formatted.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</address></div>}<dl className={styles.totals}>{order.subtotal && <div><dt>{t("order-subtotal", "Subtotal")}</dt><dd>{money(order.subtotal)}</dd></div>}<div><dt>{t("order-shipping", "Shipping")}</dt><dd>{money(order.totalShipping)}</dd></div>{order.totalTax && <div><dt>{t("order-tax", "Tax")}</dt><dd>{money(order.totalTax)}</dd></div>}<div className={styles.grandTotal}><dt>{t("order-total", "Total")}</dt><dd>{money(order.totalPrice)}</dd></div>{Number(order.totalRefunded.amount) > 0 && <div><dt>{t("order-refunded", "Refunded")}</dt><dd>{money(order.totalRefunded)}</dd></div>}<div><dt>{t("order-payment", "Payment")}</dt><dd>{readableStatus(order.financialStatus)}</dd></div></dl></div>
      {order.fulfillments.nodes.length > 0 && <div className={styles.deliveries}><p className={styles.eyebrow}>{t("order-delivery-eyebrow", "ON ITS WAY TO YOU")}</p>{order.fulfillments.nodes.map((fulfillment, index) => <div className={styles.delivery} key={fulfillment.id}><Package size={20} strokeWidth={1.2}/><div><strong>{t("order-delivery", "Delivery")} {index + 1} · {readableStatus(fulfillment.status)}</strong>{fulfillment.estimatedDeliveryAt && <p>{t("order-estimated-arrival", "Estimated arrival")} {orderDate(fulfillment.estimatedDeliveryAt)}</p>}{fulfillment.trackingInformation.map((tracking, trackingIndex) => <p key={`${tracking.number}-${trackingIndex}`}>{tracking.company && <span>{tracking.company} · </span>}{webUrl(tracking.url) ? <a href={webUrl(tracking.url)} target="_blank" rel="noopener noreferrer">{tracking.number || t("order-track-link", "Track delivery")} <ArrowUpRight size={13}/></a> : tracking.number || t("order-tracking-pending", "Tracking updates will appear when available.")}</p>)}</div></div>)}</div>}
      <div className={styles.orderActions}>{statusUrl && <a href={statusUrl} className={styles.primary} target="_blank" rel="noopener noreferrer">{t("order-updates-link", "View order updates")} <ArrowUpRight size={16}/></a>}<Link href="/contact" className={styles.textLink}>{t("order-help-link", "Need help with this order?")} <ArrowUpRight size={14}/></Link></div>
    </section>
  </>;
}

export function AccountAddresses() { return <AccountGate><AddressBook/></AccountGate>; }

function AddressBook() {
  const t = useAccountText();
  const [data, setData] = useState<AddressesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<AccountAddress | 'new' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const load = useCallback(async (after?: string | null) => {
    setLoading(true); setError('');
    try { const result = await accountRequest<AddressesResponse>(`/api/account/addresses${after ? `?after=${encodeURIComponent(after)}` : ''}`); setData(current => after && current ? {...result, addresses: {...result.addresses, nodes: [...current.addresses.nodes, ...result.addresses.nodes]}} : result); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t load your addresses.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function updateAddress(id: string, action: 'default' | 'delete') {
    setBusyId(id); setError(''); setStatus('');
    try { await accountRequest('/api/account/addresses', {method: action === 'delete' ? 'DELETE' : 'PATCH', body: JSON.stringify(action === 'delete' ? {id} : {id, default: true})}); setDeleting(null); await load(); setStatus(action === 'delete' ? t("address-deleted", "Address removed.") : t("address-default-updated", "Your default address has been updated.")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your address could not be updated.'); }
    finally { setBusyId(null); }
  }
  if (loading && !data) return <AccountLoading label={t("addresses-loading", "Opening your address book…")}/>;
  if (error && !data) return <AccountError message={error} retry={() => void load()}/>;
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>{t("addresses-eyebrow", "A HOME FOR YOUR RITUALS")}</p><h2>{t("addresses-title", "Your address")} <em>{t("addresses-emphasis", "book.")}</em></h2></div>{!editing && <button className={styles.secondary} onClick={() => {setEditing('new'); setStatus('');}}><Plus size={16}/>{t("address-add", "Add address")}</button>}</div>
    {editing ? <AddressForm address={editing === 'new' ? null : editing} isDefault={typeof editing !== 'string' && editing.id === data?.defaultAddressId} cancel={() => setEditing(null)} saved={async () => {setEditing(null); await load(); setStatus(t("address-saved", "Your address has been saved."));}}/> : <>
      {!data?.addresses.nodes.length ? <div className={styles.addressEmpty}><MapPin size={32} strokeWidth={1}/><h3>{t("addresses-empty-title", "Where should we send")} <em>{t("addresses-empty-emphasis", "a little care?")}</em></h3><p>{t("addresses-empty-body", "Add a delivery address to make your next checkout a little easier.")}</p><button className={styles.primary} onClick={() => setEditing('new')}>{t("address-add-first", "Add your first address")} <Plus size={16}/></button></div> : <div className={styles.addressGrid}>{data.addresses.nodes.map(address => <article className={styles.addressCard} key={address.id}><div className={styles.addressLabel}><MapPin size={18} strokeWidth={1.2}/><span>{address.id === data.defaultAddressId ? t("address-default", "Default address") : t("address-delivery", "Delivery address")}</span></div><address>{address.formatted.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}{address.phoneNumber && <span>{address.phoneNumber}</span>}</address>{deleting === address.id ? <div className={styles.deletePrompt}><p>{t("address-remove-prompt", "Remove this address from your account?")}</p><div><button disabled={busyId === address.id} onClick={() => void updateAddress(address.id, 'delete')}>{busyId === address.id ? t("address-removing", "Removing…") : t("address-remove-confirm", "Yes, remove")}</button><button disabled={busyId === address.id} onClick={() => setDeleting(null)}>{t("address-keep", "Keep address")}</button></div></div> : <div className={styles.addressActions}><button disabled={busyId !== null} onClick={() => {setEditing(address); setStatus('');}}>{t("address-edit", "Edit")}</button>{address.id !== data.defaultAddressId && <button disabled={busyId !== null} onClick={() => void updateAddress(address.id, 'default')}>{busyId === address.id ? t("address-updating", "Updating…") : t("address-make-default-button", "Make default")}</button>}<button disabled={busyId !== null} onClick={() => setDeleting(address.id)}>{t("address-remove", "Remove")}</button></div>}</article>)}</div>}
      {data?.addresses.pageInfo.hasNextPage && <div className={styles.loadMore}><button className={styles.secondary} disabled={loading} onClick={() => void load(data.addresses.pageInfo.endCursor)}>{loading ? t("loading-more", "Loading…") : t("addresses-load-more", "Load more addresses")}</button></div>}
    </>}
    {error && <p className={styles.inlineError} role="alert">{error}</p>}<p className={styles.success} role="status">{status}</p>
  </section>;
}

const countryCodes = 'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');
const countryNames = new Intl.DisplayNames(['en'], {type: 'region'});
const countries = countryCodes.map(code => ({code, name: countryNames.of(code) || code})).sort((a, b) => a.name.localeCompare(b.name));
// Shopify's zone codes differ from ISO for some territories (for example, Odisha is OR).
// Source: https://github.com/Shopify/worldwide/blob/main/data/regions/IN.yml
const indianStates = [['AN','Andaman and Nicobar Islands'],['AP','Andhra Pradesh'],['AR','Arunachal Pradesh'],['AS','Assam'],['BR','Bihar'],['CH','Chandigarh'],['CG','Chhattisgarh'],['DN','Dadra and Nagar Haveli'],['DD','Daman and Diu'],['DL','Delhi'],['GA','Goa'],['GJ','Gujarat'],['HR','Haryana'],['HP','Himachal Pradesh'],['JK','Jammu and Kashmir'],['JH','Jharkhand'],['KA','Karnataka'],['KL','Kerala'],['LA','Ladakh'],['LD','Lakshadweep'],['MP','Madhya Pradesh'],['MH','Maharashtra'],['MN','Manipur'],['ML','Meghalaya'],['MZ','Mizoram'],['NL','Nagaland'],['OR','Odisha'],['PY','Puducherry'],['PB','Punjab'],['RJ','Rajasthan'],['SK','Sikkim'],['TN','Tamil Nadu'],['TS','Telangana'],['TR','Tripura'],['UP','Uttar Pradesh'],['UK','Uttarakhand'],['WB','West Bengal']];

function AddressForm({address, isDefault, cancel, saved}: {address: AccountAddress | null; isDefault: boolean; cancel: () => void; saved: () => Promise<void>}) {
  const t = useAccountText();
  const {account} = useAccount();
  const [values, setValues] = useState<AccountAddressInput>({firstName: address?.firstName || account?.customer?.firstName || '', lastName: address?.lastName || account?.customer?.lastName || '', company: address?.company || '', address1: address?.address1 || '', address2: address?.address2 || '', city: address?.city || '', zoneCode: address?.zoneCode || '', territoryCode: address?.territoryCode || 'IN', zip: address?.zip || '', phoneNumber: address?.phoneNumber || ''});
  const [makeDefault, setMakeDefault] = useState(isDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function change(key: keyof AccountAddressInput, value: string) { setValues(current => ({...current, [key]: value, ...(key === 'territoryCode' ? {zoneCode: ''} : {})})); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { const input = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])); await accountRequest('/api/account/addresses', {method: address ? 'PATCH' : 'POST', body: JSON.stringify({...(address ? {id: address.id} : {}), address: input, default: makeDefault})}); await saved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This address could not be saved.'); }
    finally { setBusy(false); }
  }
  const field = (key: keyof AccountAddressInput, label: string, autocomplete: string, required = false, type = 'text') => <label>{label}<input type={type} name={key} autoComplete={autocomplete} required={required} maxLength={key === 'phoneNumber' ? 30 : 150} value={values[key] || ''} onChange={event => change(key, event.target.value)}/></label>;
  return <form className={styles.form} onSubmit={submit}><div className={styles.formTitle}><h3>{address ? t("address-edit-title", "Edit your address") : t("address-new-title", "A new delivery address")}</h3><button type="button" onClick={cancel} disabled={busy} aria-label={t("address-cancel-label", "Cancel address changes")}><X size={20}/></button></div><div className={styles.formGrid}>{field('firstName', t("first-name", "First name"), 'shipping given-name', true)}{field('lastName', t("address-last-name", "Last name (optional)"), 'shipping family-name')}</div>{field('company', t("address-company", "Company (optional)"), 'shipping organization')}{field('address1', t("address-line-one", "Address"), 'shipping address-line1', true)}{field('address2', t("address-line-two", "Apartment, suite, etc. (optional)"), 'shipping address-line2')}<div className={styles.formGrid}><label>{t("address-country", "Country / region")}<select name="country" autoComplete="shipping country" value={values.territoryCode || 'IN'} onChange={event => change('territoryCode', event.target.value)}>{countries.map(country => <option value={country.code} key={country.code}>{country.name}</option>)}</select></label>{field('city', t("address-city", "City"), 'shipping address-level2', true)}{values.territoryCode === 'IN' ? <label>{t("address-state", "State / territory")}<select name="state" autoComplete="shipping address-level1" required value={values.zoneCode || ''} onChange={event => change('zoneCode', event.target.value)}><option value="">{t("address-state-placeholder", "Select your state")}</option>{indianStates.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label> : <label>{t("address-province", "State / province code (if applicable)")}<input name="zoneCode" autoComplete="shipping address-level1" maxLength={30} placeholder={t("address-province-placeholder", "For example, CA")} value={values.zoneCode || ''} onChange={event => change('zoneCode', event.target.value)}/></label>}{field('zip', t("address-postal-code", "Postal code"), 'shipping postal-code')}</div>{field('phoneNumber', t("address-phone", "Phone number (optional, include country code)"), 'shipping tel', false, 'tel')}<label className={styles.checkbox}><input type="checkbox" checked={makeDefault} disabled={isDefault} onChange={event => setMakeDefault(event.target.checked)}/>{t("address-make-default", "Use as my default address")}</label>{error && <p className={styles.inlineError} role="alert">{error}</p>}<div className={styles.formFooter}><button disabled={busy} className={styles.primary} type="submit">{busy ? t("saving", "Saving…") : t("address-save", "Save address")}<Check size={17}/></button><button disabled={busy} className={styles.textLink} type="button" onClick={cancel}>{t("cancel", "Cancel")}</button></div></form>;
}

