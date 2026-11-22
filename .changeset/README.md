# Changesets

Run `npm run changeset` to describe a change to one or more packages.
The release is versioned locally with `npx npm@11 run version-packages`, then
committed as `chore: bump packages versions` and pushed to `main`. The release
workflow publishes the new versions when it finds no pending changeset.
