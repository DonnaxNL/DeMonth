import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { InTheBoxComponent } from './pages/in-the-box/in-the-box.component';
import { OrderboxComponent } from './pages/orderbox/orderbox.component';
import { LoginComponent } from './pages/login/login.component';
import { AccountComponent } from './pages/account/account.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { OrderFinishedComponent } from './pages/orderfinished/ordercomplete.component';
import { FaqComponent } from './pages/faq/faq.component';
import { LoggedInGuard } from './shared/components/auth/AuthGuard';
import { HowItWorksComponent } from './pages/how-it-works/how-it-works.component';
import { TermsPolicyComponent } from './pages/terms-policy/terms-policy.component';
import { TrialBoxComponent } from './pages/trial-box/trial-box.component';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'over-ons', component: AboutComponent }, //alt
  { path: 'in-the-box', component: InTheBoxComponent },
  { path: 'products', component: InTheBoxComponent }, //alt
  { path: 'producten', component: InTheBoxComponent }, //alt
  { path: 'faq', component: FaqComponent },
  { path: 'how-it-works', component: HowItWorksComponent },
  { path: 'hoe-werkt-het', component: HowItWorksComponent }, //alt
  { path: 'try-now', component: TrialBoxComponent },
  { path: 'probeer-nu', component: TrialBoxComponent }, //alt
  // { path: 'blog', component: BlogComponent },
  // { path: 'blog/:id', component: BlogDetailsComponent },
  // { path: 'contact', component: ContactFormComponent },
  { path: 'order-box', component: OrderboxComponent },
  { path: 'order-box/basic', component: OrderboxComponent, data: {box: 'Basic'}},
  { path: 'order-box/plus', component: OrderboxComponent, data: {box: 'Plus'}},
  { path: 'order-box/complete', component: OrderboxComponent, data: {box: 'Complete'}},
  { path: 'order-box/trial', component: OrderboxComponent, data: {box: 'Trial'}},
  { path: 'order-box/basic/:page', component: OrderboxComponent, data: {box: 'Basic', recover: true}},
  { path: 'order-box/plus/:page', component: OrderboxComponent, data: {box: 'Plus', recover: true}},
  { path: 'order-box/complete/:page', component: OrderboxComponent, data: {box: 'Complete', recover: true}},
  { path: 'order-box/trial/:page', component: OrderboxComponent, data: {box: 'Trial', recover: true}},
  { path: 'order-box/continue', component: OrderboxComponent, data: {box: 'Continue'}},
  { path: 'order-box/comeback', component: OrderboxComponent, data: {box: 'Return'}},
  { path: 'checkout', component: CheckoutComponent },
  { path: 'order-finished', component: OrderFinishedComponent },
  { path: 'order-complete', component: OrderFinishedComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: LoginComponent, data: {type: 'register'} },
  { path: 'account', component: AccountComponent, data: {menuItem: 'overview'}, canActivate: [LoggedInGuard]},
  // { path: 'account/subscriptions', component: AccountComponent, data: {menuItem: 'subscriptions'}, canActivate: [LoggedInGuard]},
  // { path: 'account/subscriptions/:ref/details', component: AccountComponent, data: {menuItem: 'subscriptionDetails'}, canActivate: [LoggedInGuard]},
  // { path: 'account/subscriptions/:ref/edit-preferences', component: AccountComponent, data: {menuItem: 'subscriptionEdit'}, canActivate: [LoggedInGuard]},
  // { path: 'account/subscriptions/:ref/edit-products', component: AccountComponent, data: {menuItem: 'subscriptionEdit'}, canActivate: [LoggedInGuard]},
  // { path: 'account/subscriptions/:ref/cancel-subscription', component: AccountComponent, data: {menuItem: 'subscriptionCancel'}, canActivate: [LoggedInGuard]},
  // { path: 'account/orders', component: AccountComponent, data: {menuItem: 'orders'}, canActivate: [LoggedInGuard]},
  // { path: 'account/orders/:ref/details', component: AccountComponent, data: {menuItem: 'orderDetails'}, canActivate: [LoggedInGuard]},
  // { path: 'account/points', component: AccountComponent, data: {menuItem: 'points'}, canActivate: [LoggedInGuard]},
  // { path: 'account/invite', component: AccountComponent, data: {menuItem: 'referral'}, canActivate: [LoggedInGuard]},
  // { path: 'account/settings', component: AccountComponent, data: {menuItem: 'settings'}, canActivate: [LoggedInGuard]},
  // { path: 'invite', component: ReferralComponent },
  // { path: 'upgrade/:id', component: TransferComponent, canActivate: [LoggedInGuard]},
  // { path: 'linktree', component: LinktreeComponent },
  { path: 'terms', component: TermsPolicyComponent, data: {menuItem: 'terms'}},
  { path: 'privacy-policy', component: TermsPolicyComponent, data: {menuItem: 'privacy'}},
  { path: 'cookie-policy', component: TermsPolicyComponent, data: {menuItem: 'cookie'}},
  // { path: ':referral', component: HomeComponent },
  { path: 'coupon/:coupon', component: HomeComponent },
  { path: "**", component: HomeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  constructor() { }
}
