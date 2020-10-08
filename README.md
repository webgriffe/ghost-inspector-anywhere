# Ghost Inspector anywhere

Allows to run [Ghost Inspector](https://ghostinspector.com/) tests anywhere through an [ngrok](https://ngrok.com/) tunnel.

## Install

```bash
yarn install @webgriffe/ghost-inspector-anywhere
```

## Usage

```bash
yarn run ghost-inspector-anywhere \
	<tests> \
	<outputDir> \
	[--setup-script=<setupScript>] \
	[--teardown-script=<teardownScript>]
```

Where `<tests>` could be either a directory containing Ghost Inspector JSON tests files or a single Ghost Inspector JSON test file;
and `outputDir` must be a directory where to store tests results JSON files.

`<setupScript>` and `<teardownScript>` could be scripts to execute before and after running tests. The ngrok tunnel URL is passed to both scripts as first argument.

## License

This library is under the MIT license. See the complete license in the LICENSE file.

## Credits

Developed by [Webgriffe®](http://www.webgriffe.com/).