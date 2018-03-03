//******************************************************************************
// OPENLAYERS V4 ADAPTATION - https://openlayers.org/
// (C) Dominique Cavailhez 2017 - https://github.com/Dominique92
//
// Code & all tiled layers use EPSG:3857 spherical mercator projection
// Each feature is included in a single function that you can include separately
//******************************************************************************

/**
 * Detects real human activity.
 * If none, cookieHit = false suppose it's a bot.
 */
//TBD ne détecte pas seulement le reload : n'affiche pas !
var pageHit = 0,
	cookieHit = navigator.cookieEnabled && parseInt((document.cookie + 'activity=1').match(/activity=([^;]+)/)[1]);

function checkHit() {
	document.cookie = 'activity=' + (cookieHit + pageHit++) / 2 + ';path=/';
}
checkHit();

['mousemove', 'scroll', 'touchstart', 'touchmove'].map(function(e) {
	window.addEventListener(e, checkHit);
});
/////////////////////////////////////////////////////////

/**
 * Inactive all layers if it's a bot
 */
if (navigator.userAgent.search( // Inactive maps if agent is a bot
		/arach|archiver|bot|crawl|curl|factory|index|partner|rss|scoot|search|seek|semantic|spider|spyder|yandex/i
	) != -1) {
	ol.Map.prototype.addLayer = function() {};
}

/**
 * ol.layer options
 * option.onAdd {function(map)} to be executed when the layer is added to the map
 * option.hover {ol.style.Style | ol.StyleFunction} style to be used when the pointer hover the feature
 * option.click {ol.style.Style | ol.StyleFunction} style to be used when the mouse click on the feature
 */
var oldMapAddLayer = ol.Map.prototype.addLayer;
ol.Map.prototype.addLayer = function(layer) { // Overwrite ol.Map.addLayer
	oldMapAddLayer.call(this, layer); // Call former method
	layer.onAdd_(this); // Call ol.layer function
};

var oldLayerBase = ol.layer.Base;
ol.layer.Base = function(options) { // Overwrite ol.layer
	oldLayerBase.call(this, options); // Call former method

	this.onAdd_ = function(map) { // Private function called by ol.Map.addLayer
		// onAdd layer option
		if (typeof options.onAdd == 'function')
			options.onAdd.call(this, map);

		// Hover layer option
		if (options.hover) {
			var hoverInteraction = new ol.interaction.Select({
				layers: [this],
				condition: ol.events.condition.pointerMove,
				style: function(feature) {
					// Change pointer while hovering a clicable feature
					if (options.click)
						map.getViewport().style.cursor = 'pointer';

					// Get the hover sytle
					return typeof options.hover == 'function' ?
						options.hover(feature) :
						options.hover;
				}
			});
			// Get back the basic pointer when move out from the feature
			ol.events.listen(
				hoverInteraction.getFeatures(),
				ol.CollectionEventType.REMOVE,
				function() {
					map.getViewport().style.cursor = 'auto';
				}
			);
			map.addInteraction(hoverInteraction);
		}

		// Click layer option
		if (options.click)
			map.addInteraction(new ol.interaction.Select({
				layer: this,
				condition: ol.events.condition.singleClick,
				style: options.click
			}));
	}
};

//***************************************************************
// GEOJSON & AJAX LAYERS
//***************************************************************
/**
 * BBOX LIMITED STRATEGY
 * return {ol.loadingstrategy} to be used in layer definition
 *
 * Same that bbox but reloads if we zoom in because more points can be under the limit
 * Requires ol.Map.prototype.addLayer
 */
ol.loadingstrategy.bboxLimited = function(extent, resolution) { // === bbox
	if (this.resolution != resolution) // Force loading when zoom in
		this.clear();
	this.resolution = resolution;
	return [extent];
};

/**
 * GEOJSON POI LAYER
 * return {ol.layer.Vector} to be added to the map
 *
 * Requires ol.layer onAdd options
 */
function geoJsonLayer(options) {
	return new ol.layer.Vector(ol.obj.assign({
		source: new ol.source.Vector({
			url: function(extent, resolution, projection) {
				return options.url + '&bbox=' +
					ol.proj.transformExtent(extent, projection.getCode(), 'EPSG:4326').join(',');
			},
			format: new ol.format.GeoJSON(),
			strategy: ol.loadingstrategy.bboxLimited
		}),
		style: function(feature) {
			return new ol.style.Style({
				image: new ol.style.Icon({
					src: options.properties(feature.getProperties()).styleImage
				}),
				offset: [8, 8]
			});
		},
		hover: function(feature) {
			return new ol.style.Style({
				text: new ol.style.Text({
					text: options.properties(feature.getProperties()).hoverText.toUpperCase(),
					font: 'bold 10px Verdana',
					fill: new ol.style.Fill({
						color: 'black'
					}),
					stroke: new ol.style.Stroke({
						color: 'yellow',
						width: 8
					})
				})
			});
		},
		click: function(feature) {
			window.location.href = options.properties(feature.getProperties()).clickUrl;
		}
	}, options));
}

/**
 * www.refuges.info POI LAYER
 * return {ol.layer.Vector} to be added to the map
 *
 * Requires ol.layer onAdd options
 */
function pointsWriLayer() {
	return geoJsonLayer({
		url: '//www.refuges.info/api/bbox?type_points=7,10,9,23,6,3,28',
		properties: function(property) {
			return {
				styleImage: 'http://www.refuges.info/images/icones/' + property.type.icone + '.png',
				hoverText: property.nom,
				clickUrl: property.lien
			}
		}
	});
}

/**
 * www.refuges.info AREAS LAYER
 * return {ol.layer.Vector} to be added to the map
 *
 * Requires ol.layer onAdd options
 */
