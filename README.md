# Online IDE for code editing with git version control integration for IrisJS

## Description
Free yourself from setting up development environments and installing/maintaining software. With this modules you can build
complex Iris websites/webapps from any modern browser, regardless of device.
This module allows authorised users to create/checkout git branches into a development area away from the live code.
Coding changes can then be committed/merged/pushed to the git repository. Another tab then allows you to fetch/merge/checkout
onto the live codebase. Iris cannot directly alter live files, everything is version-controlled.
As Iris uses JSONForm's, JSONForm comes with [ACE](https://ace.c9.io/) integration for natural code editing of JS/JSON, css, etc.
JsTree provides easy navigation of file directories and shows which files have changes since the last commit.

## Quick install

1. In your project directory run 'npm install irisjs-editor'
2. Set appropriate permissions.
3. Visit /irisjs-editor/editor to begin.

*This module requires your site root path to be version controlled*

## How to use

1. To edit code, go to /irisjs-editor/editor and follow the initial steps to clone your code into a tmp directory.
2. Checkout/create and leave the current branch in use.
3. Make any changes to the code files, clicking 'Save file' for each.
3. After making the required changes, commit changes and merge branches or push the commit changes.
4. To deploy, click the 'Deployment' tab.
5. Click 'Fetch all' in the actions drop-down to updated local branches.
6. Merge the newly fetched remote branch with the current branch (From 'origin/master' To 'master' for example). Or checkout an alternative branch.
