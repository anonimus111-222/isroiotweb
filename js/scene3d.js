/**
 * SKADUTA SMART AGRICULTURE - 3D DIGITAL TWIN ENGINE (Three.js)
 * High-fidelity 3D Hydroponic System with Dynamic Physics, Fluid Animation,
 * Interactive Hotspots, and Real-time Relay Synchronization.
 */

class HydroponicScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    // State
    this.pumpStates = {
      relay1: false, // pH Up
      relay2: false, // pH Down
      relay3: false, // Nutrisi A
      relay4: false  // Nutrisi B
    };

    this.waterLevel = 0.78; // 78% full
    this.lightMode = 'grow'; // 'grow' | 'day' | 'night'
    this.autoRotate = false;

    // Pump mesh references for animation
    this.pumpRotors = [];
    this.pumpLeds = [];
    this.fluidParticles = [];
    this.plantMeshes = [];
    this.bubbleParticles = [];

    // Camera target interpolation
    this.cameraLerpTarget = null;
    this.controlsLerpTarget = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    // 1. SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);
    this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);

    // 2. CAMERA
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(11, 8.5, 13);

    // 3. RENDERER
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. CONTROLS
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 25;
    this.controls.target.set(0, 1.8, 0);

    // 5. BUILD ENVIRONMENT & OBJECTS
    this.setupLighting();
    this.buildLaboratoryPlatform();
    this.buildReservoirTank();
    this.buildSensorProbes();
    this.buildDosingPumps();
    this.buildHydroponicGulliesAndPlants();
    this.buildFluidTubes();
    this.buildAmbientDust();

    // 6. EVENT LISTENERS
    window.addEventListener('resize', () => this.onWindowResize());

    // 7. START LOOP
    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLighting() {
    // Ambient Light (Crisp White Daylight)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(this.ambientLight);

    // Main Studio Sun Key Light
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.mainLight.position.set(8, 14, 8);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 40;
    this.mainLight.shadow.camera.left = -10;
    this.mainLight.shadow.camera.right = 10;
    this.mainLight.shadow.camera.top = 10;
    this.mainLight.shadow.camera.bottom = -10;
    this.mainLight.shadow.bias = -0.0005;
    this.scene.add(this.mainLight);

    // Horticultural Grow Light Fixture
    this.growLight = new THREE.SpotLight(0xf43f5e, 2.5, 16, Math.PI / 3, 0.4, 1.2);
    this.growLight.position.set(0, 6.5, 0);
    this.growLight.target.position.set(0, 2.5, 0);
    this.scene.add(this.growLight);
    this.scene.add(this.growLight.target);

    // Secondary soft fill
    this.uvLight = new THREE.PointLight(0x38bdf8, 1.0, 10);
    this.uvLight.position.set(0, 5.5, 1);
    this.scene.add(this.uvLight);

    // Water Light inside reservoir (Soft Light Blue)
    this.waterLight = new THREE.PointLight(0x0ea5e9, 1.2, 5);
    this.waterLight.position.set(-3.2, 1.2, 0);
    this.scene.add(this.waterLight);

    // Subtle Rim Light from back
    this.rimLight = new THREE.DirectionalLight(0xbae6fd, 0.6);
    this.rimLight.position.set(-10, 8, -10);
    this.scene.add(this.rimLight);
  }

  buildLaboratoryPlatform() {
    // Floor Grid / Platform (Clean White with Light Blue Accent)
    const floorGeo = new THREE.CylinderGeometry(8.5, 9.0, 0.4, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
    });
    const platform = new THREE.Mesh(floorGeo, floorMat);
    platform.position.y = -0.2;
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Outer Light Blue Trim
    const rimGeo = new THREE.TorusGeometry(8.5, 0.04, 16, 64);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.01;
    this.scene.add(rim);

    // Clean Light Blue & Gray Grid
    const grid = new THREE.GridHelper(16, 24, 0x0ea5e9, 0xcbd5e1);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Workstation Table Frame (Clean White Top)
    const tableTopGeo = new THREE.BoxGeometry(11, 0.3, 5.5);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1
    });
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.position.set(0, 1.5, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.scene.add(tableTop);

    // Table Legs (Brushed Aluminum)
    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const legPositions = [
      [-5.2, 0.75, -2.5],
      [5.2, 0.75, -2.5],
      [-5.2, 0.75, 2.5],
      [5.2, 0.75, 2.5]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      this.scene.add(leg);
    });

    // Overhead LED Grow Light Bar Rig
    const barFrameGeo = new THREE.BoxGeometry(7, 0.15, 1.6);
    const barFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9, roughness: 0.2 });
    const lightBar = new THREE.Mesh(barFrameGeo, barFrameMat);
    lightBar.position.set(0, 5.5, 0);
    this.scene.add(lightBar);

    // Glowing LED underside
    const ledStripGeo = new THREE.PlaneGeometry(6.6, 1.2);
    this.ledStripMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide });
    const ledStrip = new THREE.Mesh(ledStripGeo, this.ledStripMat);
    ledStrip.rotation.x = Math.PI / 2;
    ledStrip.position.set(0, 5.42, 0);
    this.scene.add(ledStrip);

    // Support Rods for Light Bar
    const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.8, 8);
    const rod1 = new THREE.Mesh(rodGeo, legMat);
    rod1.position.set(-3.2, 3.6, 0);
    const rod2 = new THREE.Mesh(rodGeo, legMat);
    rod2.position.set(3.2, 3.6, 0);
    this.scene.add(rod1);
    this.scene.add(rod2);
  }

  buildReservoirTank() {
    this.tankGroup = new THREE.Group();
    this.tankGroup.position.set(-3.4, 1.65, 0);

    // Transparent Acrylic Reservoir Body
    const tankWidth = 2.4, tankHeight = 1.9, tankDepth = 2.2;
    const tankGeo = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.45,
      reflectivity: 0.5,
      depthWrite: false
    });
    const tankMesh = new THREE.Mesh(tankGeo, glassMat);
    tankMesh.position.y = tankHeight / 2;
    tankMesh.castShadow = false;
    this.tankGroup.add(tankMesh);

    // Reservoir Rim and Base trim
    const trimGeo = new THREE.BoxGeometry(tankWidth + 0.1, 0.1, tankDepth + 0.1);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5, metalness: 0.3 });
    const bottomTrim = new THREE.Mesh(trimGeo, trimMat);
    bottomTrim.position.y = 0.05;
    const topTrim = new THREE.Mesh(trimGeo, trimMat);
    topTrim.position.y = tankHeight;
    this.tankGroup.add(bottomTrim);
    this.tankGroup.add(topTrim);

    // Clean Translucent Light Blue Water Liquid inside
    const waterMargin = 0.08;
    const maxWaterHeight = tankHeight * 0.85;
    const waterGeo = new THREE.BoxGeometry(tankWidth - waterMargin * 2, maxWaterHeight, tankDepth - waterMargin * 2);
    this.waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.33
    });
    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.y = maxWaterHeight / 2 + 0.02;
    this.tankGroup.add(this.waterMesh);

    // Animated Bubbles in Reservoir
    const bubbleCount = 45;
    const bubbleGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    
    for (let i = 0; i < bubbleCount; i++) {
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.position.set(
        (Math.random() - 0.5) * (tankWidth - 0.4),
        Math.random() * maxWaterHeight,
        (Math.random() - 0.5) * (tankDepth - 0.4)
      );
      bubble.userData = {
        speed: 0.015 + Math.random() * 0.02,
        origY: 0.1,
        maxY: maxWaterHeight
      };
      this.tankGroup.add(bubble);
      this.bubbleParticles.push(bubble);
    }

    // Aerator diffuser stone at bottom
    const stoneGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(0, 0.06, 0);
    this.tankGroup.add(stone);

    // Tank Label Plaque
    const plaqueGeo = new THREE.PlaneGeometry(1.2, 0.3);
    const plaqueMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 1.4, tankDepth / 2 + 0.01);
    this.tankGroup.add(plaque);

    this.scene.add(this.tankGroup);
  }

  buildSensorProbes() {
    this.sensorGroup = new THREE.Group();
    this.sensorGroup.position.set(-3.4, 2.6, 0);

    // Mounting Bracket
    const bracketGeo = new THREE.BoxGeometry(1.6, 0.1, 0.4);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    this.sensorGroup.add(bracket);

    // 1. pH Sensor Probe (Glass & Blue ring)
    const phProbeGroup = new THREE.Group();
    phProbeGroup.position.set(-0.4, -0.6, 0);

    const phBodyGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.3, 16);
    const phBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    const phBody = new THREE.Mesh(phBodyGeo, phBodyMat);
    phProbeGroup.add(phBody);

    const phTipGeo = new THREE.SphereGeometry(0.05, 16, 16);
    this.phTipMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const phTip = new THREE.Mesh(phTipGeo, this.phTipMat);
    phTip.position.y = -0.65;
    phProbeGroup.add(phTip);

    // Cable to controller
    this.sensorGroup.add(phProbeGroup);

    // 2. TDS / EC Sensor Probe (Metal twin prongs)
    const tdsProbeGroup = new THREE.Group();
    tdsProbeGroup.position.set(0.4, -0.6, 0);

    const tdsBodyGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.3, 16);
    const tdsBodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const tdsBody = new THREE.Mesh(tdsBodyGeo, tdsBodyMat);
    tdsProbeGroup.add(tdsBody);

    // Dual stainless prongs
    const prongGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8);
    const prongMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 });
    const prong1 = new THREE.Mesh(prongGeo, prongMat);
    prong1.position.set(-0.02, -0.7, 0);
    const prong2 = new THREE.Mesh(prongGeo, prongMat);
    prong2.position.set(0.02, -0.7, 0);
    tdsProbeGroup.add(prong1);
    tdsProbeGroup.add(prong2);

    this.sensorGroup.add(tdsProbeGroup);

    // 3. Water Temp Sensor Probe (Thin metallic probe)
    const tempProbeGroup = new THREE.Group();
    tempProbeGroup.position.set(0, -0.65, 0.1);
    const tempBodyGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.4, 12);
    const tempBodyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 });
    const tempBody = new THREE.Mesh(tempBodyGeo, tempBodyMat);
    tempProbeGroup.add(tempBody);
    this.sensorGroup.add(tempProbeGroup);

    this.scene.add(this.sensorGroup);
  }

  buildDosingPumps() {
    this.pumpsGroup = new THREE.Group();
    this.pumpsGroup.position.set(3.4, 1.65, 0);

    // Dosing Rack Base Mount
    const rackGeo = new THREE.BoxGeometry(3.6, 0.25, 2.2);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.4 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.y = 0.125;
    rack.castShadow = true;
    this.pumpsGroup.add(rack);

    // 4 Peristaltic Dosing Pumps
    // 0: pH Up (#38bdf8), 1: pH Down (#f43f5e), 2: Nutrisi A (#10b981), 3: Nutrisi B (#f59e0b)
    const pumpConfigs = [
      { name: 'relay1', color: 0x38bdf8, label: 'pH Up', x: -1.3, z: 0.5 },
      { name: 'relay2', color: 0xf43f5e, label: 'pH Down', x: -0.4, z: 0.5 },
      { name: 'relay3', color: 0x10b981, label: 'Nutrisi A', x: 0.5, z: 0.5 },
      { name: 'relay4', color: 0xf59e0b, label: 'Nutrisi B', x: 1.4, z: 0.5 }
    ];

    pumpConfigs.forEach((cfg, index) => {
      const unit = new THREE.Group();
      unit.position.set(cfg.x, 0.25, cfg.z);

      // Motor Back Housing (Stepper motor cylinder)
      const motorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.45, 24);
      const motorMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9, roughness: 0.3 });
      const motor = new THREE.Mesh(motorGeo, motorMat);
      motor.rotation.x = Math.PI / 2;
      motor.position.set(0, 0.35, -0.3);
      motor.castShadow = true;
      unit.add(motor);

      // Transparent Peristaltic Head
      const headGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 24);
      const headMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0.35, 0.05);
      unit.add(head);

      // Internal 3-Roller Rotor that spins when relay is on
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 0.35, 0.05);

      const centerHubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12);
      const centerHubMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const hub = new THREE.Mesh(centerHubGeo, centerHubMat);
      hub.rotation.x = Math.PI / 2;
      rotorGroup.add(hub);

      // 3 Rollers
      for (let r = 0; r < 3; r++) {
        const angle = (r * Math.PI * 2) / 3;
        const rollerGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12);
        const rollerMat = new THREE.MeshStandardMaterial({ color: cfg.color, metalness: 0.5 });
        const roller = new THREE.Mesh(rollerGeo, rollerMat);
        roller.rotation.x = Math.PI / 2;
        roller.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0);
        rotorGroup.add(roller);
      }

      unit.add(rotorGroup);
      this.pumpRotors.push({ id: cfg.name, mesh: rotorGroup });

      // LED Indicator Beacon on Pump Front
      const ledGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // red when off
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0, 0.72, 0.12);
      unit.add(led);
      this.pumpLeds.push({ id: cfg.name, mat: ledMat });

      // Chemical / Nutrient Reagent Reservoir Bottle behind pump
      const bottleGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.9, 16);
      const bottleMat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.55,
        roughness: 0.2,
        metalness: 0.1
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.set(0, 0.45, -0.8);
      bottle.castShadow = true;
      unit.add(bottle);

      // Bottle Cap
      const capGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 0.95, -0.8);
      unit.add(cap);

      this.pumpsGroup.add(unit);
    });

    this.scene.add(this.pumpsGroup);
  }

  buildHydroponicGulliesAndPlants() {
    this.cropGroup = new THREE.Group();
    this.cropGroup.position.set(0, 1.8, 0);

    // 2 NFT Hydroponic PVC Channels (Gullies)
    const gullyLength = 6.2;
    const gullyGeo = new THREE.BoxGeometry(gullyLength, 0.22, 0.65);
    const gullyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1
    });

    const gullyPositions = [-0.65, 0.65];

    gullyPositions.forEach((zOffset) => {
      const gully = new THREE.Mesh(gullyGeo, gullyMat);
      gully.position.set(0, 0.15, zOffset);
      // Slight slope for hydroponic water gravity return
      gully.rotation.z = -0.015;
      gully.castShadow = true;
      gully.receiveShadow = true;
      this.cropGroup.add(gully);

      // Net pots & lush 3D leafy plants
      const potCount = 7;
      const spacing = gullyLength / (potCount + 1);

      for (let p = 0; p < potCount; p++) {
        const xPos = -gullyLength / 2 + (p + 1) * spacing;
        
        // Net Pot rim
        const potGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.24, 16);
        const potMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.set(xPos, 0.24, zOffset);
        this.cropGroup.add(pot);

        // Procedural Smart Crop (Lettuce / Strawberry Plant with multi-tier leaves)
        const plant = this.createProceduralPlant(xPos, 0.35, zOffset, p);
        this.cropGroup.add(plant);
        this.plantMeshes.push(plant);
      }
    });

    this.scene.add(this.cropGroup);
  }

  createProceduralPlant(x, y, z, seedIndex) {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, y, z);

    // Leaf palette
    const leafColor1 = new THREE.Color(0x22c55e);
    const leafColor2 = new THREE.Color(0x10b981);
    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColor1.lerp(leafColor2, (seedIndex % 3) * 0.3),
      roughness: 0.4,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // Central Stem
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.25, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    plantGroup.add(stem);

    // Tier 1: Outer wide leaves
    const numOuterLeaves = 5 + (seedIndex % 2);
    for (let i = 0; i < numOuterLeaves; i++) {
      const angle = (i * Math.PI * 2) / numOuterLeaves + (seedIndex * 0.4);
      const leafGeo = new THREE.SphereGeometry(0.24, 8, 8);
      leafGeo.scale(0.8, 0.2, 1.8); // Flatten and elongate into leaf shape

      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.22, 0.08, Math.sin(angle) * 0.22);
      leaf.rotation.y = angle + Math.PI / 2;
      leaf.rotation.x = 0.35 + (seedIndex % 3) * 0.08;
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }

    // Tier 2: Inner young upright leaves
    const numInnerLeaves = 4;
    for (let j = 0; j < numInnerLeaves; j++) {
      const angle = (j * Math.PI * 2) / numInnerLeaves + Math.PI / 4;
      const leafGeo = new THREE.SphereGeometry(0.18, 8, 8);
      leafGeo.scale(0.7, 0.18, 1.4);

      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.12, 0.22, Math.sin(angle) * 0.12);
      leaf.rotation.y = angle + Math.PI / 2;
      leaf.rotation.x = 0.6;
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }

    // Store base position and phase for wind sway
    plantGroup.userData = {
      phase: seedIndex * 0.9,
      baseRotZ: plantGroup.rotation.z
    };

    return plantGroup;
  }

  buildFluidTubes() {
    // 4 Glowing Translucent silicone tubes from Dosing Pumps to Reservoir
    const tubeColors = [0x38bdf8, 0xf43f5e, 0x10b981, 0xf59e0b];
    const pumpXOffsets = [-1.3, -0.4, 0.5, 1.4];

    this.fluidTubes = [];

    pumpXOffsets.forEach((pX, idx) => {
      // 3D Bezier curve from pump to reservoir tank inlet
      const start = new THREE.Vector3(3.4 + pX, 2.05, 0.5);
      const mid1 = new THREE.Vector3(2.0 + pX * 0.4, 2.7 + idx * 0.08, 0.3);
      const mid2 = new THREE.Vector3(-1.0, 2.8 + idx * 0.08, -0.2);
      const end = new THREE.Vector3(-2.8, 2.65, -0.4 + idx * 0.25);

      const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);

      // Outer glass tube
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.032, 10, false);
      const tubeMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        transmission: 0.8
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tubeMesh);

      // Inner pulsating fluid particles along curve
      const particleCount = 18;
      const particles = [];
      const pGeo = new THREE.SphereGeometry(0.028, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: tubeColors[idx], transparent: true, opacity: 0 });

      for (let p = 0; p < particleCount; p++) {
        const pMesh = new THREE.Mesh(pGeo, pMat.clone());
        const t = p / particleCount;
        const pos = curve.getPointAt(t);
        pMesh.position.copy(pos);
        this.scene.add(pMesh);
        particles.push({
          mesh: pMesh,
          t: t,
          speed: 0.008 + idx * 0.001
        });
      }

      this.fluidParticles.push({
        relayKey: `relay${idx + 1}`,
        curve: curve,
        particles: particles,
        active: false,
        color: tubeColors[idx]
      });
    });
  }

  buildAmbientDust() {
    // Atmospheric floating micro-motes
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = 0.5 + Math.random() * 6;
      positions[i + 2] = (Math.random() - 0.5) * 12;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x00f5d4,
      size: 0.045,
      transparent: true,
      opacity: 0.4
    });

    this.dustParticles = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustParticles);
  }

  // Real-time synchronization with UI Relay state
  setRelayState(relayId, state) {
    this.pumpStates[relayId] = Boolean(state);

    // Update LED indicator
    const led = this.pumpLeds.find(l => l.id === relayId);
    if (led) {
      led.mat.color.setHex(state ? 0x00f5d4 : 0xef4444);
    }

    // Update fluid tube flow
    const tube = this.fluidParticles.find(t => t.relayKey === relayId);
    if (tube) {
      tube.active = Boolean(state);
      tube.particles.forEach(p => {
        p.mesh.material.opacity = state ? 0.9 : 0;
      });
    }
  }

  // Camera presets smooth transition
  setCameraPreset(presetKey) {
    const presets = {
      overview: {
        pos: new THREE.Vector3(11, 8.5, 13),
        target: new THREE.Vector3(0, 1.8, 0)
      },
      plants: {
        pos: new THREE.Vector3(0, 4.2, 5.2),
        target: new THREE.Vector3(0, 2.2, 0)
      },
      sensors: {
        pos: new THREE.Vector3(-4.8, 3.8, 3.5),
        target: new THREE.Vector3(-3.4, 2.2, 0)
      },
      pumps: {
        pos: new THREE.Vector3(5.2, 3.6, 3.6),
        target: new THREE.Vector3(3.4, 2.0, 0)
      }
    };

    const config = presets[presetKey] || presets.overview;
    this.cameraLerpTarget = config.pos.clone();
    this.controlsLerpTarget = config.target.clone();
  }

  // Grow Light Mode switcher
  setLightMode(mode) {
    this.lightMode = mode;
    if (mode === 'grow') {
      this.growLight.intensity = 3.5;
      this.uvLight.intensity = 2.0;
      this.mainLight.intensity = 0.9;
      this.ledStripMat.color.setHex(0xf43f5e);
    } else if (mode === 'day') {
      this.growLight.intensity = 0.5;
      this.uvLight.intensity = 0.2;
      this.mainLight.intensity = 2.2;
      this.ledStripMat.color.setHex(0xffffff);
    } else if (mode === 'night') {
      this.growLight.intensity = 0.0;
      this.uvLight.intensity = 0.6;
      this.mainLight.intensity = 0.2;
      this.ledStripMat.color.setHex(0x1e1b4b);
    }
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 1.2;
    return this.autoRotate;
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth camera preset lerp
    if (this.cameraLerpTarget && this.controlsLerpTarget) {
      this.camera.position.lerp(this.cameraLerpTarget, 0.06);
      this.controls.target.lerp(this.controlsLerpTarget, 0.06);

      if (this.camera.position.distanceTo(this.cameraLerpTarget) < 0.05) {
        this.cameraLerpTarget = null;
        this.controlsLerpTarget = null;
      }
    }

    // 1. Animate spinning pump rotors if relay is ON
    this.pumpRotors.forEach(pr => {
      if (this.pumpStates[pr.id]) {
        pr.mesh.rotation.z -= delta * 12; // Rapid peristaltic rotation
      }
    });

    // 2. Animate liquid flow along active tubes
    this.fluidParticles.forEach(tube => {
      if (tube.active) {
        tube.particles.forEach(p => {
          p.t += p.speed;
          if (p.t > 1) p.t = 0;
          const pos = tube.curve.getPointAt(p.t);
          p.mesh.position.copy(pos);
        });
      }
    });

    // 3. Animate bubbling in reservoir
    this.bubbleParticles.forEach(b => {
      b.position.y += b.userData.speed;
      if (b.position.y > b.userData.maxY) {
        b.position.y = b.userData.origY;
      }
    });

    // 4. Subtle wind sway on hydroponic crops
    this.plantMeshes.forEach(plant => {
      const sway = Math.sin(elapsedTime * 2.2 + plant.userData.phase) * 0.035;
      plant.rotation.z = sway;
      plant.rotation.x = Math.cos(elapsedTime * 1.8 + plant.userData.phase) * 0.02;
    });

    // 5. Ambient dust gentle float
    if (this.dustParticles) {
      this.dustParticles.rotation.y = elapsedTime * 0.015;
    }

    // 6. Water glow pulse
    if (this.waterLight) {
      this.waterLight.intensity = 1.5 + Math.sin(elapsedTime * 2.5) * 0.4;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Global scene instance attached to window for app.js access
window.HydroponicScene = HydroponicScene;
