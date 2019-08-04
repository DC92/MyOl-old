# MyOl
DEVELOPMENT AREA DON'T USE

TEST

Code & all tiled layers use EPSG:3857 spherical mercator projection

The coding rules are volontary simple & don't follow all openlayers's
* No class, no inheritage, no jquery...
* Each adaptation is included in a single JS function that you can include separately (check dependencies if any)
* Feel free to use, modify & share as you want

Architecture:
Just include myol.js & myos.css after ol/dist, proj4js & geocoder's js & css
See index.html for example

Composants:
- ol-dist : https://openlayers.org/download/  dist.zip
- proj4js-dist : https://github.com/proj4js/proj4js/releases  dist/*
- geocoder-dist : https://github.com/jonataswalker/ol-geocoder  dist/*
- myol.js : My openlayers adaptation library
- index.html .css .js : test & demo files