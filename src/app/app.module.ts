import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, LOCALE_ID } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeNL from '@angular/common/locales/nl';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';
import { NgcCookieConsentModule, NgcCookieConsentConfig } from 'ngx-cookieconsent';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { OrderboxComponent } from './pages/orderbox/orderbox.component';
import { environment } from '../environments/environment';
import { AccountComponent } from './pages/account/account.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { EditProductsComponent } from './pages/account/edit-products/edit-products.component';
import { AuthComponent } from './shared/components/auth/auth.component';
import { AccountSettingsComponent } from './pages/account/settings/settings.component';
import { FinishAdditionalDataComponent } from './pages/account/finish-additional-data/finish-additional-data.component';
import { SharedModule } from './shared/shared.module';
import { ErrorStateMatcher, ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { AbTestsModule } from 'angular-ab-tests';
import { FooterModule } from './shared/components/footer/footer.module';
import { NavbarModule } from './shared/components/navbar/navbar.module';
import { SideNavModule } from './shared/components/sidenav/sidenav.module';
import { HomeModule } from './pages/home/home.module';
import { OrderboxModule } from './pages/orderbox/orderbox.module';
import { InTheBoxModule } from './pages/in-the-box/in-the-box.module';
import { AccountModule } from './pages/account/account.module';
import { TrialBoxModule } from './pages/trial-box/trial-box.module';
import { HowItWorksModule } from './pages/how-it-works/how-it-works.module';
import { AboutModule } from './pages/about/about.module';
import { TermsPolicyModule } from './pages/terms-policy/terms-policy.module';
import { TransferModule } from './pages/transfer/transfer.module';
import { CheckoutModule } from './pages/checkout/checkout.module';
import { NotFoundPageModule } from './pages/notfoundpage/notfoundpage.module';
import { LoginModule } from './pages/login/login.module';
import { LinktreeModule } from './pages/linktree/linktree.module';
import { ClosedModule } from './pages/closed/closed.module';
import { ContactFormModule } from './pages/contact-form/contact-form.module';
import { FaqModule } from './pages/faq/faq.module';
import { OrderFinishedModule } from './pages/orderfinished/ordercomplete.module';
import { ReferralModule } from './pages/referral/referral.module';
import { SEOService } from './services/seo-service';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { ServiceWorkerModule } from '@angular/service-worker';

registerLocaleData(localeNL, 'nl');

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
};

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    NavbarModule,
    SideNavModule,
    FooterModule,
    HomeModule,
    OrderboxModule,
    TrialBoxModule,
    CheckoutModule,
    OrderFinishedModule,
    LoginModule,
    AccountModule,
    AboutModule,
    HowItWorksModule,
    InTheBoxModule,
    ReferralModule,
    FaqModule,
    TermsPolicyModule,
    LinktreeModule,
    ContactFormModule,
    TransferModule,
    NotFoundPageModule,
    ClosedModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    NgcCookieConsentModule.forRoot((environment.cookieConfig as NgcCookieConsentConfig)),
    ReactiveFormsModule.withConfig({ warnOnNgModelWithFormControl: 'never' }),
    NgxSkeletonLoaderModule.forRoot(),
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }),
    AbTestsModule.forRoot([environment.abTestConfig]),
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],
  providers: [
    AppComponent,
    SEOService,
    AuthComponent,
    CookieService,
    DatePipe,
    OrderboxComponent,
    EditProductsComponent,
    CheckoutComponent,
    AccountComponent,
    AccountSettingsComponent,
    FinishAdditionalDataComponent,
    { provide: LOCALE_ID, useValue: 'nl-NL' },
    { provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher },
    { provide: 'googleTagManagerId', useValue: 'GTM-N8Q3NS4' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
