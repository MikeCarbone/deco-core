# Deco Plugins

This plugin is the first stepping stone in the Deco plugin universe. This plugin is responsible for creating the plugins table, which keeps a record of installed plugins.

## Post-First-Install

Once a _new_ plugin is installed, we can rebuild routes and the new app should become available.

## Post-Updates

If an app is already installed, dynamic importing makes it impossible to refresh the import cache. So we'll need a solution there.
