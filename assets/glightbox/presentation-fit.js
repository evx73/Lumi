/* Keep image hotspots aligned while fitting tall plans to the viewport. */
(function () {
  'use strict';
  function installResizeHook() {
    if (!window.H5P || !H5P.ImageHotspots || !H5P.ImageHotspots.prototype) return;
    var prototype = H5P.ImageHotspots.prototype;
    if (prototype.__lumiFitHooked || typeof prototype.resize !== 'function') return;
    var originalResize = prototype.resize;
    prototype.resize = function () {
      var result = originalResize.apply(this, arguments);
      // Fit synchronously in the same frame as H5P's own resize.
      // This avoids painting its initial oversized image first.
      fit();
      return result;
    };
    prototype.__lumiFitHooked = true;
  }
  function fit() {
    document.querySelectorAll('.h5p-interactive-book .h5p-image-hotspots-container').forEach(function (box) {
      var img = box.querySelector('img.h5p-image-hotspots-background');
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      var chapter = box.closest('.h5p-interactive-book-chapter');
      if (chapter && !chapter.classList.contains('h5p-interactive-book-current')) return;
      var content = box.closest('.h5p-interactive-book-content');
      if (!content) return;
      var contentRect = content.getBoundingClientRect();
      var rect = box.getBoundingClientRect();
      var availableHeight = Math.max(100, window.innerHeight - rect.top - 4);
      var availableWidth = Math.max(100, Math.min(contentRect.width, window.innerWidth - contentRect.left) - 4);
      var width = Math.min(availableWidth, availableHeight * img.naturalWidth / img.naturalHeight);
      var fittedHeight = width * img.naturalHeight / img.naturalWidth;
      box.style.setProperty('width', width + 'px', 'important');
      box.style.setProperty('height', fittedHeight + 'px', 'important');
      img.style.setProperty('width', width + 'px', 'important');
      img.style.setProperty('height', fittedHeight + 'px', 'important');
      // Reveal the image and hotspots only after their final sizes are set.
      box.setAttribute('data-lumi-fitted', '');
    });
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; installResizeHook(); fit(); });
  }
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  document.addEventListener('load', schedule, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
  function start() {
    // Sidebar transitions resize the book content without resizing the window.
    if (window.ResizeObserver) {
      var layoutObserver = new ResizeObserver(schedule);
      document.querySelectorAll('.h5p-interactive-book-content').forEach(function (el) {
        layoutObserver.observe(el);
      });
    }
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (mutation.type === 'attributes') {
          // Chapter activation is the only class change that needs refitting.
          if (mutation.target.classList &&
              mutation.target.classList.contains('h5p-interactive-book-chapter')) {
            // A previously visited chapter still has data-lumi-fitted, but
            // H5P may have reset its image to full width while it was hidden.
            // Refit immediately before the browser paints the active chapter.
            mutation.target.querySelectorAll('.h5p-image-hotspots-container').forEach(function (box) {
              box.removeAttribute('data-lumi-fitted');
            });
            fit();
            return;
          }
        } else {
          // Ignore unrelated H5P DOM updates, including GLightbox activity.
          var nodes = mutation.addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            if (node.nodeType === 1 &&
                (node.matches('.h5p-interactive-book, .h5p-image-hotspots-container, .h5p-interactive-book-chapter') ||
                 node.querySelector('.h5p-interactive-book, .h5p-image-hotspots-container, .h5p-interactive-book-chapter'))) {
              schedule();
              return;
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    schedule();
  }
})();
