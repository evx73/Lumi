/* Lumi-only image linking preference. H5P files remain untouched. */
(function () {
  let embed = false;
  const flag = document.createElement('label');
  flag.id = 'lumi-embed-images';
  flag.style.cssText = 'position:fixed;right:12px;top:8px;z-index:2147483647;background:#fff;color:#222;padding:6px 10px;border:1px solid #aaa;border-radius:5px;font:13px sans-serif';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.addEventListener('change', function () { embed = check.checked; });
  flag.append(check, document.createTextNode(' Embed images'));
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(flag); });

  function patch(win) {
    try {
      if (win.H5P && win.H5P.getPath && !win.H5P.getPath.__lumiLinked) {
        const originalGetPath = win.H5P.getPath;
        const getPath = function (source, contentId) {
          if (typeof source === 'string' && source.startsWith('file:///')) {
            return '/api/v1/content/' + encodeURIComponent(contentId || (win.H5PEditor && win.H5PEditor.contentId) || 'new') + '/linked-image?source=' + encodeURIComponent(source);
          }
          return originalGetPath.apply(this, arguments);
        };
        getPath.__lumiLinked = true;
        win.H5P.getPath = getPath;
      }
      const editor = win.H5PEditor;
      if (editor && editor.widgets && editor.widgets.image && !editor.widgets.image.prototype.__lumiPathShown) {
        const prototype = editor.widgets.image.prototype;
        const originalAppend = prototype.appendTo;
        prototype.appendTo = function ($wrapper) {
          const result = originalAppend.apply(this, arguments);
          const widget = this;
          const $path = editor.$('<div class="lumi-image-path" style="font:12px sans-serif;overflow-wrap:anywhere;margin:6px 0;color:#555"></div>');
          widget.$file.after($path);
          function updatePath() {
            const source = widget.params && widget.params.path;
            if (typeof source === 'string' && source.startsWith('file:///')) {
              let readable = source;
              try { readable = decodeURIComponent(source.slice(8)).replace(/\//g, '\\'); } catch (_) {}
              $path.text('Linked image: ' + readable).attr('title', readable).show();
            } else if (typeof source === 'string' && source) {
              $path.text('Embedded image: ' + source).attr('title', source).show();
            } else {
              $path.empty().hide();
            }
          }
          widget.on('fileUploaded', updatePath);
          widget.on('uploadComplete', updatePath);
          updatePath();
          return result;
        };
        prototype.__lumiPathShown = true;
      }
      if (!editor || !editor.FileUploader || editor.FileUploader.__lumiLinked) return;
      const Original = editor.FileUploader;
      function LinkedUploader(field) {
        Original.call(this, field);
        if (field.type !== 'image') return;
        const originalSelect = this.openFileSelector;
        const instance = this;
        this.openFileSelector = function () {
          if (embed) { originalSelect.call(instance); return; }
          fetch('/api/v1/linked-image/select', { method: 'POST' })
            .then(function (response) { if (!response.ok) throw Error('Image selection failed'); return response.json(); })
            .then(function (result) {
              if (result.canceled) return;
              instance.trigger('upload');
              instance.trigger('uploadComplete', { error: null, data: result });
            })
            .catch(function (error) { instance.trigger('uploadComplete', { error: error.message, data: null }); });
        };
      }
      LinkedUploader.prototype = Original.prototype;
      LinkedUploader.__lumiLinked = true;
      editor.FileUploader = LinkedUploader;
    } catch (error) { console.warn('Lumi linked images:', error); }
  }
  setInterval(function () {
    patch(window);
    document.querySelectorAll('iframe').forEach(function (frame) {
      try { if (frame.contentWindow) patch(frame.contentWindow); } catch (_) { /* cross origin */ }
    });
  }, 200);
})();