function massifsWriLayer() {
	return geoJsonLayer({
		url: '//www.refuges.info/api/polygones?type_polygon=1',
		style: function(feature) {
			// Traduit la couleur en rgba pour pouvoir lui appliquer une transparence
			var cs = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(feature.getProperties().couleur);
			return new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(' + parseInt(cs[1], 16) + ',' + parseInt(cs[2], 16) + ',' + parseInt(cs[3], 16) + ',0.5)'
				}),
				stroke: new ol.style.Stroke({
					color: 'black'
				})
			});
		},
		hover: function(feature) {
			return new ol.style.Style({
				text: new ol.style.Text({
					text: feature.getProperties().nom,
					font: '12px Verdana',
					fill: new ol.style.Fill({
						color: 'white'
					}),
					stroke: new ol.style.Stroke({
						color: feature.getProperties().couleur,
						width: 5
					})
				}),
				fill: new ol.style.Fill({
					color: feature.getProperties().couleur
				}),
				stroke: new ol.style.Stroke({
					color: 'black'
				})
			});
		}
	});
}

/**
 * OSM OVERPASS POI LAYER
 * return {ol.layer.Vector} to be added to the map
 *
 * doc: http://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
 * from: https://openlayers.org/en/latest/examples/vector-osm.html
 * Requires ol.layer.VectorAction
 */
function overpassLayer(request) {
	var popup = new ol.Overlay(({
		positioning: 'bottom-center',
		offset: [0, -10],
		element: document.createElement('div'),
		autoPan: true,
		autoPanAnimation: {
			duration: 250
		}
	}));

	function overpassProperties(feature) {
		var p = feature.getProperties();
		var r = { // Default
			icon: 'batiment-en-montagne',
			name: 'Inconnu'
		};

		// Icon
		for (var i in request) { // hotel: ["tourism"="hotel|guest"]...
			var selection = request[i].split('"'), // [ tourism = hotel|guest ] ...
				selectedProperty = p[selection[1]]; // tourism: 'guest'
			if (selectedProperty &&
				selectedProperty.match(new RegExp(selection[3]))) // hotel|guest
				r.name = r.icon = i;
		}

		// Name
		var language = {
				hotel: 'hôtel',
				guest_house: 'chambre d\'hôte',
				chalet: 'gîte rural',
				apartement: 'meublé de tourisme',
				hostel: 'auberge de jeunesse/gîte d\'étape',
				camp_site: 'camping',
				convenience: 'alimentation',
				supermarket: 'supermarché',
				bus_stop: 'arrêt de bus'
			},
			n = ['old_name', 'alt_name', 'official_name', 'short_name', 'name:ch', 'name:en', 'name:fr', 'name'];
		for (var i in n)
			if (p[n[i]])
				r.name = p[n[i]];
		r.name = r.name.replace( // Word translation if necessary
			new RegExp(Object.keys(language).join('|'), 'gi'),
			function(m) {
				return language[m.toLowerCase()];
			}
		);

		// Fallback for contact:xxx properties
		for (var i in p) {
			is = i.split(':');
			if (is[0] == 'contact' && is.length == 2)
				p[is[1]] = p[i];
		}

		// Popup
		var txt = [
			'<b>' + r.name + '</b>', [
				r.icon,
				'*'.repeat(p.stars),
				p.rooms ? p.rooms + 'ch' : '',
				p.beds ? p.beds + 'p' : '',
				p.places ? p.places + 'p' : '',
				p.capacity ? p.capacity + 'p' : '',
			],
			p.ele ? 'Alt: ' + p.ele + 'm' : '',
			p.phone ? '&#9742; <a href="tel:' + p.phone.replace(/[^0-9\+]+/ig, '') + '">' + p.phone + '</a>' : '',
			p.mobile ? '&#9742; <a href="tel:' + p.mobile.replace(/[^0-9\+]+/ig, '') + '">' + p.mobile + '</a>' : '',
			p.email ? '<a href="mailto:' + p.email + '">' + p.email + '</a>' : '', [
				p['addr:housename'],
				p['addr:housenumber'],
				p['addr:street'],
				p['addr:hamlet'],
				p['addr:place'],
				p['addr:postcode'],
				p['addr:city']
			],
			p.website ? '<a href="' + p.website + '">' + p.website.substring(0, 30) + (p.website.length > 30 ? '...' : '') + '</a>' : '',
			'Voir sur <a href="http://www.openstreetmap.org/' + p.tag + '/' + feature.getId() + '" target="_blank">OSM</a> &copy;',
		];

		r.popup = ('<p>' + txt.join('</p><p>') + '</p>')
			.replace(/,/g, ' ').replace(/\s+/g, ' ').replace(/\s+<\/p>/g, '<\/p>').replace(/<p>\s*<\/p>/ig, '');

		return r;
	}

	return new ol.layer.Vector({
		source: new ol.source.Vector({
			format: new ol.format.OSMXML(),
			strategy: ol.loadingstrategy.bbox,

			loader: function(extent, resolution, projection) { // AJAX XML loader for OSM overpass
				// Prepare arguments
				var source = this, // To reuse it in a later closure function (load)
					client = new XMLHttpRequest(),
					ex4326 = ol.proj.transformExtent(extent, projection, 'EPSG:4326'),
					bbox = '(' + ex4326[1] + ',' + ex4326[0] + ',' + ex4326[3] + ',' + ex4326[2] + ')',
					args = [],
					selections = Object.values(request);
				for (var s in selections)
					args.push('node' + selections[s] + bbox, 'way' + selections[s] + bbox);

				// Send the AJAX request
				client.open('POST', '//overpass-api.de/api/interpreter');
				client.send('(' + args.join(';') + ');out center;');

				// Receive the response
				client.addEventListener('load', function() {
					// Optionaly replace way (surface) by node (centered point)
					var xml = client.responseText.replace(
						/<way id="([0-9]+)">\s*<center lat="([0-9\.]+)" lon="([0-9\.]+)"\/>(.*)/g,
						'<node id="$1" lat="$2" lon="$3">'
					).replace(
						/<\/(way|node)>/g,
						'<tag k="tag" v="$1"/></node>'
					);

					var features = new ol.format.OSMXML().readFeatures(xml, {
						featureProjection: map.getView().getProjection()
					});
					source.addFeatures(features);
				});
			}
		}),

		onAdd: function(map) {
			popup.getElement().className = 'overpass-popup';
			map.addOverlay(popup);

			// Click or change map size close the popup
			map.on(['click', 'change:size'], function() {
				popup.getElement().innerHTML = '';
			});
		},

		style: function(feature) {
			return new ol.style.Style({
				image: new ol.style.Icon({
					src: '//www.refuges.info/images/icones/' + overpassProperties(feature).icon + '.png' // hotel
				}),
				offset: [8, 8]
			})
		},

		hover: function(feature) {
			return new ol.style.Style({
				text: new ol.style.Text({
					text: overpassProperties(feature).name.toUpperCase(),
					font: 'bold 10px Verdana',
					fill: new ol.style.Fill({
						color: 'black'
					}),
					stroke: new ol.style.Stroke({
						color: '#def',
						width: 8
					})
				})
			});
		},

		click: function(feature) {
			popup.getElement().innerHTML = overpassProperties(feature).popup;
			popup.setPosition(feature.getGeometry().flatCoordinates);
		}
	});
}

