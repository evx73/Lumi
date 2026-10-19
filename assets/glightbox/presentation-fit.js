/* Keep image hotspots aligned while fitting tall plans to the viewport. */
(function () {
  'use strict';
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
      var availableHeight = Math.max(100, Math.min(contentRect.bottom, window.innerHeight) - rect.top - 4);
      var availableWidth = Math.max(100, contentRect.width - 4);
      var width = Math.min(availableWidth, availableHeight * img.naturalWidth / img.naturalHeight);
      var fittedHeight = width * img.naturalHeight / img.naturalWidth;
      box.style.setProperty('width', width + 'px', 'important');
      box.style.setProperty('height', fittedHeight + 'px', 'important');
      img.style.setProperty('width', width + 'px', 'important');
      img.style.setProperty('height', fittedHeight + 'px', 'important');
    });
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; fit(); });
  }
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  document.addEventListener('load', schedule, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
  function start() {
    var observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    schedule();
  }
})();
