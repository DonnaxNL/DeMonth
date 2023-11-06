import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { SEOService } from './seo-service';

@Injectable({
    providedIn: 'root'
})
export class PageDetailService {
    constructor(
        private seoService: SEOService,
        private meta: Meta,
        private translate: TranslateService) { }

    async setDetails(pageName: string) {

        // Titel
        this.translate.get('title.' + pageName).subscribe((res: string) => {
            this.seoService.updateTitle(res);
        });

        // // Website meta
        // this.translate.get('default.meta_description').subscribe((res: string) => {
        //     this.meta.updateTag({name: 'description', content: res});
        // });
    }
}