//******************************************************************************
// CONTROLS
//******************************************************************************
/**
 * CONTROL BUTTONS
 * Abstract definition to be used by other control buttons definitions
 *
 * options.invisible {true | false | undefined} add a control button to the map.
 * label {string} character to be displayed in the button.
 * options.color {string} backgrond color of the button.
 * options.className {string} className of the button.
 * options.rightPosition {float} distance to the top when the button is on the right of the map.
 * options.title {string} displayed when the control is hovered.
 * options.render {function} called when the control is rendered.
 * options.action {function} called when the control is clicked.
 * return {ol.control.Control}
 */
var nextButtonTopPos = 6; // Top position of next button (em)

function controlButton(label, options) {
	var button = document.createElement('button');
	button.innerHTML = label;
	if (options.action)
		button.addEventListener('click', options.action, false);
	if (options.color)
		button.style.backgroundColor = options.color; // Colore le bouton

	var element = document.createElement('div');
	element.className = 'ol-button ol-unselectable ol-control ' + (options.className || '');
	if (options.invisible)
		element.style.display = 'none';
	else if (options.rightPosition) {
		element.style.right = '.5em';
		element.style.top = options.rightPosition + 'em';
	} else {
		element.style.left = '.5em';
		element.style.top = (nextButtonTopPos += 2) + 'em';
	}
	element.title = options.title;
	element.appendChild(button);

	return new ol.control.Control({
		element: element,
		render: options.render
	});
}

/**
 * PERMALINK CONTROL
 * options.invisible {true | false | undefined} add a permalink button to the map.
 * options.init {true | false | undefined} use url hash or "permalink" cookie to position the map.
 * url hash or "permalink" cookie {<ZOOM>/<LON>/<LAT>/<LAYER>}
 * return {ol.control.Control} to be added to the map
 *
 * Requires controlButton
 * Must be called before controlLayers
 */
function permalink(options) {
	options = options || {};
	var params;

	return controlButton('&infin;', {
		title: 'Permalien',
		invisible: options.invisible,
		render: function(event) {
			var view = event.map.getView();

			// Set the map at permalink position
			if (options.init != false && // If use hash & cookies
				typeof params == 'undefined') { // Only once
				params = location.hash.substr(1).split('/'), // Get url permalink
					cookie = document.cookie.match(/permalink=([^;]+)/); // Get cookie permalink

				if (params.length < 4 && // Less than 4 params
					cookie) // There is a permalink cookie
					params = cookie[1].split('/');

				if (params.length >= 4) { // Got zoom/lon/lat/layer
					view.setZoom(params[0]);
					view.setCenter(ol.proj.transform([parseFloat(params[1]), parseFloat(params[2])], 'EPSG:4326', 'EPSG:3857'));
					// Also select layer
					var inputs = document.getElementsByTagName('input');
					for (var i in inputs)//TDB ne marche pas tout le temps !!! => for i=0;... ???
						if (inputs[i].name == 'base')
							inputs[i].checked =
								inputs[i].value == decodeURI(params[3]);
					event.map.dispatchEvent('click'); // Simulates a map click to refresh the layer switcher if any
					view.dispatchEvent('change'); // Simulates a view change to refresh the layers depending on the zoom if any
				}
			}

			// Mem map position & layers
			var ll4326 = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
			params = [
				parseInt(view.getZoom()),
				Math.round(ll4326[0] * 100000) / 100000,
				Math.round(ll4326[1] * 100000) / 100000
			];
			event.map.getLayers().forEach(function(event) {
				if (event.getVisible() && event.name_)
					params[3] = encodeURI(event.name_);
			});

			// Mem position in a cookie
			document.cookie = 'permalink=' + params.join('/') + ';path=/';
		},
		// Set permalink at map position
		action: function() {
			window.location.href = window.location.pathname + '#' + params.join('/');
		}
	});
}

/**
 * LAYER SWITCHER CONTROL
 * baseLayers {[ol.layer]} layers to be chosen one to fill the map.
 * overLayers {[ol.layer]} layers that can be independenly added to the map.
 * return {ol.control.Control} to be added to the map
 *
 * Requires controlButton
 * Must be called after permalink
 */
