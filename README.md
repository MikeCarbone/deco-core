# Deco Core

This repo is a collection of core Deco plugins. Each of these are the default plugins that power a Deco server.

## What's inside?

Here are the core plugins that this repository is home to:

-   [Deco Auth](./packages/deco-auth/)
-   [Deco Notifications](./packages/deco-notifications/)
-   [Deco Permission Requests](./packages/deco-permission-requests/)
-   [Deco Permissions](./packages/deco-permissions/)
-   [Deco Plugins](./packages/deco-plugins/)
-   [Deco Users](./packages/deco-users/)

### Utilities

This Turborepo has some additional tools already setup for you:

-   [TypeScript](https://www.typescriptlang.org/) for static type checking
-   [ESLint](https://eslint.org/) for code linting
-   [Prettier](https://prettier.io) for code formatting
-   [Vite](https://vitejs.dev) for building

### Build

To build all apps and packages, run the following command:

```bash
turbo build
```

You may have to [install Turbo](https://turbo.build/repo/docs/installing#install-globally) for this command to work.

## Useful Links

Learn more about the power of Turborepo:

-   [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
-   [Caching](https://turbo.build/repo/docs/core-concepts/caching)
-   [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
-   [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
-   [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
-   [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)

## Deployment

We need to figure out a solution to deploy these packages upon push to a repo. I need the scripts available via URL. We may want to do other things to these like track downloads. For now let's just get it live.

-   `server/public`` isnt touched in the repo
-   When code is merged into main, then we use GH Action to build those files into main, make new commit into the repo
-   Deployment just has to load the repo, build and run from root directory
