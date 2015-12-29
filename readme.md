## TOUCH with Leap Motion

![](https://raw.githubusercontent.com/edankwan/touch-leap-motion/master/app/images/screenshot.jpg)

[Live demo](http://www.edankwan.com/experiments/touch/) | [Video](https://www.youtube.com/watch?v=ws3DKUe5xPE)

It is a WebGL demo using Leap Motion and signed distance field to simulate the physics.

The technique behind this demo is very simple. It uses signed distance field to do the collision test on the hand. Basically the whole hand is constructed by the primitive - spheres, cylinders and a hexagonal Prism. You can find all of the distance field functions [here](http://iquilezles.org/www/articles/distfunctions/distfunctions.htm) by Íñgo Quílez.

This demo uses the WebGL framework - [ThreeJS](http://threejs.org) and post-processing helper tool - [Wagner](https://github.com/superguigui/Wagner) forked by [Superguigui](https://twitter.com/Superguigui) originally by [thespite](https://twitter.com/thespite)

The prototype folder boilderplate was cloned from [codevember](https://github.com/mattdesl/codevember) by [Mattdesl](https://twitter.com/mattdesl)

Hand test on [ShaderToy](https://www.shadertoy.com/view/4tSXDt)

## Development and deployment
- dev: `node dev`
- deploy: `node build`

## License
This experiment is under MIT License.

