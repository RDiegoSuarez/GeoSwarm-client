function getParameterByName(param, url) {
    if (!url) url = window.location.href;

    var results = new RegExp('[\\?&]' + param + '=([^&#]*)').exec(url);
    if (!results) return undefined;
    
    return results[1] || undefined;
 }

var projection = ol.proj.get('EPSG:4326');
var resolutions = [
    1.40625,
    0.703125,
    0.3515625,
    0.17578125,
    0.087890625,
    0.0439453125,
    0.02197265625,
    0.010986328125,
    0.0054931640625,
    0.00274658203125
];

var map  = null;
var node = null;
var xhr  = null;
var ipfs_geoswarm_hash = null;

function IPFS_Show_Status(peers) {
    status  = (node.isOnline() ? '<font color=green>online</font>' : '<font color=red>offline</font>');
    status += ' / Swarm: <font color=blue>'+peers+'</font> peer(s)';
    node.repo.stat(function (err, stats){
        status += ' / Cache: <font color=blue>'+Math.floor((stats.repoSize/stats.storageMax)*100)+'</font> %';
        document.getElementById("ipfs").innerHTML= 'IPFS status: ' + status;
    });
}

function IPFS_Status() {
    node.swarm.peers(function (err, peerInfos) {
        if (err) {
            throw err
        }

        IPFS_Show_Status(peerInfos.length);

        setTimeout(IPFS_Status, 1000);

        // Waiting 4 peers before loading map
        if ((map == null)&&(peerInfos.length > 4))
        {
            map = new ol.Map({
                target: 'map',
                layers: [
                    new ol.layer.Tile({
                        extent: [-180, -90, 180, 90],
                        source: new ol.source.TileWMS({
                            url: '/ipfs/QmWPvCEnSkGR8iTs6uiZSNkbupbv7sz3MV5mKW3erHYVZa',
                            params: { 'LAYERS': 'world' },
                            tileLoadFunction: function (imageTile, src) {
                                bbox = getParameterByName('BBOX', src);
                                extent = bbox.split("%2C");
                                res = (extent[2] - extent[0]) / 256;
                                for (z = 0; z < resolutions.length; z++)
                                    if (res == resolutions[z]) break;
                                x = -270;
                                y = -180;

                                x = extent[0] - x;
                                y = extent[1] - y;

                                x /= extent[2] - extent[0];
                                y /= extent[3] - extent[1];

                                cache = '/ipfs/' + ipfs_geoswarm_hash;
                                cache += '/world/z' + z + '/' + x + '_' + y + '.png';

                                console.log(cache);

                                node.files.get(cache, function (err, files) {
                                    files.forEach((file) => {
                                        console.log('GOT => ' + file.path);
                                        imageTile.getImage().src = 'data:image/png;base64,' + file.content.toString('base64');
                                    })
                                });

                            }
                        })
                    })
                ],
                view: new ol.View({
                    projection: projection,
                    center: [0, 0],
                    zoom: 0
                })
            });
        }
    });
}

function init_xhr(){
    if(window.XMLHttpRequest || window.ActiveXObject){
        if(window.ActiveXObject){
            try{
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            }catch(e){
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }else{
            xhr = new XMLHttpRequest(); 
        }
    }else{
        alert("Votre navigateur ne supporte pas l'objet XMLHTTPRequest...");
        return; 
    }
}

var checkLoad = function() {   
    document.readyState !== "complete" ? setTimeout(checkLoad, 11) : initGeoSwarm();   
};  
checkLoad(); 

function initGeoSwarm()
{
    init_xhr();

    xhr.open('GET', '/GEOSWARM_HASH');
    xhr.overrideMimeType("text/plain"); 
    xhr.onload = function() {
        if (xhr.status === 200) {
            ipfs_geoswarm_hash = xhr.responseText.replace(/\n|\r/g, ''); 
        } else {
            ipfs_geoswarm_hash ='QmWPvCEnSkGR8iTs6uiZSNkbupbv7sz3MV5mKW3erHYVZa';
        }
        init_IPFS();
    };
    xhr.send();
}

function init_IPFS()
{
    node = new Ipfs({
        /* Uncomment if you have a local IPFS node
        config: {
            Addresses: {
                Swarm: [
                    '/ip4/127.0.0.1/tcp/5001'
                ]
           }
        },*/
        repo: '[Geo-Swarm]-' + Math.random()
    });        

    node.once('ready', () => {
        IPFS_Status();
    });
}