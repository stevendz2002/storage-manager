import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseStorageService } from './services/showcase-storage.service';
import { HeaderComponent } from './components/header/header.component';
import { PlaygroundComponent } from './components/playground/playground.component';
import { DemosComponent } from './components/demos/demos.component';
import { InspectorComponent } from './components/inspector/inspector.component';
import { CodeGuideComponent } from './components/code-guide/code-guide.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    PlaygroundComponent,
    DemosComponent,
    InspectorComponent,
    CodeGuideComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  readonly service = inject(ShowcaseStorageService);
}