function controlLayers(baseLayers, overLayers) {
	var control = controlButton('&hellip;', {
		title: 'Liste des cartes',
		rightPosition: 0.5,
		render: render
	});

	// Curseur de transparence
	var rangeElement = document.createElement('input');
	rangeElement.type = 'range';
	rangeElement.className = 'range-layer';
	rangeElement.style.display = 'none';
	rangeElement.oninput = displayLayerSelector;
	control.element.appendChild(rangeElement);

	// Layers selector
	var selectorElement = document.createElement('div');
	selectorElement.className = 'switch-layer';
	selectorElement.style.display = 'none';
	selectorElement.style.overflow = 'auto';
	selectorElement.title = 'Ctrl+click : plusieurs fonds';
	control.element.appendChild(selectorElement);

	// When the map is created & rendered
	var map;
	function render(event) {
		if (!selectorElement.childElementCount) { // Only the first time
			map = event.map; // Take occasion to mem the map reference !

			// Base layers selector init
			for (var name in baseLayers) {
				var checked = selectorElement.childElementCount ? '' : ' checked="checked"',
					lineElement = document.createElement('div');
				lineElement.innerHTML =
					'<input type="checkbox" name="base"' + checked + ' value="' + name + '">' +
					'<span title="">' + name + '</span>';
				lineElement.onclick = checkLayer;
				selectorElement.appendChild(lineElement);

				baseLayers[name].setVisible(!!checked);
				baseLayers[name].name_ = name;
				map.addLayer(baseLayers[name]);
			}

			// Independant layers selector init
			selectorElement.appendChild(document.createElement('hr'));
			for (name in overLayers) {
				var lineElement = document.createElement('div');
				lineElement.innerHTML =
					'<input type="checkbox" name="over" checked="checked" value="' + name + '">' +
					'<span title="">' + name + '</span>';
				lineElement.onclick = displayLayerSelector;
				selectorElement.appendChild(lineElement);

				map.addLayer(overLayers[name]);
			}

			// Hover the button open the selector
			control.element.firstElementChild.onmouseover = function() {
				displayLayerSelector(true);
			};

			// Click or change map size close the selector
			map.on(['click', 'change:size'], function() {
				displayLayerSelector(false);
			});

			// Leaving the map close the selector
			window.addEventListener('mousemove', function(event) {
				var divRect = map.getTargetElement().getBoundingClientRect();
				if (event.clientX < divRect.left || event.clientX > divRect.right ||
					event.clientY < divRect.top || event.clientY > divRect.bottom)
					displayLayerSelector(false);
			}, false);
		}
	}

	var currentBaseLayerName = Object.keys(baseLayers)[0], // Le nom de la précédente couche affichée. Par défaut la premiere
		checkedBaseLayers = []; // Les layers sélectionnés (dans l'ordre de baseLayers)

	// Click sur une coche
	function checkLayer(event) {
		var selectorInputs = selectorElement.getElementsByTagName('input');
		checkedBaseLayers = [];
		for (var l = 0; l < Object.keys(baseLayers).length; l++) {
			if (event.target.checked &&
				((!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) ||
					selectorInputs[l].value != currentBaseLayerName))
				selectorInputs[l].checked = event.target.value == selectorInputs[l].value;

			if (selectorInputs[l].checked)
				checkedBaseLayers.push(baseLayers[selectorInputs[l].value]);
		}

		currentBaseLayerName = event.target.value; // Mémorise pour la prochaine fois
		rangeElement.value = 50; // Remet le curseur au centre à chaque nouvelle sélection
		displayLayerSelector(true);
	}

	function displayLayerSelector(open) {
		// Refresh button / selector display
		control.element.firstElementChild.style.display = open ? 'none' : '';
		rangeElement.style.display = open && checkedBaseLayers.length > 1 ? '' : 'none';
		selectorElement.style.display = open ? '' : 'none';

		// Refresh layer visibility
		var selectorInputs = selectorElement.getElementsByTagName('input');
//TBD ?? pourquoi ça marche pas ?					for (var i in selectorInputs)
		for (var i = 0; i < selectorInputs.length; i++)
			(baseLayers[selectorInputs[i].value] || overLayers[selectorInputs[i].value]).setVisible(selectorInputs[i].checked);

		// Tune range & selector
		if (checkedBaseLayers.length > 1)
			checkedBaseLayers[1].setOpacity(rangeElement.value / 100);
		selectorElement.style.maxHeight = (map.getTargetElement().clientHeight - (checkedBaseLayers.length > 1 ? 65 : 40)) + 'px';
	}

	return control;
}

/**
 * GPS CONTROL
 * return {ol.control.Control} to be added to the map
 *
 * Requires controlButton
 */
