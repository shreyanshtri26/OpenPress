export function renderBorder(props: { id?: string; height?: string; color?: string }) {
  const height = props.height ?? '1px'
  const color = props.color ?? 'gray'

  return `
    <section id="${props.id ?? ''}" class="w-full bg-white pt-6 px-16 pb-3 relative">
      <div class="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
        <div class="absolute inset-0 pointer-events-none">
          <div
            class="hidden lg:block mx-8 absolute left-0 right-0 top-0"
            style="border-bottom: ${height} solid ${color}"
          ></div>
        </div>
      </div>
    </section>
  `
}
