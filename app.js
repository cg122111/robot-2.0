// Robot state
const robotState = {
    rotate: 0,    // -180 to 180 degrees
    extend: 0,    // 0 to 100 percent (arm extension)
    elevate: 0,   // -90 to 90 degrees (up and down)
    pinch: 0      // 0 to 100 percent
};

// Movement programming state
let isRecording = false;
let recordingInterval = null;
let recordedPositions = [];
let isPlaying = false;
let currentProgram = null;

// Hardware control state
let hardwareConfig = {
    enable_hardware: false,
    serial_port: '/dev/ttyUSB0',
    feedrate: 120000
};

// Three.js scene setup
let scene, camera, renderer, robotGroup;
let base, arm1, arm2, gripper;

function init3D() {
    const container = document.getElementById('canvas-container');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, 5, -5);
    scene.add(pointLight);
    
    // Create robot
    createRobot();
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

function createRobot() {
    robotGroup = new THREE.Group();
    
    // Base (stationary)
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.3, 32);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x667eea });
    base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    robotGroup.add(base);
    
    // First arm (rotates around Y axis)
    const arm1Geometry = new THREE.BoxGeometry(0.3, 1.5, 0.3);
    const arm1Material = new THREE.MeshPhongMaterial({ color: 0x764ba2 });
    arm1 = new THREE.Mesh(arm1Geometry, arm1Material);
    arm1.position.y = 0.9;
    arm1.castShadow = true;
    robotGroup.add(arm1);
    
    // Second arm (elevates)
    const arm2Geometry = new THREE.BoxGeometry(0.25, 1.2, 0.25);
    const arm2Material = new THREE.MeshPhongMaterial({ color: 0x28a745 });
    arm2 = new THREE.Mesh(arm2Geometry, arm2Material);
    arm2.position.y = 1.8;
    arm2.castShadow = true;
    arm1.add(arm2);
    
    // Gripper group (pinches)
    const gripperGroup = new THREE.Group();
    gripperGroup.position.y = 2.4;
    arm2.add(gripperGroup);
    
    // Gripper base
    const gripperBaseGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const gripperBaseMaterial = new THREE.MeshPhongMaterial({ color: 0xdc3545 });
    const gripperBase = new THREE.Mesh(gripperBaseGeometry, gripperBaseMaterial);
    gripperBase.castShadow = true;
    gripperGroup.add(gripperBase);
    
    // Left finger
    const fingerGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.08);
    const fingerMaterial = new THREE.MeshPhongMaterial({ color: 0xffc107 });
    const leftFinger = new THREE.Mesh(fingerGeometry, fingerMaterial);
    leftFinger.position.set(-0.12, 0.25, 0);
    leftFinger.castShadow = true;
    gripperGroup.add(leftFinger);
    
    // Right finger
    const rightFinger = new THREE.Mesh(fingerGeometry, fingerMaterial);
    rightFinger.position.set(0.12, 0.25, 0);
    rightFinger.castShadow = true;
    gripperGroup.add(rightFinger);
    
    // Store references for animation
    gripper = {
        group: gripperGroup,
        leftFinger: leftFinger,
        rightFinger: rightFinger,
        base: gripperBase
    };
    
    scene.add(robotGroup);
}

function updateRobot() {
    // Rotate base around Y axis
    robotGroup.rotation.y = THREE.MathUtils.degToRad(robotState.rotate);
    
    // Extend arm (scale arm1 along its length)
    const extendAmount = robotState.extend / 100; // 0 to 1
    const baseArm1Height = 1.5; // Base height of arm1
    const maxExtension = 2.0; // Maximum extension factor
    const scaleFactor = 1.0 + (extendAmount * (maxExtension - 1.0));
    arm1.scale.y = scaleFactor;
    
    // Adjust arm2 position to stay at the top of arm1 (joint position)
    // arm1 center is at y=0.9, so top is at 0.9 + (baseArm1Height/2) * scaleFactor
    // arm2 should be positioned at the joint, which is slightly above arm1's top
    const baseArm1Top = 0.9 + (baseArm1Height / 2); // 1.65 at base scale
    const extendedArm1Top = 0.9 + (baseArm1Height / 2) * scaleFactor;
    const jointOffset = 1.8 - baseArm1Top; // 0.15 offset from base top
    arm2.position.y = extendedArm1Top + jointOffset;
    
    // Elevate second arm (rotate around X axis at the joint)
    arm2.rotation.x = THREE.MathUtils.degToRad(-robotState.elevate);
    
    // Pinch gripper (move fingers closer/farther)
    const pinchAmount = robotState.pinch / 100; // 0 to 1
    const maxPinch = 0.15; // Maximum finger movement
    gripper.leftFinger.position.x = -0.12 - (pinchAmount * maxPinch);
    gripper.rightFinger.position.x = 0.12 + (pinchAmount * maxPinch);
}

