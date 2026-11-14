import { Component, inject } from '@angular/core';
import { ShowcaseStorageService } from '../../services/showcase-storage.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  readonly service = inject(ShowcaseStorageService);
}
