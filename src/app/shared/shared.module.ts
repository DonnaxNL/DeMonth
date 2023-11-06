import { NgModule } from '@angular/core';
import { MaterialModule } from './modules/material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AppRoutingModule } from '../app-routing.module';
import { CommonModule } from '@angular/common';
import { FirebaseModule } from './modules/firebase.module';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { CountryPipe } from './pipes/country.pipe';
import { CustomCurrencyPipe } from './pipes/currency-space.pipe';
import { AddressViewComponent } from './components/address-view/address-view.component';
import { FormComponent } from './components/forms/address/form.component';
import { PasswordFormComponent } from './components/forms/password/password.form.component';
import { BoxImageDialog, PickboxComponent } from './components/order/pickbox/pickbox.component';
import { PickPreferencesComponent } from './components/order/pickpreferences/pickpreferences.component';
import { PickProductsComponent } from './components/order/pickproducts/pickproducts.component';
import { ProgressBarComponent } from './components/order/progress-bar/progress-bar.component';
import { ProductDetailDialog } from './components/order/pickproducts/product-detail-dialog/product-detail-dialog';
import { PickboxTrialComponent } from './components/order/pickbox-trial/pickbox-trial.component';
import { CheckoutSummaryComponent } from './components/checkout-summary/checkout-summary.component';
import { RouterModule } from '@angular/router';
import { Boxes } from '../constants/boxes';
import { CountryFormats } from '../constants/country-formats';
import { Products } from '../constants/products';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { PaymentMethodPipe } from './pipes/payment-method.pipe';
import { PluralTranslatePipe } from './pipes/plural-translate.pipe';
import { IdealIssuers } from '../constants/ideal-issuers';

@NgModule({
  declarations: [
    AddressViewComponent,
    CheckoutSummaryComponent,
    FormComponent,
    PasswordFormComponent,
    ProgressBarComponent,
    PickboxComponent,
    BoxImageDialog,
    PickProductsComponent,
    PickPreferencesComponent,
    PickboxTrialComponent,
    ProductDetailDialog,
    CountryPipe,
    CustomCurrencyPipe,
    PaymentMethodPipe,
    PluralTranslatePipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule.withConfig({ warnOnNgModelWithFormControl: 'never' }),
    MaterialModule,
    FlexLayoutModule,
    FirebaseModule,
    TranslateModule,
    NgxSkeletonLoaderModule.forRoot(),
  ],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    FirebaseModule,
    AddressViewComponent,
    CheckoutSummaryComponent,
    FormComponent,
    PasswordFormComponent,
    ProgressBarComponent,
    PickboxComponent,
    PickboxTrialComponent,
    PickProductsComponent,
    PickPreferencesComponent,
    CountryPipe,
    CustomCurrencyPipe,
    PaymentMethodPipe,
    PluralTranslatePipe,
    TranslateModule,
    NgxSkeletonLoaderModule
  ],
  providers: [
    Boxes,
    Products,
    CountryFormats,
    IdealIssuers,
    FormComponent,
    PasswordFormComponent
  ],
  entryComponents: [
    BoxImageDialog,
    ProductDetailDialog
  ]
})

export class SharedModule {
}