function animate() {
    requestAnimationFrame(animate);
    updateRobot();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Control functions
function updateValue(axis, delta) {
    const step = (axis === 'pinch' || axis === 'extend') ? 5 : 10; // 5% for pinch/extend, 10° for others
    const newValue = robotState[axis] + (delta * step);
    
    if (axis === 'pinch' || axis === 'extend') {
        robotState[axis] = Math.max(0, Math.min(100, newValue));
    } else if (axis === 'elevate') {
        robotState[axis] = Math.max(-90, Math.min(90, newValue));
    } else {
        robotState[axis] = Math.max(-180, Math.min(180, newValue));
    }
    
    updateUI();
    sendToBackend();
}

function updateUI() {
    // Update value displays
    document.getElementById('rotate-value').textContent = `${robotState.rotate}°`;
    document.getElementById('extend-value').textContent = `${robotState.extend}%`;
    document.getElementById('elevate-value').textContent = `${robotState.elevate}°`;
    document.getElementById('pinch-value').textContent = `${robotState.pinch}%`;
    
    // Update sliders
    document.getElementById('rotate-slider').value = robotState.rotate;
    document.getElementById('extend-slider').value = robotState.extend;
    document.getElementById('elevate-slider').value = robotState.elevate;
    document.getElementById('pinch-slider').value = robotState.pinch;
    
    // Update status
    document.getElementById('status-rotate').textContent = `${robotState.rotate}°`;
    document.getElementById('status-extend').textContent = `${robotState.extend}%`;
    document.getElementById('status-elevate').textContent = `${robotState.elevate}°`;
    document.getElementById('status-pinch').textContent = `${robotState.pinch}%`;
}

function resetAll() {
    robotState.rotate = 0;
    robotState.extend = 0;
    robotState.elevate = 0;
    robotState.pinch = 0;
    updateUI();
    sendToBackend();
}

function homePosition() {
    robotState.rotate = 0;
    robotState.extend = 0;
    robotState.elevate = 0;
    robotState.pinch = 0;
    updateUI();
    sendToBackend();
}

function sendToBackend() {
    // Send state to backend (for future hardware integration)
    fetch('/api/robot/state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(robotState)
    }).catch(err => {
        // Silently fail if backend is not available (for emulator mode)
        console.log('Backend not available (emulator mode)');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    init3D();
    updateUI();
    
    // Button controls
    document.querySelectorAll('.btn-increase, .btn-decrease').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const axis = e.target.dataset.axis;
            const direction = parseInt(e.target.dataset.direction);
            updateValue(axis, direction);
        });
    });
    
    // Slider controls
    document.getElementById('rotate-slider').addEventListener('input', (e) => {
        robotState.rotate = parseInt(e.target.value);
        updateUI();
        sendToBackend();
    });
    
    document.getElementById('extend-slider').addEventListener('input', (e) => {
        robotState.extend = parseInt(e.target.value);
        updateUI();
        sendToBackend();
    });
    
    document.getElementById('elevate-slider').addEventListener('input', (e) => {
        robotState.elevate = parseInt(e.target.value);
        updateUI();
        sendToBackend();
    });
    
    document.getElementById('pinch-slider').addEventListener('input', (e) => {
        robotState.pinch = parseInt(e.target.value);
        updateUI();
        sendToBackend();
    });
    
    // Action buttons
    document.getElementById('reset-btn').addEventListener('click', resetAll);
    document.getElementById('home-btn').addEventListener('click', homePosition);
    
    // Keyboard controls (optional)
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'q': case 'Q':
                updateValue('rotate', -1);
                break;
            case 'e': case 'E':
                updateValue('rotate', 1);
                break;
            case 'r': case 'R':
                updateValue('extend', 1);
                break;
            case 'f': case 'F':
                updateValue('extend', -1);
                break;
            case 'w': case 'W':
                updateValue('elevate', 1);
                break;
            case 's': case 'S':
                updateValue('elevate', -1);
                break;
            case 'a': case 'A':
                updateValue('pinch', -1);
                break;
            case 'd': case 'D':
                updateValue('pinch', 1);
                break;
            case 'x': case 'X':
                resetAll();
                break;
        }
    });
    
    // Movement programming event listeners
    setupProgrammingControls();
    loadPrograms();
    
    // Hardware control event listeners
    setupHardwareControls();
    loadHardwareConfig();
    
    // Motion settings event listeners
    setupMotionSettings();
});

