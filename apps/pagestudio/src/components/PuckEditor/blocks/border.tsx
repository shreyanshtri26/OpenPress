export type BorderProps = {
    id?: string;
    height?: string;
    color?: string;
};

export default function Border({
    id,
    height = '1px',
    color = 'gray',
}: BorderProps) {
    return (
        <section id={id} className="w-full bg-white pt-6 pb-3 relative">
            <div className="relative op-container pb-4">
                {/* Horizontal border line (same as PopularGrid) */}
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="hidden lg:block mx-8 absolute left-0 right-0 top-0"
                        style={{ borderBottom: `${height} solid ${color}` }}
                    />
                </div>
            </div>
        </section>
    );
}
