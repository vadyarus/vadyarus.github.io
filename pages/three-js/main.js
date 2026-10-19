// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {GLTFLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const flamingo = await loader.loadAsync('https://cdn.devdojo.com/assets/3d/parrot.glb');
const canvas = document.querySelector('#canvas');

function main() {
    const renderer = new THREE.WebGLRenderer({canvas, antialias: true});

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    
    const scene = new THREE.Scene();

    const light = new THREE.SpotLight();
    light.position.set(-20, 15, 120);
    scene.add(light);

    scene.add(flamingo.scene);
    
    scene.background = new THREE.Color('#72c0ff');

    camera.position.set(10, 0, 140);

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width  = canvas.clientWidth  * pixelRatio | 0;
        const height = canvas.clientHeight * pixelRatio | 0;   
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }        

    // Main render loop
    function render(time) {
        time *= 0.001;

        // Check if the canvas has been resized
        // If so, then resize it
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        // Update loop
        flamingo.scene.children[0].rotation.y += 0.005;

        // Render to the canvas
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    // Start the render loop
    requestAnimationFrame(render);
}       

main();