// Movement Programming Functions
function setupProgrammingControls() {
    // Save current position
    document.getElementById('save-program-btn').addEventListener('click', () => {
        const programName = document.getElementById('program-name').value.trim();
        if (!programName) {
            alert('Please enter a program name');
            return;
        }
        savePosition(programName);
        document.getElementById('program-name').value = '';
    });
    
    // Start recording
    document.getElementById('start-recording-btn').addEventListener('click', startRecording);
    
    // Stop recording
    document.getElementById('stop-recording-btn').addEventListener('click', stopRecording);
    
    // Clear recording
    document.getElementById('clear-recording-btn').addEventListener('click', clearRecording);
    
    // Allow Enter key to save
    document.getElementById('program-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('save-program-btn').click();
        }
    });
}

function savePosition(name) {
    const position = {
        name: name,
        timestamp: Date.now(),
        state: {
            rotate: robotState.rotate,
            extend: robotState.extend,
            elevate: robotState.elevate,
            pinch: robotState.pinch
        }
    };
    
    // Save to localStorage
    const programs = getPrograms();
    programs.push(position);
    localStorage.setItem('robotPrograms', JSON.stringify(programs));
    
    // Refresh programs list
    loadPrograms();
    
    // Show feedback
    const btn = document.getElementById('save-program-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saved!';
    btn.style.background = '#28a745';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1000);
}

function startRecording() {
    if (isPlaying) {
        alert('Cannot record while playing a program');
        return;
    }
    
    isRecording = true;
    recordedPositions = [];
    
    // Record initial position
    recordCurrentPosition();
    
    // Record every 200ms
    recordingInterval = setInterval(() => {
        recordCurrentPosition();
    }, 200);
    
    // Update UI
    document.getElementById('start-recording-btn').disabled = true;
    document.getElementById('stop-recording-btn').disabled = false;
    document.getElementById('recording-status').style.display = 'flex';
    updateRecordingCount();
}

function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    
    // Update UI
    document.getElementById('start-recording-btn').disabled = false;
    document.getElementById('stop-recording-btn').disabled = true;
    document.getElementById('recording-status').style.display = 'none';
    
    // Save recording if we have positions
    if (recordedPositions.length > 0) {
        const programName = prompt('Enter a name for this movement sequence:', 
            `Movement_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`);
        if (programName) {
            saveRecording(programName);
        }
    }
}

function recordCurrentPosition() {
    recordedPositions.push({
        timestamp: Date.now(),
        state: {
            rotate: robotState.rotate,
            extend: robotState.extend,
            elevate: robotState.elevate,
            pinch: robotState.pinch
        }
    });
    updateRecordingCount();
}

function updateRecordingCount() {
    document.getElementById('recording-count').textContent = recordedPositions.length;
}

function clearRecording() {
    if (isRecording) {
        stopRecording();
    }
    recordedPositions = [];
    updateRecordingCount();
}

function saveRecording(name) {
    if (recordedPositions.length === 0) return;
    
    // Normalize timestamps relative to first position
    const startTime = recordedPositions[0].timestamp;
    const normalizedPositions = recordedPositions.map((pos, index) => ({
        time: index === 0 ? 0 : pos.timestamp - startTime,
        state: pos.state
    }));
    
    const program = {
        name: name,
        type: 'sequence',
        positions: normalizedPositions,
        createdAt: Date.now()
    };
    
    const programs = getPrograms();
    programs.push(program);
    localStorage.setItem('robotPrograms', JSON.stringify(programs));
    
    loadPrograms();
    clearRecording();
}

function getPrograms() {
    const stored = localStorage.getItem('robotPrograms');
    return stored ? JSON.parse(stored) : [];
}

