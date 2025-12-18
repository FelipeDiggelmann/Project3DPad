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
      color: '#00ff88',
      date: new Date().toLocaleDateString(),
      position: { x: 0, y: 0, z: 0 } // Bem no centro
    });
    this.saveToStorage();
  }

  // Método para o componente pegar as notas
  getNotes(): NoteData[] {
    return this.notes;
  }

  addNote(newNote: NoteData): void {
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
