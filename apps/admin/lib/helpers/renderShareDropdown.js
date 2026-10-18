// Share Dropdown Component - Extracted from renderFunctions.js
// Provides a reusable dropdown menu with Facebook, Twitter, LinkedIn, WhatsApp, and Copy options

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

export function renderShareDropdown({ title, url = "" }, containerId) {
  // create dropdown with data attributes; wiring script will be inserted by parent
  const safeTitle = escapeHtml(title || "");
  const safeUrl = escapeHtml(url || "");

  return `
    <div class="flex flex-col items-start pb-2 pt-[1.40rem]">
      <div style="position: relative;">
        <button
          data-puck-share-button
          style="
            display: flex;
            align-items: stretch;
            border: 0.25px solid rgb(62, 62, 62);
            background: #FFFFFF;
            padding: 0;
            cursor: pointer;
            user-select: none;
            height: 24px;
          "
          aria-label="Share"
          title="Share"
        >
          <span style="
            font-size:9px;
            letter-spacing:0.03em;
            color:rgb(59, 59, 59);
            padding:2px 2px;
            display:flex;
            align-items:center;
            justify-content:center;
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            padding-left: 0.25rem;
            padding-right: 0.25rem;
          ">
            SHARE
          </span>

          <div style="
            width:0.25px;
            background:rgb(62,62,62);
          "></div>
          <div style="padding:2px 6px; display:flex; align-items:center;">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="black"
              style="display:block;"
            >
              <path
                d="M12 6V2l7 7l-7 7v-4c-5 0-8.5 1.5-11 5l.8-3l.2-.4A12 12 0 0 1 12 6"
              ></path>
            </svg>
          </div>
        </button>
        
        <!-- Share Dropdown Menu -->
        <div
          data-puck-share-menu
          style="
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid rgb(62, 62, 62);
            border-radius: 0px;
            margin-top: 4px;
            z-index: 1000;
            min-width: 180px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          "
        >
          <button
            data-share-facebook
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              border-bottom: 1px solid black;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
            <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M146.8,313.7c10.3,0,21.3,3.2,21.3,3.2l6.6-39.2c0,0-14-4.8-47.4-4.8c-20.5,0-32.4,7.8-41.1,19.3 c-8.2,10.9-8.5,28.4-8.5,39.7v25.7H51.2v38.3h26.5v133h49.6v-133h39.3l2.9-38.3h-42.2v-29.9C127.3,317.4,136.5,313.7,146.8,313.7z"/> </g> </g>
            </svg>
            <h2 class="font-libre italic pl-2 font-semibold">FACEBOOK</h2>
          </button>
          <button
            data-share-twitter
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
              border-bottom: 1px solid black;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
          <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M234.3,313.1c-10.2,6-21.4,10.4-33.4,12.8c-9.6-10.2-23.3-16.6-38.4-16.6c-29,0-52.6,23.6-52.6,52.6c0,4.1,0.4,8.1,1.4,12 c-43.7-2.2-82.5-23.1-108.4-55c-4.5,7.8-7.1,16.8-7.1,26.5c0,18.2,9.3,34.3,23.4,43.8c-8.6-0.3-16.7-2.7-23.8-6.6v0.6 c0,25.5,18.1,46.8,42.2,51.6c-4.4,1.2-9.1,1.9-13.9,1.9c-3.4,0-6.7-0.3-9.9-0.9c6.7,20.9,26.1,36.1,49.1,36.5 c-18,14.1-40.7,22.5-65.3,22.5c-4.2,0-8.4-0.2-12.6-0.7c23.3,14.9,50.9,23.6,80.6,23.6c96.8,0,149.7-80.2,149.7-149.7 c0-2.3,0-4.6-0.1-6.8c10.3-7.5,19.2-16.7,26.2-27.3c-9.4,4.2-19.6,7-30.2,8.3C222.1,335.7,230.4,325.4,234.3,313.1z"/> </g> </g>
          </svg>
            <h1 class="font-libre italic pl-2 font-semibold">TWITTER</h1>
          </button>
          <button
            data-share-linkedin
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              border-bottom: 1px solid black;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
            <svg fill="#000000" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve" width="25px" height="25px">
              <g id="SVGRepo_bgCarrier" stroke-width="0"/>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
              <g id="SVGRepo_iconCarrier"> <g> <path d="M329,145h-432c-22.1,0-40,17.9-40,40v432c0,22.1,17.9,40,40,40h432c22.1,0,40-17.9,40-40V185C369,162.9,351.1,145,329,145z M339,617c0,5.5-4.5,10-10,10h-432c-5.5,0-10-4.5-10-10V185c0-5.5,4.5-10,10-10h432c5.5,0,10,4.5,10,10V617z"/> <rect x="-8.5" y="348.4" width="49.9" height="159.7"/> <path d="M177.7,346.9c-28.6,0-46.5,15.6-49.8,26.6v-25.1H71.8c0.7,13.3,0,159.7,0,159.7h56.1v-86.3c0-4.9-0.2-9.7,1.2-13.1 c3.8-9.6,12.1-19.6,27-19.6c19.5,0,28.3,14.8,28.3,36.4v82.6H241v-88.8C241,369.9,213.2,346.9,177.7,346.9z"/> <path d="M15.4,273c-18.4,0-30.5,11.9-30.5,27.7c0,15.5,11.7,27.7,29.8,27.7h0.4c18.8,0,30.5-12.3,30.4-27.7 C45.1,284.9,33.8,273,15.4,273z"/> </g> </g>
            </svg>
            <h2 class="font-libre italic pl-2 font-semibold">LINKEDIN</h2>
          </button>
          <button
            data-share-whatsapp
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
              border-bottom: 1px solid black;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
          <svg fill="#000000" width="25px" height="25px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier">
            <path d="M11.42 9.49c-.19-.09-1.1-.54-1.27-.61s-.29-.09-.42.1-.48.6-.59.73-.21.14-.4 0a5.13 5.13 0 0 1-1.49-.92 5.25 5.25 0 0 1-1-1.29c-.11-.18 0-.28.08-.38s.18-.21.28-.32a1.39 1.39 0 0 0 .18-.31.38.38 0 0 0 0-.33c0-.09-.42-1-.58-1.37s-.3-.32-.41-.32h-.4a.72.72 0 0 0-.5.23 2.1 2.1 0 0 0-.65 1.55A3.59 3.59 0 0 0 5 8.2 8.32 8.32 0 0 0 8.19 11c.44.19.78.3 1.05.39a2.53 2.53 0 0 0 1.17.07 1.93 1.93 0 0 0 1.26-.88 1.67 1.67 0 0 0 .11-.88c-.05-.07-.17-.12-.36-.21z"/>
            <path d="M13.29 2.68A7.36 7.36 0 0 0 8 .5a7.44 7.44 0 0 0-6.41 11.15l-1 3.85 3.94-1a7.4 7.4 0 0 0 3.55.9H8a7.44 7.44 0 0 0 5.29-12.72zM8 14.12a6.12 6.12 0 0 1-3.15-.87l-.22-.13-2.34.61.62-2.28-.14-.23a6.18 6.18 0 0 1 9.6-7.65 6.12 6.12 0 0 1 1.81 4.37A6.19 6.19 0 0 1 8 14.12z"/>
            </g>
          </svg>
            <h1 class="font-libre italic pl-2 font-semibold">WHATSAPP</h1>
          </button>
          <button
            data-share-copy
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', 'white')));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#1C274C')));"
          >
          <svg width="25px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"/>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
              <g id="SVGRepo_iconCarrier"> <path d="M15.7285 3.88396C17.1629 2.44407 19.2609 2.41383 20.4224 3.57981C21.586 4.74798 21.5547 6.85922 20.1194 8.30009L17.6956 10.7333C17.4033 11.0268 17.4042 11.5017 17.6976 11.794C17.9911 12.0863 18.466 12.0854 18.7583 11.7919L21.1821 9.35869C23.0934 7.43998 23.3334 4.37665 21.4851 2.5212C19.6346 0.663551 16.5781 0.905664 14.6658 2.82536L9.81817 7.69182C7.90688 9.61053 7.66692 12.6739 9.51519 14.5293C9.80751 14.8228 10.2824 14.8237 10.5758 14.5314C10.8693 14.2391 10.8702 13.7642 10.5779 13.4707C9.41425 12.3026 9.44559 10.1913 10.8809 8.75042L15.7285 3.88396Z" fill="#1C274C"/> <path d="M14.4851 9.47074C14.1928 9.17728 13.7179 9.17636 13.4244 9.46868C13.131 9.76101 13.1301 10.2359 13.4224 10.5293C14.586 11.6975 14.5547 13.8087 13.1194 15.2496L8.27178 20.1161C6.83745 21.556 4.73937 21.5863 3.57791 20.4203C2.41424 19.2521 2.44559 17.1408 3.88089 15.6999L6.30473 13.2667C6.59706 12.9732 6.59614 12.4984 6.30268 12.206C6.00922 11.9137 5.53434 11.9146 5.24202 12.2081L2.81818 14.6413C0.906876 16.5601 0.666916 19.6234 2.51519 21.4789C4.36567 23.3365 7.42221 23.0944 9.33449 21.1747L14.1821 16.3082C16.0934 14.3895 16.3334 11.3262 14.4851 9.47074Z" fill="#1C274C"/> </g>
            </svg>
            <h1 class="font-libre italic pl-2 font-semibold">COPY</h1>
          </button>
        </div>
      </div>

      <span data-puck-copied-msg style="display:none; margin-top: 8px;" class="text-sm text-green-600">Copied!</span>

      <script>
        (function() {
          var container = document.getElementById("${escapeHtml(containerId)}");
          if (!container) return;

          // Get share button and menu
          var shareBtn = container.querySelector('[data-puck-share-button]');
          var shareMenu = container.querySelector('[data-puck-share-menu]');
          var msg = container.querySelector('[data-puck-copied-msg]');

          var shareTitle = ${JSON.stringify(escapeHtml(title || ""))};
          var shareUrl = ${JSON.stringify(escapeHtml(url || (typeof window !== 'undefined' ? window.location.href : "")))};

          // Toggle dropdown on button click
          if (shareBtn) {
            shareBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              shareMenu.style.display = shareMenu.style.display === 'none' ? 'block' : 'none';
            });
          }

          // Close dropdown when clicking outside
          document.addEventListener('click', function(e) {
            if (shareBtn && shareMenu && !shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
              shareMenu.style.display = 'none';
            }
          });

          // Facebook
          var facebookBtn = container.querySelector('[data-share-facebook]');
          if (facebookBtn) {
            facebookBtn.addEventListener('click', function(e) {
              e.preventDefault();
              var fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
              window.open(fbUrl, '_blank', 'width=600,height=400');
              shareMenu.style.display = 'none';
            });
          }

          // Twitter
          var twitterBtn = container.querySelector('[data-share-twitter]');
          if (twitterBtn) {
            twitterBtn.addEventListener('click', function(e) {
              e.preventDefault();
              var twitterUrl = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareTitle);
              window.open(twitterUrl, '_blank', 'width=600,height=400');
              shareMenu.style.display = 'none';
            });
          }

          // LinkedIn
          var linkedinBtn = container.querySelector('[data-share-linkedin]');
          if (linkedinBtn) {
            linkedinBtn.addEventListener('click', function(e) {
              e.preventDefault();
              var linkedinUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl);
              window.open(linkedinUrl, '_blank', 'width=600,height=400');
              shareMenu.style.display = 'none';
            });
          }

          // WhatsApp
          var whatsappBtn = container.querySelector('[data-share-whatsapp]');
          if (whatsappBtn) {
            whatsappBtn.addEventListener('click', function(e) {
              e.preventDefault();
              var whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(shareUrl);
              window.open(whatsappUrl, '_blank');
              shareMenu.style.display = 'none';
            });
          }

          // Copy Link
          var copyBtn = container.querySelector('[data-share-copy]');
          if (copyBtn) {
            copyBtn.addEventListener('click', function(e) {
              e.preventDefault();
              
              // Use the provided URL or fall back to current page URL
              var urlToCopy = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
              
              if (!urlToCopy) {
                console.error('No URL available to copy');
                return;
              }
              
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(urlToCopy).then(function() {
                  if (msg) {
                    msg.style.display = 'inline';
                    setTimeout(function() {
                      msg.style.display = 'none';
                    }, 2000);
                  }
                  shareMenu.style.display = 'none';
                }).catch(function(err) {
                  console.error('Clipboard copy failed:', err);
                  fallbackCopy();
                });
              } else {
                fallbackCopy();
              }
              
              // Fallback method for older browsers
              function fallbackCopy() {
                var input = document.createElement('input');
                input.value = urlToCopy;
                document.body.appendChild(input);
                input.select();
                try {
                  document.execCommand('copy');
                  if (msg) {
                    msg.style.display = 'inline';
                    setTimeout(function() {
                      msg.style.display = 'none';
                    }, 2000);
                  }
                } catch (err) {
                  console.error('Fallback copy failed:', err);
                }
                document.body.removeChild(input);
              }
              
              shareMenu.style.display = 'none';
            });
          }
        })();
      </script>
    </div>
  `;
}
