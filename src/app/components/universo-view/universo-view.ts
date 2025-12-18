import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NoteService, NoteData } from '../../services/note';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-universo-view',
  standalone: true,
  imports : [CommonModule, FormsModule],
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
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(); // Guarda a posição X, Y do mouse na tela
  private intersectedObj: THREE.Object3D | null = null; // Guarda qual objeto o mouse está em cima
  private sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
  private linesMesh!: THREE.LineSegments;

  public selectedNote: any = null;
  public isEditing: boolean = false;
  // Controle da Busca
  public searchTerm: string = '';
  public searchResults: NoteData[] = [];

  constructor(private noteService: NoteService) { }

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

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    // 1. Verifica onde foi o clique
    const target = event.target as HTMLElement;

    // SE O USUÁRIO CLICOU EM BOTÃO, INPUT OU DENTRO DA NOTA...
    // Paramos a função aqui. Não queremos mexer no 3D.
    if (target.closest('button') || target.closest('input') || target.closest('.note-card')) {
      return;
    }

    // 2. Se clicou no Fundo Escuro (Overlay) ou no Canvas vazio -> Fecha a nota
    if (this.selectedNote && (target.tagName === 'CANVAS' || target.classList.contains('overlay-container'))) {
      this.closeNote();
      return;
    }

    // 3. Se clicou em uma Esfera 3D (e não tem nota aberta atrapalhando)
    if (this.intersectedObj) {
        // Encontra a nota correspondente
        const note = this.intersectedObj.userData as NoteData;
        
        // Usa nossa função inteligente que foca a câmera!
        this.focusOnNote(note);
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    // 1. Atualiza a proporção da câmera (largura / altura)
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // 2. Atualiza o tamanho da pintura na tela
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

private notesGroup!: THREE.Group;

  private createOrbitRings(): void {
    // Vamos criar 2 anéis visuais para representar as áreas que definimos no service
    const radii = [8, 16, 32]; // Raio interno e Raio médio

    radii.forEach(radius => {
      // Cria um círculo
      const curve = new THREE.EllipseCurve(
        0, 0,            // ax, aY (centro)
        radius, radius,  // xRadius, yRadius
        0, 2 * Math.PI,  // aStartAngle, aEndAngle
        false,           // aClockwise
        0                // aRotation
      );

      const points = curve.getPoints(64); // 64 pontos para ficar redondinho
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.1 // Bem fraquinho, só uma sugestão visual
      });

      // O círculo nasce em pé (XY), precisamos deitar ele (XZ)
      const ring = new THREE.Line(geometry, material);
      ring.rotation.x = -Math.PI / 2; // Gira 90 graus
      
      // Adiciona direto na cena (não no grupo, para não girar junto com os planetas, ou no grupo se quiser que gire)
      // Sugiro na cena estática para dar a sensação que os planetas orbitam pelo caminho
      this.scene.add(ring); 
    });
  }

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

    // --- CONFIGURAÇÃO DOS CONTROLES ---
   // Passamos a câmera e o elemento DOM que vai ouvir o mouse (o canvas)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Habilita "inércia" (o movimento continua um pouco depois que você solta o mouse)
    // Dá uma sensação muito mais premium e suave
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Limites (opcional): Impede que o usuário dê zoom demais ou de menos
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;

    this.createOrbitRings();

    // --- 4. CRIANDO AS NOTAS ---
    this.createNotesUniverse();
  }

  private createNotesUniverse(): void {
    this.notesGroup = new THREE.Group(); // Cria um container para agrupar todas as notas

    // Criamos os dados do serviço
    const notes = this.noteService.getNotes();

    // Iteramos sobre os dados reais
    notes.forEach(note => {
      this.createSingleSphere(note);
    });

    this.scene.add(this.notesGroup);

    // this.updateConstellation();
  }

  addNewNote(): void {
    const newId = Math.floor(Math.random() * 100000);
    
    // Nota como NÃO passamos 'position' aqui. O Service vai calcular.
    const newNote: NoteData = {
      id: newId,
      title: '',
      content: '',
      color: this.noteService.generateRandomColor(),
      date: new Date().toLocaleDateString(),
      // position: ... REMOVIDO DAQUI
    };

    this.noteService.addNote(newNote);
    
    // Importante: Pegamos a nota DE VOLTA do serviço, pois agora ela tem a posição calculada lá
    const savedNote = this.noteService.getNotes().find(n => n.id === newId);
    
    if (savedNote) {
        this.createSingleSphere(savedNote);
        this.selectedNote = savedNote;
        // this.updateConstellation();
    }
  }

  saveNote(): void {
    this.isEditing = false;
    // Como estamos usando objetos por referência (o jeito que o JavaScript funciona),
    // ao digitar no input, o dado já foi atualizado dentro da esfera!
    // Num app real com Backend, aqui chamaríamos o serviço para enviar ao banco de dados.

    // Avisa o serviço para persistir as alterações que fizemos nos objetos
    this.noteService.saveUpdates();
  }

  deleteCurrentNote(): void {
    if (!this.selectedNote) return;

    // 1. Pergunta de segurança (Confirmação nativa do navegador)
    const confirmDelete = window.confirm('Tem certeza que deseja apagar esta ideia para sempre?');
    
    if (confirmDelete) {
      const noteId = this.selectedNote.id;

      // 2. Remove a esfera VISUALMENTE da cena
      // Procuramos dentro do grupo de notas qual malha (mesh) tem o ID igual ao da nota
      const meshToRemove = this.notesGroup.children.find(child => child.userData['id'] === noteId);
      
      if (meshToRemove) {
        this.notesGroup.remove(meshToRemove);
        
        // (Opcional avançado) Em apps grandes, deveríamos limpar a memória da geometria também
        // mas para este portfólio o Garbage Collector do JS dá conta.
      }

      // 3. Remove os DADOS do serviço
      this.noteService.deleteNote(noteId);

      // this.updateConstellation();

      // 4. Fecha a janela
      this.selectedNote = null;
      this.isEditing = false;

      if (this.controls) {
        this.controls.target.set(0, 0, 0);
        this.camera.position.set(0, 20, 50);
        this.controls.update();
      }
    }
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.searchResults = [];
      return;
    }
    const allNotes = this.noteService.getNotes();
    this.searchResults = allNotes.filter(note => 
      note.title.toLowerCase().includes(term) || 
      note.content.toLowerCase().includes(term)
    );
  }

  focusOnNote(note: NoteData): void {
    // 1. Precisamos achar a ESFERA (Mesh) correspondente a essa nota
    // Procuramos dentro do grupo qual filho tem o ID igual ao da nota
    const targetMesh = this.notesGroup.children.find(
        child => child.userData['id'] === note.id
    ) as THREE.Mesh;

    if (!targetMesh) return;

    // 2. Limpa a busca
    this.searchTerm = '';
    this.searchResults = [];

    // 3. Pega a posição REAL no mundo (World Position)
    // O Three.js calcula onde ela está AGORA, considerando a rotação atual
    const worldPosition = new THREE.Vector3();
    targetMesh.getWorldPosition(worldPosition);

    // 4. Configura o alvo da câmera para esse ponto exato
    this.controls.target.copy(worldPosition);

    // 5. Move a câmera para perto (usando a posição real calculada)
    this.camera.position.set(
      worldPosition.x + 4,
      worldPosition.y + 2,
      worldPosition.z + 4
    );

    this.controls.update();

    // 6. Seleciona a nota (Isso vai ativar o PAUSE no loop de renderização)
    this.selectedNote = note;
    this.isEditing = false;
  }

  closeNote(): void {
    this.selectedNote = null;
    this.isEditing = false;
    
    // Opcional: Faz a câmera olhar para o centro do universo (Sol) novamente
    // Isso dá uma sensação de "Zoom Out"
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.camera.position.set(0, 20, 50);
      this.controls.update();
    }
  }

  private createSingleSphere(note: NoteData): void {
    const color = new THREE.Color(note.color);
    
    // O Sol ganha um material emissivo (brilha no escuro) para se destacar
    const isSun = note.id === 1;
    
    const material = new THREE.MeshStandardMaterial({ 
      color: color, 
      roughness: isSun ? 0.2 : 0.5, // Sol é mais liso/brilhante
      emissive: isSun ? color : new THREE.Color(0,0,0), // Sol emite luz própria
      emissiveIntensity: 0.5 // Intensidade do brilho
    });
    
    const noteMesh = new THREE.Mesh(this.sphereGeometry, material);

    // Posiciona
    if (note.position) {
      noteMesh.position.set(note.position.x, note.position.y, note.position.z);
    }

    // --- A MUDANÇA DE TAMANHO ---
    if (isSun) {
      // Escala 4x maior em todos os eixos (X, Y, Z)
      noteMesh.scale.set(2.5, 2.5, 2.5); 
    }

    noteMesh.userData = note;
    this.notesGroup.add(noteMesh);
  }

  private startRenderingLoop(): void {
    requestAnimationFrame(() => this.startRenderingLoop());

    // 1. Atualiza o "Laser" com a posição da câmera e do mouse
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 2. Atualiza a suavidade dos controles da câmera
    if (this.controls) this.controls.update();

    // 3. Verifica se o laser bateu nas esferas (filhos do grupo notesGroup)
    if (this.notesGroup && !this.selectedNote) {
      this.notesGroup.rotation.y += 0.003; // Mantém a rotação lenta

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

  // Desenha linhas entre notas próximas
  private updateConstellation(): void {
    // 1. Se já existirem linhas antigas, removemos para recriar
    if (this.linesMesh) {
      this.linesMesh.geometry.dispose(); // Limpa memória da geometria
      (this.linesMesh.material as THREE.Material).dispose(); // Limpa memória do material
      this.notesGroup.remove(this.linesMesh);
    }

    // 2. Filtra apenas as esferas (ignora as próprias linhas se já existirem)
    const storedMeshes = this.notesGroup.children.filter(child => child.type === 'Mesh') as THREE.Mesh[];

    // Array para guardar as posições (x, y, z) de cada ponta das linhas
    const positions: number[] = [];
    const connectionDistance = 15; // Distância máxima para conectar (ajuste se quiser mais/menos linhas)

    // 3. Loop duplo para comparar cada nota com todas as outras
    for (let i = 0; i < storedMeshes.length; i++) {
      for (let j = i + 1; j < storedMeshes.length; j++) {
        
        const meshA = storedMeshes[i];
        const meshB = storedMeshes[j];
        
        // Calcula a distância entre as duas
        const dist = meshA.position.distanceTo(meshB.position);

        // Se estiverem perto, salvamos os pares de coordenadas
        if (dist < connectionDistance) {
          positions.push(
            meshA.position.x, meshA.position.y, meshA.position.z, // Ponto A
            meshB.position.x, meshB.position.y, meshB.position.z  // Ponto B
          );
        }
      }
    }

    // 4. Cria a geometria das linhas baseada nos pontos que achamos
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // 5. Cria um material de linha fina e transparente
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff, // Branco
      transparent: true,
      opacity: 0.15 // Bem sutil, para não poluir
    });

    // 6. Adiciona ao grupo
    this.linesMesh = new THREE.LineSegments(geometry, material);

    // --- A CORREÇÃO MÁGICA ---
    // Substituímos a função de detectar mouse por uma função vazia.
    // Assim, o Raycaster ignora este objeto completamente.
    this.linesMesh.raycast = () => {};

    this.notesGroup.add(this.linesMesh);
  }
}