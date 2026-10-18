// AdCard.tsx
import type { AdProduct } from '../adProducts'
 
export type AdCardProps = {
  id?: string;
  productId?: string;
  product?: AdProduct;
}
 
 
export default function AdCard({ product }: AdCardProps) {
  if (!product) return null
 
  return (
    <article className="relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
      {/* Badge  */}
      <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
        {product.availability}
      </span>
 
      {/* Image */}
      <img
        src={product.imageUrl}
        alt={product.imageAlt}
        className="aspect-[16/10] w-full object-cover"
        loading="lazy"
      />
 
      {/* Info */}
      <div className="flex flex-col gap-1 px-5 py-4">
        <p className="font-cormorant-garamond text-xl font-semibold text-slate-900">
          {product.name}
        </p>
        <p className="font-jetbrains-mono text-sm font-semibold uppercase tracking-wide text-slate-800">
          {product.price}
        </p>
      </div>
    </article>
  )
}
 
 