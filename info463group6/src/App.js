import React, { useState, useRef, useEffect } from "react";
import GestureList from "./GestureList";
import "./App.css";
import Keyboard from "simple-keyboard";
import swipe from "swipe-keyboard";
import DollarRecognizer from "./utils/dollarRecognizer";
import { saveAs } from "file-saver";

// CSS
import "simple-keyboard/build/css/index.css";
import "./styles/index.css";

function App() {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const keyboardRef = useRef(null);
  const recognizerRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [showGestures, setShowGestures] = useState(false);
  const [gestureWordMap, setGestureWordMap] = useState({});

  // SEPARATE STATE FOR ADD GESTURE MODAL
  const [addGesturePoints, setAddGesturePoints] = useState([]);

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
          // Highlight the pressed key
          highlightKey(button);

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
            "z x c v b n m . ,",
            "{shift} {space}"
          ],
          shift: [
            "Q W E R T Y U I O P {bksp}",
            "A S D F G H J K L",
            "Z X C V B N M . ,",
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

    const highlightKey = (button) => {
      // Remove highlight from all keys
      document.querySelectorAll('.hg-button').forEach(el => {
        el.classList.remove('key-highlight');
      });

      // Add highlight to the pressed key
      // For special keys, simple-keyboard uses their label as class, e.g. hg-button-bksp
      let selector = `.hg-button[data-skbtn="${button}"]`;
      // For space, shift, etc., fallback to class
      if (button === "{space}") selector = `.hg-button.hg-button-space`;
      if (button === "{shift}") selector = `.hg-button.hg-button-shift`;
      if (button === "{bksp}") selector = `.hg-button.hg-button-bksp`;
      if (button === "{lock}") selector = `.hg-button.hg-button-lock`;
      if (button === "{enter}") selector = `.hg-button.hg-button-enter`;

      const keyEl = document.querySelector(selector);
      if (keyEl) {
        keyEl.classList.add('key-highlight');
        setTimeout(() => {
          keyEl.classList.remove('key-highlight');
        }, 150); // Highlight duration in ms
      }
    };

    const handleInput = event => {
      if (keyboardRef.current) keyboardRef.current.setInput(event.target.value);
    };
    const inputElem = inputRef.current;
    inputElem.addEventListener("input", handleInput);

    // Gesture canvas logic
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let currentPoints = []; // Use local variable to avoid stale closure

    const handleMouseDown = e => {
      drawing = true;
      currentPoints = [{ X: e.offsetX, Y: e.offsetY }];
      setPoints(currentPoints);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const handleMouseMove = e => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      currentPoints = [...currentPoints, { X: e.offsetX, Y: e.offsetY }];
      setPoints(currentPoints);
    };

    const handleMouseUp = () => {
      drawing = false;
      ctx.closePath();

      // Use currentPoints instead of stale points from state
      if (currentPoints.length > 5) {
        const result = recognizerRef.current.Recognize(currentPoints);
        console.log("Recognition result:", result); // DEBUG
        if (result.Score > 0.5 && gestureWordMap[result.Name]) {
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

  // FIXED: Add gesture modal logic with separate points state
  useEffect(() => {
    if (!showAddGesture) return;
    const canvas = addCanvasRef.current;
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let currentPoints = []; // Use local variable for immediate access
  
    const handleMouseDown = e => {
      drawing = true;
      currentPoints = [{ X: e.offsetX, Y: e.offsetY }];
      setAddGesturePoints(currentPoints);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };
  
    const handleMouseMove = e => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      currentPoints = [...currentPoints, { X: e.offsetX, Y: e.offsetY }];
      setAddGesturePoints(currentPoints);
    };
  
    const handleMouseUp = () => {
      drawing = false;
      ctx.closePath();
      console.log("Drawing completed. Points:", currentPoints.length); // DEBUG
    };
  
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
  
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [showAddGesture]);

  // FIXED: Save gesture function
  const saveGesture = () => {
    console.log("Save button clicked"); // DEBUG
    console.log("addGesturePoints length:", addGesturePoints.length); // DEBUG
    console.log("newGestureWord:", newGestureWord.trim()); // DEBUG
    
    if (addGesturePoints.length > 5 && newGestureWord.trim()) {
      const gestureKey = JSON.stringify(addGesturePoints);
      console.log("Adding gesture with key:", gestureKey); // DEBUG
      
      recognizerRef.current.AddGesture(gestureKey, addGesturePoints);
      setGestureWordMap(prev => ({
        ...prev,
        [gestureKey]: newGestureWord.trim()
      }));
      
      // Clear modal state
      setShowAddGesture(false);
      setNewGestureWord("");
      setAddGesturePoints([]);
      
      // Clear canvas
      const canvas = addCanvasRef.current;
      if (canvas) {
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      }
      
      window.alert(`Gesture saved! Now drawing this gesture will input "${newGestureWord.trim()}"`);
    } else {
      alert("Please draw a gesture and enter a word before saving.");
    }
  };

  // FIXED: Clear gesture canvas function
  const clearGestureCanvas = () => {
    const canvas = addCanvasRef.current;
    if (canvas) {
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      setAddGesturePoints([]);
    }
  };

  // Test mode state
  const [testMode, setTestMode] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testSentences] = useState([
    "She packed twelve blue pens in her small bag.",
    "Every bird sang sweet songs in the quiet dawn.",
    "They watched clouds drift across the golden sky.",
    "A clever mouse slipped past the sleepy cat.",
    "Green leaves danced gently in the warm breeze.",
    "He quickly wrote notes before the test began.",
    "The tall man wore boots made of soft leather.",
    "Old clocks ticked loudly in the silent room.",
    "She smiled while sipping tea on the front porch.",
    "We found a hidden path behind the old barn.",
    "Sunlight streamed through cracks in the ceiling.",
    "Dogs barked at shadows moving through the yard.",
    "Rain tapped softly against the window glass.",
    "Bright stars twinkled above the quiet valley.",
    "He tied the package with ribbon and string.",
    "A sudden breeze blew papers off the desk.",
    "The curious child opened every single drawer.",
    "Fresh apples fell from the heavy tree limbs.",
    "The artist painted scenes from her memory.",
    "They danced all night under the glowing moon."
  ]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [entryLog, setEntryLog] = useState([]);
  const [testInput, setTestInput] = useState("");

  // Track per-sentence input and timing for metrics
  const [sentenceResults, setSentenceResults] = useState([]);

  // Helper to start test
  const startTest = () => {
    setTestMode(true);
    setTestStarted(true);
    setCurrentSentenceIdx(0);
    setEntryLog([]);
    setTestInput("");
    if (inputRef.current) inputRef.current.value = ""; // <-- Add this line
    if (keyboardRef.current) keyboardRef.current.setInput(""); // <-- Add this line for virtual keyboard
  };

  // Helper to end test and download log
  const endTest = (clearResults = true) => {
    setTestMode(false);
    setTestStarted(false);

    // Combine all entryLogs from sentenceResults
    let allLogs = [];
    sentenceResults.forEach(r => {
      if (Array.isArray(r.entryLog)) {
        allLogs = allLogs.concat(r.entryLog);
      }
    });
    if (entryLog.length > 0) {
      allLogs = allLogs.concat(entryLog);
    }

    // Download combined log as JSON
    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: "application/json" });
    saveAs(blob, "text_entry_log.json");

    // Always generate metrics if there are results
    const allResults = [...sentenceResults];
    if (entryLog.length > 0) {
      // If the current sentence hasn't been pushed yet, add it
      const target = testSentences[currentSentenceIdx];
      const input = testInput;
      const sentenceEntries = entryLog.filter(e => e);
      const first = sentenceEntries.length > 0 ? sentenceEntries[0].timestamp : null;
      const last = sentenceEntries.length > 0 ? sentenceEntries[sentenceEntries.length - 1].timestamp : null;
      const msElapsed = first !== null && last !== null ? last - first : 0;
      allResults.push({
        target,
        input,
        msElapsed,
        entryLog: sentenceEntries
      });
    }
    if (allResults.length > 0) {
      calculateAndShowMetrics(allResults);
    }

    setEntryLog([]);
    setTestInput("");
    setCurrentSentenceIdx(0);
    if (clearResults) setSentenceResults([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Calculate and show metrics after all sentences
  const calculateAndShowMetrics = (results) => {
    let totalMSD = 0;
    let totalRawWPM = 0;
    let totalAdjWPM = 0;
    let totalTime = 0;
    let totalChars = 0;
    let totalSentences = results.length;

    results.forEach(({ target, input, msElapsed }) => {
      const { msd, rawWPM, adjWPM } = adjustedWPM(target, input, msElapsed);
      totalMSD += msd;
      totalRawWPM += rawWPM;
      totalAdjWPM += adjWPM;
      totalTime += msElapsed;
      totalChars += input.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim().length;
    });

    const avgMSD = totalMSD / totalSentences;
    const avgRawWPM = totalRawWPM / totalSentences;
    const avgAdjWPM = totalAdjWPM / totalSentences;

    // Show metrics to user
    window.alert(
      `Test Complete!\n\n` +
      `Average Minimum String Distance (MSD): ${avgMSD.toFixed(2)}\n` +
      `Average Raw WPM: ${avgRawWPM.toFixed(2)}\n` +
      `Average Adjusted WPM: ${avgAdjWPM.toFixed(2)}\n` +
      `Total Time: ${(totalTime / 1000).toFixed(1)} seconds`
    );

    // Optionally: Save metrics in the log for download
    const metricsSummary = {
      avgMSD,
      avgRawWPM,
      avgAdjWPM,
      totalTimeMs: totalTime,
      totalChars,
      totalSentences,
      perSentence: results.map((r, i) => {
        const { msd, rawWPM, adjWPM } = adjustedWPM(r.target, r.input, r.msElapsed);
        return {
          sentenceIdx: i,
          target: r.target,
          input: r.input,
          msElapsed: r.msElapsed,
          msd,
          rawWPM,
          adjWPM
        };
      })
    };
    // Download metrics as JSON
    const blob = new Blob([JSON.stringify(metricsSummary, null, 2)], { type: "application/json" });
    saveAs(blob, "text_entry_metrics.json");
    setSentenceResults([]); // Clear for next test
  };

  // FIXED: Record keystrokes and gestures in test mode
  useEffect(() => {
    if (!testMode || !testStarted) return;

    // Handler for physical keyboard input
    const handleInput = (e) => {
      const value = e.target.value;
      const now = Date.now();
      setEntryLog((prev) => [
        ...prev,
        {
          type: "input",
          value,
          key: e.data || "",
          timestamp: now
        }
      ]);
      setTestInput(value);
    };

    // Handler for virtual keyboard input
    const handleVirtualInput = (input) => {
      const now = Date.now();
      setEntryLog((prev) => [
        ...prev,
        {
          type: "virtual",
          value: input,
          key: "", // simple-keyboard doesn't provide key
          timestamp: now
        }
      ]);
      setTestInput(input);
      if (inputRef.current) inputRef.current.value = input;
    };

    // Handler for gestures
    const handleGesture = (word) => {
      const now = Date.now();
      const newValue = testInput + (testInput ? " " : "") + word + " ";
      setEntryLog((prev) => [
        ...prev,
        {
          type: "gesture",
          value: newValue,
          gesture: word,
          timestamp: now
        }
      ]);
      setTestInput(newValue);
      if (inputRef.current) inputRef.current.value = newValue;
    };

    // Attach listeners
    const inputElem = inputRef.current;
    inputElem.addEventListener("input", handleInput);

    // Patch keyboardRef to log input
    if (keyboardRef.current) {
      keyboardRef.current.setOptions({
        onChange: handleVirtualInput
      });
    }

    // FIXED: Patch gesture canvas logic with proper closure handling
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let currentPoints = []; // Use local variable to avoid stale closure

    const handleMouseDown = e => {
      drawing = true;
      currentPoints = [{ X: e.offsetX, Y: e.offsetY }];
      setPoints(currentPoints);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const handleMouseMove = e => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      currentPoints = [...currentPoints, { X: e.offsetX, Y: e.offsetY }];
      setPoints(currentPoints);
    };

    const handleMouseUp = () => {
      drawing = false;
      ctx.closePath();

      // Use currentPoints instead of stale points from state
      if (currentPoints.length > 5) {
        const result = recognizerRef.current.Recognize(currentPoints);
        if (result.Score > 0.5 && gestureWordMap[result.Name]) {
          const word = gestureWordMap[result.Name];
          handleGesture(word);
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
    };
    // eslint-disable-next-line
  }, [testMode, testStarted, gestureWordMap, testInput]);

  // Helper: Minimum String Distance (Levenshtein Distance)
  function minStringDistance(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  // Helper: Adjusted Words Per Minute (WPM)
  function adjustedWPM(target, input, msElapsed) {
    // Remove punctuation and extra spaces for fair comparison
    const cleanTarget = target.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
    const cleanInput = input.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
    const msd = minStringDistance(cleanTarget, cleanInput);
    const charCount = cleanInput.length;
    const minutes = msElapsed / 60000;
    // Standard WPM: (chars/5) / minutes
    const rawWPM = minutes > 0 ? (charCount / 5) / minutes : 0;
    // Adjusted WPM: penalize for errors (subtract MSD from char count)
    const adjWPM = minutes > 0 ? ((charCount - msd) / 5) / minutes : 0;
    return { msd, rawWPM: Math.max(0, rawWPM), adjWPM: Math.max(0, adjWPM) };
  }

  // Handler for sentence completion
  const handleNextSentence = () => {
    // Save the result for this sentence
    const target = testSentences[currentSentenceIdx];
    const input = testInput;
    // Find first and last timestamp for this sentence
    const sentenceEntries = entryLog.filter(e => e);
    const first = sentenceEntries.length > 0 ? sentenceEntries[0].timestamp : null;
    const last = sentenceEntries.length > 0 ? sentenceEntries[sentenceEntries.length - 1].timestamp : null;
    const msElapsed = first !== null && last !== null ? last - first : 0;

    setSentenceResults(prev => [
      ...prev,
      {
        target,
        input,
        msElapsed,
        entryLog: sentenceEntries
      }
    ]);

    if (currentSentenceIdx < testSentences.length - 1) {
      setCurrentSentenceIdx(idx => idx + 1);
      setTestInput("");
      setEntryLog([]);
      if (inputRef.current) inputRef.current.value = "";
      if (keyboardRef.current) keyboardRef.current.setInput("");
    } else {
      // All sentences done, calculate metrics and show/download
      calculateAndShowMetrics([...sentenceResults, {
        target,
        input,
        msElapsed,
        entryLog: sentenceEntries
      }]);
      endTest(false); // Don't clear sentenceResults yet
    }
  };

  return (
    <div className="App">
      <div className="descriptionText">
        <h2 style={{ marginBottom: "12px" }}>🧠 Smart Swipe Keyboard</h2>
        <p>Welcome to your gesture-powered keyboard experience! You can swipe on the keyboard and canvas sections to input a word! Here's the steps to start a test:</p>
        <ul style={{ textAlign: "left", marginTop: "16px" }}>
          <li>1. Start by adding 3 gestures to word mappings</li>
          <li>2. Press on the <strong>"Back to Keyboard"</strong> button</li>
          <li>3. Test your gestures on that keyboard and clear before starting the test.</li>
          <li>4. Press on the <strong>"Start Test"</strong> button to begin the test</li>
        </ul>
      </div>

      {!testMode && !showGestures && (
        <button
          className="Button"
          style={{ marginBottom: "18px", background: "#fbbf24" }}
          onClick={startTest}
        >
          Start Test
        </button>
      )}

      {testMode && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ marginBottom: 12, fontWeight: 600, color: "#1e293b" }}>
            Sentence {currentSentenceIdx + 1} of {testSentences.length}
          </div>
          <div style={{ marginBottom: 12, fontSize: "1.1rem", color: "#334155" }}>
            <em>{testSentences[currentSentenceIdx]}</em>
          </div>
          <button
            className="Button"
            style={{ background: "#ef4444", marginRight: 8 }}
            onClick={endTest}
          >
            Cancel & Download Log
          </button>
        </div>
      )}

      {!testMode && (
        <button
          className="Button"
          onClick={() => setShowGestures((v) => !v)}
          style={{ marginBottom: "18px" }}
        >
          {showGestures ? "Back to Keyboard" : "Modified Gestures"}
        </button>
      )}

      {showGestures && !testMode ? (
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
                <p>Please input the word before drawing the image</p>
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
                
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "12px" }}>
                  <button
                    className="clearBtn"
                    onClick={() => {
                      setShowAddGesture(false);
                      setNewGestureWord("");
                      setAddGesturePoints([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="clearBtn"
                    style={{ background: "#fbbf24", color: "#1e3a8a" }}
                    onClick={clearGestureCanvas}
                  >
                    Clear Canvas
                  </button>
                  <button
                    className="clearBtn"
                    style={{ background: "#93c5fd", color: "#1e3a8a" }}
                    onClick={saveGesture}
                  >
                    Save
                  </button>
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
                  placeholder={
                    testMode
                      ? "Type the sentence above using swipe/gesture"
                      : "Swipe over the virtual keyboard to start"
                  }
                  value={testInput}
                  onChange={e => {
                    setTestInput(e.target.value);
                    if (keyboardRef.current) keyboardRef.current.setInput(e.target.value);
                  }}
                  disabled={testMode && !testStarted}
                />
                {testMode && (
                  <button
                    className="clearBtn"
                    style={{ background: "#fca5a5" }}
                    onClick={handleNextSentence}
                  >
                    Next Sentence
                  </button>
                )}
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
