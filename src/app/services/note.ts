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

  constructor() {
    // Ao iniciar o serviço, geramos os dados inicias
    this.generateInitialNotes();
  }

  // Gera dados falsos para popular nosso universo
  private generateInitialNotes(): void {

    for (let i = 0; i < 50; i++) {
      this.notes.push({
        id: i,
        title: `Ideia Cósmica #${i + 1}`,
        content: 'Esta é uma anotação flutuando no espaço-tempo. Clique em "Editar" para alterar este pensamento.',
        color: this.generateRandomColor(),
        date: new Date().toLocaleDateString(),
        position: {
          x: (Math.random() - 0.5) * 40,
          y: (Math.random() - 0.5) * 40,
          z: (Math.random() - 0.5) * 40
        }
      });
    }
  }

  // Método para o componente pegar as notas
  getNotes(): NoteData[] {
    return this.notes;
  }

  private generateRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  addNote(newNote: NoteData): void {
    this.notes.push(newNote);
  }
  // No futuro, adição de métodos como addNote(), deleteNote(), etc.
}
