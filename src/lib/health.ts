/** Keep dependency failures private while exposing a usable readiness status to the host. */
export async function storefrontReadiness(loadProducts: () => Promise<readonly unknown[]>, demo: boolean): Promise<Response> {
  const products = await loadProducts().catch(() => []);
  const ready = products.length > 0;
  return Response.json({application: 'DYUhandmade', mode: demo ? 'demo' : 'shopify', ready, productCount: products.length}, {
    status: ready ? 200 : 503,
    headers: {'Cache-Control': 'private, no-store'},
  });
}
