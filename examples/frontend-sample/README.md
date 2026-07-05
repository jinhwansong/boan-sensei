# boan-sensei Frontend Sample

This tiny project exists so adapter authors and AI coding tools can try the boan-sensei workflow without preparing a full application.

From this directory, run the local CLI engine after building the repository:

```bash
node ../../apps/cli/dist/index.js scan --mode basic
node ../../apps/cli/dist/index.js report --mode basic
node ../../apps/cli/dist/index.js todo
```

Mode checks:

```bash
node ../../apps/cli/dist/index.js scan --mode blue
node ../../apps/cli/dist/index.js report --mode blue

node ../../apps/cli/dist/index.js scan --mode red
node ../../apps/cli/dist/index.js report --mode red

node ../../apps/cli/dist/index.js scan --mode purple
node ../../apps/cli/dist/index.js report --mode purple
```

If your environment exposes `boan-sensei` as a command, you can use `boan-sensei scan` and `boan-sensei report` instead of the `node ../../apps/cli/dist/index.js` form.

Treat generated output as review candidates that need human confirmation.
