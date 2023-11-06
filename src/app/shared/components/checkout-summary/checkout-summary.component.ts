import { Component, Input, OnInit } from '@angular/core';
import { LangChangeEvent } from '@ngx-translate/core';
import { TranslateViewService } from 'src/app/services/translate.service';

@Component({
  selector: 'checkout-summary',
  templateUrl: './checkout-summary.component.html',
  styleUrls: ['./checkout-summary.component.scss']
})
export class CheckoutSummaryComponent implements OnInit {
  @Input() checkoutSummary: any
  @Input() order: any
  
  showMore = false
  language = 'nl'

  constructor(
    private translate: TranslateViewService
  ) { }

  ngOnInit(): void {
    this.language = this.translate.getLanguage()
    this.translate.onLanguageChange().subscribe((event: LangChangeEvent) => {
      this.language = event.lang
    });
  }

}
