# Patchbay.js

[![NPM](https://img.shields.io/npm/v/patchbay.js)](https://www.npmjs.com/package/patchbay.js)
![NPM Downloads](https://img.shields.io/npm/dw/patchbay.js)

![GitHub Issues](https://img.shields.io/github/issues/helgesverre/patchbay-js)
![NPM License](https://img.shields.io/npm/l/patchbay.js)

![Patchbay.js](./art/demo.gif)

JavaScript library for creating interactive physics-based rope simulations connected to DOM
elements.

Inspired
by [Reason Studio's Rack](https://www.reasonstudios.com/rack#:~:text=hear%20what%20happens.-,FLIP%20THE%20RACK,-Scary%20to%20some) ([Video](https://www.reasonstudios.com/videos/Flip-the-rack.mp4)).

## Installation

### Using npm

```shell
npm install patchbay.js

# Or with yarn
yarn add patchbay.js
```

### Using a CDN

```html
<script src="https://unpkg.com/patchbay.js/dist/patchbay.umd.js" defer></script>
```

## Configuration Options

| Option             | Type    | Default            | Description                                                                                                 |
| ------------------ | ------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| color              | string  | "#000000"          | The color of the cable.                                                                                     |
| canvas             | boolean | false              | Render cables on a shared Canvas2D surface instead of individual DOM segments.                              |
| container          | Element | document.body      | The container element for the patchbay.                                                                     |
| dragHandleSize     | number  | 20                 | The size of the drag handles in pixels.                                                                     |
| draggable          | boolean | true               | Whether the cable start/end points are draggable by the user.                                               |
| gravity            | number  | 1                  | The gravity factor applied to the cable. Higher values make the cable sag more.                             |
| iterations         | number  | 5                  | The number of iterations to solve constraints. Higher values increase stability but may impact performance. |
| lineThickness      | number  | 2                  | The thickness of the cable line in pixels.                                                                  |
| segments           | number  | 20                 | The number of segments in the cable. More segments allow for smoother curves but may impact performance.    |
| slack              | number  | 1.1                | The slack factor of the cable. Values greater than 1 allow the cable to hang loosely.                       |
| snapRadius         | number  | 100                | The radius (in pixels) for snapping to connector elements when dragging cable ends.                         |
| snapTargetSelector | string  | ".cable-connector" | The CSS selector for identifying snap target elements.                                                      |
| static             | boolean | false              | When `true`, cables use page coordinates instead of viewport coordinates, so they don't respond to scroll.  |
| zIndex             | number  | 9999               | The CSS z-index of the patchbay container.                                                                  |

### Usage Example

```javascript
import Patchbay from "patchbay.js";

const patchbay = new Patchbay({
  // Global configuration for all cables
  color: "#FF0000",
  gravity: 1.5,
  segments: 30,
  draggable: true,
});

patchbay.connect(document.getElementById("input-1"), document.getElementById("output-2"), {
  // Specific configuration for this cable, overriding global settings
  color: "#00FF00",
  slack: 1.2,
  snapRadius: 150,
});

patchbay.start();
```

### Snapping to HTML Elements when Dragging

Patchbay.js supports snapping to HTML elements when dragging cable ends. To enable this feature, set the
`snapTargetSelector` option to a valid CSS selector for the elements you want to snap to. Patchbay.js will automatically
snap the cable end points to the nearest element when dragging.

```html
Snap here
<div id="start" class="cable-connector"></div>

and here initially.
<div id="end" class="cable-connector"></div>

And if you drag the cable ends close to these elements, it will snap to them.
<div id="snap-here-on-drag" class="cable-connector"></div>

<script>
  const patchbay = new Patchbay({
    // Selector to snap elements to when releasing the cable ends after dragging
    snapTargetSelector: ".cable-connector",
  });

  const start = document.getElementById("start");
  const end = document.getElementById("end");
  patchbay.connect(start, end);
  patchbay.start();
</script>
```

## Examples

Check out the [examples](./examples) directory for some examples of how to use Patchbay.js.

- [Basic Example](./examples/basic-usage.html) - A simple example demonstrating the basic usage of Patchbay.js.
- [Snapping Example](./examples/snapping.html) - An example demonstrating how to snap cable ends to HTML elements.
- [Customization Example](./examples/configurations.html) - An example demonstrating how to customize the appearance and
  behavior of cables.
- [Using the CDN](./examples/using-cdn-link.html) - An example showing how to use Patchbay.js with a CDN.
- [Click to add](./examples/click-to-add.html) - Drag from a port to create and connect a cable.
- [Stress test](./examples/stress-test.html) - Compare DOM and canvas rendering with hundreds of cables.

## Development

To set up the development environment:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the library for production

```shell
git clone git@github.com:HelgeSverre/patchbay-js.git
cd patchbay-js
npm install
npm run build
```

### Verification

Use Node 24 (see `.nvmrc`) and install the browser binaries once:

```shell
npm ci
npx playwright install chromium firefox webkit
npm test
npm run test:e2e
npm run test:package
```

`npm test` runs unit and regression tests in Chromium, Firefox, and WebKit. `npm run test:e2e` builds the library and tests the example pages, dragging, snapping, scrolling, resizing, and stress controls in all three browsers. The Chromium checks also use a high DPI display. The CDN example requires an internet connection.

`npm run test:package` installs a temporary npm tarball and checks ESM and CommonJS imports and package contents. Use `npm run test:headed` to watch the Chromium unit tests. Performance traces from `node scripts/profile.mjs 300 5 true` are stored locally in `profiles/` and excluded from Git and npm packages.

### Formatting

This project uses [Prettier](https://prettier.io/) for code formatting. To format the code, run:

```shell
npm run format
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is [MIT](https://opensource.org/licenses/MIT) licensed.
