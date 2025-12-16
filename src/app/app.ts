import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { RouterOutlet } from '@angular/router';
import { UniversoViewComponent } from './components/universo-view/universo-view';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, UniversoViewComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('universo-notas');
}
