import { ClipboardModule } from '@angular/cdk/clipboard';
import { NgModule } from '@angular/core';
import { AuthModule } from 'src/app/shared/components/auth/auth.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { BottomSheetOverview } from '../orderbox/orderbox.component';
import { AccountSubscriptionComponent } from './account-subscription/account-subscription.component';
import { AccountComponent } from './account.component';
import { CancelSubscriptionComponent } from './cancel-subscription/cancel-subscription.component';
import { CancelWarningDialog } from './cancel-warning/cancel-warning.component';
import { ChangeBoxDialog } from './change-box/change-box.component';
import { DeliveryDaysDialog } from './change-days/change-days.component';
import { ConfirmProductsDialog, EditProductsComponent } from './edit-products/edit-products.component';
import { FinishAdditionalDataComponent } from './finish-additional-data/finish-additional-data.component';
import { NewStartDateDialog } from './new-startdate/new-startdate.component';
import { PauseSubscriptionDialog } from './pause-order/pause-order.component';
import { ConfirmDialog } from './points/confirm/confirm.component';
import { PointsComponent } from './points/points.component';
import { AccountReferralComponent, ReferralDialog } from './referral/referral.component';
import { AccountSettingsComponent } from './settings/settings.component';

@NgModule({
  declarations: [
    AccountComponent,
    FinishAdditionalDataComponent,
    AccountSubscriptionComponent,
    ChangeBoxDialog,
    NewStartDateDialog,
    PauseSubscriptionDialog,
    EditProductsComponent,
    ConfirmProductsDialog,
    DeliveryDaysDialog,
    CancelSubscriptionComponent,
    CancelWarningDialog,
    AccountReferralComponent,
    ReferralDialog,
    PointsComponent,
    ConfirmDialog,
    AccountSettingsComponent,
  ],
  imports: [
    SharedModule,
    ClipboardModule,
    AuthModule
  ],
  exports: [

  ],
  providers: [
    
  ],
  entryComponents: [
    BottomSheetOverview,
    DeliveryDaysDialog,
    ChangeBoxDialog,
    NewStartDateDialog,
    ConfirmProductsDialog,
    PauseSubscriptionDialog,
    CancelWarningDialog,
    ConfirmDialog,
    ReferralDialog
  ]
})

export class AccountModule {
}