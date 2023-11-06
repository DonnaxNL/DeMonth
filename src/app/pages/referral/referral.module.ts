import { ClipboardModule } from "@angular/cdk/clipboard";
import { NgModule } from "@angular/core";
import { AuthModule } from "src/app/shared/components/auth/auth.module";
import { SharedModule } from "src/app/shared/shared.module";
import { ReferralComponent } from "./referral.component";

@NgModule({
    declarations: [
        ReferralComponent
    ],
    imports: [
        SharedModule,
        AuthModule,
        ClipboardModule
    ]
})

export class ReferralModule {
}