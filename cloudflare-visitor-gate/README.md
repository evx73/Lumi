# Lumi visitor gate (casual access only)

GitHub Pages remains public. This is a visitor-specific link check and log, not real access control.

1. Run `npx wrangler login` and authorise Cloudflare in your browser.
2. Run `npx wrangler d1 create lumi-visitors`, then copy the returned database ID into `wrangler.toml`.
3. Run `npx wrangler d1 execute lumi-visitors --remote --file=schema.sql`.
4. Add visitors with a random key, e.g. `npx wrangler d1 execute lumi-visitors --remote --command="INSERT INTO visitors (key,name) VALUES ('YOUR_RANDOM_KEY','Contractor A')"`.
5. Run `npx wrangler deploy` and copy the workers.dev URL.
6. Add the gate script to a **test copy** of your HTML, replace WORKER_URL with the deployed URL, and test valid/invalid keys.
7. View logs: `npx wrangler d1 execute lumi-visitors --remote --command="SELECT v.name,l.page,l.visited_at FROM visits l JOIN visitors v ON v.key=l.key ORDER BY l.id DESC LIMIT 50"`.

Do not publish visitor names or the D1 database. Do not put the gate script in a separate file if you want to hide the H5P until the check succeeds. A client-side gate is bypassable, and any linked images remain public.
