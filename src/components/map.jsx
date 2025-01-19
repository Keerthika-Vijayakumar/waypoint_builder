import 'ol/ol.css';

import React, { Component } from 'react';

import Map from 'ol/Map';
import View from 'ol/View';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import { Polygon } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import { Draw } from 'ol/interaction';
import { getDistance } from 'ol/sphere';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import ModalComponent from './ModalComponent';

class MapComponent extends Component {
    constructor(props) {
        super(props);
        this.state = {
            waypointDetails: {
                type: 'Mission', // Mission or Polygon
                modalTitle: '', // Modal title
                coordinates: [], // LineString Coordinates
                polygonCoordinates: [], // Polygon Coordinates
                selectedWPIndex: null, // LinString index to import polygons
                insertPosition: 'before' // Position to insert polygon
            },
            isModalOpen: false // Flag to control modal visibility
        }
        this.map = null; // Reference to the map instance
        this.mapElement = React.createRef(); // Reference to the map container
        this.vectorSource = new VectorSource(); // Source for drawn features
        this.vectorLayer = new VectorLayer({ source: this.vectorSource }); // Layer to hold drawn features
        this.drawInteraction = null; // To hold the draw interaction
    }

    componentDidMount() {
        // Initialize the OpenLayers map
        this.map = new Map({
            target: this.mapElement.current,
            layers: [
                new TileLayer({
                    source: new OSM(), // OpenStreetMap layer
                }),
                this.vectorLayer, // Add vector layer for drawings
            ],
            view: new View({
                center: [0, 0], // Default center (longitude, latitude in EPSG:3857)
                zoom: 2
            }),
        });

        // Add event listener for Enter key
        window.addEventListener('keydown', this.handleKeyPress);
    }

    componentWillUnmount() {
        // Clean up event listener and map interactions on component unmount
        window.removeEventListener('keydown', this.handleKeyPress);

        if (this.map) {
            this.map.setTarget(null);
        }
        if (this.drawInteraction) {
            this.map.removeInteraction(this.drawInteraction);
        }
    }

    handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            this.drawInteraction.finishDrawing();
        }
    };

    calculateDistance = (coordinates) => {
        for (let i = 0; i < coordinates.length - 1; i++) {
            const distance = getDistance(
                toLonLat(coordinates[i]), // Convert from map projection to LonLat
                toLonLat(coordinates[i + 1]) // Convert from map projection to LonLat
            );
            coordinates[i + 1].distance = distance.toFixed(2); // Save distance in meters with 2 decimal places
        }
        return coordinates;
    };

    startDrawing = (type) => {
        let { waypointDetails } = this.state;
        // Remove any existing draw interaction
        if (this.drawInteraction) {
            this.map.removeInteraction(this.drawInteraction);
        }

        this.setState({
            isModalOpen: true,
            waypointDetails: {
                ...waypointDetails,
                modalTitle: 'Mission Creation',
            },
        });

        // Add a new draw interaction based on the selected type
        this.drawInteraction = new Draw({
            source: this.vectorSource,
            type, // "LineString" or "Polygon"
        });

        // Add the interaction to the map
        this.map.addInteraction(this.drawInteraction);

        // Handle the drawend event to update modal and retain the drawn feature
        this.drawInteraction.on('drawend', (event) => {
            const feature = event.feature; // Get the drawn feature
            let coordinates = feature.getGeometry().getCoordinates(); // Get its coordinates

            // Close drawing and update modal
            this.map.removeInteraction(this.drawInteraction);
            this.drawInteraction = null;

            if (type === 'Polygon') {
                const coordinatesCopy = coordinates[0];
                waypointDetails['polygonCoordinates'] = [this.calculateDistance(coordinatesCopy)];
                this.setState({ waypointDetails });
            } else {
                waypointDetails['coordinates'] = this.calculateDistance(coordinates);
                this.setState({ waypointDetails });
            }
        });
    };

    handleModalBack = (type, selectedWPIndex, insertPosition) => {
        let { waypointDetails } = this.state;
        waypointDetails['insertPosition'] = insertPosition;
        waypointDetails['type'] = type;
        waypointDetails['selectedWPIndex'] = selectedWPIndex;
        this.setState({ waypointDetails });
        this.startDrawing('Polygon');
    }

    importPolygonPoints = (type) => {
        let { waypointDetails } = this.state;
        if (type === 'discard') {
            waypointDetails['polygonCoordinates'] = []
            this.setState({ waypointDetails });
            return;
        }

        const { coordinates, polygonCoordinates, selectedWPIndex, insertPosition } = waypointDetails;

        // Check if polygonCoordinates exist
        if (!polygonCoordinates || polygonCoordinates.length === 0) {
            console.error('Polygon coordinates are missing.');
            return;
        }

        // Get the attachment point on the LineString
        const attachPoint = insertPosition === 'before' ? coordinates[selectedWPIndex] : coordinates[selectedWPIndex + 1];

        if (!attachPoint) {
            console.error('Attachment point is invalid.');
            return;
        }

        // Find the closest vertex of the polygon to the attachment point
        const closestVertex = polygonCoordinates[0].reduce((closest, vertex) => {
            const [x, y] = vertex;
            const distance = Math.sqrt(
                Math.pow(x - attachPoint[0], 2) + Math.pow(y - attachPoint[1], 2)
            );

            return distance < closest.distance
                ? { vertex, distance }
                : closest;
        }, { vertex: null, distance: Infinity }).vertex;

        if (!closestVertex) {
            console.error('Unable to find the closest vertex of the polygon.');
            return;
        }

        // Loop through all features in the layer and remove the polygon feature
        const features = this.vectorSource.getFeatures();

        features.forEach((feature) => {
            if (feature.getGeometry().getType() === 'Polygon') {
                this.vectorSource.removeFeature(feature);
            }
        });
        // Calculate the offset to translate the polygon
        const offsetX = attachPoint[0] - closestVertex[0];
        const offsetY = attachPoint[1] - closestVertex[1];

        // Translate the polygon to align its edge with the attachment point
        const transformedPolygonCoordinates = polygonCoordinates[0].map(([x, y]) => [
            x + offsetX,
            y + offsetY
        ]);

        // Create a new Polygon feature with the transformed coordinates
        const transformedPolygon = new Feature(
            new Polygon([transformedPolygonCoordinates])
        );

        // Add the transformed polygon to the layer
        this.vectorLayer.getSource().addFeature(transformedPolygon);

        waypointDetails['polygonCoordinates'] = [this.calculateDistance(transformedPolygonCoordinates)];
        const updatedCoordinates = [
            ...coordinates.slice(0, insertPosition === 'before' ? selectedWPIndex : selectedWPIndex + 1), // coordinates before the index
            [transformedPolygonCoordinates], // insert the polygon coordinates
            ...coordinates.slice(insertPosition === 'before' ? selectedWPIndex : selectedWPIndex + 1) // coordinates after the index
        ];
        waypointDetails['coordinates'] = updatedCoordinates;
        waypointDetails['type'] = 'Mission';
        this.setState({ waypointDetails })
    };
    render() {
        const { waypointDetails } = this.state;
        return (
            <div>
                {/* Buttons to toggle drawing modes */}
                <div style={{ padding: '10px', textAlign: 'center' }}>
                    <button className='drawing-btn' onClick={() => this.startDrawing('LineString')}>
                        Start Drawing
                    </button>
                </div>

                {/* Map container */}
                <div
                    ref={this.mapElement}
                    style={{ width: '100%', height: '90vh' }}
                ></div>

                {/* Modal Component */}
                <ModalComponent
                    isOpen={this.state.isModalOpen}
                    onClose={() => this.setState({ isModalOpen: false })}
                    waypointDetails={waypointDetails}
                    handleModalBack={this.handleModalBack}
                    onImportPoints={this.importPolygonPoints}
                />
            </div>
        );
    }
}

export default MapComponent;