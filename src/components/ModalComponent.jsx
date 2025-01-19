import './modal.css';

import React from 'react';
class ModalComponent extends React.Component {
    constructor(props) {
        super(props);
    }

    renderTable = (coordinates, columns, rowRenderer) => {
        if (!coordinates || coordinates.length === 0)
            return <></>;

        return (
            <table style={{ padding: "1rem 0rem" }}>
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {coordinates.map((waypoint, index) => rowRenderer(waypoint, index))}
                </tbody>
            </table>
        );
    }

    renderModalHeader = (title, onClose, handleModalBack, backButtonLabel) => {
        return (
            <div className="modal-header">
                <div>
                    {handleModalBack && (
                        <div style={{ color: "#a39fa8", textAlign: "left" }}>
                            <span
                                className="close-btn"
                                style={{ fontSize: "inherit", marginRight: "5px" }}
                                onClick={() => handleModalBack(backButtonLabel)}
                            >
                                &#8592;
                            </span>
                            <span>{backButtonLabel}</span>
                        </div>
                    )}
                    <h3 style={{ margin: "0px" }}>{title}</h3>
                </div>
                <span className="close-btn" onClick={onClose}>
                    &times;
                </span>
            </div>
        );
    }
    renderPolygonModal() {
        const { onClose, onImportPoints, waypointDetails, handleModalBack } = this.props;
        const { polygonCoordinates } = waypointDetails;
        const rowRenderer = (wp, index) => (
            <tr key={index}>
                <td>{String(index + 1).padStart(2, "0")}</td>
                <td>{wp[0]}, {wp[1]}</td>
                <td>{wp.distance || "N/A"}</td>
            </tr>
        );
        const columns = [
            { header: "WP" },
            { header: "Coordinates" },
            { header: "Distance (m)" },
            { header: "" },
        ];
        return (
            <div className="modal-container">
                {this.renderModalHeader("Polygon Tool", onClose, handleModalBack, "Mission")}
                <div className="modal-body">
                    {this.renderTable(polygonCoordinates?.[0], columns, rowRenderer)}
                    <div className="navigation-container">
                        <div className="instructions-container">
                            {"Click on the map to mark points of the polygon's perimeter, then press (Enter | Double click) to close and complete the polygon"}
                        </div>
                    </div>
                </div>
                <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                    <button className="discard-btn" onClick={() => onImportPoints("discard")}>
                        Discard
                    </button>
                    <button className="generate-data-btn" style={{ backgroundColor: "#1872a5" }} onClick={onImportPoints}>
                        Import Points
                    </button>
                </div>
            </div>
        );
    }
    renderMissionModal() {
        const { waypointDetails, onClose, handleModalBack } = this.props;
        const { coordinates, modalTitle } = waypointDetails;
        const columns = [
            { header: "Select" },
            { header: "WP" },
            { header: "Coordinates" },
            { header: "Distance (m)" },
            { header: "" },
        ];
        const rowRenderer = (wp, index) => (
            <tr key={index}>
                <td>
                    <input type="checkbox" />
                </td>
                <td>{String(index + 1).padStart(2, "0")}</td>
                <td>{wp[0]}, {wp[1]}</td>
                <td>{wp.distance || "N/A"}</td>
                <td>
                    <button className="three-dots-btn">
                        &#x22EE;
                        <div className="dropdown">
                            <button onClick={() => handleModalBack("Polygon", index, "before")}>
                                Insert Polygon Before
                            </button>
                            <button onClick={() => handleModalBack("Polygon", index, "after")}>
                                Insert Polygon After
                            </button>
                        </div>
                    </button>
                </td>
            </tr>
        );
        return (
            <div className="modal-container">
                {this.renderModalHeader(modalTitle, onClose)}
                <div className="modal-body">
                    {this.renderTable(coordinates, columns, rowRenderer)}
                    <div className="navigation-container">
                        <h3 style={{ margin: "0px" }}>Waypoint Navigation</h3>
                        <div className="instructions-container">
                            {"Click on the map to mark points of the route and then press (Enter | Double click) to complete the route"}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="generate-data-btn" onClick={() => alert("Generate Data clicked")}>
                        Generate Data
                    </button>
                </div>
            </div>
        )
    }
    render() {
        const { isOpen, waypointDetails } = this.props;
        const { type } = waypointDetails || {};
        if (!isOpen) {
            return <></>
        }

        switch (type) {
            case "Polygon":
                return this.renderPolygonModal();
            case "Mission":
                return this.renderMissionModal();
        }
    }
}

export default ModalComponent;