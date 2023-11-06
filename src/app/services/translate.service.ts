import { EventEmitter } from "@angular/core";
import { Injectable } from "@angular/core";
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { CookieService } from "ngx-cookie-service";

@Injectable({
    providedIn: 'root'
})
export class TranslateViewService {
    currentLanguage = 'nl'

    constructor(
        private translate: TranslateService,
        private cookieService: CookieService
    ) { }

    // Initial setup for website language
    initLanguage() {
        this.translate.addLangs(['en', 'nl']);
        // Get browser language
        const browserLang = this.translate.getBrowserLang();
        this.translate.use(browserLang.match(/en|nl/) ? browserLang : 'nl');
        if (this.cookieService.get('language')) {
            var language = this.cookieService.get('language')
            this.translate.setDefaultLang(language);
            this.currentLanguage = language;
        } else {
            this.cookieService.set('language', 'nl', 730);
            this.translate.setDefaultLang('nl');
        }

        // Listen for real-time language change
        this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
            this.cookieService.set('language', event.lang, 730);
            this.translate.setDefaultLang(event.lang);
            this.currentLanguage = event.lang;
        });
    }

    onLanguageChange(): EventEmitter<LangChangeEvent> {
        return this.translate.onLangChange;
    }

    // Set and use language as default and in cookie
    setLanguage(language: string) {
        this.currentLanguage = language;
        this.translate.setDefaultLang(language);
        this.translate.use(language);
        this.cookieService.set('language', language, 730);
    }

    // Get current language
    getLanguage() {
        return this.currentLanguage;
    }
}