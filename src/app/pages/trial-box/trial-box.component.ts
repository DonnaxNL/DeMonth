import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-trial-box',
  templateUrl: './trial-box.component.html',
  styleUrls: ['./trial-box.component.scss']
})
export class TrialBoxComponent implements OnInit {
  isMobile = false;

  constructor() { 
    this.onResize()
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    var screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 480
  }

  ngOnInit(): void {
  }

}
