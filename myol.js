/*!
 * OPENLAYERS V4 ADAPTATION - https://openlayers.org/
 * (C) Dominique Cavailhez 2017
 * Check https://github.com/Dominique92/MyOl
 */
//TODO BEST Site off line, application
//TODO END http://jsbeautifier.org/
//TODO END check , à la fin des tablos : http://jshint.com/

/**
 * HACK send 'onAdd' event to layers when added to a map
 */
ol.Map.prototype.addLayer = function(layer) { // Overwrites ol.Map.addLayer
	ol.PluggableMap.prototype.addLayer.call(this, layer); // Call former method (as ol.Map hasn't addLayer)

	layer.dispatchEvent(new ol.MapEvent('onAdd', this));
};

//***************************************************************
// TILE LAYERS
//***************************************************************
//TODO BEST Superzoom
/**
 * Openstreetmap
 */
function layerOSM(url, attribution) {
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
 * Kompas (austria)
 * Requires layerOSM
 */
function layerKompass(layer) {
	return layerOSM(
		'http://ec{0-3}.cdn.ecmaps.de/WmsGateway.ashx.jpg?' + // Not available via https
		'Experience=ecmaps&MapStyle=' + layer + '&TileX={x}&TileY={y}&ZoomLevel={z}',
		'<a href="http://www.kompass.de/livemap/">KOMPASS</a>'
	);
}

/**
 * Thunderforest
 * Requires layerOSM
 */
function layerThunderforest(layer, key) {
	return layerOSM(
		'//{a-c}.tile.thunderforest.com/' + layer + '/{z}/{x}/{y}.png?apikey=' + key,
		'<a href="http://www.thunderforest.com">Thunderforest</a>'
	);
}

/**
 * Google
 */
function layerGoogle(layer) {
	return new ol.layer.Tile({
		source: new ol.source.XYZ({
			url: '//mt{0-3}.google.com/vt/lyrs=' + layer + '&x={x}&y={y}&z={z}',
			attributions: '<a href="https://www.google.com/maps">Google</a>'
		})
	});
}

/**
 * Stamen http://maps.stamen.com
 */
function layerStamen(layer) {
	return new ol.layer.Tile({
		source: new ol.source.Stamen({
			layer: layer
		})
	});
}

/**
 * IGN France
 * Doc on http://api.ign.fr
 * Get a free key : http://professionnels.ign.fr/ign/contrats
 */
function layerIGN(key, layer, format) {
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
			attributions: '<a href="http://www.geoportail.fr/" target="_blank">' +
				'<img src="https://api.ign.fr/geoportail/api/js/latest/theme/geoportal/img/logo_gp.gif"></a>'
		})
	});
}

/**
 * Incomplete cards
 * Virtual class
 * Displays OSM outside the zoom area, 
 * Displays blank outside the area of validity
 * Requires 'onAdd' layer event
 */
function layerTileIncomplete(extent, sources) {
	var layer = new ol.layer.Tile(),
		map, view,
		backgroundSource = new ol.source.Stamen({
			layer: 'terrain'
		});
	layer.on('onAdd', function(e) {
		map = e.map
		view = map.getView();
		view.on('change', change);
		change(); // At init
	});

	// Zoom has changed
	function change() {
		var resolution = 999999; // Max resolution
		sources[resolution] = backgroundSource; // Add extrabound source on the top of the list

		// Search for sources according to the map resolution
		if (ol.extent.intersects(extent, view.calculateExtent(map.getSize())))
			resolution = Object.keys(sources).filter(function(event) { //TODO BEST réécrire avec autre chose que filter !!! (ou écriture silplifiée)
				return event > view.getResolution();
			})[0];

		// Update layer if necessary
		if (layer.getSource() != sources[resolution])
			layer.setSource(sources[resolution]);
	}

	return layer;
}

/**
 * Swisstopo https://api.geo.admin.ch/
 * Register your domain: https://shop.swisstopo.admin.ch/fr/products/geoservice/swisstopo_geoservices/WMTS_info
 * Requires layerTileIncomplete
 */
function layerSwissTopo(layer) {
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

	return layerTileIncomplete([664577, 5753148, 1167741, 6075303], {
		500: new ol.source.WMTS(({
			crossOrigin: 'anonymous',
			url: '//wmts2{0-4}.geo.admin.ch/1.0.0/' + layer + '/default/current/3857/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
			tileGrid: tileGrid,
			requestEncoding: 'REST',
			attributions: '<a href="https://map.geo.admin.ch/">SwissTopo</a>'
		}))
	});
}

/**
 * Italy IGM
 * Requires layerTileIncomplete
 */
function layerIGM() {
	function igmSource(url, layer) {
		return new ol.source.TileWMS({
			url: 'http://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/' + url + '.map',
			params: {
				layers: layer
			},
			attributions: '<a href="http://www.pcn.minambiente.it/viewer">IGM</a>'
		});
	}

	return layerTileIncomplete([660124, 4131313, 2113957, 5958411], { // EPSG:6875 (Italie)
		100: igmSource('IGM_250000', 'CB.IGM250000'),
		25: igmSource('IGM_100000', 'MB.IGM100000'),
		5: igmSource('IGM_25000', 'CB.IGM25000')
	});
}

/**
 * Spain
 */
