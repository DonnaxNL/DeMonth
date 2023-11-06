import { Component, HostListener, Input, OnInit } from '@angular/core';
import { AbTestsService } from 'angular-ab-tests';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'order-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent implements OnInit {
  isMobile = false;
  sectionSelected;
  abVersion = 'productsFirst'

  @Input() set section(value) {
    if (value != undefined) {
      this.sectionSelected = value;
      this.setProgressBar()
    }
  }

  @Input() boxType;
  @Input() hideBoxPicker = false;

  constructor(
    private app: AppComponent,
    private abTestsService: AbTestsService
  ) {
    this.onResize()
  }

  ngOnInit(): void {
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    var screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 480
  }

  setProgressBar() {
    this.abVersion = this.abTestsService.getVersion('orderOrder')
    var steps = [0,25,50,75,100]
    if (this.boxType && this.boxType.id == 'box_01') {
      steps = [0,33,0,66,100]
    }
    switch (this.sectionSelected) {
      case 'pick-box':
        this.app.setProgress(steps[0])
        break;
      case 'personalise':
        this.app.setProgress(this.abVersion == 'productsFirst' ? steps[1] : steps[2])
        break;
      case 'preferences':
        this.app.setProgress(this.abVersion == 'preferencesFirst' ? steps[1] : steps[2])
        break;
      case 'delivery':
        this.app.setProgress(steps[3])
        break;
      case 'checkout':
        this.app.setProgress(steps[4])
        break;
      default:
        break;
    }
  }
}