function buttonGPS() {
	// Le viseur
	var point_ = new ol.geom.Point([0, 0]),
		source_ = new ol.source.Vector({
			features: [new ol.Feature({
				geometry: point_
			})]
		}),
		style_ = new ol.style.Style({
			image: new ol.style.Icon(({
				anchor: [.5, .5],
				src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA7VBMVEUAAAA/X39UVHFMZn9NXnRPX3RMW3VPXXNOXHJOXXNNXHNOXXFPXHNNXXFPXHFOW3NPXHNPXXJPXXFPXXNNXXFNW3NOXHJPW25PXXNRX3NSYHVSYHZ0fIx1fo13gI95hJR6go96g5B7hpZ8hZV9hpZ9h5d/iZiBi5ucoquepa+fpbGhqbSiqbXNbm7Ob2/OcHDOcXHOcnLPdHTQdXXWiIjXiorXjIzenp7eoKDgpKTgpaXgpqbks7TktLTktbXnubnr2drr5+nr6Ons29vs29zs6Ors6ert6uvt6uzu6uz18fH18fL68PD++/v+/Pw8gTaQAAAAFnRSTlMACAkKLjAylJWWmJmdv8HD19ja2/n6GaRWtgAAAMxJREFUGBkFwctqwkAUgOH/nMnVzuDGFhRKKVjf/226cKWbQgNVkphMzFz6fQJQlY0S/boCAqa1AMAwJwRjW4wtcxgS05gEa3HHOYipzxP9ZKot9tR5ZfIff7FetMQcf4tDVexNd1IKbbA+7S59f9mlZGmMVVdpXN+3gwh+RiGLAjkDGTQSjHfhes3OV0+CkXrdL/4gzVunxQ+DYZNvn+Mg6aav35GH8OJS/SUrVTw/9e4FtRvypsbPwmPMAto6AOC+ZASgLBpDmGMA/gHW2Vtk8HXNjQAAAABJRU5ErkJggg=='
			}))
		}),
		layer = new ol.layer.Vector({
			source: source_,
			style: style_
		});

	// Interface avec le GPS système	
	var geolocation = new ol.Geolocation();
	geolocation.on('error', function(error) {
		alert('Geolocation error: ' + error.message);
	});

	var active = false,
		bouton = controlButton('G', {
		title: 'Centrer sur la position GPS',
		action: function(event) {
			active ^= 1; // Bascule on/off
			event.target.style.color = active ? 'black' : 'white'; // Colore le bouton

			geolocation.setTracking(active); // Active/désactive
			if (active)
				bouton.getMap().addLayer(layer);
			else
				bouton.getMap().removeLayer(layer);
		}
	});

	geolocation.on('change', function() {
		var pos = ol.proj.fromLonLat(this.getPosition());
		bouton.getMap().getView().setCenter(pos);
		point_.setCoordinates(pos);
	});

	return bouton;
}

//***************************************************************
// TILE LAYERS
//***************************************************************

/**
 * OPENSTREETMAP LAYERS
 * url {string} location of the tiles.
 * attribution {string}.
 * return {ol.layer} to be added to the map
 *
 * EXAMPLES
 * OSMlayer('OSM', '//{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
 * OSMlayer('OSM-FR', '//{a-c}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'),
 * OSMlayer('MRI', '//maps.refuges.info/hiking/{z}/{x}/{y}.png', '<a href="http://wiki.openstreetmap.org/wiki/Hiking/mri">MRI</a>'),
 */
function OSMlayer(url, attribution) {
	return new ol.layer.Tile({
		source: new ol.source.XYZ({
			url: url,
			attributions: [
				attribution || '',
				ol.source.OSM.ATTRIBUTION
			]
		})
	});
}

/**
 * KOMPAS LAYERS (AUSTRIA)
 * url {string} location of the tiles.
 * attribution {string}.
 * return {ol.layer} to be added to the map
 *
 *  Requires OSMlayer
 *
 * EXAMPLES
 *  kompassLayer('Kompas', 'KOMPASS')
 *  kompassLayer('Kompas touristik', 'KOMPASS Touristik')
 *  kompassLayer('Kompas summer', 'Summer OSM')
 *  kompassLayer('Kompas winter', 'Winter OSM')
 *  kompassLayer('Kompas luftbild', 'a') // ????
 */
function kompassLayer(layer) {
	return OSMlayer(
		'http://ec{0-3}.cdn.ecmaps.de/WmsGateway.ashx.jpg?' + // Not available via https
		'Experience=ecmaps&MapStyle=' + layer + '&TileX={x}&TileY={y}&ZoomLevel={z}',
		'<a href="http://www.kompass.de/livemap/">KOMPASS</a>'
	);
}

/**
 * CARTES THUNDERFOREST
 * layer {string} part of location of the tiles.
 * key {string} to be obtained from https://manage.thunderforest.com
 * return {ol.layer} to be added to the map
 *
 *  Requires OSMlayer
 *
 * EXAMPLES
 * thunderforestLayer('OSM-outdoors', 'outdoors', thunderforestKey)
 * thunderforestLayer('OSM-cycle', 'cycle', thunderforestKey)
 * thunderforestLayer('OSM-landscape', 'landscape', thunderforestKey)
 * thunderforestLayer('OSM-transport', 'transport', thunderforestKey)
 */
function thunderforestLayer(layer, key) {
	return OSMlayer(
		'//{a-c}.tile.thunderforest.com/' + layer + '/{z}/{x}/{y}.png?apikey=' + key,
		'<a href="http://www.thunderforest.com">Thunderforest</a>'
	);
}

//***************************************************************
// GOOGLE
// No key / no api
//
// googleLayer('Google road', 'm')
// googleLayer('Google terrain', 'p')
// googleLayer('Google satellite', 's')
// googleLayer('Google hybrid', 's,h')
//***************************************************************
function googleLayer(layer) {
	return new ol.layer.Tile({
		source: new ol.source.XYZ({
			url: '//mt{0-3}.google.com/vt/lyrs=' + layer + '&x={x}&y={y}&z={z}',
			attributions: '<a href="https://www.google.com/maps">Google</a>'
		})
	});
}

//***************************************************************
// STAMEN
// http://maps.stamen.com
//
// stamenLayer('terrain')
// stamenLayer('watercolor')
//***************************************************************
function stamenLayer(layer) {
	return new ol.layer.Tile({
		source: new ol.source.Stamen({
		layer: layer
	})});
}