function loadPrograms() {
    const programs = getPrograms();
    const container = document.getElementById('programs-container');
    
    if (programs.length === 0) {
        container.innerHTML = '<p class="no-programs">No programs saved yet. Record a movement sequence to get started.</p>';
        return;
    }
    
    container.innerHTML = programs.map((program, index) => {
        const isSequence = program.type === 'sequence';
        const positionCount = isSequence ? program.positions.length : 1;
        const duration = isSequence ? 
            (program.positions[program.positions.length - 1].time / 1000).toFixed(1) + 's' : 
            'Single position';
        
        return `
            <div class="program-item" data-index="${index}">
                <div class="program-info">
                    <div class="program-name">${program.name}</div>
                    <div class="program-details">
                        ${isSequence ? `Sequence: ${positionCount} positions, ${duration}` : 'Single position'}
                        ${program.createdAt ? ` • Created: ${new Date(program.createdAt).toLocaleString()}` : ''}
                    </div>
                </div>
                <div class="program-buttons">
                    <button class="btn btn-play" onclick="playProgram(${index})">Play</button>
                    <button class="btn btn-delete" onclick="deleteProgram(${index})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function playProgram(index) {
    if (isRecording) {
        alert('Cannot play while recording');
        return;
    }
    
    if (isPlaying) {
        stopPlayback();
        return;
    }
    
    const programs = getPrograms();
    if (index < 0 || index >= programs.length) return;
    
    currentProgram = programs[index];
    isPlaying = true;
    
    // Update UI
    const programItem = document.querySelector(`.program-item[data-index="${index}"]`);
    if (programItem) {
        programItem.classList.add('playing');
        const playBtn = programItem.querySelector('.btn-play');
        if (playBtn) playBtn.textContent = 'Stop';
    }
    
    if (currentProgram.type === 'sequence') {
        playSequence(currentProgram.positions);
    } else {
        // Single position
        moveToState(currentProgram.state);
        setTimeout(() => {
            stopPlayback();
        }, 500);
    }
}

function playSequence(positions) {
    if (positions.length === 0) {
        stopPlayback();
        return;
    }
    
    let currentIndex = 0;
    const startTime = Date.now();
    
    function animate() {
        if (!isPlaying) return;
        
        const elapsed = Date.now() - startTime;
        
        // Find current and next position
        let currentPos = positions[currentIndex];
        let nextPos = positions[Math.min(currentIndex + 1, positions.length - 1)];
        
        // Check if we should move to next position
        if (currentIndex < positions.length - 1 && elapsed >= nextPos.time) {
            currentIndex++;
            currentPos = positions[currentIndex];
            nextPos = positions[Math.min(currentIndex + 1, positions.length - 1)];
        }
        
        // Interpolate between current and next position
        if (currentIndex < positions.length - 1) {
            const timeBetween = nextPos.time - currentPos.time;
            const timeSinceCurrent = elapsed - currentPos.time;
            const t = Math.min(1, timeSinceCurrent / Math.max(timeBetween, 1));
            
            const currentState = currentPos.state;
            const nextState = nextPos.state;
            
            robotState.rotate = lerp(currentState.rotate, nextState.rotate, t);
            robotState.extend = lerp(currentState.extend, nextState.extend, t);
            robotState.elevate = lerp(currentState.elevate, nextState.elevate, t);
            robotState.pinch = lerp(currentState.pinch, nextState.pinch, t);
            
            updateUI();
            sendToBackend();
        } else {
            // Reached the end
            robotState.rotate = currentPos.state.rotate;
            robotState.extend = currentPos.state.extend;
            robotState.elevate = currentPos.state.elevate;
            robotState.pinch = currentPos.state.pinch;
            updateUI();
            sendToBackend();
            stopPlayback();
            return;
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function moveToState(targetState, duration = 1000) {
    const startState = { ...robotState };
    const startTime = Date.now();
    
    function animate() {
        if (!isPlaying) return;
        
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        
        // Ease in-out
        const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        
        robotState.rotate = lerp(startState.rotate, targetState.rotate, easedT);
        robotState.extend = lerp(startState.extend, targetState.extend, easedT);
        robotState.elevate = lerp(startState.elevate, targetState.elevate, easedT);
        robotState.pinch = lerp(startState.pinch, targetState.pinch, easedT);
        
        updateUI();
        sendToBackend();
        
        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            stopPlayback();
        }
    }
    
    animate();
}

function stopPlayback() {
    isPlaying = false;
    currentProgram = null;
    
    // Update UI
    document.querySelectorAll('.program-item').forEach(item => {
        item.classList.remove('playing');
        const playBtn = item.querySelector('.btn-play');
        if (playBtn) playBtn.textContent = 'Play';
    });
}

function deleteProgram(index) {
    if (!confirm('Are you sure you want to delete this program?')) return;
    
    const programs = getPrograms();
    programs.splice(index, 1);
    localStorage.setItem('robotPrograms', JSON.stringify(programs));
    loadPrograms();
}

// Hardware Control Functions
function setupHardwareControls() {
    document.getElementById('hardware-enable-btn').addEventListener('click', enableHardware);
    document.getElementById('hardware-disable-btn').addEventListener('click', disableHardware);
}

function loadHardwareConfig() {
    fetch('/api/robot/config')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.config) {
                hardwareConfig = { ...hardwareConfig, ...data.config };
                updateHardwareUI();
                loadMotionSettings();
            }
        })
        .catch(err => {
            console.log('Failed to load hardware config:', err);
            updateHardwareUI(); // Show disabled state
        });
}

function updateHardwareUI() {
    const statusDot = document.getElementById('hardware-status-dot');
    const statusText = document.getElementById('hardware-status-text');
    const hardwareInfo = document.getElementById('hardware-info');
    const serialPortDisplay = document.getElementById('serial-port-display');
    const enableBtn = document.getElementById('hardware-enable-btn');
    const disableBtn = document.getElementById('hardware-disable-btn');
    
    if (hardwareConfig.enable_hardware) {
        statusDot.className = 'status-dot enabled';
        statusText.textContent = 'Hardware Enabled';
        hardwareInfo.style.display = 'block';
        serialPortDisplay.textContent = hardwareConfig.serial_port || '/dev/ttyUSB0';
        enableBtn.style.display = 'none';
        disableBtn.style.display = 'block';
    } else {
        statusDot.className = 'status-dot disabled';
        statusText.textContent = 'Hardware Disabled (Emulator Mode)';
        hardwareInfo.style.display = 'none';
        enableBtn.style.display = 'block';
        disableBtn.style.display = 'none';
    }
}

function enableHardware() {
    const config = {
        enable_hardware: true,
        serial_port: hardwareConfig.serial_port || '/dev/ttyUSB0'
    };
    
    updateHardwareConfig(config, () => {
        alert('Hardware enabled! G-code commands will now be sent to stepper motors.');
    });
}

function disableHardware() {
    if (!confirm('Disable hardware control? The robot will run in emulator mode.')) {
        return;
    }
    
    const config = {
        enable_hardware: false
    };
    
    updateHardwareConfig(config, () => {
        alert('Hardware disabled. Running in emulator mode.');
    });
}

function updateHardwareConfig(config, callback) {
    fetch('/api/robot/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            hardwareConfig = { ...hardwareConfig, ...config };
            updateHardwareUI();
            if (callback) callback();
        } else {
            alert('Failed to update hardware configuration');
        }
    })
    .catch(err => {
        console.error('Error updating hardware config:', err);
        alert('Error updating hardware configuration. Make sure the server is running.');
    });
}

// Motion Settings Functions
function setupMotionSettings() {
    // Feedrate control
    document.getElementById('apply-feedrate-btn').addEventListener('click', () => {
        const feedrate = parseInt(document.getElementById('feedrate-input').value);
        if (feedrate >= 1000 && feedrate <= 500000) {
            updateFeedrate(feedrate);
        } else {
            alert('Feedrate must be between 1000 and 500000 steps/second');
        }
    });
    
    // Steps per second control (same as feedrate)
    document.getElementById('apply-steps-btn').addEventListener('click', () => {
        const steps = parseInt(document.getElementById('steps-per-second-input').value);
        if (steps >= 1000 && steps <= 500000) {
            updateFeedrate(steps);
        } else {
            alert('Steps per second must be between 1000 and 500000');
        }
    });
    
    // Allow Enter key to apply
    document.getElementById('feedrate-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('apply-feedrate-btn').click();
        }
    });
    
    document.getElementById('steps-per-second-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('apply-steps-btn').click();
        }
    });
}

function updateFeedrate(feedrate) {
    const config = {
        feedrate: feedrate
    };
    
    fetch('/api/robot/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            hardwareConfig.feedrate = feedrate;
            document.getElementById('feedrate-display').textContent = feedrate;
            document.getElementById('steps-display').textContent = feedrate;
            document.getElementById('feedrate-input').value = feedrate;
            document.getElementById('steps-per-second-input').value = feedrate;
            
            // Show feedback
            const btn = document.getElementById('apply-feedrate-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Applied!';
            btn.style.background = '#28a745';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1000);
        } else {
            alert('Failed to update feedrate');
        }
    })
    .catch(err => {
        console.error('Error updating feedrate:', err);
        alert('Error updating feedrate. Make sure the server is running.');
    });
}

function loadMotionSettings() {
    fetch('/api/robot/config')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.config) {
                const feedrate = data.config.feedrate || 120000;
                hardwareConfig.feedrate = feedrate;
                document.getElementById('feedrate-input').value = feedrate;
                document.getElementById('steps-per-second-input').value = feedrate;
                document.getElementById('feedrate-display').textContent = feedrate;
                document.getElementById('steps-display').textContent = feedrate;
            }
        })
        .catch(err => {
            console.log('Failed to load motion settings:', err);
        });
}

