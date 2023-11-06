import { Component, Input, OnInit } from '@angular/core';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { AppComponent } from 'src/app/app.component';
import { TranslateViewService } from 'src/app/services/translate.service';

@Component({
  selector: 'sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SideNavComponent implements OnInit {
  promotionItem
  promotionEyeCatcher = ''
  language = 'nl';

  @Input() user;
  @Input() set promotion(value) {
    if (value != undefined) {
      this.promotionItem = value;
      this.setPromotion();
    }
  }

  constructor(
    private app: AppComponent,
    private translate: TranslateViewService) { }

  ngOnInit(): void {
    this.language = this.translate.getLanguage()
    this.translate.onLanguageChange().subscribe(async (event: LangChangeEvent) => {
      this.language = event.lang;
    });
  }

  toggleSideNav() {
    this.app.toggleSidenav()
  }

  onLanguageChange(value) {
    this.language = value
    this.translate.setLanguage(value)
    if (this.promotionItem) {
      this.setPromotion()
    }
  }

  setPromotion() {
    this.promotionEyeCatcher = this.promotionItem.eyeCatcher[this.language]
  }
}
