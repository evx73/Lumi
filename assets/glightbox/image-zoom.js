/* Pointer-centred image zoom for inline H5P image slides. */
(function () {
  'use strict';
  window.lumiAttachImageZoom = function (container, onSwipe) {
    if (!container || container.dataset.lumiZoomReady) return;
    var img = container.querySelector('img');
    if (!img) return;
    container.dataset.lumiZoomReady = '1';
    var scale = 1, x = 0, y = 0, pointers = new Map();
    var drag = null, pinch = null, swipeStart = null;
    img.draggable = false;
    img.style.transformOrigin = 'center center';
    img.style.willChange = 'transform';
    img.style.touchAction = 'none';
    container.style.touchAction = 'none';
    function render() {
      img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
      img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    }
    function clamp() {
      var rect = container.getBoundingClientRect();
      var w = Math.min(img.clientWidth, rect.width);
      var h = Math.min(img.clientHeight, rect.height);
      var maxX = Math.max(0, (w * scale - rect.width) / 2);
      var maxY = Math.max(0, (h * scale - rect.height) / 2);
      x = Math.max(-maxX, Math.min(maxX, x));
      y = Math.max(-maxY, Math.min(maxY, y));
    }
    function zoom(next, clientX, clientY) {
      next = Math.max(1, Math.min(5, next));
      var old = scale, bounds = img.getBoundingClientRect();
      var cx = clientX - (bounds.left + bounds.width / 2);
      var cy = clientY - (bounds.top + bounds.height / 2);
      var factor = next / old;
      x -= cx * (factor - 1);
      y -= cy * (factor - 1);
      scale = next;
      if (scale === 1) { x = 0; y = 0; }
      clamp();
      render();
    }
    container.addEventListener('wheel', function (e) {
      if (!e.target.closest('img')) return;
      e.preventDefault();
      e.stopPropagation();
      zoom(scale * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
    }, { passive: false });
    img.addEventListener('dblclick', function (e) {
      e.preventDefault(); e.stopPropagation();
      zoom(scale > 1 ? 1 : 2, e.clientX, e.clientY);
    });
    img.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      img.setPointerCapture(e.pointerId);
      if (pointers.size === 1) {
        drag = { x: e.clientX, y: e.clientY };
        swipeStart = scale === 1 && e.pointerType !== 'mouse' ?
          { x: e.clientX, y: e.clientY, time: Date.now() } : null;
      }
      if (pointers.size === 2) {
        var a = Array.from(pointers.values());
        pinch = { distance: Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y), scale: scale };
        drag = null;
        swipeStart = null;
      }
      e.stopPropagation();
    });
    img.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinch) {
        var a = Array.from(pointers.values());
        var distance = Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
        zoom(pinch.scale * distance / Math.max(1,pinch.distance),
          (a[0].x+a[1].x)/2, (a[0].y+a[1].y)/2);
      } else if (drag && scale > 1) {
        x += e.clientX - drag.x; y += e.clientY - drag.y;
        drag = { x: e.clientX, y: e.clientY };
        clamp(); render();
      }
      e.preventDefault(); e.stopPropagation();
    });
    function end(e) {
      if (e.type === 'pointerup' && swipeStart && pointers.size === 1 && scale === 1) {
        var dx = e.clientX - swipeStart.x;
        var dy = e.clientY - swipeStart.y;
        if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5 &&
            Date.now() - swipeStart.time < 1000 && typeof onSwipe === 'function') {
          onSwipe(dx < 0 ? 'next' : 'previous');
        }
      }
      swipeStart = null;
      pointers.delete(e.pointerId);
      drag = null; pinch = null;
      if (pointers.size === 1) {
        var a = Array.from(pointers.values())[0];
        drag = { x: a.x, y: a.y };
      }
      e.stopPropagation();
    }
    img.addEventListener('pointerup', end);
    img.addEventListener('pointercancel', end);
    render();
  };
})();
