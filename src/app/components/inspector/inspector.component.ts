import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseStorageService } from '../../services/showcase-storage.service';
import type { StoredItem } from '../../models/stored-item.model';

@Component({
  selector: 'app-inspector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.css'],
})
export class InspectorComponent {
  readonly service = inject(ShowcaseStorageService);

  loadItem(item: StoredItem): void {
    this.service.loadItemIntoPlayground(item, 'local');
  }

  deleteItem(key: string): void {
    this.service.handleRemove(key);
  }
}
