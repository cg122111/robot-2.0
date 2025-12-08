// Robot state
const robotState = {
    rotate: 0,    // -180 to 180 degrees
    elevate: 0,   // -90 to 90 degrees
    pinch: 0      // 0 to 100 percent
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
    const step = axis === 'pinch' ? 5 : 10; // 5% for pinch, 10° for others
    const newValue = robotState[axis] + (delta * step);
    
    if (axis === 'pinch') {
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
    document.getElementById('elevate-value').textContent = `${robotState.elevate}°`;
    document.getElementById('pinch-value').textContent = `${robotState.pinch}%`;
    
    // Update sliders
    document.getElementById('rotate-slider').value = robotState.rotate;
    document.getElementById('elevate-slider').value = robotState.elevate;
    document.getElementById('pinch-slider').value = robotState.pinch;
    
    // Update status
    document.getElementById('status-rotate').textContent = `${robotState.rotate}°`;
    document.getElementById('status-elevate').textContent = `${robotState.elevate}°`;
    document.getElementById('status-pinch').textContent = `${robotState.pinch}%`;
}

function resetAll() {
    robotState.rotate = 0;
    robotState.elevate = 0;
    robotState.pinch = 0;
    updateUI();
    sendToBackend();
}

function homePosition() {
    robotState.rotate = 0;
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
            case 'r': case 'R':
                resetAll();
                break;
        }
    });
});

