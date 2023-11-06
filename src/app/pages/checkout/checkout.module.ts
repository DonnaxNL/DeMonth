import { NgModule } from "@angular/core";
import { AuthModule } from "src/app/shared/components/auth/auth.module";
import { SharedModule } from "src/app/shared/shared.module";
import { CheckoutComponent } from "./checkout.component";
import { SummaryDialog } from "./summary-dialog/summary.component";

@NgModule({
    declarations: [
        CheckoutComponent,
        SummaryDialog
    ],
    imports: [
        SharedModule,
        AuthModule
    ],
    entryComponents: [
      SummaryDialog
    ]
})

export class CheckoutModule {
}