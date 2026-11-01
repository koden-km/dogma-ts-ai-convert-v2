I would like to port a Go language library/framework to TypeScript.

The Go language code is from GitHub:
https://github.com/dogmatiq
https://github.com/orgs/dogmatiq/repositories?type=all

The Go language code is wrriten in idomatic Go style. For the TypeScript conversion, prefer idomatic TypeScript (types instead of interfaces where possible, plain objects and functions instead of classes). I would like to port the general behaviour, some freedom can be taken in naming and structure. Feel free to pause and ask any questions along the way. This is an experimental project. Porting the tests would be good and `testkit` should allow running with an in memory test database, so we shouldn't need anything extra.

In this current directory i've created some directories and cloned some repos to use as a reference:
- `dogma-go-reference` This directory contains the main Go lang repo's to use as a reference (as well as GitHub on the web if required and if you have access?). Inspect these, their README.md's to help plan. Within this directory, the `example` repo is the main "app" goal, everything else is the Dogma library/framework that the app is built on.
- `dogma-ts-prototype` This is a partially done manual port from Go to TypeScript that I have been working on. I was reasonably happy with convertion of the `dogma/message.ts` (Commands, Events, Deadlines), and the usage in `example/app/messages/` and `example/app/domain/account.ts`. There is a lot of commented out partially converted code and scratch notes for ideas. Feel free to improve on that code where possible.
- `dogma-ts` This is where I would like you to add the ported code. Split it up into separate directories for each of the ported Go repos like how the `dogma-ts-prototype/src/` was doing and follow the mono repo thing so imports can be done directly without doing builds through `npm` registry.

