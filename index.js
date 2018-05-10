// LA CARTE ------------------------------------------------
var IGNkey = 'o6owv8ubhn3vbz2uj8jq5j0z'; // localhost
//var IGNkey = 'hcxdz5f1p9emo4i1lch6ennl'; // chemineur.fr
var thunderforestKey = 'a54d38a8b23f435fa08cfb1d0d0b266e'; // https://manage.thunderforest.com
var bingKey = 'ArLngay7TxiroomF7HLEXCS7kTWexf1_1s1qiF7nbTYs2IkD3XLcUnvSlKbGRZxt';

var baseLayers = {
	'OSM-FR': OSMlayer('//{a-c}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'),
	'OSM': OSMlayer('//{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
	'MRI': OSMlayer('//maps.refuges.info/hiking/{z}/{x}/{y}.png', '<a href="http://wiki.openstreetmap.org/wiki/Hiking/mri">MRI</a>'),
	'Hike & Bike': OSMlayer('http://{a-c}.tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png', '<a href="http://www.hikebikemap.org/">hikebikemap.org</a>'), // Not on https
	'Autriche': kompassLayer('KOMPASS Touristik'),
	'OSM-outdoors': thunderforestLayer('outdoors', thunderforestKey),
	'OSM-cycle': thunderforestLayer('cycle', thunderforestKey),
	'OSM-landscape': thunderforestLayer('landscape', thunderforestKey),
	'OSM-transport': thunderforestLayer('transport', thunderforestKey),
	'IGN': ignLayer(IGNkey, 'GEOGRAPHICALGRIDSYSTEMS.MAPS'),
	'IGN photos': ignLayer(IGNkey, 'ORTHOIMAGERY.ORTHOPHOTOS'),
	'IGN TOP 25': ignLayer(IGNkey, 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD'),
	'IGN classique': ignLayer(IGNkey, 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.CLASSIQUE'),
	// NOT YET	ignLayer('IGN avalanches', IGNkey,'GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN'),
	'Cadastre': ignLayer(IGNkey, 'CADASTRALPARCELS.PARCELS', 'image/png'),
	'Swiss': swissLayer('ch.swisstopo.pixelkarte-farbe'),
	'Swiss photo': swissLayer('ch.swisstopo.swissimage'),
	'Espagne': spainLayer('mapa-raster', 'MTN'),
	'Espagne photo': spainLayer('pnoa-ma', 'OI.OrthoimageCoverage'),
	'Italie': igmLayer(),
	'Angleterre': osLayer(bingKey),
	'Bing': bingLayer('Road', bingKey),
	'Bing photo': bingLayer('Aerial', bingKey),
	'Google road': googleLayer('m'),
	'Google terrain': googleLayer('p'),
	'Google photo': googleLayer('s'),
	'Google hybrid': googleLayer('s,h'),
	Stamen: stamenLayer('terrain'),
	Watercolor: stamenLayer('watercolor'),
	'Neutre': new ol.layer.Tile()
};

var overLayers = {
	WRI: pointsWriLayer(),
	Massifs: massifsWriLayer(),
	Chemineur: geoJsonLayer({
		url: 'http://chemineur.fr/ext/Dominique92/GeoBB/gis.php?site=this&poi=3,8,16,20,23,28,30,40,44,64,58,62',
		properties: function(property) {
			return {
				styleImage: property.icone,
				hoverText: property.nom,
				clickUrl: property.url
			}
		}
	})
/*	,OverPass: overpassLayer({
		// icon_name: '[overpass selection]'
		ravitaillement: '["shop"~"supermarket|convenience"]',
		bus: '["highway"="bus_stop"]',
		parking: '["amenity"="parking"]["access"!="private"]',
		camping: '["tourism"="camp_site"]',
		'refuge-garde': '["tourism"="alpine_hut"]',
		'cabane-non-gardee': '["building"="cabin"]',
		abri: '["amenity"="shelter"]',
		hotel: '["tourism"~"hotel|guest_house|chalet|hostel|apartment"]',
	})*/
}

var controls = [
	controlLayers(baseLayers, overLayers),
	new ol.control.Zoom(),
	new ol.control.Attribution({
		collapsible: false // Attribution toujours ouverte
	}),
	//TBD BUG full screen limité en hauteur (chrome, mobile, ...)
	new ol.control.FullScreen({
		label: '\u21d4',
		labelActive: '\u21ce',
		tipLabel: 'Plein écran'
	}),
	new ol.control.ScaleLine(),
	new ol.control.MousePosition({
		coordinateFormat: ol.coordinate.createStringXY(5),
		projection: 'EPSG:4326',
		className: 'ol-coordinate'
	}),
	permalink({
		init: true,
		invisible: false
	}),
	// https://github.com/jonataswalker/ol-geocoder
	new Geocoder('nominatim', {
		provider: 'osm',
		lang: 'FR',
		placeholder: 'Recherche par nom' // Initialisation du champ de saisie
	}),
	buttonGPS(),
	controlButton('&equiv;', {
		title: 'Imprimer la carte',
		action: function() {
			window.print();
		}
	})
];

var map = new ol.Map({
	target: 'map',
	//	loadTilesWhileInteracting: true,
	controls: controls,
	view: new ol.View({
		//center: ol.proj.fromLonLat([-3.5, 48.25]), // France
		center: ol.proj.fromLonLat([7, 47]), // Suisse
		//center: ol.proj.fromLonLat([9.2, 45.5]), // Milan
		//center: ol.proj.fromLonLat([7.07, 45.19]), // Rochemelon
		//center: ol.proj.fromLonLat([-.1, 51.5]), // Londres
		zoom: 8
	})
});

//TEST
var viseur = marqueur('images/viseur.png', [6.15, 46.2], 'edit-lonlat', [
	'Lon <input type="text" onchange="viseur.edit(this,0,4326)" size="12" maxlength="12" value="{0}"/>' +
	'<br/>Lat <input type="text" onchange="viseur.edit(this,1,4326)" size="12" maxlength="12" value="{1}"/>',
	'<br/>X <input type="text" onchange="viseur.edit(this,0,21781)" size="12" maxlength="12" value="{2}"/>' +
	'<br/>Y <input type="text" onchange="viseur.edit(this,1,21781)" size="12" maxlength="12" value="{3}"/>'
], 'edit');
map.addLayer(viseur);

map.addLayer(marqueur('images/cadre.png', [-.575, 44.845], 'lonlat', ['Lon {0}, Lat {1}', '<br/>X {2}, Y {3} (CH1903)']));

if(overLayers.Massifs)
	map.addLayer(lineEditor('geojson', [overLayers.Massifs]));
