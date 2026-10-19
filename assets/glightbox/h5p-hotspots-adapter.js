/* GLightbox adapter for exported H5P ImageHotspots. H5P editor is unchanged. */
(function () {
  'use strict';
  if (!window.GLightbox || !window.H5P || !H5P.ImageHotspots ||
      !H5P.ImageHotspots.Hotspot) return;

  var prototype = H5P.ImageHotspots.Hotspot.prototype;
  var originalShow = prototype.showPopup;

  prototype.showPopup = function (focusPopup) {
    var hotspot = this;
    var actions = hotspot.config && hotspot.config.content;
    if (!Array.isArray(actions) || actions.length === 0) {
      return originalShow.call(hotspot, focusPopup);
    }

    var instances = [];
    var slides = actions.map(function (action, index) {
      var wrapper = document.createElement('div');
      wrapper.className = 'lumi-glightbox-action';
      wrapper.setAttribute('data-lumi-slide', String(index));
      wrapper.style.cssText = 'width:100%;height:100%;overflow:hidden;background:transparent;color:white;';
      return { content: wrapper, type: 'inline', width: 'auto', height: 'auto' };
    });
    var gallery;
    try {
      gallery = window.GLightbox({
        elements: slides,
        loop: false,
        touchNavigation: true,
        keyboardNavigation: true,
        closeOnOutsideClick: true
      });
      gallery.on('slide_after_load', function (event) {
        var index = event.index;
        var slide = event.slideNode;
        var container = slide && slide.querySelector('.lumi-glightbox-action');
        if (!container || instances[index]) return;
        try {
          var instance = H5P.newRunnable(actions[index], hotspot.id);
          instances[index] = instance;
          instance.attach(H5P.jQuery(container));
          if (actions[index].library && actions[index].library.split(' ')[0] === 'H5P.Image') {
            var attempts = 0;
            var zoomTimer = setInterval(function () {
              attempts += 1;
              if (container.querySelector('img') && window.lumiAttachImageZoom) {
                window.lumiAttachImageZoom(container, function (direction) {
                  if (direction === 'next') gallery.nextSlide();
                  else gallery.prevSlide();
                });
                clearInterval(zoomTimer);
              } else if (attempts >= 30) clearInterval(zoomTimer);
            }, 100);
          }
          if (typeof instance.trigger === 'function') {
            setTimeout(function () { instance.trigger('resize'); }, 0);
          }
        } catch (error) {
          console.error('GLightbox H5P slide failed', error);
          container.textContent = 'Unable to display this media item.';
        }
      });
      gallery.on('slide_changed', function (event) {
        var previous = event.prev && event.prev.slideNode;
        if (!previous) return;
        previous.querySelectorAll('video,audio').forEach(function (media) {
          if (typeof media.pause === 'function') media.pause();
        });
      });
      gallery.on('close', function () {
        document.querySelectorAll('.gslide video, .gslide audio').forEach(function (media) {
          if (typeof media.pause === 'function') media.pause();
        });
        hotspot.$element && hotspot.$element.trigger('focus');
        setTimeout(function () { gallery.destroy(); }, 0);
      });
      gallery.open();
      // Native fullscreen elements form a separate top layer. An overlay
      // appended to document.body is hidden behind that layer.
      var fullscreenRoot = document.fullscreenElement ||
        document.webkitFullscreenElement ||
        hotspot.$element && hotspot.$element[0] &&
        hotspot.$element[0].closest('.h5p-fullscreen, .h5p-semi-fullscreen');
      if (fullscreenRoot) {
        var overlay = document.querySelector('.glightbox-container');
        if (overlay && !fullscreenRoot.contains(overlay)) {
          fullscreenRoot.appendChild(overlay);
        }
      }
    } catch (error) {
      console.error('GLightbox failed; reverting to H5P popup', error);
      if (gallery) gallery.destroy();
      return originalShow.call(hotspot, focusPopup);
    }
  };
})();
