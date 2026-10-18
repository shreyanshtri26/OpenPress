// Grabs one frame of a video in the browser and returns it as a WebP File.
// Used as the free thumbnail path when the server has no FFmpeg (e.g. on Neon Functions).
// The video must be served with CORS headers, otherwise the canvas is tainted and this rejects.
export function captureVideoFrame(url, { atFraction = 0.1, maxWidth = 1280, fileName = 'thumbnail.webp' } = {}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;

    const fail = (message) => { video.removeAttribute('src'); video.load(); reject(new Error(message)); };
    const timer = setTimeout(() => fail('Timed out reading the video'), 20000);

    video.onerror = () => { clearTimeout(timer); fail('The video could not be loaded for a thumbnail'); };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(Math.max(video.duration * atFraction, 0.1), Math.max(video.duration - 0.1, 0));
    };
    video.onseeked = () => {
      clearTimeout(timer);
      try {
        const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((video.videoWidth || 640) * scale);
        canvas.height = Math.round((video.videoHeight || 360) * scale);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          video.removeAttribute('src');
          video.load();
          if (!blob) return reject(new Error('Could not encode the thumbnail'));
          resolve(new File([blob], fileName, { type: 'image/webp' }));
        }, 'image/webp', 0.85);
      } catch {
        fail('The video host does not allow reading frames (CORS)');
      }
    };
    video.src = url;
  });
}
