class AdvancedCarViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.carModel = null;
        this.currentCar = 'car1';
        this.currentColor = 'blue';
        this.isLoading = false;
        this.carParts = [];
        this.mixer = null;

        // Car navigation properties array
        this.allCars = ['car1', 'car2', 'car3', 'car4', 'car5','car6', 'car7','car8','car9','car10']; // dynamically add car here as you need in this array
        this.carNames = {
            'car1': 'Porsche',
            'car2': 'Ferrari OLD', 
            'car3': 'GT3',
            'car4': 'Lamborghini',
            'car5': 'Mazda',
            'car6': 'BMW',
            'car7': 'GTR',
            'car8': 'Maclaren',
            'car9': 'BMW M4',
            'car10': 'Mustang'
        };
        this.currentCarIndex = 0;
        this.visibleCars = 2; // Number of cars to show at once
        this.startIndex = 0; // Starting index for visible cars

        this.currentEnvironment = 'default';
        this.environments = {
            default: '',
            night: 'night-env',
            garage: 'garage-env',
            studio: 'studio-env',
            track: 'track-env',
            city: 'city-env'
        };
        this.environmentSceneColors = {
            default: 0x1f2937,
            night: 0x1e1b4b,
            garage: 0x1f2937,
            studio: 0xf1f5f9,
            track: 0x365314,
            city: 0x374151
        };
        
        // Enhanced color palette
        this.colorMap = {
            blue: { color: 0x1e40af, metallic: 0.8, roughness: 0.2 },
            red: { color: 0xdc2626, metallic: 0.7, roughness: 0.3 },
            yellow: { color: 0xeab308, metallic: 0.9, roughness: 0.1 },
            green: { color: 0x059669, metallic: 0.6, roughness: 0.4 },
            black: { color: 0x1f2937, metallic: 0.9, roughness: 0.1 },
            white: { color: 0xffffff, metallic: 0.5, roughness: 0.5 },
            orange: { color: 0xea580c, metallic: 0.7, roughness: 0.3 },
            purple: { color: 0x7c3aed, metallic: 0.8, roughness: 0.2 }
        };

        this.init();
        this.setupEventListeners();
        this.loadCarModel();
    }

    init() {
        const canvas = document.getElementById('car-canvas');
        const container = canvas.parentElement;

        // Enhanced scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1f2937);
        this.scene.fog = new THREE.Fog(0xf1f5f9, 10, 50);

        // Camera setup with better positioning
        this.camera = new THREE.PerspectiveCamera(
            60, 
            container.clientWidth / container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(6, 3, 6);

        // Enhanced renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Enhanced lighting setup
        this.setupLighting();
        this.setupEnvironment();
        this.setupControls();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation loop
        this.animate();
    }

    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(10, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Fill lights
        const fillLight1 = new THREE.DirectionalLight(0x87ceeb, 0.3);
        fillLight1.position.set(-5, 5, -5);
        this.scene.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0xffa500, 0.2);
        fillLight2.position.set(5, 2, -8);
        this.scene.add(fillLight2);

        // Rim light for edge definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(-10, 5, 10);
        this.scene.add(rimLight);
    }

    setupEnvironment() {
        // Ground plane with shadow receiving
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.ShadowMaterial({ 
            opacity: 0.2,
            transparent: true 
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Optional: Add environment spheres for reflections
        const sphereGeometry = new THREE.SphereGeometry(100, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xf8fafc,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.1
        });
        const environmentSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.scene.add(environmentSphere);
    }

    setupControls() {
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let targetRotationX = 0.1;   // Adjust vertical angle (up/down view)
        let targetRotationY = 0.68;   // Adjust horizontal angle (left/right rotation)
        let rotationX = 0.1;         // Adjust vertical angle (up/down view)
        let rotationY = 0.5;         // Adjust horizontal angle (left/right rotation)
        let targetDistance = 2.6;
        let currentDistance = 2.7;

        const canvas = this.renderer.domElement;

        // Mouse controls
        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;

            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;

            // Clamp vertical rotation
            targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));

            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('mouseleave', () => {
            isMouseDown = false;
            canvas.style.cursor = 'grab';
        });

        // Wheel controls for zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scale = e.deltaY > 0 ? 1.1 : 0.9;
            targetDistance = Math.max(3, Math.min(15, targetDistance * scale));
        });

        // Touch controls for mobile
        let touch1 = null;
        let touch2 = null;
        let lastTouchDistance = 0;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                touch1 = e.touches[0];
                mouseX = touch1.clientX;
                mouseY = touch1.clientY;
                isMouseDown = true;
            } else if (e.touches.length === 2) {
                touch1 = e.touches[0];
                touch2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                isMouseDown = false;
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && isMouseDown) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - mouseX;
                const deltaY = touch.clientY - mouseY;

                targetRotationY += deltaX * 0.01;
                targetRotationX += deltaY * 0.01;
                targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));

                mouseX = touch.clientX;
                mouseY = touch.clientY;
            } else if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                if (lastTouchDistance > 0) {
                    const scale = lastTouchDistance / distance;
                    targetDistance = Math.max(3, Math.min(15, targetDistance * scale));
                }
                lastTouchDistance = distance;
            }
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            isMouseDown = false;
            touch1 = null;
            touch2 = null;
            lastTouchDistance = 0;
        });

        // Update camera in animation loop
        this.updateCamera = () => {
            rotationX += (targetRotationX - rotationX) * 0.1;
            rotationY += (targetRotationY - rotationY) * 0.1;
            currentDistance += (targetDistance - currentDistance) * 0.1;

            this.camera.position.x = currentDistance * Math.sin(rotationY) * Math.cos(rotationX);
            this.camera.position.y = currentDistance * Math.sin(rotationX) + 1;
            this.camera.position.z = currentDistance * Math.cos(rotationY) * Math.cos(rotationX);

            this.camera.lookAt(0, 0.5, 0);
        };
    }

    setupEventListeners() {
        // Environment selection (combined background + stage)
        document.querySelectorAll('.env-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelector('.env-btn.active')?.classList.remove('active');
                e.target.classList.add('active');
                this.currentEnvironment = e.target.dataset.env;
                this.changeEnvironment();
            });
        });
        // Navigation arrows
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (this.startIndex > 0) {
                this.startIndex -= this.visibleCars;
                this.updateCarSelector();
            }
        });
    
        document.getElementById('next-btn').addEventListener('click', () => {
            if (this.startIndex + this.visibleCars < this.allCars.length) {
                this.startIndex += this.visibleCars;
                this.updateCarSelector();
            }
        });
    
        // Model selection (delegated event listener)
        document.querySelector('.model-selector').addEventListener('click', (e) => {
            if (e.target.classList.contains('model-btn') && !this.isLoading) {
                document.querySelector('.model-btn.active')?.classList.remove('active');
                e.target.classList.add('active');
                this.currentCar = e.target.dataset.car;
                this.currentCarIndex = this.allCars.indexOf(this.currentCar);
                this.loadCarModel();
            }
        });
    
        // Color selection
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                document.querySelector('.color-swatch.active')?.classList.remove('active');
                e.target.classList.add('active');
                this.currentColor = e.target.dataset.color;
                this.changeCarColor();
            });
        });
    
        // Initialize car selector
        this.updateCarSelector();
    }

    updateCarSelector() {
        const modelSelector = document.querySelector('.model-selector');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        // Remove existing model buttons (keep arrows)
        const existingBtns = modelSelector.querySelectorAll('.model-btn');
        existingBtns.forEach(btn => btn.remove());
        
        // Add visible car buttons
        for (let i = this.startIndex; i < Math.min(this.startIndex + this.visibleCars, this.allCars.length); i++) {
            const carId = this.allCars[i];
            const carName = this.carNames[carId];
            const button = document.createElement('button');
            
            button.className = 'model-btn';
            button.dataset.car = carId;
            button.textContent = carName;
            
            // Set active state
            if (carId === this.currentCar) {
                button.classList.add('active');
            }
            
            // Insert before next button
            modelSelector.insertBefore(button, nextBtn);
        }
        
        // Update arrow states
        prevBtn.disabled = this.startIndex === 0;
        nextBtn.disabled = this.startIndex + this.visibleCars >= this.allCars.length;
    }

    changeEnvironment() {
        const container = document.querySelector('.showroom-container');
        
        // Remove all environment classes
        Object.values(this.environments).forEach(envClass => {
            if (envClass) container.classList.remove(envClass);
        });
        
        // Add new environment class if not default
        const newEnvClass = this.environments[this.currentEnvironment];
        if (newEnvClass) {
            container.classList.add(newEnvClass);
        }
        
        // Update scene background color to match environment
        if (this.scene) {
            const sceneColor = this.environmentSceneColors[this.currentEnvironment];
            this.scene.background = new THREE.Color(sceneColor);
        }
    }

    showLoading(show = true, text = 'Loading 3D model...', progress = '') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        const progressText = document.getElementById('loading-progress');
        
        overlay.style.display = show ? 'flex' : 'none';
        loadingText.textContent = text;
        progressText.textContent = progress;
    }

    showError(message) {
        const overlay = document.getElementById('loading-overlay');
        overlay.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Loading Error</h3>
                <p>${message}</p>
                <p style="margin-top: 10px; font-size: 12px;">Using demo model instead</p>
            </div>
        `;
    }

    async loadCarModel() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        this.showLoading(true, 'Loading 3D model...');

        try {
            // Remove existing car model
            if (this.carModel) {
                this.scene.remove(this.carModel);
                this.carModel = null;
                this.carParts = [];
            }

            const possiblePaths = [
                `images/cars/${this.currentCar}/source/model.glb`
            ];

            let modelLoaded = false;

            // Check if GLTFLoader is available
            if (typeof THREE.GLTFLoader !== 'undefined') {
                const loader = new THREE.GLTFLoader();
                
                for (const modelPath of possiblePaths) {
                    try {
                        await new Promise((resolve, reject) => {
                            loader.load(
                                modelPath,
                                (gltf) => {
                                    this.setupLoadedModel(gltf);
                                    modelLoaded = true;
                                    resolve();
                                },
                                (progress) => {
                                    const percent = Math.round((progress.loaded / progress.total) * 100);
                                    this.showLoading(true, 'Loading 3D model...', `${percent}%`);
                                },
                                (error) => {
                                    reject(error);
                                }
                            );
                        });
                        break; // If successful, exit the loop
                    } catch (error) {
                        console.log(`Failed to load ${modelPath}:`, error);
                        continue; // Try next path
                    }
                }
            }

            // If no GLB model was loaded, create demo model
            if (!modelLoaded) {
                console.log('No GLB files found or GLTFLoader not available, creating demo model');
                this.createEnhancedDemoModel();
            }

        } catch (error) {
            console.error('Error in loadCarModel:', error);
            this.showError('Failed to load GLB model');
            setTimeout(() => {
                this.createEnhancedDemoModel();
            }, 2000);
        } finally {
            this.isLoading = false;
            setTimeout(() => this.showLoading(false), 500);
        }
    }

    setupLoadedModel(gltf) {
        this.carModel = gltf.scene;
        
        // Scale and position the model appropriately
        const box = new THREE.Box3().setFromObject(this.carModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim; // Adjust scale as needed
        
        this.carModel.scale.setScalar(scale);
        
        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        this.carModel.position.sub(center.multiplyScalar(scale));
        this.carModel.position.y = 0; // Place on ground

        // Enable shadows
        this.carModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Identify paintable parts
                if (child.material) {
                    const materialName = child.material.name?.toLowerCase() || '';
                    const meshName = child.name?.toLowerCase() || '';
                    
                    // Look for parts that should change color
                    if (materialName.includes('paint') || 
                        materialName.includes('body') || 
                        materialName.includes('car') ||
                        meshName.includes('body') ||
                        meshName.includes('paint') ||
                        (!materialName && !meshName)) {
                        this.carParts.push(child);
                    }
                }
            }
        });

        // If no specific parts found, try to identify main body parts
        if (this.carParts.length === 0) {
            this.carModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Add largest meshes as paintable parts
                    this.carParts.push(child);
                }
            });
        }

        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.carModel);
            gltf.animations.forEach((clip) => {
                this.mixer.clipAction(clip).play();
            });
        }

        this.scene.add(this.carModel);
        this.changeCarColor();
    }

    createEnhancedDemoModel() {
        const carGroup = new THREE.Group();

        // Enhanced car body with more realistic proportions
        const bodyGeometry = new THREE.BoxGeometry(4.2, 1.2, 2);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({ 
            color: this.colorMap[this.currentColor].color,
            metalness: this.colorMap[this.currentColor].metallic,
            roughness: this.colorMap[this.currentColor].roughness,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        carGroup.add(body);

        // Car hood with slight angle
        const hoodGeometry = new THREE.BoxGeometry(1.8, 0.3, 1.9);
        const hoodMaterial = new THREE.MeshPhysicalMaterial({ 
            color: this.colorMap[this.currentColor].color,
            metalness: this.colorMap[this.currentColor].metallic,
            roughness: this.colorMap[this.currentColor].roughness,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(1.4, 1.35, 0);
        hood.rotation.x = -0.1;
        hood.castShadow = true;
        carGroup.add(hood);

        // Car roof
        const roofGeometry = new THREE.BoxGeometry(2.8, 0.9, 1.8);
        const roofMaterial = new THREE.MeshPhysicalMaterial({ 
            color: this.colorMap[this.currentColor].color,
            metalness: this.colorMap[this.currentColor].metallic,
            roughness: this.colorMap[this.currentColor].roughness,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(-0.2, 1.65, 0);
        roof.castShadow = true;
        carGroup.add(roof);

        // Windshield
        const windshieldGeometry = new THREE.PlaneGeometry(1.8, 0.8);
        const windshieldMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.7,
            metalness: 0,
            roughness: 0.1,
            transmission: 0.9
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0.7, 1.8, 0);
        windshield.rotation.x = -0.3;
        carGroup.add(windshield);

        // Side windows
        const sideWindowGeometry = new THREE.PlaneGeometry(1.2, 0.6);
        const leftWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
        leftWindow.position.set(-0.2, 1.7, 0.9);
        leftWindow.rotation.y = Math.PI / 2;
        carGroup.add(leftWindow);

        const rightWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
        rightWindow.position.set(-0.2, 1.7, -0.9);
        rightWindow.rotation.y = -Math.PI / 2;
        carGroup.add(rightWindow);

        // Enhanced wheels with rims
        const wheelGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
        const wheelMaterial = new THREE.MeshPhysicalMaterial({ 
            color: 0x1a1a1a,
            metalness: 0.1,
            roughness: 0.8
        });
        
        const rimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.32, 16);
        const rimMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xc0c0c0,
            metalness: 0.9,
            roughness: 0.1
        });

        const wheelPositions = [
            { x: -1.4, y: 0, z: 1.3 },
            { x: 1.4, y: 0, z: 1.3 },
            { x: -1.4, y: 0, z: -1.3 },
            { x: 1.4, y: 0, z: -1.3 }
        ];

        wheelPositions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            wheelGroup.add(wheel);
            
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.z = Math.PI / 2;
            rim.castShadow = true;
            wheelGroup.add(rim);
            
            wheelGroup.position.set(pos.x, pos.y, pos.z);
            carGroup.add(wheelGroup);
        });

        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const headlightMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            metalness: 0,
            roughness: 0.1,
            emissive: 0x404040
        });

        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(2.2, 0.8, 0.6);
        carGroup.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(2.2, 0.8, -0.6);
        carGroup.add(rightHeadlight);

        // Taillights
        const taillightMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            metalness: 0,
            roughness: 0.2,
            emissive: 0x200000
        });

        const leftTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        leftTaillight.position.set(-2.2, 0.8, 0.6);
        carGroup.add(leftTaillight);

        const rightTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        rightTaillight.position.set(-2.2, 0.8, -0.6);
        carGroup.add(rightTaillight);

        // Grille
        const grilleGeometry = new THREE.BoxGeometry(0.1, 0.6, 1.4);
        const grilleMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.3
        });
        const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grille.position.set(2.15, 0.8, 0);
        carGroup.add(grille);

        // Store references to parts that can change color
        this.carParts = [body, hood, roof];
        this.carModel = carGroup;
        this.scene.add(this.carModel);
        this.changeCarColor();
    }

    changeCarColor() {
        if (!this.carModel || !this.carParts) return;

        const colorData = this.colorMap[this.currentColor];
        const color = new THREE.Color(colorData.color);

        this.carParts.forEach(part => {
            if (part.material) {
                part.material.color = color;
                if (part.material.metalness !== undefined) {
                    part.material.metalness = colorData.metallic;
                    part.material.roughness = colorData.roughness;
                }
            }
        });
    }

    onWindowResize() {
        const container = document.querySelector('.viewer-stage');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.updateCamera) {
            this.updateCamera();
        }

        if (this.mixer) {
            this.mixer.update(0.016); // ~60fps
        }

        this.renderer.render(this.scene, this.camera);
    }
}
// initialization here
window.addEventListener('load', () => {
    new AdvancedCarViewer();
});