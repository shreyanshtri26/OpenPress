import { type ReactNode } from 'react'

export type AdvertisementGridProps = {
  id?: string
  heading: string
  infoLabel?: string
  brandName?: string
  items?: ReactNode
}

export function AdvertisementGridBlock({ id, heading, infoLabel, brandName, items: Items }: AdvertisementGridProps) {
  const Slot = Items as unknown as React.ComponentType<{ className?: string }>

  return (
    <section id={id} className="op-container py-8">
      {/* Heading */}
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
        <span className="h-px flex-1 bg-slate-200" aria-hidden />
        <span>{heading}</span>
        {infoLabel && (
          <button
            type="button"
            className="flex h-6 w-6 rounded-full items-center justify-center border border-slate-300 font-bold text-slate-500"
            aria-label={infoLabel}
          >
            <span className="tracking-[0px]">i</span>
          </button>
        )}
        <span className="h-px flex-1 bg-slate-200" aria-hidden />
      </div>

      {/* Grid (drop area) */}
      <div className="mt-6">
        <Slot
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-x-8 gap-y-12
            rounded-xl
            
          
            p-6
            min-h-[200px]
          "
        />
      </div>

      {/* Footer */}
      {brandName && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <span className="font-jetbrains-mono text-xs font-semibold uppercase tracking-[0.45em] text-slate-700">
            {brandName}
          </span>
          <span className="h-px w-full bg-slate-200" aria-hidden />
        </div>
      )}
    </section>
  )
}
