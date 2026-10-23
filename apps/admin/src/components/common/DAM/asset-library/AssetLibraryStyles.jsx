const AssetLibraryStyles = () => (
  <style>{`
        .dragging { opacity: 0.4; }
        .kanban-scroll-container { scroll-behavior: smooth; overscroll-behavior: contain; }
        .kanban-scroll-container::-webkit-scrollbar { width: 8px; }
        .kanban-scroll-container::-webkit-scrollbar-track { background: transparent; }
        .kanban-scroll-container::-webkit-scrollbar-thumb { background-color: rgb(255, 255, 255); border-radius: 4px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.3); }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        /* ✅ Fix DevExpress CardView rounded corners */

        /* ✅ DevExpress Button Styling */

        /* ✅ Compact Pagination */

        /* Mobile pagination - move higher from bottom */

        /* Custom grid layout for assets */

        /* neutral when not focused */

        /* black only on focused input */

        /* Ensure cards maintain consistent width */

        @media (max-width: 768px) {

          .header-bar-inside-cardview {
            padding: 12px 12px 12px 12px !important;
          }
        }

        @media (max-width: 480px) {

          .header-bar-inside-cardview {
            padding: 10px 10px 10px 10px !important;
          }
        }

        /* Cards and pagination share the filter bar's 24px side inset so every edge lines up. */
        .asset-grid .kit-cardview__grid { padding: 4px 24px 16px; }
        .asset-grid .kit-cardview__footer { flex: none; margin-top: 0; padding: 12px 24px; border-top: 1px solid var(--color-border-subtle); background: var(--color-surface); }
        @media (max-width: 768px) {
          .asset-grid .kit-cardview__grid { padding: 4px 12px 12px; }
          .asset-grid .kit-cardview__footer { padding: 12px; }
        }

        .kit-accordion-item{
          border-bottom: 1px solid black;
        }
        /* Filter dropdown option hover - matches sidebar nav hover:bg-gray-100 */

        /* ADD THIS CSS FOR HEADER ALIGNMENT */
        .header-bar-inside-cardview {
          width: 100% !important;
          margin: 0 !important;
          padding: 16px 24px 0 24px !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
        }

        .header-bar-inside-cardview .relume-filter-container {
          max-width: none !important;
          width: 100% !important;
        }

        /* Pro Search bar width */
        .header-bar-inside-cardview .search-input {
          width: 420px !important;
          max-width: 100% !important;
        }

        /* Responsive alignment - matches existing card breakpoints */
        @media (max-width: 1279px) {
          .header-bar-inside-cardview {
        padding: 16px 24px 0 24px !important;
          }
        }

        @media (max-width: 1024px) {
          .header-bar-inside-cardview {
        padding: 14px 14px 0 14px !important;
          }
        }

        @media (max-width: 768px) {
          .header-bar-inside-cardview {
        padding: 12px 12px 0 12px !important;
          }
        }

        @media (max-width: 480px) {
          .header-bar-inside-cardview {
        padding: 10px 10px 0 10px !important;
          }
        }

        /* Mobile Header Responsive Styles - ADD THIS */
        @media (max-width: 767px) {
          .header-bar-inside-cardview {
        padding: 12px 12px 16px 12px !important;
          }

          .header-bar-inside-cardview .relume-filter-container {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
          }

          .header-bar-inside-cardview .search-input {
        width: 100% !important;
          }

          .header-bar-inside-cardview button {
        width: 100% !important;
        justify-content: center !important;
        text-align: center !important;
          }

          /* Mobile grid for filters */
          .header-bar-inside-cardview .grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
          }
        }

        /* Mobile Drawer Styles */
        @media (max-width: 768px) {
          .fixed.right-0.z-30 {
            width: 100vw !important;
            left: 0 !important;
          }
        }

        /* Upload Component Mobile Styles */
        @media (max-width: 640px) {
          .card {
            padding: 1rem !important;
          }
          
          .max-w-md {
            max-width: 100% !important;
            padding: 0 0.5rem !important;
          }
        }
      `}</style>
);

export default AssetLibraryStyles;
