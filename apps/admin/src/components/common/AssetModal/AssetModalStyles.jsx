const AssetModalStyles = () => (
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

        /* Desktop styles */
        
        /* Mobile styles */

        /* Custom grid layout for assets */

        /* Ensure cards maintain consistent width */

        /* Force exactly 4 cards per row on large screens */

        @media (max-width: 768px) {
          
          /* Adjust mobile header padding to match cards */
          .header-bar-inside-cardview {
            padding: 12px 12px 12px 12px !important;
          }
        }

        @media (max-width: 480px) {

          /* Adjust mobile header padding to match cards */
          .header-bar-inside-cardview {
            padding: 10px 10px 10px 10px !important;
          }
        }

        /* Ensure rows are equal height */

        /* Grey hover to match the sidebar's existing hover:bg-gray-100 state. */

        /* Currently selected filter option: stays visible, greyed out, unselectable */

        /* ADD THIS CSS FOR HEADER ALIGNMENT */
        .header-bar-inside-cardview {
          width: 100% !important;
          margin: 0 auto !important;
          padding: 16px 24px 0 24px !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
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
     `}</style>
);

export default AssetModalStyles;