//***************************************************************
// IGN
// key: http://professionnels.ign.fr
// doc: http://api.ign.fr
//
// ignLayer('IGN', IGNkey, 'GEOGRAPHICALGRIDSYSTEMS.MAPS')
// ignLayer('IGN photos', IGNkey, 'ORTHOIMAGERY.ORTHOPHOTOS')
// ignLayer('IGN TOP 25', IGNkey, 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD')
// ignLayer('IGN classique', IGNkey, 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.CLASSIQUE')
// ignLayer('IGN avalanches', IGNkey,'GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN')
// ignLayer('Cadastre', IGNkey,' CADASTRALPARCELS.PARCELS', 'image/png')
//***************************************************************
function ignLayer(key, layer, format) {
	var IGNresolutions = [],
		IGNmatrixIds = [];
	for (var i = 0; i < 18; i++) {
		IGNresolutions[i] = ol.extent.getWidth(ol.proj.get('EPSG:3857').getExtent()) / 256 / Math.pow(2, i);
		IGNmatrixIds[i] = i.toString();
	}
	var IGNtileGrid = new ol.tilegrid.WMTS({
		origin: [-20037508, 20037508],
		resolutions: IGNresolutions,
		matrixIds: IGNmatrixIds
	});

	return new ol.layer.Tile({
		source: new ol.source.WMTS({
			url: '//wxs.ign.fr/' + key + '/wmts',
			layer: layer,
			matrixSet: 'PM',
			format: format || 'image/jpeg',
			tileGrid: IGNtileGrid,
			style: 'normal',
			attributions:
				'<a href="http://www.geoportail.fr/" target="_blank">' +
				'<img src="https://api.ign.fr/geoportail/api/js/latest/theme/geoportal/img/logo_gp.gif"></a>'
		})
	});
}

//***************************************************************
// TRAITEMENT DES CARTES INCOMPLETES
//
// Arg: extent: [<4 numbers>] : valid area
// Arg: source: {
//	<max resolution>: <source>,
//	...
// }
//
// En dehors de la zone de zoom, affiche OSM
// En dehors de la zone de validité, affiche blanc

// Requires ol.layer onAdd option
//***************************************************************
function incompleteTileLayer(extent, sources) {
	var map, view,
		layer = new ol.layer.Tile({
			onAdd: function(m) {
				map = m;
				view = map.getView();
				view.on('change', change);
				change(); // At init
			}
		}),
		backgroundSource = new ol.source.Stamen({
			layer: 'terrain'
		});

	// Zoom has changed
	function change() {
		var resolution = 999999; // Max resolution
		sources[resolution] = backgroundSource; // Add extrabound source on the top of the list

		// Search for sources according to the map resolution
		if (ol.extent.intersects(extent, view.calculateExtent(map.getSize())))
			resolution = Object.keys(sources).find(function(e) {
				return e > view.getResolution();
			});

		// Update layer if necessary
		if (layer.getSource() != sources[resolution])
			layer.setSource(sources[resolution]);
	}

	return layer;
}

//***************************************************************
// SWISSTOPO
// doc: https://api.geo.admin.ch/
// register your domain: https://shop.swisstopo.admin.ch/fr/products/geoservice/swisstopo_geoservices/WMTS_info
//
// swissLayer('Swiss','ch.swisstopo.pixelkarte-farbe')
// swissLayer('Swiss photo','ch.swisstopo.swissimage')

// Requires incompleteTileLayer
//***************************************************************
function swissLayer(layer) {
	var projectionExtent = ol.proj.get('EPSG:3857').getExtent(),
		resolutions = [],
		matrixIds = [];
	for (var r = 0; r < 18; ++r) {
		resolutions[r] = ol.extent.getWidth(projectionExtent) / 256 / Math.pow(2, r);
		matrixIds[r] = r;
	}
	var tileGrid = new ol.tilegrid.WMTS({
		origin: ol.extent.getTopLeft(projectionExtent),
		resolutions: resolutions,
		matrixIds: matrixIds
	});

	return incompleteTileLayer([664577, 5753148, 1167741, 6075303], {
		500: new ol.source.WMTS(({
			crossOrigin: 'anonymous',
			url: cookieHit
				? '//wmts2{0-4}.geo.admin.ch/1.0.0/' + layer + '/default/current/3857/{TileMatrix}/{TileCol}/{TileRow}.jpeg'
				: '',
			tileGrid: tileGrid,
			requestEncoding: 'REST',
			attributions: '<a href="https://map.geo.admin.ch/">SwissTopo</a>'
		}))
	});
}

//***************************************************************
// ITALY IGM

// Requires incompleteTileLayer
//***************************************************************
function igmLayer() {
	function igmSource(url, layer) {
		return new ol.source.TileWMS({
			url: 'http://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/' + url + '.map',
			params: {
				layers: layer
			},
			attributions: '<a href="http://www.pcn.minambiente.it/viewer">IGM</a>'
		})
	}

	return incompleteTileLayer([660124, 4131313, 2113957, 5958411], { // EPSG:6875 (Italie)
		100: igmSource('IGM_250000', 'CB.IGM250000'),
		25: igmSource('IGM_100000', 'MB.IGM100000'),
		5: igmSource('IGM_25000', 'CB.IGM25000')
	});
}
//***************************************************************
// SPAIN
//
// spainLayer('Espagne', 'mapa-raster', 'MTN')
// spainLayer('Espagne photo', 'pnoa-ma', 'OI.OrthoimageCoverage')
//***************************************************************
function spainLayer(serveur, layer) {
	return new ol.layer.Tile({
		source: new ol.source.XYZ({
			url: '//www.ign.es/wmts/' + serveur + '?layer=' + layer +
				'&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg' +
				'&style=default&tilematrixset=GoogleMapsCompatible' +
				'&TileMatrix={z}&TileCol={x}&TileRow={y}',
			attributions: '<a href="http://www.ign.es/">IGN España</a>'
		})
	});
}