function layerSpain(serveur, layer) {
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

/**
 * Bing (Microsoft)
 */
function layerBing(layer, key) {
	return new ol.layer.Tile({
		source: new ol.source.BingMaps({
			imagerySet: layer,
			key: key,
		})
	});
}

/**
 * Ordnance Survey : Great Britain
 * Requires layerTileIncomplete
 */
//TODO TEST Voir traffic réseau (autre couche = ord survey ??) => init permalink ???
//TODO BEST attribution : Ordnance Survey
function layerOS(key) {
	return layerTileIncomplete([-841575, 6439351, 198148, 8589177], { // EPSG:27700 (G.B.)
		100: new ol.source.BingMaps({
			imagerySet: 'ordnanceSurvey',
			key: key
		})
	});
}

/**
 * Tile layers examples
 * Requires many
 */
function layersCollection(keys) {
	return {
		'OSM-FR': layerOSM('//{a-c}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'),
		'OSM': layerOSM('//{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
		'MRI': layerOSM(
			'//maps.refuges.info/hiking/{z}/{x}/{y}.png',
			'<a href="http://wiki.openstreetmap.org/wiki/Hiking/mri">MRI</a>'
		),
		'Hike & Bike': layerOSM(
			'http://{a-c}.tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png',
			'<a href="http://www.hikebikemap.org/">hikebikemap.org</a>'
		), // Not on https
		'Autriche': layerKompass('KOMPASS Touristik'),
		//'Kompas': layerKompass(, 'KOMPASS'),
		//'Kompas summer': layerKompass('Summer OSM'),
		//'Kompas winter': layerKompass('Winter OSM'),
		//'Kompas luftbild': layerKompass('a'),
		'OSM-outdoors': layerThunderforest('outdoors', keys.thunderforest),
		'OSM-cycle': layerThunderforest('cycle', keys.thunderforest),
		'OSM-landscape': layerThunderforest('landscape', keys.thunderforest),
		'OSM-transport': layerThunderforest('transport', keys.thunderforest),
		'IGN': layerIGN(keys.IGN, 'GEOGRAPHICALGRIDSYSTEMS.MAPS'),
		'IGN photos': layerIGN(keys.IGN, 'ORTHOIMAGERY.ORTHOPHOTOS'),
		'IGN TOP 25': layerIGN(keys.IGN, 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD'),
		'IGN classique': layerIGN(keys.IGN, 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.CLASSIQUE'),
		// NOT YET	layerIGN('IGN avalanches', keys.IGN,'GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN'),
		'Cadastre': layerIGN(keys.IGN, 'CADASTRALPARCELS.PARCELS', 'image/png'),
		'Swiss': layerSwissTopo('ch.swisstopo.pixelkarte-farbe'),
		'Swiss photo': layerSwissTopo('ch.swisstopo.swissimage'),
		'Espagne': layerSpain('mapa-raster', 'MTN'),
		'Espagne photo': layerSpain('pnoa-ma', 'OI.OrthoimageCoverage'),
		'Italie': layerIGM(),
		'Angleterre': layerOS(keys.bing),
		'Bing': layerBing('Road', keys.bing),
		'Bing photo': layerBing('Aerial', keys.bing),
		//'Bing mixte': layerBing ('AerialWithLabels', bingKey),
		'Google road': layerGoogle('m'),
		'Google terrain': layerGoogle('p'),
		'Google photo': layerGoogle('s'),
		'Google hybrid': layerGoogle('s,h'),
		Stamen: layerStamen('terrain'),
		Watercolor: layerStamen('watercolor'),
		'Neutre': new ol.layer.Tile()
	};
}

//***************************************************************
// VECTORS, GEOJSON & AJAX LAYERS
//***************************************************************
//TODO sélecteur de type de pictos
/**
 * GeoJson POI layer
 * Requires 'onAdd' layer event
 */
function layerGeoJson(options) {
	var actual_resolution,
		layer = new ol.layer.Vector({
			source: new ol.source.Vector({
				strategy: function(extent, resolution) { // Force loading when zoom in / out (for BBOX)
					if (actual_resolution != resolution)
						this.clear();
					actual_resolution = resolution;
					return [extent];
				},
				url: function(extent, resolution, projection) {
					return options.url + '&bbox=' +
						ol.proj.transformExtent(extent, projection.getCode(), 'EPSG:4326').join(',');
				},
				format: new ol.format.GeoJSON()
			}),
			style: typeof options.style != 'function' ?
				ol.style.Style.defaultFunction : function(feature) {
					return new ol.style.Style(options.style(feature.getProperties()));
				}
		});

	layer.options_ = options; // Mem options for intercations
	layer.on('onAdd', function(e) {

		// Hover activity (coloring the feature)
		if (typeof options.hover == 'function')
			e.map.addInteraction(new ol.interaction.Select({
				layers: [layer],
				condition: ol.events.condition.pointerMove,
				hitTolerance: 6,
				style: function(feature) {
					return new ol.style.Style(options.hover(feature.getProperties()));
				}
			}));

		if (!e.map.popElement) { // Only once for all layers
			// Create the label's popup
			e.map.popElement = document.createElement('div');
			var popup = new ol.Overlay({
				element: e.map.popElement
			});
			e.map.addOverlay(popup);

			// Display a label when hover the feature
			e.map.on('pointermove', function(event) {
				e.map.getViewport().style.cursor = 'default'; // To get the default cursor if there is no feature here
				popup.setPosition(undefined); // Hide label by default if none feature here

				// Search the hovered the feature(s)
				e.map.forEachFeatureAtPixel(event.pixel, checkFeatureAtPixelHovered);
			});

			function checkFeatureAtPixelHovered(feature_, layer_) {
				if (!popup.getPosition() && // Only for the top one
					layer_ && layer_.options_ && typeof layer_.options_.label == 'function') {
					var properties_ = layer_.options_.label(feature_.getProperties());
					e.map.popElement.innerHTML = properties_.text; // Set the label inner
					e.map.popElement.className = 'popup ' + (properties_.className || '');
					// Garder pour doc !!! var t = layer_.getStyleFunction()(feature_).getText();

					// Now, what anchor for the label () ?
					var coordinates_ = feature_.getGeometry().flatCoordinates; // If it's a point, just over it
					if (coordinates_.length != 2)
						coordinates_ = event.coordinate; // If it's a surface, over the pointer
					popup.setPosition(e.map.getView().getCenter()); // For popup size calculation

					// Well calculated shift of the label regarding the pointer position
					var pixel = e.map.getPixelFromCoordinate(coordinates_); //TODO BUG : ne marche pas sur un massif !!!
					if (pixel[1] < e.map.popElement.clientHeight + 12) { // On the top of the map (not enough space for it)
						pixel[0] += pixel[0] < e.map.getSize()[0] / 2 ? 10 : -e.map.popElement.clientWidth - 10;
						pixel[1] += 2 - pixel[1];
					} else {
						pixel[0] -= e.map.popElement.clientWidth * pixel[0] / e.map.getSize()[0];
						pixel[1] -= e.map.popElement.clientHeight + 10;
					}
					popup.setPosition(e.map.getCoordinateFromPixel(pixel));
				}
				if (layer_ && layer_.options_ && layer_.options_.click)
					e.map.getViewport().style.cursor = 'pointer';
			}

			// Click on feature
			e.map.on('click', function(event) {
				// Search the clicked the feature(s)
				e.map.forEachFeatureAtPixel(event.pixel, checkFeatureAtPixelClicked, {
					hitTolerance: 6
				});
			});

			function checkFeatureAtPixelClicked(feature_, layer_) {
				if (layer_ && layer_.options_ && typeof layer_.options_.click == 'function')
					layer_.options_.click(feature_.getProperties());
			}
		}
	});

	return layer;
}

/**
 * www.refuges.info areas layer
 * Requires layerGeoJson
 */
function layerMassifsWri() {
	return layerGeoJson({
		url: '//www.refuges.info/api/polygones?type_polygon=1',
		style: function(properties) {
			// Translates the color in RGBA to be transparent
			var cs = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(properties.couleur);
			return {
				fill: new ol.style.Fill({
					color: 'rgba(' + parseInt(cs[1], 16) + ',' + parseInt(cs[2], 16) + ',' + parseInt(cs[3], 16) + ',0.5)'
				}),
				stroke: new ol.style.Stroke({
					color: 'black'
				})
			};
		},
		label: function(properties) {
			return {
				text: properties.nom
			};
		},
		hover: function(properties) {
			return {
				fill: new ol.style.Fill({
					color: properties.couleur
				}),
				stroke: new ol.style.Stroke({
					color: 'black'
				})
			};
		},
		click: function(properties) {
			if (properties.lien)
				window.location.href = properties.lien;
		}
	});
}

/**
 * www.refuges.info POI layer
 * Requires layerGeoJson
 */
function layerPointsWri() {
	return layerGeoJson({
		url: '//www.refuges.info/api/bbox?type_points=7,10,9,23,6,3,28',
		style: function(properties) {
			return {
				image: new ol.style.Icon({
					src: '//www.refuges.info/images/icones/' + properties.type.icone + '.png'
				}),
				offset: [8, 8]
			};
		},
		label: function(properties) {
			return {
				text: properties.nom
			};
		},
		click: function(properties) {
			if (properties.lien)
				window.location.href = properties.lien;
		}
	});
}

/**
 * chemineur.fr POI layer
 * Requires layerGeoJson
 */
function chemineurLayer() {
	return layerGeoJson({
		url: '//dc9.fr/chemineur/ext/Dominique92/GeoBB/gis.php?site=this&poi=3,8,16,20,23,28,30,40,44,64,58,62',
		style: function(properties) {
			return {
				image: new ol.style.Icon({
					src: properties.icone
				}),
				offset: [8, 8]
			};
		},
		label: function(properties) {
			return {
				text: properties.nom
			};
		},
		click: function(properties) {
			if (properties.url)
				window.location.href = properties.url;
		}
	});
}

/**
 * OSM overpass poi layer
 * From: https://openlayers.org/en/latest/examples/vector-osm.html
 * Doc: http://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
 * Requires layerGeoJson
 * Requires 'onAdd' layer event
 */
//TODO REDO
function layerOverpass(request) {
	request = request || { // Default selection
		// icon_name: '[overpass selection]'
		ravitaillement: '["shop"~"supermarket|convenience"]',
		bus: '["highway"="bus_stop"]',
		parking: '["amenity"="parking"]["access"!="private"]',
		camping: '["tourism"="camp_site"]',
		'refuge-garde': '["tourism"="alpine_hut"]',
		'cabane-non-gardee': '["building"="cabin"]',
		abri: '["amenity"="shelter"]',
		hotel: '["tourism"~"hotel|guest_house|chalet|hostel|apartment"]',
	};

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
		var ret = { // Default
			icon: 'batiment-en-montagne',
			name: 'Inconnu'
		};

		// Icon
		for (var r in request) { // hotel: ["tourism"="hotel|guest"]...
			var selection = request[r].split('"'), // [ tourism = hotel|guest ] ...
				selectedProperty = p[selection[1]]; // tourism: 'guest'
			if (selectedProperty &&
				selectedProperty.match(new RegExp(selection[3]))) // hotel|guest
				r.name = r.icon = r;
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
			names = ['old_name', 'alt_name', 'official_name', 'short_name', 'name:ch', 'name:en', 'name:fr', 'name'];
		for (var n in names)
			if (p[names[n]])
				ret.name = p[names[n]];
		ret.name = ret.name.replace( // Word translation if necessary
			new RegExp(Object.keys(language).join('|'), 'gi'),
			function(m) {
				return language[m.toLowerCase()];
			}
		);

		// Fallback for contact:xxx properties
		for (var i in p) {
			var is = i.split(':');
			if (is[0] == 'contact' && is.length == 2)
				p[is[1]] = p[i];
		}

		// Popup
		var txt = [
			'<b>' + ret.name + '</b>', [
				ret.icon,
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

		ret.popup = ('<p>' + txt.join('</p><p>') + '</p>')
			.replace(/,/g, ' ').replace(/\s+/g, ' ').replace(/\s+<\/p>/g, '<\/p>').replace(/<p>\s*<\/p>/ig, '');

		return ret;
	}
	var client = new XMLHttpRequest();

	function ajaxLoaded() { //REDO voir si on met inline ou pas ???
		// Optionaly replace way (surface) by node (centered point)
		var xml = client.responseText.replace(
			/<way id="([0-9]+)">\s*<center lat="([0-9\.]+)" lon="([0-9\.]+)"\/>(.*)/g,
			'<node id="$1" lat="$2" lon="$3">'
		).replace(
			/<\/(way|node)>/g,
			'<tag k="tag" v="$1"/></node>'
		);

		var features = new ol.format.OSMXML().readFeatures(xml, {
			featureProjection: map.getView().getProjection() //REDO MISSING map !!
		});
		source.addFeatures(features); //REDO MISSING source
	}
	return new ol.layer.Vector({
		source: new ol.source.Vector({
			format: new ol.format.OSMXML(),
			strategy: ol.loadingstrategy.bbox,

			loader: function(extent, resolution, projection) { // AJAX XML loader for OSM overpass
				// Prepare arguments
				var source = this, // To reuse it in a later closure function (load)
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
				client.addEventListener('load', ajaxLoaded);
			}
		}),

//REDO	layer.on('onAdd', function(e) {
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
			});
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

/**
 * Vector layers examples
 * Requires many
 */
function overlaysCollection() {
	return {
		//TODO OverPass: layerOverpass(),
		Chemineur: chemineurLayer(),
		WRI: layerPointsWri(),
		//TODO Massifs: layerMassifsWri()
	};
}

/**
 * Marqueurs
 * Requires proj4.js for swiss coordinates
 * Requires 'onAdd' layer event
 */
function marqueur(imageUrl, ll, IdDisplay, format, edit) { // imageUrl, [lon, lat], 'id-display', ['format de base', 'format suisse']
	var point = new ol.geom.Point(
			ol.proj.fromLonLat(ll)
		),
		iconStyle = new ol.style.Style({
			image: new ol.style.Icon(({
				src: imageUrl,
				anchor: [0.5, 0.5]
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
			zIndex: 1
		});
	layer.on('onAdd', function(e) {
		if (edit) {
			// Drag and drop
			e.map.addInteraction(new ol.interaction.Modify({
				features: new ol.Collection([iconFeature]),
				style: iconStyle
			}));
			point.on('change', function() {
				displayLL(this.getCoordinates());
			});
		}
	});

	// Show a coordinate
	function displayLL(ll) {
		var ll4326 = ol.proj.transform(ll, 'EPSG:3857', 'EPSG:4326'),
			html = format[0],
			p = [Math.round(ll4326[0] * 100000) / 100000, Math.round(ll4326[1] * 100000) / 100000];

		// Adding Swiss coordinates EPSG:21781 (CH1903 / LV03)
		if (ol.extent.containsCoordinate([664577, 5753148, 1167741, 6075303], ll) && // Si on est dans la zone suisse EPSG:21781
			format.length >= 2 &&
			typeof proj4 == 'function') {
			proj4.defs('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=660.077,13.551,369.344,2.484,1.783,2.939,5.66 +units=m +no_defs');
			var c21781 = ol.proj.transform(ll, 'EPSG:3857', 'EPSG:21781');
			html += format[1];
			p.push(Math.round(c21781[0]), Math.round(c21781[1]));
		}

		// We integrate coordinates in html format
		for (var r in p) // === sprinft
			html = html.replace('{' + r + '}', p[r]);

		// We insert the resulting HTML string where it is going
		var displayElement = document.getElementById(IdDisplay);
		if (displayElement)
			displayElement.innerHTML = html;
	}

	// Display coords
	displayLL(ol.proj.fromLonLat(ll));

	// <input> coords edition
	layer.edit = function(event, nol, projection) {
		var coord = ol.proj.transform(point.getCoordinates(), 'EPSG:3857', 'EPSG:' + projection); // La position actuelle du marqueur
		coord[nol] = parseFloat(event.value); // On change la valeur qui a été modifiée
		point.setCoordinates(ol.proj.transform(coord, 'EPSG:' + projection, 'EPSG:3857')); // On repositionne le marqueur
	};

	return layer;
}

//******************************************************************************
// CONTROLS
//******************************************************************************
/**
 * Control buttons
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
 */
var nextButtonTopPos = 6; // Top position of next button (em)
//TODO BEST voir s'ilm n'y a pas de boutons dans control.Control
//TODO BEST automatiser position des autres boutons
//TODO BUG ne pas colorier le bouton en sombre lors du clic
//TODO BUG mobiles ! boutons trop grand ou trop pres / Espacement entre boutons doit être proportionnel à font-size (em)

function controlButton(label, options) {
	var buttonElement = document.createElement('button');
	buttonElement.innerHTML = label;
	if (options.action)
		buttonElement.addEventListener('click', options.action, false);
	if (options.color)
		buttonElement.style.backgroundColor = options.color; // Color button
	var divElement = document.createElement('div');
	divElement.className = 'ol-button ol-unselectable ol-control ' + (options.className || '');
	if (options.invisible)
		divElement.style.display = 'none';
	else if (options.rightPosition) {
		divElement.style.right = '.5em';
		divElement.style.top = options.rightPosition + 'em';
	} else {
		divElement.style.left = '.5em';
		divElement.style.top = (nextButtonTopPos += 2) + 'em';
	}
	divElement.title = options.title;
	divElement.appendChild(buttonElement);

	return new ol.control.Control({
		element: divElement,
		render: options.render
	});
}

/**
 * Layer switcher control
 * baseLayers {[ol.layer]} layers to be chosen one to fill the map.
 * overLayers {[ol.layer]} layers that can be independenly added to the map.
 * Requires controlButton
 */
//TODO BEST mem cookie couches overlay
//TODO BEST GeoJSON Ajax filtre / paramètres / setURL geojson / setRequest OVERPASS
function controlLayers(baseLayers, overLayers) {
	var control = controlButton('&hellip;', {
		title: 'Liste des cartes',
		rightPosition: 0.5,
		render: render
	});

	// Transparency slider
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

			// Check is permalink baselayer
			var params = getPermalink();
			var checkedLayer =  Object.keys(baseLayers)[0]; // The first by default
			if (params && params[3] && baseLayers[params[3]])
				checkedLayer = params[3];

			// Base layers selector init
			for (var name in baseLayers) {
				var checked = name == checkedLayer ? ' checked="checked"' : '',
					baseElement = document.createElement('div');
				baseElement.innerHTML =
					'<input type="checkbox" name="base"' + checked + ' value="' + name + '">' +
					'<span title="">' + name + '</span>';
				baseElement.onclick = checkLayer;
				selectorElement.appendChild(baseElement);

				baseLayers[name].setVisible(!!checked);
				map.addLayer(baseLayers[name]);
			}

			// Independant layers selector init
			selectorElement.appendChild(document.createElement('hr'));
			for (var name in overLayers) {
				var overlayElement = document.createElement('div');
				overlayElement.innerHTML =
					'<input type="checkbox" name="over" checked="checked" value="' + name + '">' +
					'<span title="">' + name + '</span>';
				overlayElement.onclick = displayLayerSelector;
				selectorElement.appendChild(overlayElement);

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

	var currentBaseLayerName = Object.keys(baseLayers)[0], // Cursor of the name of the previous layer displayed. By default the first
		checkedBaseLayers = []; // The selected layers (in basic orderLayers)

	// Click on a check mark
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

		currentBaseLayerName = event.target.value; // Memorize for next time
		rangeElement.value = 50; // Put the cursor back in the center with each new selection
		displayLayerSelector(true);
	}

	function displayLayerSelector(open) {
		// Refresh button / selector display
		control.element.firstElementChild.style.display = open ? 'none' : '';
		rangeElement.style.display = open && checkedBaseLayers.length > 1 ? '' : 'none';
		selectorElement.style.display = open ? '' : 'none';

		// Refresh layer visibility
		var input = getCurrentLayer(),
		  checkedLayer =baseLayers[input.value] || overLayers[input.value];
		  if(checkedLayer)
		checkedLayer.setVisible(input.checked);

		// Tune range & selector
		if (checkedBaseLayers.length > 1)
			checkedBaseLayers[1].setOpacity(rangeElement.value / 100);
		selectorElement.style.maxHeight = (map.getTargetElement().clientHeight - 56) + 'px';
	}

	return control;
}

function getCurrentLayer() {
	var inputs = document.getElementsByTagName('input');
	for (var i of inputs)
		if (i.name == 'base' && i.checked)
			return i;
	return {};
}

/**
 * Permalink control
 * options.visible {true | false | undefined} add a controlPermalink button to the map.
 * options.init {true | false | undefined} use url hash or "controlPermalink" cookie to position the map.
 * "map" url hash or cookie = {<ZOOM>/<LON>/<LAT>/<LAYER>}
 */
function controlPermalink(options) {
	var divElement = document.createElement('div'),
		aElement = document.createElement('a'),
		control = new ol.control.Control({
			element: divElement,
			render: render
		}),
		params;
	if (options.visible) {
		divElement.className = 'ol-permalink';
		aElement.innerHTML = 'Permalink';
		aElement.title = 'Generate a link with map zoom & position';
		divElement.appendChild(aElement);
	}

	function render(event) {
		var view = event.map.getView();

		// Set the map at the init
		if (options.init !== false && // If use hash & cookies
			typeof params == 'undefined') { // Only once
			params = getPermalink();
			if (params.length >= 3) { // Got lon/lat/zoom
				view.setZoom(params[0]);
				view.setCenter(ol.proj.transform([parseFloat(params[1]), parseFloat(params[2])], 'EPSG:4326', 'EPSG:3857'));
			}
		}

		// Check the current map zoom & position
		var ll4326 = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
		params = [
			parseInt(view.getZoom()),
			Math.round(ll4326[0] * 100000) / 100000,
			Math.round(ll4326[1] * 100000) / 100000,
			getCurrentLayer().value
		];

		// Set the new permalink
		aElement.href = '#map=' + params.join('/');
		document.cookie = 'map=' + params.join('/') + ';path=/';
	}

	return control;
}
// Gives the permalink params

var permalinkValue =
	location.hash.match(/map=([^#,&;]+)/) || // Priority to the hash
	document.cookie.match(/map=([^;]+)/); // Then the cookie

function getPermalink() {
	if (permalinkValue)
		return permalinkValue[1].split('/');
	return [];
}
 
/**
 * GPS control
 * Requires controlButton
 */
function controlGPS() {
	// The position marker
	var point_ = new ol.geom.Point([0, 0]),
		source_ = new ol.source.Vector({
			features: [new ol.Feature({
				geometry: point_
			})]
		}),
		style_ = new ol.style.Style({
			image: new ol.style.Icon({
				anchor: [0.5, 0.5], // Picto marking the position on the map
				src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA7VBMVEUAAAA/X39UVHFMZn9NXnRPX3RMW3VPXXNOXHJOXXNNXHNOXXFPXHNNXXFPXHFOW3NPXHNPXXJPXXFPXXNNXXFNW3NOXHJPW25PXXNRX3NSYHVSYHZ0fIx1fo13gI95hJR6go96g5B7hpZ8hZV9hpZ9h5d/iZiBi5ucoquepa+fpbGhqbSiqbXNbm7Ob2/OcHDOcXHOcnLPdHTQdXXWiIjXiorXjIzenp7eoKDgpKTgpaXgpqbks7TktLTktbXnubnr2drr5+nr6Ons29vs29zs6Ors6ert6uvt6uzu6uz18fH18fL68PD++/v+/Pw8gTaQAAAAFnRSTlMACAkKLjAylJWWmJmdv8HD19ja2/n6GaRWtgAAAMxJREFUGBkFwctqwkAUgOH/nMnVzuDGFhRKKVjf/226cKWbQgNVkphMzFz6fQJQlY0S/boCAqa1AMAwJwRjW4wtcxgS05gEa3HHOYipzxP9ZKot9tR5ZfIff7FetMQcf4tDVexNd1IKbbA+7S59f9mlZGmMVVdpXN+3gwh+RiGLAjkDGTQSjHfhes3OV0+CkXrdL/4gzVunxQ+DYZNvn+Mg6aav35GH8OJS/SUrVTw/9e4FtRvypsbPwmPMAto6AOC+ZASgLBpDmGMA/gHW2Vtk8HXNjQAAAABJRU5ErkJggg=='
			})
		}),
		layer = new ol.layer.Vector({
			source: source_,
			style: style_
		});

	// Interface with the system GPS
	var geolocation = new ol.Geolocation();
	geolocation.on('error', function(error) {
		alert('Geolocation error: ' + error.message);
	});

	var active = false,
		bouton = controlButton('G', {
			title: 'Centrer sur la position GPS',
			action: function(event) {
				active ^= 1; // Toggle on / off
				event.target.style.color = active ? 'black' : 'white'; // Color button
				geolocation.setTracking(active); // Turn on / off
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

/**
 * Control that displays the length of a line overflown
 */
function controlLengthLine() {
	//HACK reuse ol.control.MousePosition
	//TODO BEST use ol.control.Control
	var control = new ol.control.MousePosition({
		className: 'ol-length-line'
	});

	control.updateHTML_ = function() {}; //HACK Inhibits the MousePosition display

	control.setMap = function(map) { //HACK overload the ol.control.Control.setMap
		ol.control.MousePosition.prototype.setMap.call(control, map);

		var lengthElement = this.element,
			interaction = new ol.interaction.Select({
				condition: ol.events.condition.pointerMove,
				hitTolerance: 6,
				filter: calculateLength // HACK : use of filter to perform an action
			});

		function calculateLength(f) {
			var length = ol.Sphere.getLength(f.getGeometry());
			if (length >= 100000)
				lengthElement.innerHTML = (Math.round(length / 1000)) + ' km';
			else if (length >= 10000)
				lengthElement.innerHTML = (Math.round(length / 1000 * 10) / 10) + ' km';
			else if (length >= 1000)
				lengthElement.innerHTML = (Math.round(length / 1000 * 100) / 100) + ' km';
			else if (length >= 1)
				lengthElement.innerHTML = (Math.round(length)) + ' m';
			return length > 0; // Continue hover if we are above a line
		}

		map.on(['changed'], function() { // Momentary hide hover if anything has changed
			map.removeInteraction(interaction);
			lengthElement.innerHTML = null;
		});

		map.on(['pointermove'], function(event) {
			var features = map.getFeaturesAtPixel(event.pixel, {
				hitTolerance: 6
			});

			if (features) {
				if (!interaction.getMap())
					map.addInteraction(interaction);
			} else {
				lengthElement.innerHTML = null;
				if (interaction.getMap())
					map.removeInteraction(interaction);
			}
		});
	};

	return control;
}

/**
 * GPX file loader control
 * Requires controlButton
 */
//TODO BEST Pas d'upload/download sur mobile (-> va vers photos !)
function controlLoadGPX() {
	var inputElement = document.createElement('input'),
		button = controlButton('&uArr;', {
			title: 'Visualiser un fichier GPX sur la carte',
			action: function() {
				inputElement.click();
			}
		}),
		format = new ol.format.GPX(),
		reader = new FileReader();

	inputElement.type = 'file';
	inputElement.addEventListener('change', function() {
		reader.readAsText(inputElement.files[0]);
	});

	reader.onload = function() {
		var map = button.getMap(),
			features = format.readFeatures(reader.result, {
				dataProjection: 'EPSG:4326',
				featureProjection: 'EPSG:3857'
			});

		if (map.sourceEditor) { // If there is an active editor
			map.sourceEditor.addFeatures(features); // Add the track to the editor

			// Zomm the map on the added features
			var extent = ol.extent.createOrUpdateEmpty();
			for (var f of features)
				ol.extent.extend(extent, f.getGeometry().getExtent());
			button.getMap().getView().fit(extent);
		} else {
			// Display the track on the map
			var source = new ol.source.Vector({
					format: format,
					features: features
				}),
				vector = new ol.layer.Vector({
					source: source
				});
			button.getMap().addLayer(vector);
			button.getMap().getView().fit(source.getExtent());
		}
	};
	return button;
}

/**
 * GPX file downloader control
 * Requires controlButton
 */
function controlDownloadGPX() {
	var map,
		selectedFeatures = [],
		hiddenElement = document.createElement('a'),
		button = controlButton('&dArr;', {
			title: 'Obtenir un fichier GPX',
			action: function() {
				if (map.sourceEditor) // If there is an active editor
					download(map.sourceEditor.getFeatures());
				else if (selectedFeatures.length) // If there are selected features
					download(selectedFeatures);
				else
					alert('Sélectionnez une ou plusieurs traces à sauvegarder avec "Shift+Clic"');
			}
		});

	//HACK for Moz
	hiddenElement.target = '_blank';
	hiddenElement.style = 'display:none;opacity:0;color:transparent;';
	(document.body || document.documentElement).appendChild(hiddenElement);

	button.setMap = function(m) { //HACK overload the ol.control.Control.setMap
		ol.control.Control.prototype.setMap.call(this, m);
		map = m;

		if (!map.sourceEditor) { // If there is no active editor
			var select = new ol.interaction.Select({
				condition: ol.events.condition.click,
				hitTolerance: 6
			});
			select.on('select', function(e) {
				selectedFeatures = e.target.getFeatures().getArray();
			});
			map.addInteraction(select);
		}
	};

	function download(layers) {
		var fileName = 'trace.gpx',
			gpx = new ol.format.GPX().writeFeatures(layers).replace(/>/g, ">\n"),
			file = new Blob([gpx], {
				type: 'application/gpx+xml'
			});

		//HACK for IE/Edge
		if (typeof navigator.msSaveOrOpenBlob !== 'undefined')
			return navigator.msSaveOrOpenBlob(file, fileName);
		else if (typeof navigator.msSaveBlob !== 'undefined')
			return navigator.msSaveBlob(file, fileName);

		hiddenElement.href = URL.createObjectURL(file);
		hiddenElement.download = fileName;

		if (typeof hiddenElement.click === 'function')
			hiddenElement.click();
		else
			hiddenElement.dispatchEvent(new MouseEvent('click', {
				view: window,
				bubbles: true,
				cancelable: true
			}));
	}

	return button;
}

/**
 * HACK to display a title on the geocoder
 */
window.addEventListener('load', function() {
	var buttonElement = document.getElementById('gcd-button-control');
	if (buttonElement)
		buttonElement.title = 'Recherche par nom';
}, true);

/**
 * Controls examples
 * Requires many
 */
function controlsCollection() {
	return [
		new ol.control.ScaleLine(),
		new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(5),
			projection: 'EPSG:4326',
			className: 'ol-coordinate'
		}),
		new ol.control.Attribution({
			collapsible: false // Attribution always open
		}),
		new ol.control.Zoom(),
		//TODO BUG : pas de boutons de controles en full screen
		new ol.control.FullScreen({
			label: '\u21d4', // For old navigators support
			labelActive: '\u21ce',
			tipLabel: 'Plein écran'
		}),
		controlLengthLine(),
		controlPermalink({
			init: true,
			visible: true
		}),
		// Requires https://github.com/jonataswalker/ol-geocoder/tree/master/dist
		// Requires hack to display a title on the geocoder
		new Geocoder('nominatim', {
			provider: 'osm',
			lang: 'FR',
			keepOpen: true,
			placeholder: 'Saisir un nom' // Initialization of the input field
		}),
		controlGPS(),
		controlLoadGPX(),
		controlDownloadGPX(),
		//TODO impression full format page -> CSS
		controlButton('&equiv;', {
			title: 'Imprimer la carte',
			action: function() {
				window.print();
			}
		})
	];
}

/**
 * Line Editor
 * Requires controlButton
 */
function controlLineEditor(id, snapLayers) {
	var map,
		// Reading data
		textareaElement = document.getElementById(id), // <textarea> element
		format = new ol.format.GeoJSON(),
		features = format.readFeatures(
			JSON.parse(textareaElement.textContent), {
				featureProjection: 'EPSG:3857' // Reads/writes data as ESPG:4326 by default
			}
		),
		source = new ol.source.Vector({
			features: features,
			wrapX: false
		}),
		layer = new ol.layer.Vector({
			source: source,
			zIndex: 1
		}),
		interactions = {
			snap: new ol.interaction.Snap({
				source: source
			}),
			modify: new ol.interaction.Modify({
				source: source,
				deleteCondition: function(event) {
					//HACK because the system don't trig singleClick
					return ol.events.condition.altKeyOnly(event) && ol.events.condition.click(event);
				}
			}),
			draw: new ol.interaction.Draw({
				source: source,
				type: 'LineString'
			})
		},
		editMode = true, // Versus false if insert line mode
		bouton = controlButton('E', {
			title: "Editeur de lignes\n" +
				"Click sur E pour ajouter ou étendre une ligne, doubleclick pour finir\n" +
				"Click sur un sommet puis déplacer pour modifier\n" +
				"Click sur un segment puis déplacer pour créer un sommet\n" +
				"Alt+click sur un sommet pour le supprimer\n" +
				"Alt+click sur un segment pour le supprimer et couper la ligne\n" +
				"Ctrl+Alt+click sur une ligne pour la supprimer",
			action: function() {
				setMode(editMode ^= 1); // Alternately switch modes
			}
		});

	bouton.setMap = function(m) { //HACK overload the ol.control.Control.setMap
		ol.control.Control.prototype.setMap.call(this, m);
		map = m;
		map.sourceEditor = source; //HACK to make other control acting differently when there is an editor
		map.addLayer(layer);
		//HACK Avoid zooming when you leave the mode by doubleclick
		map.getInteractions().getArray().forEach(function(i) {
			if (i instanceof ol.interaction.DoubleClickZoom)
				map.removeInteraction(i);
		});

		// Snap on features external to the editor
		if (snapLayers)
			for (var s in snapLayers)
				snapLayers[s].getSource().on('change', snapFeatures);

		setMode(true); // Set edit mode by default
	};

	function snapFeatures() {
		this.forEachFeature(
			function(f) {
				interactions.snap.addFeature(f);
			}
		);
	}

	function setMode(em) {
		editMode = em;
		bouton.element.firstChild.innerHTML = editMode ? 'E' : '+';
		bouton.element.firstChild.style.color = editMode ? 'white' : 'black';
		for (var i in interactions)
			map.removeInteraction(interactions[i]);
		map.addInteraction(editMode ? interactions.modify : interactions.draw);
		map.addInteraction(interactions.snap);
	}
	interactions.draw.on(['drawend'], function() {
		setMode(true); // We close the line creation mode
	});
	source.on(['addfeature'], function() {
		stickLines();
	});
	source.on(['change'], function() {
		// Save lines in <EL> as geoJSON at every change
		textareaElement.textContent = format.writeFeatures(source.getFeatures(), {
			featureProjection: 'EPSG:3857'
		});
		map.dispatchEvent('changed'); //HACK Reset hover if any
	});

	// Removes a line, a segment, and breaks a line in 2
	interactions.modify.on('modifyend', function(event) {
		// We retrieve the list of targeted features
		var features = event.mapBrowserEvent.map.getFeaturesAtPixel(event.mapBrowserEvent.pixel, {
				hitTolerance: 6
			}),
			pointer = null,
			line = null;
		for (var f in features)
			if (features[f].getGeometry().flatCoordinates.length == 2)
				pointer = features[f];
			else
				line = features[f];

		if (pointer && line &&
			event.mapBrowserEvent.type == 'pointerup') {

			if (event.mapBrowserEvent.originalEvent.altKey) {
				source.removeFeature(line); // We delete the line

				if (!event.mapBrowserEvent.originalEvent.ctrlKey) {
					var cp = pointer.getGeometry().flatCoordinates, // The coordinates of the cut point marker
						vc = line.getGeometry().flatCoordinates, // The coordinates of the vertices of the line to be cut
						cs = [[],[]], // [[],[]], // The coordinates of the 2 cut segments
						s = 0;
					for (var cl = 0; cl < vc.length; cl += line.getGeometry().stride)
						// If we found the cutoff point
						if (cp[0] == vc[cl] && cp[1] == vc[cl + 1])
							s++; // We skip it and increment the segment counter
						else // We add the current point
							cs[s].push(vc.slice(cl));

					// We draw the 2 ends of lines
					for (var c in cs)
						if (cs[c].length > 1) // If they have at least 2 points
							source.addFeature(new ol.Feature({
								geometry: new ol.geom.LineString(cs[c], line.getGeometry().layout)
							}));

				}
			}
		}
		stickLines();
	});

	// Join lines with identical ends
	function stickLines() {
		var lines = [],
			fs = source.getFeatures();
		for (var f in fs)
			if (fs[f].getGeometry().getType().indexOf('String') !== -1) { // If it contains strings
				var cs = fs[f].getGeometry().getCoordinates();
				if (fs[f].getGeometry().getType() == 'LineString')
					cs = [cs];
				for (var c in cs) {
					var coordinates = cs[c];
					if (coordinates.length > 1) // If the line owns at least 2 points
						for (var i in [0, 0]) { // Twice (in both directions)
							lines.push({
								feature: fs[f],
								first: coordinates[0], // The first point
								suite: coordinates.slice(1) // The other points
							});
							coordinates = coordinates.reverse(); // And we redo the other way
						}
				}
			}

		for (var l1 in lines)
			for (var l2 in lines) {
				if (lines[l1].feature.ol_uid < lines[l2].feature.ol_uid && // Not the same line & not twice
					lines[l1].first[0] == lines[l2].first[0] && lines[l1].first[1] == lines[l2].first[1]) { // The ends matches
					// Remove the 2 lines
					source.removeFeature(lines[l1].feature);
					source.removeFeature(lines[l2].feature);

					// And add the merged one by gluing the 2 ends
					source.addFeature(new ol.Feature({
						geometry: new ol.geom.LineString(lines[l1].suite.reverse().concat([lines[l1].first]).concat(lines[l2].suite))
					}));

					return stickLines(); // Restart at the beginning
				}
			}

	}

	return bouton;
}
