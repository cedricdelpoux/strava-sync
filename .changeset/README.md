# Changesets

Run `npm run changeset` to describe a change to one or more packages.
The release is versioned locally with `npx npm@11 run version-packages`, then
committed as one `chore(<package>): bump version to vX.Y.Z` per bumped package
(the root lock in the last one) and pushed to `main`. The release workflow
publishes the new versions when it finds no pending changeset.
