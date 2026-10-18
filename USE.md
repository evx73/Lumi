# Lumi custom development

After running the setup below, the installed `C:\Program Files\Lumi\resources\app` is a junction to this `custom` worktree. The original unpacked app is preserved as `app-before-custom`.

## One-time setup (elevated PowerShell)

Close Lumi, then run:

```powershell
& "$env:APPDATA\src\lumi\custom\setup-junction.ps1"
```

Requires administrator privileges to rename the installed application directory.

## Development (Cygwin Bash)

```sh
cd "$(cygpath -u "$APPDATA")/src/lumi/custom"
npx tsc --watch
```

Keep watch running while editing `src/**/*.ts`. It recompiles to `build/` on save. Restart Lumi to load changed backend JavaScript. Frontend (`client/`) changes may require their own build.

## Dependency patches

```sh
./apply-patches.sh
```

Applies `patches/*.patch` to their configured installed-Lumi targets, skipping patches already applied and stopping on errors. Add a target mapping in `apply-patches.sh` for each new patch.

## Restore original unpacked application

Close Lumi, then in an elevated PowerShell:

```powershell
$resources = 'C:\Program Files\Lumi\resources'
(Get-Item "$resources\app").LinkType  # must say Junction
cmd /c rmdir "$resources\app"
Rename-Item "$resources\app-before-custom" 'app'
```

Do not delete the junction with recursive removal, and do not delete `app-before-custom` until the setup has been tested.

## Export and publish

In **File**, use **Export..** once to choose format, options, and destination. Thereafter **Export (last settings)** repeats that export without a dialog, **Publish** stages/commits/pushes from the last export folder (which must be the Git repository root), and **Export and Publish** runs both in order. The commit message is "Update presentation". If no files changed, Publish does nothing. Open and Export remember different folders. Settings are saved in Lumi user data as last-export.json, open-directory.json, and export-directory.json.

