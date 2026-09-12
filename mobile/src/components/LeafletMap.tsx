import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface MapMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  title?: string;
  selected?: boolean;
}

interface LeafletMapProps {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: MapMarker[];
  onMarkerPress?: (id: string | number) => void;
  style?: any;
  fitToMarkers?: boolean;
}

export function LeafletMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  onMarkerPress, 
  style,
  fitToMarkers = false 
}: LeafletMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Send updates to the map without reloading the entire WebView
  // We must wait for isLoaded to be true to avoid race conditions!
  useEffect(() => {
    if (webViewRef.current && isLoaded) {
      const data = { center, zoom, markers, fitToMarkers };
      webViewRef.current.injectJavaScript(`
        if (window.updateMap) {
          window.updateMap(JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(data))}")));
        }
        true;
      `);
    }
  }, [center, zoom, markers, fitToMarkers, isLoaded]);

  // The initial HTML is loaded once. 
  // It uses Leaflet.js from CDN (standard standard for Expo Go maps).
  // We use useMemo to prevent the HTML string from changing and causing a full WebView reload!
  const html = React.useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #EDF1EF; }
        #map { position: absolute; top: 0; bottom: 0; left: 0; right: 0; z-index: 1; }
        .custom-marker {
          background-color: #2B7A4B;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          width: 20px !important;
          height: 20px !important;
          box-sizing: border-box;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
        }
        .custom-marker.selected {
          background-color: #16794B;
          border-color: #173D2D;
          width: 26px !important;
          height: 26px !important;
          margin-left: -3px;
          margin-top: -3px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${center.latitude}, ${center.longitude}], ${zoom});
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        var markersLayer = L.layerGroup().addTo(map);
        
        // Track last center to avoid jitter during React re-renders
        var lastCenter = "${center.latitude},${center.longitude}";

        window.updateMap = function(data) {
          // Update center if it changed
          var newCenter = data.center.latitude + "," + data.center.longitude;
          if (newCenter !== lastCenter && !data.fitToMarkers) {
            map.flyTo([data.center.latitude, data.center.longitude], data.zoom || map.getZoom());
            lastCenter = newCenter;
          }
          
          markersLayer.clearLayers();
          
          var bounds = [];
          
          if (data.markers && data.markers.length > 0) {
            data.markers.forEach(function(m) {
              var className = 'custom-marker' + (m.selected ? ' selected' : '');
              var icon = L.divIcon({ className: className, iconSize: [20, 20] });
              var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(markersLayer);
              
              if (m.title) marker.bindPopup(m.title);
              
              marker.on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
              });
              
              bounds.push([m.latitude, m.longitude]);
            });
          }
          
          if (data.fitToMarkers && bounds.length > 0) {
            if (bounds.length === 1) {
              map.flyTo(bounds[0], 14);
            } else {
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
          }
        };

        // Render initial markers safely avoiding quote escaping bugs
        var initialData = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify({ center, markers, fitToMarkers }))}"));
        window.updateMap(initialData);
      </script>
    </body>
    </html>
  `, []);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={{ flex: 1, backgroundColor: '#EDF1EF' }}
        scrollEnabled={false}
        bounces={false}
        onLoadEnd={() => setIsLoaded(true)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'markerPress' && onMarkerPress) {
              onMarkerPress(data.id);
            }
          } catch (e) {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF1EF' }
});
