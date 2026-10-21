# Bug: external-content export embeds duplicate Base64 images

**Component:** `@lumieducation/h5p-html-exporter`, `HtmlExporter.createBundleWithExternalContentResources()`

## Summary
An export created with `createBundleWithExternalContentResources()` writes content images into an external `index/images/` folder, but the resulting `index.html` also contains Base64 data URIs for those same images in the serialized H5P content parameters. This substantially increases HTML download and parse costs and prevents effective per-image caching.

## Reproduction
1. Export an H5P Interactive Book containing ImageHotspots and H5P.Image slides using external content resources.
2. Inspect the generated HTML for `data:image/jpeg;base64,` and `data:image/png;base64,`.
3. Decode these image data URIs and compare SHA-256 hashes with files under `index/images/`.
4. Observe that identical images are present in both places.

## Measured example
- Original `index.html`: **84,832,903 bytes**
- 31 embedded JPEG data URIs and 4 embedded PNG data URIs.
- All 35 image data URIs matched existing exported files byte-for-byte by SHA-256.
- Replacing these URIs with their corresponding external paths reduced HTML to **2,555,739 bytes**, approximately **97% smaller**.
- The external directory contained 70 image files, including duplicate copies.

## Expected
In external-resource mode, content images that already exist as exported files should be referenced by relative paths, not duplicated as Base64 data URIs. Single-file bundle mode should retain its current inline behavior.

## Proposed upstream patch
In the external-resource export pipeline, after collecting and copying `contentFiles`, build a SHA-256 index of exported image bytes. Before writing the HTML, replace `data:image/jpeg;base64,...` and `data:image/png;base64,...` values **only when** their decoded bytes exactly match an exported image. Leave unmatched data URIs unchanged. Preserve existing URL escaping and the export basename prefix.

Reference implementation (in Lumi's external-export caller, without modifying H5P libraries):

```ts
import { createHash } from 'crypto';

const exportedImages = new Map<string, string>();
// After writing each content file:
if (/\.(jpe?g|png)$/i.test(filename)) {
  const bytes = await fsExtra.readFile(fn);
  exportedImages.set(
    createHash('sha256').update(bytes).digest('hex'),
    `${basename}/${filename.replace(/\\/g, '/')}`
  );
}

const optimizedHtml = html.replace(
  /data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+/g,
  (uri) => {
    const bytes = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
    const hash = createHash('sha256').update(bytes).digest('hex');
    return exportedImages.get(hash) || uri;
  }
);
```

This is a conservative workaround. A preferable upstream implementation would resolve duplicate media paths **before** serializing H5P content parameters, avoiding Base64 creation and large-string replacement altogether.

## Acceptance tests
- External export of nested ImageHotspots and H5P.Image contains no duplicate inline JPEG/PNG resources.
- The referenced images, hotspot coordinates, and GLightbox media still render correctly.
- Nonmatching inline images remain intact.
- Single-file export remains self-contained.
- Paths work from local files and on a static host, including filenames with spaces or special characters.
- Add regression coverage for identical bytes stored under multiple content filenames.

**Status:** Reproduced against a real export. Local workaround compiled, but browser regression testing is still required. Root cause within the upstream serialization path has not yet been proven.
