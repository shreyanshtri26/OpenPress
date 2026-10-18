import { escapeHtml } from '../core/escapeHtml'

type AdProduct = {
  availability: string
  imageUrl: string
  imageAlt: string
  name: string
  price: string
}

export function renderAdCard(props: { product?: AdProduct }): string {
  const product = props.product
  if (!product) return ''

  return `
    <article class="relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
      
      <span class="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
        ${escapeHtml(product.availability)}
      </span>

      <img
        src="${escapeHtml(product.imageUrl)}"
        alt="${escapeHtml(product.imageAlt)}"
        class="aspect-[16/10] w-full object-cover"
        loading="lazy"
      />

      <div class="flex flex-col gap-1 px-5 py-4">
        <p class="font-cormorant-garamond text-xl font-semibold text-slate-900">
          ${escapeHtml(product.name)}
        </p>
        <p class="font-jetbrains-mono text-sm font-semibold uppercase tracking-wide text-slate-800">
          ${escapeHtml(product.price)}
        </p>
      </div>
    </article>
  `
}
