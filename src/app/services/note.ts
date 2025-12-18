import { Injectable } from '@angular/core';

// 1.Centralizamos a definição do que é uma "Nota" aqui
export interface NoteData {
  id: number;
  title: string;
  content: string;
  color: string;
  date: string;
  // Posições 3D (Salvar em uma posição fixa)
  position?: {x: number, y: number, z: number };
}

@Injectable({
  providedIn: 'root', // Cria uma instância única para todo o app (Singleton)
})
export class NoteService {
  
  private notes: NoteData[] = [];

  private readonly STORAGE_KEY = 'universo_notas_v1';

  // Configurações do Sistema Solar
    private readonly ORBIT_1_COUNT = 6;  // 1 Sol + 5 planetas internos
    private readonly ORBIT_2_COUNT = 15; // Próximos 15
    // O resto vai para o espaço profundo por enquanto

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const savedData = localStorage.getItem(this.STORAGE_KEY);

    if (savedData) {
      // Se achou dados salvos, converte de texto JSON de para Objeto
      this.notes = JSON.parse(savedData);
    } else {
      // Se é a primeira vez do usuário, cria a nota de boas-vindas
      this.initDefaultNote();
    }
  }

  private initDefaultNote(): void {
    this.notes.push({
      id: 1,
      title: `Bem vindo ao seu Universo`,
      content: 'Aqui é o início de tudo. Clique no botão "+" para criar novas memórias flutuantes',
      color: '#ffaa00',
      date: new Date().toLocaleDateString(),
      position: { x: 0, y: 0, z: 0 } // Bem no centro
    });
    this.saveToStorage();
  }

  // --- A NOVA MATEMÁTICA ---
    public calculateSmartPosition(index: number): {x: number, y: number, z: number} {
      // Se for a primeira nota (0), é o Sol
      if (index === 0) return { x: 0, y: 0, z: 0 };

      let radius = 0;
      let angleIncrement = 0;
      
      // Camada 1: 5 notas próximas (Índices 1 a 5)
      if (index <= 5) {
        radius = 8; // Distância do centro
        // Distribui uniformemente ou aleatoriamente no círculo
        // Usamos index * val para espalhar, + random para não ficar perfeitamente alinhado
        angleIncrement = (index * (Math.PI * 2) / 5) + (Math.random() * 0.5);
      } 
      // Camada 2: Próximas 15 notas (Índices 6 a 20)
      else if (index <= 20) {
        radius = 16;
        angleIncrement = (index * (Math.PI * 2) / 15) + (Math.random() * 0.5);
      }
      // Camada 3: Espaço Profundo (Índices 21+)
      else {
        radius = 24 + (index - 20) * 0.5; // Espiral abrindo
        angleIncrement = index * 0.5;
      }

      // Converte Polar (Raio/Ângulo) para Cartesiano (X/Z)
      // Adicionamos um Y (altura) pequeno para o sistema não ser totalmente plano (2D)
      return {
        x: Math.cos(angleIncrement) * radius,
        y: (Math.random() - 0.5) * 4, // Variação leve de altura
        z: Math.sin(angleIncrement) * radius
      };
    }

  // Método para o componente pegar as notas
  getNotes(): NoteData[] {
    return this.notes;
  }

  addNote(newNote: NoteData): void {
    if (!newNote.position) {
        newNote.position = this.calculateSmartPosition(this.notes.length);
      }
    this.notes.push(newNote);
    this.saveToStorage();
  }

  saveUpdates(): void {
    this.saveToStorage();
  }

  deleteNote(id: number): void {
    // Filtra o array, mantendo apenas as notas que NÃO têm esse ID
    this.notes = this.notes.filter(note => note.id !== id);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    // LocalStorage só aceita texto (string), então usamos JSON.stringify
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notes));
  }

  public generateRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}
