import React, { useEffect, useRef } from "react";

function GestureCanvas({ points, width = 100, height = 50, padding = 10 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    if (points.length > 1) {
      // Find bounds
      const xs = points.map(p => p.X);
      const ys = points.map(p => p.Y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Calculate scale and offset to fit gesture in canvas with padding
      const gestureWidth = maxX - minX || 1;
      const gestureHeight = maxY - minY || 1;
      const scale = Math.min(
        (width - 2 * padding) / gestureWidth,
        (height - 2 * padding) / gestureHeight
      );
      const offsetX = (width - gestureWidth * scale) / 2 - minX * scale;
      const offsetY = (height - gestureHeight * scale) / 2 - minY * scale;

      ctx.beginPath();
      ctx.moveTo(points[0].X * scale + offsetX, points[0].Y * scale + offsetY);
      points.forEach(pt => {
        ctx.lineTo(pt.X * scale + offsetX, pt.Y * scale + offsetY);
      });
      ctx.stroke();
    }
  }, [points, width, height, padding]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ border: "1px solid #ccc" }} />;
}

export default function GestureList({ gestureWordMap, onDeleteGesture }) {
  return (
    <div style={{ margin: "2rem" }}>
      <h2>Saved Gestures</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Gesture</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Associated Word</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(gestureWordMap).map(([gestureKey, word]) => {
            let points;
            try {
              points = JSON.parse(gestureKey);
            } catch {
              points = [];
            }
            return (
              <tr key={gestureKey}>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  <GestureCanvas points={points} width={120} height={60} />
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{word}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  <button
                    style={{
                      background: "#e74c3c",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 10px",
                      cursor: "pointer"
                    }}
                    onClick={() => onDeleteGesture(gestureKey)}
                    title="Delete gesture"
                  >
                    X
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}