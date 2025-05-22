import React, { useState, useRef, useEffect } from "react";
import GestureList from "./GestureList";
import "./App.css";
import Keyboard from "simple-keyboard";
import swipe from "swipe-keyboard";
import DollarRecognizer from "./utils/dollarRecognizer";

// CSS
import "simple-keyboard/build/css/index.css";
import "./styles/index.css";

function App() {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const keyboardRef = useRef(null);
  const recognizerRef = useRef(null);

  const [showGestures, setShowGestures] = useState(false);
  const [gestureWordMap, setGestureWordMap] = useState({
  });

  useEffect(() => {
    const savedMode = localStorage.getItem("showGestures");
    if (savedMode === "true") {
      setShowGestures(true);
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem("showGestures", showGestures);
  }, [showGestures]);

  // For gesture adding modal
  const [showAddGesture, setShowAddGesture] = useState(false);
  const [newGestureWord, setNewGestureWord] = useState("");
  const addCanvasRef = useRef(null);

  // Initialize recognizer only once
  useEffect(() => {
    recognizerRef.current = new DollarRecognizer();
    recognizerRef.current.AddGesture("4", [
      { X: 50, Y: 120 }, { X: 80, Y: 60 }, { X: 110, Y: 120 }, { X: 110, Y: 30 }
    ]);
  }, []);

  // Initialize keyboard and gesture canvas logic when keyboard UI is shown
  useEffect(() => {
    if (showGestures) return;

    // Delay initialization to ensure .simple-keyboard is in the DOM
    setTimeout(() => {
      keyboardRef.current = new Keyboard({
        onChange: input => {
          if (inputRef.current) inputRef.current.value = input;
        },
        onKeyPress: button => {
          if (button === "{shift}" || button === "{lock}") {
            const currentLayout = keyboardRef.current.options.layoutName;
            const shiftToggle = currentLayout === "default" ? "shift" : "default";
            keyboardRef.current.setOptions({ layoutName: shiftToggle });
          }
        },
        useMouseEvents: true,
        modules: [swipe],
        layout: {
          default: [
            "q w e r t y u i o p {bksp}",
            "a s d f g h j k l",
            "z x c v b n m",
            "{shift} {space}"
          ],
          shift: [
            "Q W E R T Y U I O P {bksp}",
            "A S D F G H J K L",
            "Z X C V B N M",
            "{shift} {space}"
          ]
        },
        display: {
          "{shift}": "⇧",
          "{lock}": "⇪",
          "{bksp}": "⌫",
          "{enter}": "⏎",
          "{space}": "␣"
        }
      });
    }, 0);

    const handleInput = event => {
      if (keyboardRef.current) keyboardRef.current.setInput(event.target.value);
    };
    const inputElem = inputRef.current;
    inputElem.addEventListener("input", handleInput);

    // Gesture canvas logic
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let points = [];

    const handleMouseDown = e => {
      drawing = true;
      points = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
      points.push({ X: e.offsetX, Y: e.offsetY });
    };

    const handleMouseMove = e => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      points.push({ X: e.offsetX, Y: e.offsetY });
    };

    const handleMouseUp = () => {
      drawing = false;
      ctx.closePath();

      if (points.length > 5) {
        const result = recognizerRef.current.Recognize(points);
        if (result.Score > 0.7 && gestureWordMap[result.Name]) {
          const word = gestureWordMap[result.Name];
          const currentValue = inputRef.current.value;
          const newValue = currentValue
            ? currentValue.trim() + " " + word + " "
            : word + " ";
          keyboardRef.current.setInput(newValue);
          inputRef.current.value = newValue;
        }
      }
      setTimeout(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }, 200);
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      inputElem.removeEventListener("input", handleInput);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (keyboardRef.current) {
        keyboardRef.current.destroy();
        keyboardRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [showGestures, gestureWordMap]);

  // Add gesture modal logic
  useEffect(() => {
    if (!showAddGesture) return;
    const canvas = addCanvasRef.current;
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let points = [];

    const handleMouseDown = e => {
      drawing = true;
      points = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
      points.push({ X: e.offsetX, Y: e.offsetY });
    };

    const handleMouseMove = e => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      points.push({ X: e.offsetX, Y: e.offsetY });
    };

    const handleMouseUp = () => {
      drawing = false;
      ctx.closePath();
      // Save gesture
      if (points.length > 5 && newGestureWord) {
        const gestureKey = JSON.stringify(points);
        recognizerRef.current.AddGesture(gestureKey, points);
        setGestureWordMap(prev => ({
          ...prev,
          [gestureKey]: newGestureWord.trim()
        }));
        setShowAddGesture(false);
        setNewGestureWord("");
        setTimeout(() => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 200);
        window.alert(`Gesture saved! Now drawing this gesture will input "${newGestureWord.trim()}"`);
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [showAddGesture, newGestureWord]);

  return (
    <div className="App">
      <div className="descriptionText">
        <h2 style={{ marginBottom: "12px" }}>🧠 Smart Swipe Keyboard</h2>
        <p>Welcome to your gesture-powered keyboard experience! Here's what you can do:</p>
        <ul style={{ textAlign: "left", marginTop: "16px" }}>
          <li>🖐️ <strong>Swipe</strong> over the keyboard to type like a pro</li>
          <li>✍️ <strong>Draw gestures</strong> in the canvas to insert custom words</li>
          <li>⚙️ <strong>Tap "Modify Gestures"</strong> above the canvas to customize them</li>
        </ul>
      </div>
      
      <button
        className="Button"
        onClick={() => setShowGestures((v) => !v)}
        style={{ marginBottom: "18px" }}
      >
        {showGestures ? "Back to Keyboard" : "Modified Gestures"}
      </button>

      {showGestures ? (
        <div>
          <button
            className="Button"
            style={{ marginBottom: "18px" }}
            onClick={() => setShowAddGesture(true)}
          >
            Add Gesture
          </button>

          <GestureList
            gestureWordMap={gestureWordMap}
            onDeleteGesture={gestureKey => {
              setGestureWordMap(prev => {
                const updated = { ...prev };
                delete updated[gestureKey];
                return updated;
              });
            }}
          />
          {showAddGesture && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000
              }}
            >
              <div style={{ background: "#fff", padding: 24, borderRadius: 8, textAlign: "center" }}>
                <h3>Draw your gesture</h3>
                <input
                  type="text"
                  placeholder="Associated Word"
                  value={newGestureWord}
                  onChange={e => setNewGestureWord(e.target.value)}
                  style={{ marginBottom: 8, width: "80%" }}
                />
                <br />
                <canvas
                  ref={addCanvasRef}
                  width={400}
                  height={200}
                  style={{ border: "1px solid #ccc", marginBottom: 8 }}
                />
                <div>
                  <button
                    onClick={() => setShowAddGesture(false)}
                    style={{ marginRight: 8 }}
                  >
                    Cancel
                  </button>
                  <span style={{ color: "#888" }}>
                    Draw the gesture and release mouse to save
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {!showGestures && (
            <div>
              <div className="inputRowHorizontal">
              <input
                  ref={inputRef}
                  className="inputWide"
                  placeholder="Swipe over the virtual keyboard to start"
                />
                <button
                  className="clearBtn"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.value = "";
                      if (keyboardRef.current) keyboardRef.current.setInput("");
                    }
                  }}
                >
                  Clear
                </button>
              </div>

              <div className="keyboardContainer" style={{ display: "flex", justifyContent: "center" }}>
                <div className="simple-keyboard"></div>
                <canvas
                ref={canvasRef}
                id="gestureCanvas"
                width="500"
                height="200"
                style={{
                  display: "block",
                  margin: "0 auto 18px auto",
                  maxWidth: "100%"
                }}
              ></canvas>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
