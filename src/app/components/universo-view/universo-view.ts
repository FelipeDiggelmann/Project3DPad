import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import * as THREE from 'three';

interface NoteData {
  id: number;
  title: string;
  color: string;
  x: number;
  y: number;
  z: number;
}

@Component({
  selector: 'app-universo-view',
  standalone: true,
  templateUrl: './universo-view.html',
  styleUrls: ['./universo-view.scss']
})
export class UniversoViewComponent implements AfterViewInit {

  // Captura o elemento <canvas> do HTML
  @ViewChild('rendererCanvas') rendererCanvas!: ElementRef<HTMLCanvasElement>;

  // Variáveis principais do Three.js tipadas
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(); // Guarda a posição X, Y do mouse na tela
  private intersectedObj: THREE.Object3D | null = null; // Guarda qual objeto o mouse está em cima

  constructor() { }

  // Usamos AfterViewInit porque precisamos que o HTML (o canvas) já exista
  ngAfterViewInit(): void {
    this.createScene();
    this.startRenderingLoop();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Transforma a posição do mouse em coordenadas normalizadas (de -1 a +1)
    // Isso é o que o Three.js entende: 0 é o centro, -1 é esquerda/baixo, +1 é direita/cima
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  }

private notesGroup!: THREE.Group; 

  private createScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505); // Quase preto, parecendo espaço

    // --- 1. ILUMINAÇÃO (Necessário para ver objetos sólidos) ---
    // Luz ambiente (clareia tudo suavemente)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Luz pontual (como uma lâmpada ou sol) brilhando de cima
    /*const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);*/

    // A luz direcional cria sombras mais definidas, como o sol
    const dirLight = new THREE.DirectionalLight(0xffffff, 3); // Intensidade 3 (mais forte)
    dirLight.position.set(10, 10, 10);
    this.scene.add(dirLight);

    // Adiciona uma luz azulada vinda de baixo para dar um efeito "sci-fi"
    const blueLight = new THREE.PointLight(0x0000ff, 2);
    blueLight.position.set(0, -20, 0);
    this.scene.add(blueLight);

    // --- 2. CÂMERA ---
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.z = 30; // Afastamos mais a câmera para ver o "universo"

    // --- 3. RENDERIZADOR ---
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.rendererCanvas.nativeElement,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // --- 4. CRIANDO AS NOTAS ---
    this.createNotesUniverse();
  }

  private createNotesUniverse(): void {
    this.notesGroup = new THREE.Group(); // Cria um container para agrupar todas as notas
    
    // Vamos simular 50 notas aleatórias
    const geometry = new THREE.SphereGeometry(1, 32, 32); // Esfera: Raio 1, suavidade 32

    for (let i = 0; i < 50; i++) {
      // Cria uma cor aleatória para cada nota
      const color = new THREE.Color(Math.random(), Math.random(), Math.random());
      
      // Material Standard reage à luz (dá efeito de 3D real)
      const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
      
      const noteMesh = new THREE.Mesh(geometry, material);

      // Posiciona aleatoriamente no espaço (entre -20 e 20)
      noteMesh.position.x = (Math.random() - 0.5) * 40;
      noteMesh.position.y = (Math.random() - 0.5) * 40;
      noteMesh.position.z = (Math.random() - 0.5) * 40;

      this.notesGroup.add(noteMesh);
    }

    this.scene.add(this.notesGroup);
  }

  private startRenderingLoop(): void {
    requestAnimationFrame(() => this.startRenderingLoop());

    // 1. Atualiza o "Laser" com a posição da câmera e do mouse
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 2. Verifica se o laser bateu nas esferas (filhos do grupo notesGroup)
    if (this.notesGroup) {
      this.notesGroup.rotation.y += 0.002; // Mantém a rotação lenta

      const intersects = this.raycaster.intersectObjects(this.notesGroup.children);

      // Lógica de Hover (Passar o mouse)
      if (intersects.length > 0) {
        // Se bateu em algo, pegamos o primeiro objeto (o mais próximo)
        const object = intersects[0].object as THREE.Mesh;
        const material = object.material as THREE.MeshStandardMaterial;

        // Se é um objeto novo que não estava selecionado antes
        if (this.intersectedObj !== object) {
          // Se já tinha um selecionado antes, volta a cor dele para o normal (branco/cinza)
          if (this.intersectedObj) {
            const prevMaterial = (this.intersectedObj as THREE.Mesh).material as THREE.MeshStandardMaterial;
            prevMaterial.emissive.setHex(0x000000); // Apaga o brilho
          }

          // Define o novo objeto selecionado e faz ele BRILHAR (emissive)
          this.intersectedObj = object;
          material.emissive.setHex(0xff0000); // Brilho Vermelho intenso
        }
      } else {
        // Se o mouse não está em cima de nada, limpa a seleção
        if (this.intersectedObj) {
          const prevMaterial = (this.intersectedObj as THREE.Mesh).material as THREE.MeshStandardMaterial;
          prevMaterial.emissive.setHex(0x000000); // Apaga o brilho
          this.intersectedObj = null;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}