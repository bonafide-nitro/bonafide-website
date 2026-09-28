// The two product views are separate pages. This is the only place a SKU is assigned to a view.
export const productsForView = (products, view) => products.filter((p) => p.views.includes(view));
