# Registry

## Considerations

Directory `/public/plugins` should not be touched directly. The files within are a side-effect of package builds, and running `npm run deploy` in the root directory of `deco-core`. No user-created PRs should ever include a diff to `/public/plugins`.
