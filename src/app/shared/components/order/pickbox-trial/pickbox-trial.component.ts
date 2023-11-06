import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CookieService } from 'ngx-cookie-service';
import { Boxes } from 'src/app/constants/boxes';
import { BoxImageDialog } from '../pickbox/pickbox.component';

@Component({
  selector: 'order-pickbox-trial',
  templateUrl: './pickbox-trial.component.html',
  styleUrls: ['./pickbox-trial.component.scss']
})
export class PickboxTrialComponent implements OnInit {
  @Input() isMobile = false;

  constructor(
    private dialog: MatDialog,
    public boxes: Boxes,
    public cookieService: CookieService,
  ) { }

  ngOnInit(): void {
  }

  openImage(box: string) {
    if (this.isMobile) {
      this.dialog.open(BoxImageDialog, {
        panelClass: 'image-dialog-class',
        data: {
          boxType: box
        }
      });
    }
  }
}