//***************************************************************
// BING (Microsoft)
// key : https://msdn.microsoft.com/fr-fr/library/ff428642.aspx
//
// bingLayer ('Bing', 'Road', bingKey)
// bingLayer ('Bing photo', 'Aerial', bingKey)
// bingLayer ('Bing mixte', 'AerialWithLabels', bingKey)
// bingLayer ('Ordnance Survey', 'ordnanceSurvey', bingKey) // UK
//***************************************************************
function bingLayer(layer, key) {
	return new ol.layer.Tile({
		source: new ol.source.BingMaps({
			imagerySet: layer,
			key: key,
		})
	});
}

//***************************************************************
// Ordnance Survey : Great Britain map

// Requires incompleteTileLayer
// TODO : attribution : Ordnance Survey
//***************************************************************
function osLayer(key) {
	return incompleteTileLayer([-841575, 6439351, 198148, 8589177], { // EPSG:27700 (G.B.)
		100: new ol.source.BingMaps({
			imagerySet: 'ordnanceSurvey',
			key: key
		})
	});
}

//***************************************************************
// MARQUEURS

// Requires proj4.js for swiss coordinates
// Requires ol.layer onAdd option
//***************************************************************
function marqueur(imageUrl, ll, IdDisplay, format, edit) { // imageUrl, [lon, lat], 'id-display', ['format de base', 'format suisse']
	var point = new ol.geom.Point(
			ol.proj.fromLonLat(ll)
		),
		iconStyle = new ol.style.Style({
			image: new ol.style.Icon(({
				src: imageUrl,
				anchor: [.5, .5]
			}))
		}),
		iconFeature = new ol.Feature({
			geometry: point
		}),
		layer = new ol.layer.Vector({
			source: new ol.source.Vector({
				features: [iconFeature]
			}),
			style: iconStyle,
			zIndex: 1,
			onAdd: function(map) {
				if (edit) {
					// Drag and drop
					map.addInteraction(new ol.interaction.Modify({
						features: new ol.Collection([iconFeature]),
						style: iconStyle,
						pixelTolerance: 20
					}));
					point.on('change', function() {
						displayLL(this.getCoordinates());
					});
				}
			}
		});

	// Affiche une coordonnée
	function displayLL(ll) {
		var ll4326 = ol.proj.transform(ll, 'EPSG:3857', 'EPSG:4326'),
			html = format[0],
			p = [Math.round(ll4326[0] * 100000) / 100000, Math.round(ll4326[1] * 100000) / 100000];

		// Ajout des coordonnées suisses EPSG:21781 (CH1903 / LV03)
		if (ol.extent.containsCoordinate([664577, 5753148, 1167741, 6075303], ll) && // Si on est dans la zone suisse EPSG:21781
			format.length >= 2 &&
			typeof proj4 == 'function') {
			proj4.defs('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=660.077,13.551,369.344,2.484,1.783,2.939,5.66 +units=m +no_defs');
			var c21781 = ol.proj.transform(ll, 'EPSG:3857', 'EPSG:21781');
			html += format[1];
			p.push(Math.round(c21781[0]), Math.round(c21781[1]));
		}

		// On intégre les coordonnées dans le format html
		for (var r in p) // === sprinft
			html = html.replace('{' + r + '}', p[r]);

		// On insère la chaine HTML obtenue à l'endroit qui va bien
		var llid = document.getElementById(IdDisplay);
		if (llid)
			llid.innerHTML = html;
	}

	// Display coords
	displayLL(ol.proj.fromLonLat(ll));

	// <input> coords edition
	layer.edit = function(event, nol, projection) {
		var coord = ol.proj.transform(point.getCoordinates(), 'EPSG:3857', 'EPSG:' + projection); // La position actuelle du marqueur
		coord[nol] = parseFloat(event.value); // On change la valeur qui a été modifiée
		point.setCoordinates(ol.proj.transform(coord, 'EPSG:' + projection, 'EPSG:3857')); // On repositionne le marqueur
	}

	return layer;
}

//***************************************************************
// Editeur de lignes

// Requires ol.Map.prototype.addLayer
// Requires controlButton
// Requires ol.layer onAdd option
//***************************************************************
//TBD BUG EDITEUR click cretion ligne appelle une nouvelle page

