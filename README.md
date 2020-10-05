# Ghost Inspector anywhere

Allows to run [Ghost Inspector](https://ghostinspector.com/) tests anywhere through an [ngrok](https://ngrok.com/) tunnel.

## Usage

```bash
node index.js <tests>
```

Where `<tests>` could be either a directory containing Ghost Inspector JSON tests files or a single Ghost Inspector JSON test file.


## TODO

* Allow to configure ngrok tunnel with config file (but watchout for [this issue](https://github.com/bubenshchykov/ngrok/issues/197)
* Better handling of failed test (dump debug info somewhere)
* Allow to install through npm
