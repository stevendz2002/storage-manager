import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseStorageService } from '../../services/showcase-storage.service';

@Component({
  selector: 'app-demos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './demos.component.html',
  styleUrls: ['./demos.component.css'],
})
export class DemosComponent {
  readonly service = inject(ShowcaseStorageService);

  runCacheDemo(): void {
    this.service.setBackend('cache');
    this.service.setKey('datos_offline');
    this.service.setValue(
      JSON.stringify(
        {
          timestamp: Date.now(),
          version: '1.0.0',
          items: [1, 2, 3],
        },
        null,
        2
      )
    );
    this.service.handleSet();
    this.service.setActiveTab('playground');
  }
}