function lineEditor(id, snaps) {

	// Déclaration des boutons de l'éditeur
	var map, // THE map !
		actif, // Le texte du bouton du contôle actif
		controles = { // Les interactions OL à activer pour chaque bouton
			'+': ['draw', 'snap'],
			'M': ['hover', 'modify', 'snap'],
			'-': ['remove']
		};

	function editControl(label, title) {
		return controlButton(label, {
			action: clickBouton,
			title: title,
			color: '#848',
			className: 'ol-button-edit'
		});
	}
	var boutonEdits = [
		editControl('+', 'Pointer le début et cliquer pour dessiner une ligne'),
		editControl('M',
			"Click sur un sommet puis déplacer pour modifier\n" +
			"Click sur une ligne puis déplacer pour créer un sommet\n" +
			"Alt+click sur un sommet ou un segment pour le supprimer",
		),
		editControl('-', 'Click sur une ligne pour la supprimer')
	];

	var el = document.getElementById(id), // L'élement <textarea>
		format = new ol.format.GeoJSON(),
		// Lecture des données
		features = format.readFeatures( // Lit par défaut les données en ESPG:4326
			JSON.parse(el.textContent), {
				featureProjection: 'EPSG:3857' // La projection suivant laquelle readFeatures restitue les données !
			}
		),
		// Déclaration de la couche à éditer
		source = new ol.source.Vector({
			features: features
		}),
		layer = new ol.layer.Vector({
			source: source,
			zIndex: 1,
			onAdd: function(m) {
				map = m;
				for (var i in boutonEdits)
					map.addControl(boutonEdits[i]);
			}
		});

	// Déclaration des interactions avec la couche à éditer
	var interactions = {
		draw: new ol.interaction.Draw({
			source: source,
			type: 'LineString'
		}),
		snap: new ol.interaction.Snap({
			source: source,
			pixelTolerance: 5
		}),
		hover: new ol.interaction.Select({
			layers: [layer],
			condition: ol.events.condition.always,
			hitTolerance: 5
		}),
		modify: new ol.interaction.Modify({
			source: source
		}),
		remove: new ol.interaction.Select({
			layers: [layer],
			hitTolerance: 5,
			condition: function(event) {
				// Un click supprime les features pointés
				if (event.type == 'pointerdown') {
					var features = this.getFeatures();
					for (var i = 0, f; f = features.item(i); i++)
						source.removeFeature(f);
					features.clear();
				}

				// Continue les actions (hover, ...)
				return true;
			}
		})
	};

	// Snap sur des sources extèrieures à l'éditeur
	if (snaps)
//TBD		for (var s = 0; s < snaps.length; s++)
		for (var s in snaps)
			snaps[s].getSource().on('change', function() {
				this.forEachFeature(
					function(f) {
						interactions['snap'].addFeature(f);
					}
				);
			});

	// Supprime un segment et coupe une ligne en 2
	interactions['modify'].on('modifyend', function(event) {
		if (ol.events.condition.altKeyOnly(event.mapBrowserEvent) &&
			event.mapBrowserEvent.type == 'pointerup') {
			// On récupère la liste des features visés
			var features = event.mapBrowserEvent.map.getFeaturesAtPixel(event.mapBrowserEvent.pixel, {
				hitTolerance: 5
			});
			// En théorie, on doit sélectionner au moins 2 features :
			if (features.length > 1) {
				var c0 = features[0].getGeometry().flatCoordinates, // Les coordonnées du marqueur du point de coupure
					c1 = features[1].getGeometry().flatCoordinates, // les coordonnées des sommets de la ligne à couper
					cs = [[],[]], // Les coordonnées des 2 segments découpés
					s = 0;
				for (i = 0; i < c1.length / 2; i++)
					// Si on a trouvé le point de coupure, on le saute et on incrémente le compteur de segment
					if (c0[0] == c1[2 * i] && c0[1] == c1[2 * i + 1])
						s++;
					else // On ajoute le point courant
						cs[s].push([c1[2 * i], c1[2 * i + 1]]);

				// On enlève la ligne existante
				source.removeFeature(features[1]);

				// On dessine les 2 lines de lignes
//TBD				for (var f = 0; f < cs.length; f++)
				for (var f in cs)
					if (cs[f].length > 1) // s'ils ont au moins 2 points
						source.addFeature(new ol.Feature({
							geometry: new ol.geom.LineString(cs[f])
						}));
			}
		}
	});

	// Joint les lignes ayant un bout identique
	function stickLines() {
		var features = source.getFeatures(),
			lines = [];

		// On fait un grand tableau avec tous les lines
//TBD		for (var f = 0; f < features.length; f++) {
		for (var f in features) {
			var flatCoordinates = features[f].getGeometry().flatCoordinates, // OL fournit les coordonnées dans un même niveau de tableau, lon & lat mélangés
				coordinates = []; // On va les remettre en tableau de lonlat
			for (var c = 0; c < flatCoordinates.length / 2; c++)
				coordinates.push(flatCoordinates.slice(c * 2, c * 2 + 2));

			// Dans chacun des sens
			for (var i = 0; i < 2; i++) {
				lines.push({
					indexFeature: f,
					premier: coordinates[0], // Le premier point
					suite: coordinates.slice(1) // Les autres points
				});
				coordinates = coordinates.reverse(); // Et on recommence dans l'autre sens
			}
		}

		// On recherche 2 lines ayant le même premier bout
		for (var m in lines) {
//TBD 		for (var m = 0; m < lines.length; m++) {
			var found = lines.find(function(event) { //TBD IE ne supporte pas find
				if (event.indexFeature == lines[m].indexFeature) return false; // C'était le même morceau !
				if (event.premier[0] != lines[m].premier[0]) return false; // X des premiers points n'est pas pareil
				if (event.premier[1] != lines[m].premier[1]) return false; // Y des premiers points n'est pas pareil
				return true;
			});

			// On en a trouvé au moins une paire
			if (typeof found == 'object') {
				// On supprime les 2 lines
				source.removeFeature(features[found.indexFeature]);
				source.removeFeature(features[lines[m].indexFeature]);

				// On en rajoute un en recollant les 2 bouts
				source.addFeature(new ol.Feature({
					geometry: new ol.geom.LineString(found.suite.reverse().concat([found.premier]).concat(lines[m].suite))
				}));
				return stickLines(); // On recommence au début
			}
		}
	}

	function clickBouton() { // On a cliqué sur un bouton de l'éditeur !
		// On commence par enlever toutes les interactions
		for (var i in interactions)
			map.removeInteraction(interactions[i]);

		// On colore en blanc tous les boutons ede l'éditeur
		var editButtons = document.getElementsByClassName('ol-button-edit');
		for (var i = 0; i < editButtons.length; i++)
			editButtons[i].firstChild.style.color = 'white';

		// Si on re-clique sur le même bouton, on le désactive
		if (actif == this.textContent)
			actif = null;
		else { // Sinon, on colore le bouton actif en noir,
			actif = this.textContent;
			this.style.color = 'black';
			// et on active les intéractions correspondantes
			for (var i = 0; i < controles[actif].length; i++)
				map.addInteraction(interactions[controles[actif][i]]);
		}

		// Sauver les lignes dans <EL> sous forme geoJSON à chaque modif
		map.on(['pointermove', 'click', 'change'], function() {
			stickLines();
			el.textContent = format.writeFeatures(source.getFeatures(), {
				featureProjection: 'EPSG:3857' // La projection des données internes
			});
		});
	}

	return layer;
}
