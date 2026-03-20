/* ==========================================
   TalentAI - 3D Effects (Three.js)
   ========================================== */

// ========== 3D Pyramid ==========
const container = document.getElementById('pyramid-container');
if (container && typeof THREE !== 'undefined') {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  
  // Create Pyramid
  const geometry = new THREE.ConeGeometry(2, 3, 4);
  const material = new THREE.MeshPhongMaterial({ 
    color: 0x667eea, 
    transparent: true, 
    opacity: 0.7,
    wireframe: false
  });
  const pyramid = new THREE.Mesh(geometry, material);
  scene.add(pyramid);
  
  // Wireframe
  const wireGeo = new THREE.EdgesGeometry(geometry);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x764ba2, linewidth: 2 });
  const wireframe = new THREE.LineSegments(wireGeo, wireMat);
  pyramid.add(wireframe);
  
  // Lights
  const light1 = new THREE.PointLight(0x667eea, 1);
  light1.position.set(5, 5, 5);
  scene.add(light1);
  
  const light2 = new THREE.PointLight(0x764ba2, 1);
  light2.position.set(-5, -5, 5);
  scene.add(light2);
  
  camera.position.z = 6;
  
  // Animation
  function animate() {
    requestAnimationFrame(animate);
    pyramid.rotation.x += 0.005;
    pyramid.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();
  
  // Resize
  window.addEventListener('resize', () => {
    if (container.clientWidth > 0) {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
  });
}

// ========== Particle Background ==========
const canvas = document.getElementById('canvas-3d');
if (canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const particleCount = 50;
  
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 2 + 1;
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(102, 126, 234, 0.5)';
      ctx.fill();
    }
  }
  
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}
